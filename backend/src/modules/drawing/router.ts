import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { drawings } from "../../db/schema.js";
import { firmPayload } from "../../lib/firm.js";
import { enqueueJob } from "../../lib/redis.js";
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
      // Surface short-lived URLs only once the worker has produced them.
      const svgUrl = row.svgKey ? await presignedGet(row.svgKey).catch(() => null) : null;
      const issuePdfUrl = row.issuePdfKey
        ? await presignedGet(row.issuePdfKey).catch(() => null)
        : null;
      return { ...row, svgUrl, issuePdfUrl };
    }),

  /** Render a watermarked issue-set PDF of the drawing (for client/authority). */
  issuePdf: protectedProcedure
    .input(z.object({ id: z.string().uuid(), watermark: z.string().max(60).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(drawings).where(eq(drawings.id, input.id));
      if (!row?.svgKey) throw new TRPCError({ code: "BAD_REQUEST", message: "drawing not rendered" });
      await ctx.db
        .update(drawings)
        .set({ issuePdfStatus: "PENDING" })
        .where(eq(drawings.id, input.id));
      await enqueueJob("render_pdf", {
        target: "drawing",
        id: row.id,
        firm: await firmPayload(ctx.db),
        watermark: input.watermark || "ISSUED FOR APPROVAL",
      });
      return { ok: true };
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
