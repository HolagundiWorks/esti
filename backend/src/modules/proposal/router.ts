import {
  FeeProposalCreate,
  FeeProposalSetClientApproval,
  coaMinimumFee,
  isBelowCoaMinimum,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { leads, projectOffices, proposals } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { requireProject } from "../../lib/projectScope.js";
import { requireUnissuedDocument } from "../../lib/retention.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { capabilityProcedure, router } from "../../trpc/trpc.js";

// Proposals expose firm economics (COA fee) — Partner and Owner only.
const manage = capabilityProcedure("fees:manage");

/**
 * Unified Proposals — the former Fee proposals (COA scale-of-charges + the
 * Project OS client-approval gate) merged with the thin scope/agreement proposal.
 * One model (`esti_proposal`). PDF worker target stays "feeproposal".
 */
export const proposalRouter = router({
  listByProject: manage
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(proposals)
        .where(eq(proposals.projectId, input.projectId))
        .orderBy(desc(proposals.createdAt)),
    ),

  /** All proposals across projects (office-wide Office › Proposals view). */
  listAll: manage.query(async ({ ctx }) =>
    ctx.db
      .select({
        id: proposals.id,
        ref: proposals.ref,
        projectId: proposals.projectId,
        projectRef: projectOffices.ref,
        projectTitle: projectOffices.title,
        workCategory: proposals.workCategory,
        workType: proposals.workType,
        feePaise: proposals.feePaise,
        belowMinimum: proposals.belowMinimum,
        status: proposals.status,
        clientApprovalStatus: proposals.clientApprovalStatus,
        pdfStatus: proposals.pdfStatus,
      })
      .from(proposals)
      .innerJoin(projectOffices, eq(projectOffices.id, proposals.projectId))
      .orderBy(desc(proposals.createdAt))
      .limit(300),
  ),

  byId: manage.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(proposals).where(eq(proposals.id, input.id));
    if (!row) return null;
    const pdfUrl = row.pdfKey ? await presignedGet(row.pdfKey).catch(() => null) : null;
    return { ...row, pdfUrl };
  }),

  create: manage.input(FeeProposalCreate).mutation(async ({ ctx, input }) => {
    await requireProject(ctx.db, input.projectId);
    const coaMinimumPaise = coaMinimumFee(input.workCategory, input.costOfWorksPaise);
    const below = isBelowCoaMinimum(input.feePaise, coaMinimumPaise);
    // COA compliance guardrail: a below-minimum fee needs an audited override.
    if (below && !input.overrideReason) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Quoted fee is below the COA minimum; an override reason is required.",
      });
    }
    const { ref } = await nextRef(ctx.db, "proposal", "PRP");
    const [row] = await ctx.db
      .insert(proposals)
      .values({
        ref,
        projectId: input.projectId,
        workCategory: input.workCategory,
        workType: input.workType,
        costOfWorksPaise: input.costOfWorksPaise,
        feePaise: input.feePaise,
        docCommPct: input.docCommPct,
        coaMinimumPaise,
        belowMinimum: below,
        overrideReason: input.overrideReason ?? null,
        scope: input.scope ?? null,
        notes: input.notes ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "proposal",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  generatePdf: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(proposals).where(eq(proposals.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.update(proposals).set({ pdfStatus: "PENDING" }).where(eq(proposals.id, input.id));
    await enqueueJob(
      "render_pdf",
      { target: "feeproposal", id: row.id, firm: await firmPayload(ctx.db) },
      ctx.requestId,
    );
    await writeAudit(ctx.db, {
      entity: "proposal",
      entityId: input.id,
      action: "PDF_REQUEST",
      actorId: ctx.user.id,
      before: { pdfStatus: row.pdfStatus },
      after: { pdfStatus: "PENDING" },
    });
    return { ok: true };
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(proposals).where(eq(proposals.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    requireUnissuedDocument(row, "Proposal");
    if (row.pdfKey) await removeObject(row.pdfKey);
    await ctx.db.delete(proposals).where(eq(proposals.id, input.id));
    await writeAudit(ctx.db, {
      entity: "proposal",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
      before: row,
    });
    return { ok: true };
  }),

  /**
   * Project OS — Client Approval Gate (Slice I). On REJECTED, the draft project is
   * cancelled and the linked lead (if any) is marked LOST — closing the funnel.
   */
  setClientApproval: manage
    .input(FeeProposalSetClientApproval)
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(proposals).where(eq(proposals.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });

      const result = await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(proposals)
          .set({
            clientApprovalStatus: input.clientApprovalStatus,
            clientApprovedAt: input.clientApprovalStatus === "APPROVED" ? new Date() : null,
            approvalNotes: input.approvalNotes ?? null,
            updatedAt: new Date(),
          })
          .where(eq(proposals.id, input.id))
          .returning();

        if (input.clientApprovalStatus === "REJECTED") {
          const [proj] = await tx
            .update(projectOffices)
            .set({ status: "CANCELLED" })
            .where(eq(projectOffices.id, before.projectId))
            .returning({ leadId: projectOffices.leadId });
          if (proj?.leadId) {
            await tx.update(leads).set({ status: "LOST", updatedAt: new Date() }).where(eq(leads.id, proj.leadId));
          }
        }
        return row!;
      });

      await writeAudit(ctx.db, {
        entity: "proposal",
        entityId: input.id,
        action: "CLIENT_APPROVAL",
        actorId: ctx.user.id,
        before: { clientApprovalStatus: before.clientApprovalStatus },
        after: { clientApprovalStatus: input.clientApprovalStatus },
      });
      return result;
    }),
});
