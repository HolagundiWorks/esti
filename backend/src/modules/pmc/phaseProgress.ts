import { DEFAULT_LIVE_STAGES, PhaseProgressUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { phaseProgress, phases } from "../../db/schema.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

export async function ensureLiveStagesForPhase(db: DB, phaseId: string, phaseCode: string) {  const existing = await db
    .select({ id: phaseProgress.id })
    .from(phaseProgress)
    .where(eq(phaseProgress.phaseId, phaseId))
    .limit(1);
  if (existing.length > 0) return;

  const defs = DEFAULT_LIVE_STAGES[phaseCode];
  if (!defs?.length) return;

  await db.insert(phaseProgress).values(
    defs.map((d, i) => ({
      phaseId,
      liveStageCode: d.code,
      label: d.label,
      sortOrder: i,
      status: "NOT_STARTED" as const,
    })),
  );
}

export const phaseProgressRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {      const phaseRows = await ctx.db
        .select()
        .from(phases)
        .where(eq(phases.projectId, input.projectId))
        .orderBy(asc(phases.sortOrder));

      for (const ph of phaseRows) {
        if (DEFAULT_LIVE_STAGES[ph.code]) {
          await ensureLiveStagesForPhase(ctx.db, ph.id, ph.code);
        }
      }

      const rows = await ctx.db
        .select({
          id: phaseProgress.id,
          phaseId: phaseProgress.phaseId,
          phaseCode: phases.code,
          phaseLabel: phases.label,
          liveStageCode: phaseProgress.liveStageCode,
          label: phaseProgress.label,
          status: phaseProgress.status,
          completedAt: phaseProgress.completedAt,
          sortOrder: phaseProgress.sortOrder,
        })
        .from(phaseProgress)
        .innerJoin(phases, eq(phases.id, phaseProgress.phaseId))
        .where(eq(phases.projectId, input.projectId))
        .orderBy(asc(phases.sortOrder), asc(phaseProgress.sortOrder));

      return rows;
    }),

  update: manage.input(PhaseProgressUpdate).mutation(async ({ ctx, input }) => {    const [joined] = await ctx.db
      .select({
        id: phaseProgress.id,
        projectId: phases.projectId,
      })
      .from(phaseProgress)
      .innerJoin(phases, eq(phases.id, phaseProgress.phaseId))
      .where(eq(phaseProgress.id, input.id))
      .limit(1);
    if (!joined || joined.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const completedAt = input.status === "COMPLETE" ? new Date() : null;
    const [row] = await ctx.db
      .update(phaseProgress)
      .set({
        status: input.status,
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(phaseProgress.id, input.id))
      .returning();
    return row!;
  }),
});
