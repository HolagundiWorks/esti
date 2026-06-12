import { PhaseSetCurrent } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { phases, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const phaseRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(phases)
        .where(eq(phases.projectId, input.projectId))
        .orderBy(asc(phases.sortOrder));
    }),

  /** Advance the project to the given stage; earlier stages are implicitly complete. */
  setCurrent: protectedProcedure.input(PhaseSetCurrent).mutation(async ({ ctx, input }) => {
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
});
