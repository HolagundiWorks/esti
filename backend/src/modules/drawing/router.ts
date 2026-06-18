import { ProjectListParams, CompanionDrawingSetScale, clampListLimit } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, or } from "drizzle-orm";
import { z } from "zod";
import { drawings } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { writeActivity } from "../../lib/activity.js";
import { assertCompanionTakeoff } from "../../lib/companion/writeGate.js";
import { firmPayload } from "../../lib/firm.js";
import { enqueueJob } from "../../lib/redis.js";
import { getObjectText, presignedGet } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const drawingRouter = router({
  listByProject: protectedProcedure
    .input(ProjectListParams.extend({ currentOnly: z.boolean().default(true) }))
    .query(async ({ ctx, input }) => {
      const where = input.currentOnly
        ? and(eq(drawings.projectId, input.projectId), eq(drawings.isCurrent, true))
        : eq(drawings.projectId, input.projectId);
      return ctx.db
        .select()
        .from(drawings)
        .where(where)
        .orderBy(desc(drawings.createdAt))
        .limit(clampListLimit(input.limit));
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
      await writeActivity(ctx.db, {
        projectId: row.projectId,
        objectType: "drawing",
        objectId: row.id,
        eventType: "drawing.issue_pdf_requested",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `Issue PDF requested for drawing ${row.ref}`,
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

  /** Drawing scale calibration — ESTICAD companion only (TOSCALE). */
  setScale: protectedProcedure.input(CompanionDrawingSetScale).mutation(async ({ ctx, input }) => {
    if (!ctx.deviceSessionId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Drawing scale calibration is only available in ESTICAD. Open the drawing with Open in ESTICAD.",
      });
    }
    await assertCompanionTakeoff(ctx);

    const [before] = await ctx.db.select().from(drawings).where(eq(drawings.id, input.drawingId));
    if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Drawing not found" });

    const [row] = await ctx.db
      .update(drawings)
      .set({
        scaleUnit: input.scaleUnit,
        scaleUnitsPerVb: input.scaleFactor,
        updatedAt: new Date(),
      })
      .where(eq(drawings.id, input.drawingId))
      .returning();

    await writeAudit(ctx.db, {
      entity: "drawing",
      entityId: input.drawingId,
      action: "SET_SCALE_COMPANION",
      actorId: ctx.user.id,
      before: { scaleUnit: before.scaleUnit, scaleUnitsPerVb: before.scaleUnitsPerVb },
      after: { scaleUnit: row!.scaleUnit, scaleUnitsPerVb: row!.scaleUnitsPerVb },
    });

    return row!;
  }),

  /** All revised drawings (rev > 1) for a project — general revision feed. */
  recentRevisions: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(drawings)
        .where(and(eq(drawings.projectId, input.projectId), gt(drawings.revNo, 1)))
        .orderBy(desc(drawings.createdAt))
        .limit(20);
    }),
});
