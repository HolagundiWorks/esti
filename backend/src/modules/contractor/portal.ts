import { ContractorBidByToken, TENDER_STATUS_LABEL } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { contractors, projectOffices, tenderBids, tenderInvitations, tenders } from "../../db/schema.js";
import { getFirm } from "../../lib/firm.js";
import { publicProcedure, router } from "../../trpc/trpc.js";

/**
 * Token-scoped contractor bid portal (Phase 7 gate). A contractor opens their
 * unguessable per-invitation magic link (`/bid/:token`) and sees ONLY their own
 * tender and bid — never another contractor's invitation, bid, or the firm's
 * internal data. No login: the 48-char accessToken is the capability.
 */

async function loadByToken(db: DB, token: string) {
  const [row] = await db
    .select({
      invitationId: tenderInvitations.id,
      invitationStatus: tenderInvitations.status,
      contractorName: contractors.name,
      tenderId: tenders.id,
      tenderTitle: tenders.title,
      tenderStatus: tenders.status,
      scope: tenders.scope,
      dueDate: tenders.dueDate,
      projectRef: projectOffices.ref,
      projectTitle: projectOffices.title,
    })
    .from(tenderInvitations)
    .innerJoin(tenders, eq(tenders.id, tenderInvitations.tenderId))
    .innerJoin(projectOffices, eq(projectOffices.id, tenders.projectId))
    .innerJoin(contractors, eq(contractors.id, tenderInvitations.contractorId))
    .where(eq(tenderInvitations.accessToken, token));
  return row;
}

export const contractorPortalRouter = router({
  /** Open an invitation by token: returns only this invitation's tender + own bid. */
  byToken: publicProcedure
    .input(z.object({ token: z.string().min(10).max(96) }))
    .query(async ({ ctx, input }) => {
      const inv = await loadByToken(ctx.db, input.token);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "This bid link is invalid or has expired." });

      // First open marks the invitation as viewed (don't downgrade later states).
      if (inv.invitationStatus === "INVITED") {
        await ctx.db.update(tenderInvitations).set({ status: "VIEWED" }).where(eq(tenderInvitations.id, inv.invitationId));
      }

      const [bid] = await ctx.db
        .select({
          amountPaise: tenderBids.amountPaise,
          completionWeeks: tenderBids.completionWeeks,
          technicalScore: tenderBids.technicalScore,
          notes: tenderBids.notes,
        })
        .from(tenderBids)
        .where(eq(tenderBids.invitationId, inv.invitationId));

      const firm = await getFirm(ctx.db);
      return {
        firmName: firm.companyName,
        contractorName: inv.contractorName,
        tender: {
          title: inv.tenderTitle,
          scope: inv.scope,
          dueDate: inv.dueDate,
          status: inv.tenderStatus,
          statusLabel: TENDER_STATUS_LABEL[inv.tenderStatus as keyof typeof TENDER_STATUS_LABEL] ?? inv.tenderStatus,
          projectRef: inv.projectRef,
          projectTitle: inv.projectTitle,
          open: inv.tenderStatus === "OPEN",
        },
        invitationStatus: inv.invitationStatus === "INVITED" ? "VIEWED" : inv.invitationStatus,
        bid: bid ?? null,
      };
    }),

  /** Submit (or update) this contractor's sealed bid — only while the tender is OPEN. */
  submitBid: publicProcedure.input(ContractorBidByToken).mutation(async ({ ctx, input }) => {
    const inv = await loadByToken(ctx.db, input.token);
    if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "This bid link is invalid or has expired." });
    if (inv.tenderStatus !== "OPEN")
      throw new TRPCError({ code: "BAD_REQUEST", message: "This tender is not open for bids." });

    const [existing] = await ctx.db
      .select({ id: tenderBids.id })
      .from(tenderBids)
      .where(eq(tenderBids.invitationId, inv.invitationId));
    if (existing) {
      await ctx.db
        .update(tenderBids)
        .set({
          amountPaise: input.amountPaise,
          completionWeeks: input.completionWeeks ?? null,
          technicalScore: input.technicalScore ?? null,
          notes: input.notes ?? null,
          updatedAt: new Date(),
        })
        .where(eq(tenderBids.id, existing.id));
    } else {
      await ctx.db.insert(tenderBids).values({
        invitationId: inv.invitationId,
        amountPaise: input.amountPaise,
        completionWeeks: input.completionWeeks ?? null,
        technicalScore: input.technicalScore ?? null,
        notes: input.notes ?? null,
      });
    }
    await ctx.db.update(tenderInvitations).set({ status: "SUBMITTED" }).where(eq(tenderInvitations.id, inv.invitationId));
    return { ok: true as const };
  }),
});
