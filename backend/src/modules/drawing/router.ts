import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { drawings } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { enqueueJob } from "../../lib/redis.js";
import { getObjectText, presignedGet } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const drawingRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), currentOnly: z.boolean().default(true) }))
    .query(async ({ ctx, input }) => {
      const where = input.currentOnly
        ? and(eq(drawings.projectId, input.projectId), eq(drawings.isCurrent, true))
        : eq(drawings.projectId, input.projectId);
      return ctx.db.select().from(drawings).where(where).orderBy(desc(drawings.createdAt));
    }),

  /** All revisions of a drawing (pass any revision's id), oldest first. */
  versions: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [seed] = await ctx.db.select().from(drawings).where(eq(drawings.id, input.id));
      if (!seed) return [];
      const root = seed.rootId ?? seed.id;
      return ctx.db
        .select()
        .from(drawings)
        .where(or(eq(drawings.id, root), eq(drawings.rootId, root)))
        .orderBy(asc(drawings.revNo));
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
      }, ctx.requestId);
      await writeAudit(ctx.db, {
        entity: "drawing",
        entityId: input.id,
        action: "ISSUE_PDF_REQUEST",
        actorId: ctx.user.id,
        before: { issuePdfStatus: row.issuePdfStatus },
        after: {
          issuePdfStatus: "PENDING",
          watermark: input.watermark || "ISSUED FOR APPROVAL",
        },
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
      const [before] = await ctx.db.select().from(drawings).where(eq(drawings.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      const [row] = await ctx.db
        .update(drawings)
        .set({ scaleUnitsPerVb: input.scaleUnitsPerVb, scaleUnit: input.scaleUnit })
        .where(eq(drawings.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "drawing",
        entityId: input.id,
        action: "SCALE_UPDATE",
        actorId: ctx.user.id,
        before: { scaleUnitsPerVb: before.scaleUnitsPerVb, scaleUnit: before.scaleUnit },
        after: { scaleUnitsPerVb: row!.scaleUnitsPerVb, scaleUnit: row!.scaleUnit },
      });
      return row;
    }),
});
