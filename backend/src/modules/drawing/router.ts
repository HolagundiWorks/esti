import {
  ProjectListParams,
  DrawingSetReviewStatus,
  clampListLimit,
  drawingSourceKind,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, or } from "drizzle-orm";
import { z } from "zod";
import { drawings } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { writeActivity } from "../../lib/activity.js";
import { firmPayload } from "../../lib/firm.js";
import { enqueueJob } from "../../lib/redis.js";
import { getObjectBuffer, getObjectText, presignedGet } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const drawingRouter = router({
  listByProject: protectedProcedure
    .input(ProjectListParams.extend({ currentOnly: z.boolean().default(true) }))
    .query(async ({ ctx, input }) => {
      const where = input.currentOnly
        ? and(eq(drawings.projectId, input.projectId), eq(drawings.isCurrent, true))
        : eq(drawings.projectId, input.projectId);
      const rows = await ctx.db
        .select()
        .from(drawings)
        .where(where)
        .orderBy(desc(drawings.createdAt))
        .limit(clampListLimit(input.limit));
      return rows.map((row) => ({
        ...row,
        sourceKind: drawingSourceKind({ storageKey: row.storageKey, fileName: row.fileName }),
      }));
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
      return {
        ...row,
        sourceKind: drawingSourceKind({ storageKey: row.storageKey, fileName: row.fileName }),
        svgUrl,
        issuePdfUrl,
      };
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

  /**
   * QC / peer-review checkpoint (SOP-07/08) — advisory sign-off recorded before a
   * drawing goes out via issuePdf. Does not block issuePdf; ProjectDrawings surfaces
   * the status so it isn't skipped silently.
   */
  setReviewStatus: protectedProcedure
    .input(DrawingSetReviewStatus)
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(drawings).where(eq(drawings.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      const [row] = await ctx.db
        .update(drawings)
        .set({
          reviewStatus: input.reviewStatus,
          reviewedById: ctx.user.id,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote ?? null,
          updatedAt: new Date(),
        })
        .where(eq(drawings.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "drawing",
        entityId: input.id,
        action: "REVIEW_STATUS_UPDATE",
        actorId: ctx.user.id,
        before: { reviewStatus: before.reviewStatus },
        after: { reviewStatus: input.reviewStatus, reviewNote: input.reviewNote ?? null },
      });
      await writeActivity(ctx.db, {
        projectId: before.projectId,
        objectType: "drawing",
        objectId: input.id,
        eventType: "drawing.review_status_changed",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `Drawing ${before.ref} review → ${input.reviewStatus}`,
      });
      return row!;
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

  /**
   * Proxy the original uploaded PDF bytes as base64 (same-origin — avoids MinIO CORS).
   * Used by Plan Measurement PDF.js canvas. Only for PDF-sourced drawings.
   */
  pdf: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(drawings).where(eq(drawings.id, input.id));
      if (!row) return null;
      const kind = drawingSourceKind({ storageKey: row.storageKey, fileName: row.fileName });
      if (kind !== "PDF") return null;
      const buf = await getObjectBuffer(row.storageKey).catch(() => null);
      if (!buf) return null;
      return {
        base64: buf.toString("base64"),
        fileName: row.fileName,
        pageNo: 0,
      };
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
