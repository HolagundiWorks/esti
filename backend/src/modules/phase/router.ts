import { PhaseUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { phases } from "../../db/schema.js";
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

  update: protectedProcedure.input(PhaseUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(phases).where(eq(phases.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .update(phases)
      .set({
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.datePlanned !== undefined ? { datePlanned: input.datePlanned } : {}),
        ...(input.dateActual !== undefined ? { dateActual: input.dateActual } : {}),
      })
      .where(eq(phases.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "phase",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before,
      after: row,
    });
    return row!;
  }),
});
