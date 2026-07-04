import { PhaseSetCurrent } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { phases, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { assertProjectAccess } from "../../lib/projectAccess.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const phaseRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user, input.projectId);
      return ctx.db
        .select()
        .from(phases)
        .where(eq(phases.projectId, input.projectId))
        .orderBy(asc(phases.sortOrder));
    }),

  /** Advance the project to the given stage; earlier stages are implicitly complete. */
  setCurrent: protectedProcedure.input(PhaseSetCurrent).mutation(async ({ ctx, input }) => {
    await assertProjectAccess(ctx.db, ctx.user, input.projectId);
    const [phase] = await ctx.db
      .select()
      .from(phases)
      .where(eq(phases.id, input.phaseId));
    if (!phase || phase.projectId !== input.projectId)
      throw new TRPCError({ code: "NOT_FOUND" });
    const [before] = await ctx.db
      .select({ currentPhaseId: projectOffices.currentPhaseId })
      .from(projectOffices)
      .where(eq(projectOffices.id, input.projectId));
    await ctx.db
      .update(projectOffices)
      .set({ currentPhaseId: input.phaseId })
      .where(eq(projectOffices.id, input.projectId));
    await writeAudit(ctx.db, {
      entity: "project",
      entityId: input.projectId,
      action: "UPDATE",
      actorId: ctx.user.id,
      before,
      after: { currentPhaseId: input.phaseId },
    });
    return { ok: true };
  }),

  /** Set the revision budget (# revisions included in the contract fee) for a phase. */
  setRevisionBudget: protectedProcedure
    .input(z.object({
      phaseId: z.string().uuid(),
      projectId: z.string().uuid(),
      revisionBudget: z.number().int().min(0).max(99).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user, input.projectId);
      const [phase] = await ctx.db.select().from(phases).where(eq(phases.id, input.phaseId));
      if (!phase || phase.projectId !== input.projectId)
        throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .update(phases)
        .set({ revisionBudget: input.revisionBudget })
        .where(eq(phases.id, input.phaseId));
      await writeAudit(ctx.db, {
        entity: "phase",
        entityId: input.phaseId,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: { revisionBudget: phase.revisionBudget },
        after: { revisionBudget: input.revisionBudget },
      });
      return { ok: true };
    }),
});
