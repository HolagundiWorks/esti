import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { drawings, measurements } from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const measurementRouter = router({
  listByDrawing: protectedProcedure
    .input(z.object({ drawingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(measurements)
        .where(eq(measurements.drawingId, input.drawingId))
        .orderBy(desc(measurements.createdAt));
    }),

  /** Project takeoff rollup — all measured quantities across the drawings. */
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: measurements.id,
          label: measurements.label,
          kind: measurements.kind,
          realLength: measurements.realLength,
          unit: measurements.unit,
          drawingTitle: drawings.title,
          drawingRef: drawings.ref,
        })
        .from(measurements)
        .innerJoin(drawings, eq(drawings.id, measurements.drawingId))
        .where(eq(measurements.projectId, input.projectId))
        .orderBy(desc(measurements.createdAt));
    }),

  create: protectedProcedure
    .input(
      z.object({
        drawingId: z.string().uuid(),
        projectId: z.string().uuid(),
        label: z.string().min(1).max(120),
        // LINEAR stores length; AREA stores the polygon's area magnitude in the
        // same vb/real columns (unit then carries the squared label, e.g. m²).
        kind: z.enum(["LINEAR", "AREA"]).default("LINEAR"),
        vbLength: z.number().nonnegative(),
        realLength: z.number().nonnegative(),
        unit: z.string().min(1).max(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(measurements)
        .values({
          drawingId: input.drawingId,
          projectId: input.projectId,
          label: input.label,
          kind: input.kind,
          vbLength: input.vbLength,
          realLength: input.realLength,
          unit: input.unit,
        })
        .returning();
      return row!;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(measurements).where(eq(measurements.id, input.id));
      return { ok: true };
    }),
});
