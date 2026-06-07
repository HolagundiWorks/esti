import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { drawings } from "../../db/schema.js";
import { getObjectText, presignedGet } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const drawingRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(drawings)
        .where(eq(drawings.projectId, input.projectId))
        .orderBy(desc(drawings.createdAt));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(drawings).where(eq(drawings.id, input.id));
      if (!row) return null;
      // Surface a short-lived SVG URL only once the worker has produced one.
      const svgUrl = row.svgKey ? await presignedGet(row.svgKey).catch(() => null) : null;
      return { ...row, svgUrl };
    }),

  /** Proxy the rendered SVG text (same-origin via the API — avoids MinIO CORS). */
  svg: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(drawings).where(eq(drawings.id, input.id));
      if (!row?.svgKey) return null;
      const svg = await getObjectText(row.svgKey).catch(() => null);
      return svg ? { svg } : null;
    }),

  /** Persist viewer calibration (real units per SVG viewBox unit). */
  setScale: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        scaleUnitsPerVb: z.number().positive(),
        scaleUnit: z.string().min(1).max(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(drawings)
        .set({ scaleUnitsPerVb: input.scaleUnitsPerVb, scaleUnit: input.scaleUnit })
        .where(eq(drawings.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
});
