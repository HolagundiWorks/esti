import { FeeProposalCreate, coaMinimumFee, isBelowCoaMinimum } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { feeProposals } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
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

  create: feesProcedure.input(FeeProposalCreate).mutation(async ({ ctx, input }) => {
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
      return { ok: true };
    }),
});
