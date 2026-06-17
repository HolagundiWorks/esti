import {
  EstimateBulkImport,
  EstimateCreate,
  EstimateItemCreate,
  EstimateItemUpdate,
  estimateItemAmount,
  formatINR,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { estimateItems, estimates } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { recordDocumentIssue } from "../../lib/documentIssue.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { recomputeEstimate } from "./recomputeEstimate.js";
import { importTakeoffToEstimate } from "./takeoffImport.js";

const recompute = recomputeEstimate;

export const estimateRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(estimates)
        .where(eq(estimates.projectId, input.projectId))
        .orderBy(desc(estimates.createdAt));
    }),

  items: protectedProcedure
    .input(z.object({ estimateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(estimateItems)
        .where(eq(estimateItems.estimateId, input.estimateId))
        .orderBy(asc(estimateItems.sortOrder), asc(estimateItems.createdAt));
    }),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id));
    if (!row) return null;
    const pdfUrl = row.pdfKey ? await presignedGet(row.pdfKey).catch(() => null) : null;
    return { ...row, pdfUrl };
  }),

  create: protectedProcedure.input(EstimateCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "estimate", "EST");
    const [row] = await ctx.db
      .insert(estimates)
      .values({
        ref,
        projectId: input.projectId,
        title: input.title,
        dsrVersionId: input.dsrVersionId ?? null,
        leadPct: input.leadPct,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "estimate",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  setLead: protectedProcedure
    .input(z.object({ id: z.string().uuid(), leadPct: z.number().min(0).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await assertDraft(ctx.db, input.id);
      const [before] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.update(estimates).set({ leadPct: input.leadPct }).where(eq(estimates.id, input.id));
      await recompute(ctx.db, input.id);
      const [after] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id));
      await writeAudit(ctx.db, {
        entity: "estimate",
        entityId: input.id,
        action: "LEAD_UPDATE",
        actorId: ctx.user.id,
        before: { leadPct: before.leadPct, totalPaise: before.totalPaise },
        after: { leadPct: after!.leadPct, totalPaise: after!.totalPaise },
      });
      return { ok: true };
    }),

  setDsrVersion: protectedProcedure
    .input(z.object({ id: z.string().uuid(), dsrVersionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertDraft(ctx.db, input.id);
      const [before] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .update(estimates)
        .set({ dsrVersionId: input.dsrVersionId })
        .where(eq(estimates.id, input.id));
      await writeAudit(ctx.db, {
        entity: "estimate",
        entityId: input.id,
        action: "DSR_LINK",
        actorId: ctx.user.id,
        before: { dsrVersionId: before.dsrVersionId },
        after: { dsrVersionId: input.dsrVersionId },
      });
      return { ok: true };
    }),

  /** Create a draft estimate from drawing takeoff, linked to a DSR version with rates applied. */
  createFromTakeoff: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        title: z.string().min(1).max(200),
        dsrVersionId: z.string().uuid(),
        leadPct: z.number().min(0).max(100).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { ref } = await nextRef(ctx.db, "estimate", "EST");
      const [row] = await ctx.db
        .insert(estimates)
        .values({
          ref,
          projectId: input.projectId,
          title: input.title,
          dsrVersionId: input.dsrVersionId,
          leadPct: input.leadPct,
          status: "DRAFT",
        })
        .returning();
      const imported = await importTakeoffToEstimate(ctx.db, {
        projectId: input.projectId,
        estimateId: row!.id,
        actorId: ctx.user.id,
      });
      await writeAudit(ctx.db, {
        entity: "estimate",
        entityId: row!.id,
        action: "CREATE_FROM_TAKEOFF",
        actorId: ctx.user.id,
        after: { ...row, ...imported },
      });
      const [final] = await ctx.db.select().from(estimates).where(eq(estimates.id, row!.id));
      return { estimate: final!, ...imported };
    }),

  addItem: protectedProcedure.input(EstimateItemCreate).mutation(async ({ ctx, input }) => {
    await assertDraft(ctx.db, input.estimateId);
    const amountPaise = estimateItemAmount(input.qty, input.ratePaise, input.itemLeadPct);
    const [row] = await ctx.db.insert(estimateItems).values({
      estimateId: input.estimateId,
      dsrItemId: input.dsrItemId ?? null,
      description: input.description,
      unit: input.unit,
      qty: input.qty,
      ratePaise: input.ratePaise,
      itemLeadPct: input.itemLeadPct,
      amountPaise,
    }).returning();
    await recompute(ctx.db, input.estimateId);
    await writeAudit(ctx.db, { entity: "estimateitem", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return { ok: true };
  }),

  updateItem: protectedProcedure.input(EstimateItemUpdate).mutation(async ({ ctx, input }) => {
    const [item] = await ctx.db.select().from(estimateItems).where(eq(estimateItems.id, input.id));
    if (!item) throw new TRPCError({ code: "NOT_FOUND" });
    await assertDraft(ctx.db, item.estimateId);
    const qty = input.qty ?? item.qty;
    const ratePaise = input.ratePaise ?? item.ratePaise;
    const itemLeadPct = input.itemLeadPct ?? item.itemLeadPct;
    const amountPaise = estimateItemAmount(qty, ratePaise, itemLeadPct);
    await ctx.db
      .update(estimateItems)
      .set({
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        qty,
        ratePaise,
        itemLeadPct,
        amountPaise,
      })
      .where(eq(estimateItems.id, input.id));
    await recompute(ctx.db, item.estimateId);
    return { ok: true };
  }),

  bulkImport: protectedProcedure.input(EstimateBulkImport).mutation(async ({ ctx, input }) => {
    await assertDraft(ctx.db, input.estimateId);
    for (const row of input.rows) {
      const amountPaise = estimateItemAmount(row.qty, row.ratePaise, row.itemLeadPct);
      await ctx.db.insert(estimateItems).values({
        estimateId: input.estimateId,
        dsrItemId: row.dsrItemId ?? null,
        description: row.description,
        unit: row.unit,
        qty: row.qty,
        ratePaise: row.ratePaise,
        itemLeadPct: row.itemLeadPct,
        amountPaise,
      });
    }
    await recompute(ctx.db, input.estimateId);
    await writeAudit(ctx.db, {
      entity: "estimate",
      entityId: input.estimateId,
      action: "BULK_IMPORT",
      actorId: ctx.user.id,
      after: { rowCount: input.rows.length },
    });
    return { ok: true, count: input.rows.length };
  }),

  revise: protectedProcedure
    .input(z.object({ id: z.string().uuid(), revisionNote: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status !== "APPROVED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved estimates can be revised" });
      }
      const versionNo = (row.versionNo ?? 1) + 1;
      await ctx.db
        .update(estimates)
        .set({
          versionNo,
          status: "DRAFT",
          revisionNote: input.revisionNote,
          pdfStatus: "NONE",
          pdfKey: null,
        })
        .where(eq(estimates.id, input.id));
      await recordDocumentIssue(ctx.db, {
        entityType: "ESTIMATE",
        entityId: row.id,
        projectId: row.projectId,
        ref: row.ref,
        versionNo,
        revisionNote: input.revisionNote,
        issuedById: ctx.user.id,
      });
      return { versionNo };
    }),

  generatePdf: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.update(estimates).set({ pdfStatus: "PENDING" }).where(eq(estimates.id, input.id));
    await enqueueJob(
      "render_pdf",
      { target: "estimate", id: row.id, firm: await firmPayload(ctx.db) },
      ctx.requestId,
    );
    return { ok: true };
  }),

  removeItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(estimateItems)
        .where(eq(estimateItems.id, input.id));
      if (!item) return { ok: true };
      await assertDraft(ctx.db, item.estimateId);
      await ctx.db.delete(estimateItems).where(eq(estimateItems.id, input.id));
      await recompute(ctx.db, item.estimateId);
      await writeAudit(ctx.db, { entity: "estimateitem", entityId: input.id, action: "DELETE", actorId: ctx.user.id, before: item });
      return { ok: true };
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(estimates)
        .set({ status: "APPROVED" })
        .where(eq(estimates.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "estimate",
        entityId: input.id,
        action: "APPROVE",
        actorId: ctx.user.id,
        after: { status: "APPROVED", totalPaise: row.totalPaise },
      });
      await recordDocumentIssue(ctx.db, {
        entityType: "ESTIMATE",
        entityId: row.id,
        projectId: row.projectId,
        ref: row.ref,
        versionNo: row.versionNo ?? 1,
        issuedById: ctx.user.id,
      });
      return row;
    }),

  exportRows: protectedProcedure
    .input(z.object({ estimateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [est] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.estimateId));
      if (!est) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await ctx.db
        .select()
        .from(estimateItems)
        .where(eq(estimateItems.estimateId, input.estimateId))
        .orderBy(asc(estimateItems.sortOrder), asc(estimateItems.createdAt));
      return {
        ref: est.ref,
        title: est.title,
        status: est.status,
        leadPct: est.leadPct,
        total: formatINR(est.totalPaise, { paise: false }),
        rows: items.map((i, idx) => ({
          "#": idx + 1,
          Description: i.description,
          Unit: i.unit,
          Qty: i.qty,
          "Rate (₹)": (i.ratePaise / 100).toFixed(2),
          "Lead %": i.itemLeadPct,
          "Amount (₹)": (i.amountPaise / 100).toFixed(2),
        })),
      };
    }),
});

async function assertDraft(db: DB, estimateId: string) {
  const [est] = await db.select({ status: estimates.status }).from(estimates).where(eq(estimates.id, estimateId));
  if (est && est.status !== "DRAFT") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Approved estimate is locked" });
  }
}
