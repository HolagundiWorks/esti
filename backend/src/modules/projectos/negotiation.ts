import {
  NegotiationAddRound,
  NegotiationSetOutcome,
  conversionProbability,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { projectNegotiations } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const writer = capabilityProcedure("write");

export const negotiationRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(projectNegotiations)
        .where(eq(projectNegotiations.projectId, input.projectId))
        .orderBy(projectNegotiations.roundNo);
    }),

  /**
   * Append a negotiation round. The round number is allocated server-side and
   * the conversion probability is recomputed from the running round count and
   * the cumulative discount conceded across all rounds (advisory only).
   */
  addRound: writer.input(NegotiationAddRound).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db
      .select({
        roundNo: projectNegotiations.roundNo,
        discount: projectNegotiations.discountRequestedPct,
      })
      .from(projectNegotiations)
      .where(eq(projectNegotiations.projectId, input.projectId));

    const roundNo = existing.reduce((m, r) => Math.max(m, r.roundNo), 0) + 1;
    const totalDiscountPct =
      existing.reduce((s, r) => s + Number(r.discount), 0) + input.discountRequestedPct;
    const probability = conversionProbability({ rounds: roundNo, totalDiscountPct });

    const [row] = await ctx.db
      .insert(projectNegotiations)
      .values({
        projectId: input.projectId,
        feeProposalId: input.feeProposalId ?? null,
        roundNo,
        feeChangePaise: input.feeChangePaise,
        scopeChanges: input.scopeChanges ?? null,
        timelineChanges: input.timelineChanges ?? null,
        discountRequestedPct: String(input.discountRequestedPct),
        architectResponse: input.architectResponse ?? null,
        clientResponse: input.clientResponse ?? null,
        outcome: input.outcome,
        conversionProbability: probability,
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "project_negotiation", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  setOutcome: writer.input(NegotiationSetOutcome).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db
      .select()
      .from(projectNegotiations)
      .where(eq(projectNegotiations.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .update(projectNegotiations)
      .set({ outcome: input.outcome })
      .where(eq(projectNegotiations.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "project_negotiation",
      entityId: input.id,
      action: "OUTCOME",
      actorId: ctx.user.id,
      before: { outcome: before.outcome },
      after: { outcome: input.outcome },
    });
    return row!;
  }),
});
