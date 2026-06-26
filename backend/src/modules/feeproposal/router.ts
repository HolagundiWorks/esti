import {
  FeeProposalCreate,
  FeeProposalSetClientApproval,
  coaMinimumFee,
  isBelowCoaMinimum,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { feeProposals, leads, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { requireProject } from "../../lib/projectScope.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet } from "../../lib/storage.js";
import { capabilityProcedure, router } from "../../trpc/trpc.js";

// Fee proposals expose firm economics — Partner and Owner only.
const feesProcedure = capabilityProcedure("fees:manage");

export const feeProposalRouter = router({
  listByProject: feesProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(feeProposals)
        .where(eq(feeProposals.projectId, input.projectId))
        .orderBy(desc(feeProposals.createdAt));
    }),

  /** All fee proposals across projects (office-wide Accounting view). */
  listAll: feesProcedure.query(async ({ ctx }) =>
    ctx.db
      .select({
        id: feeProposals.id,
        ref: feeProposals.ref,
        projectId: feeProposals.projectId,
        projectRef: projectOffices.ref,
        projectTitle: projectOffices.title,
        workCategory: feeProposals.workCategory,
        feePaise: feeProposals.feePaise,
        belowMinimum: feeProposals.belowMinimum,
        status: feeProposals.status,
        pdfStatus: feeProposals.pdfStatus,
      })
      .from(feeProposals)
      .innerJoin(projectOffices, eq(projectOffices.id, feeProposals.projectId))
      .orderBy(desc(feeProposals.createdAt))
      .limit(300),
  ),

  create: feesProcedure.input(FeeProposalCreate).mutation(async ({ ctx, input }) => {
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
    const { ref } = await nextRef(ctx.db, "feeproposal", "FEE");
    const [row] = await ctx.db
      .insert(feeProposals)
      .values({
        ref,
        projectId: input.projectId,
        workCategory: input.workCategory,
        costOfWorksPaise: input.costOfWorksPaise,
        feePaise: input.feePaise,
        docCommPct: input.docCommPct,
        coaMinimumPaise,
        belowMinimum: below,
        overrideReason: input.overrideReason ?? null,
        scope: input.scope ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "feeproposal",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  byId: feesProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(feeProposals).where(eq(feeProposals.id, input.id));
      if (!row) return null;
      const pdfUrl = row.pdfKey ? await presignedGet(row.pdfKey).catch(() => null) : null;
      return { ...row, pdfUrl };
    }),

  generatePdf: feesProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(feeProposals).where(eq(feeProposals.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .update(feeProposals)
        .set({ pdfStatus: "PENDING" })
        .where(eq(feeProposals.id, input.id));
      await enqueueJob("render_pdf", {
        target: "feeproposal",
        id: row.id,
        firm: await firmPayload(ctx.db),
      }, ctx.requestId);
      await writeAudit(ctx.db, {
        entity: "feeproposal",
        entityId: input.id,
        action: "PDF_REQUEST",
        actorId: ctx.user.id,
        before: { pdfStatus: row.pdfStatus },
        after: { pdfStatus: "PENDING" },
      });
      return { ok: true };
    }),

  /**
   * Project OS — Client Approval Gate (Slice I). Record the client's decision on
   * a fee proposal. On REJECTED, the draft project is cancelled and the linked
   * lead (if any) is marked LOST — closing the funnel cleanly.
   */
  setClientApproval: feesProcedure
    .input(FeeProposalSetClientApproval)
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(feeProposals).where(eq(feeProposals.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });

      const result = await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(feeProposals)
          .set({
            clientApprovalStatus: input.clientApprovalStatus,
            clientApprovedAt: input.clientApprovalStatus === "APPROVED" ? new Date() : null,
            approvalNotes: input.approvalNotes ?? null,
            updatedAt: new Date(),
          })
          .where(eq(feeProposals.id, input.id))
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
        entity: "feeproposal",
        entityId: input.id,
        action: "CLIENT_APPROVAL",
        actorId: ctx.user.id,
        before: { clientApprovalStatus: before.clientApprovalStatus },
        after: { clientApprovalStatus: input.clientApprovalStatus },
      });
      return result;
    }),
});
