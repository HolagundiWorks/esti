import { FeeProposalCreate, coaMinimumFee, isBelowCoaMinimum } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { feeProposals } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const feeProposalRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(feeProposals)
        .where(eq(feeProposals.projectId, input.projectId))
        .orderBy(desc(feeProposals.createdAt));
    }),

  create: protectedProcedure.input(FeeProposalCreate).mutation(async ({ ctx, input }) => {
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
});
