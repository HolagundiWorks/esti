import {
  EstimateCreate,
  EstimateImportFromMeasurementBook,
  EstimateItemUpsert,
  EstimateMeasurementUpsert,
  EstimateStatus,
  EstimateUpdateHeader,
  canTransitionEstimate,
  computeEstimateTotals,
  computeEstimateTotalsFromSubtotal,
  estimateItemAmountPaise,
  measurementImportError,
  measurementQuantity,
  shapeForUnit,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import {
  estimateItems,
  estimateMeasurements,
  estimates,
  measurementBooks,
  measurementRows,
  rateBooks,
} from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { requireDeletableStatus } from "../../lib/retention.js";
import { capabilityProcedure, router } from "../../trpc/trpc.js";

// Estimates carry firm costing (rates, contingency) — same gate as fee proposals.
const manage = capabilityProcedure("fees:manage");

/**
 * Sums an item's measurement lines and updates its quantity/amount to match.
 *
 * `emptiedByDelete` tells us a line was just removed, so zero lines means the
 * measured quantity is genuinely zero — as opposed to an item that never had
 * lines, whose hand-typed quantity must be left alone.
 */
async function recomputeItemFromMeasurements(
  db: DB,
  estimateItemId: string,
  opts?: { emptiedByDelete?: boolean },
): Promise<void> {
  const [item] = await db.select().from(estimateItems).where(eq(estimateItems.id, estimateItemId));
  if (!item) return;
  const lines = await db
    .select({ quantity: estimateMeasurements.quantity })
    .from(estimateMeasurements)
    .where(eq(estimateMeasurements.estimateItemId, estimateItemId));
  // No lines left. An item that never had any keeps its manually-typed
  // quantity; an item whose last line was just deleted must fall to zero, or
  // deleting a wrongly-measured wall leaves its money in the estimate. The
  // caller knows which case it is, so it says so rather than us guessing.
  if (lines.length === 0) {
    if (!opts?.emptiedByDelete) return;
    await db
      .update(estimateItems)
      .set({ quantity: 0, amountPaise: 0, updatedAt: new Date() })
      .where(eq(estimateItems.id, estimateItemId));
    return;
  }
  // Round the total to 3 dp, the same precision the measurement book derives at.
  // Without this, summing 3-dp line quantities surfaces float drift on the item
  // (e.g. 25.2 + 18.6 + 12.3 -> 56.099999999999994) and in the printed abstract.
  const quantity = Math.round(lines.reduce((s, l) => s + l.quantity, 0) * 1000) / 1000;
  const amountPaise = estimateItemAmountPaise(item.ratePaise, quantity);
  await db
    .update(estimateItems)
    .set({ quantity, amountPaise, updatedAt: new Date() })
    .where(eq(estimateItems.id, estimateItemId));
}

export const estimateRouter = router({
  listByProject: manage
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(estimates)
        .where(eq(estimates.projectId, input.projectId))
        .orderBy(desc(estimates.createdAt));
      const totalsByEstimate = await ctx.db
        .select({ estimateId: estimateItems.estimateId, subtotal: sql<number>`coalesce(sum(${estimateItems.amountPaise}), 0)::bigint` })
        .from(estimateItems)
        .groupBy(estimateItems.estimateId);
      const subtotalOf = new Map(totalsByEstimate.map((t) => [t.estimateId, Number(t.subtotal)]));
      return rows.map((e) => {
        const t = computeEstimateTotalsFromSubtotal(subtotalOf.get(e.id) ?? 0, e.contingencyPct, e.gstPct);
        return { ...e, grandTotalPaise: t.grandTotalPaise };
      });
    }),

  byId: manage.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [estimate] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id));
    if (!estimate) return null;
    const items = await ctx.db
      .select()
      .from(estimateItems)
      .where(eq(estimateItems.estimateId, input.id))
      .orderBy(asc(estimateItems.sortOrder), asc(estimateItems.createdAt));
    const measurements =
      items.length === 0
        ? []
        : await ctx.db
            .select()
            .from(estimateMeasurements)
            .where(inArray(estimateMeasurements.estimateItemId, items.map((i) => i.id)))
            .orderBy(asc(estimateMeasurements.sortOrder), asc(estimateMeasurements.createdAt));
    const totals = computeEstimateTotals(
      items.map((i) => ({ ratePaise: i.ratePaise, quantity: i.quantity })),
      estimate.contingencyPct,
      estimate.gstPct,
    );
    return {
      ...estimate,
      items: items.map((i) => ({
        ...i,
        measurements: measurements.filter((m) => m.estimateItemId === i.id),
        shape: shapeForUnit(i.unit),
      })),
      totals,
    };
  }),

  create: manage.input(EstimateCreate).mutation(async ({ ctx, input }) => {
    const [book] = await ctx.db.select().from(rateBooks).where(eq(rateBooks.id, input.rateBookId));
    if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Rate book not found" });
    const { ref } = await nextRef(ctx.db, "estimate", "EST");
    const [row] = await ctx.db
      .insert(estimates)
      .values({
        ref,
        projectId: input.projectId,
        rateBookId: input.rateBookId,
        title: input.title,
        date: input.date ?? null,
        contingencyPct: input.contingencyPct,
        gstPct: input.gstPct,
        notes: input.notes ?? null,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "estimate", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    await writeActivity(ctx.db, {
      projectId: input.projectId,
      objectType: "estimate",
      objectId: row!.id,
      eventType: "estimate.created",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `Estimate ${ref} created`,
    });
    return row!;
  }),

  updateHeader: manage.input(EstimateUpdateHeader).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .update(estimates)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.date !== undefined ? { date: input.date } : {}),
        ...(input.contingencyPct !== undefined ? { contingencyPct: input.contingencyPct } : {}),
        ...(input.gstPct !== undefined ? { gstPct: input.gstPct } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(estimates.id, input.id))
      .returning();
    return row!;
  }),

  setStatus: manage
    .input(z.object({ id: z.string().uuid(), status: EstimateStatus }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canTransitionEstimate(before.status as EstimateStatus, input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Estimate cannot move from ${before.status} to ${input.status}.`,
        });
      }
      const [row] = await ctx.db
        .update(estimates)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(estimates.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "estimate",
        entityId: input.id,
        action: "STATUS_UPDATE",
        actorId: ctx.user.id,
        before: { status: before.status },
        after: { status: input.status },
      });
      return row!;
    }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    requireDeletableStatus(before.status, ["DRAFT", "CANCELLED"], "Estimate");
    await ctx.db.delete(estimates).where(eq(estimates.id, input.id));
    await writeAudit(ctx.db, { entity: "estimate", entityId: input.id, action: "DELETE", actorId: ctx.user.id, before });
    return { ok: true };
  }),

  upsertItem: manage.input(EstimateItemUpsert).mutation(async ({ ctx, input }) => {
    const amountPaise = estimateItemAmountPaise(input.ratePaise, input.quantity);
    if (input.id) {
      const [row] = await ctx.db
        .update(estimateItems)
        .set({
          rateBookItemId: input.rateBookItemId ?? null,
          itemCode: input.itemCode ?? null,
          description: input.description,
          unit: input.unit,
          quantity: input.quantity,
          ratePaise: input.ratePaise,
          amountPaise,
          linkedItemId: input.linkedItemId ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(estimateItems.id, input.id), eq(estimateItems.estimateId, input.estimateId)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }
    const maxSort = await ctx.db
      .select({ n: estimateItems.sortOrder })
      .from(estimateItems)
      .where(eq(estimateItems.estimateId, input.estimateId))
      .orderBy(desc(estimateItems.sortOrder))
      .limit(1);
    const [row] = await ctx.db
      .insert(estimateItems)
      .values({
        estimateId: input.estimateId,
        sortOrder: (maxSort[0]?.n ?? 0) + 10,
        rateBookItemId: input.rateBookItemId ?? null,
        itemCode: input.itemCode ?? null,
        description: input.description,
        unit: input.unit,
        quantity: input.quantity,
        ratePaise: input.ratePaise,
        amountPaise,
        linkedItemId: input.linkedItemId ?? null,
      })
      .returning();
    return row!;
  }),

  removeItem: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(estimateItems).where(eq(estimateItems.id, input.id));
    return { ok: true };
  }),

  upsertMeasurement: manage.input(EstimateMeasurementUpsert).mutation(async ({ ctx, input }) => {
    const [item] = await ctx.db.select().from(estimateItems).where(eq(estimateItems.id, input.estimateItemId));
    if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Estimate item not found" });
    const shape = shapeForUnit(item.unit);
    const quantity = measurementQuantity(shape, input.nos, input.length, input.breadth, input.depth, input.directQuantity);

    if (input.id) {
      await ctx.db
        .update(estimateMeasurements)
        .set({
          description: input.description ?? null,
          nos: input.nos,
          length: input.length,
          breadth: input.breadth,
          depth: input.depth,
          quantity,
        })
        .where(eq(estimateMeasurements.id, input.id));
    } else {
      const maxSort = await ctx.db
        .select({ n: estimateMeasurements.sortOrder })
        .from(estimateMeasurements)
        .where(eq(estimateMeasurements.estimateItemId, input.estimateItemId))
        .orderBy(desc(estimateMeasurements.sortOrder))
        .limit(1);
      await ctx.db.insert(estimateMeasurements).values({
        estimateItemId: input.estimateItemId,
        sortOrder: (maxSort[0]?.n ?? 0) + 10,
        description: input.description ?? null,
        nos: input.nos,
        length: input.length,
        breadth: input.breadth,
        depth: input.depth,
        quantity,
      });
    }
    await recomputeItemFromMeasurements(ctx.db, input.estimateItemId);
    return { ok: true };
  }),

  /**
   * Browser takeoff → estimate (replaces the ESTICAD import path, 2026-07-19).
   *
   * Carries measurement-book rows onto an estimate item as measurement lines.
   * The book's derived quantity is authoritative and copied across as-is — it is
   * what the QS measured and signed off — so this never re-derives through the
   * estimate's shape model. Dimensions are written in metres for a readable
   * abstract sheet, and the row's unit must describe the same kind of measure as
   * the item's unit or the import is refused (see measurementImportError).
   *
   * Idempotent per (item, row): re-importing updates the existing line.
   */
  importFromMeasurementBook: manage
    .input(EstimateImportFromMeasurementBook)
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(estimateItems)
        .where(eq(estimateItems.id, input.estimateItemId));
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Estimate item not found" });

      // The item's estimate and the rows' books must belong to the same
      // project — otherwise one project's measured quantities can be priced
      // into another's estimate, which the audit log would record as legitimate.
      const [estimate] = await ctx.db
        .select({ projectId: estimates.projectId })
        .from(estimates)
        .where(eq(estimates.id, item.estimateId));
      if (!estimate) throw new TRPCError({ code: "NOT_FOUND", message: "Estimate not found" });

      const rows = await ctx.db
        .select({
          id: measurementRows.id,
          particulars: measurementRows.particulars,
          lengthMm: measurementRows.lengthMm,
          breadthMm: measurementRows.breadthMm,
          heightMm: measurementRows.heightMm,
          quantity: measurementRows.quantity,
          uom: measurementRows.uom,
          projectId: measurementBooks.projectId,
        })
        .from(measurementRows)
        .innerJoin(measurementBooks, eq(measurementBooks.id, measurementRows.bookId))
        .where(inArray(measurementRows.id, input.measurementRowIds));
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No measurement rows found" });
      }

      // Validate the whole batch first — a partial import would leave a
      // silently wrong quantity on the item.
      for (const r of rows) {
        if (r.projectId !== estimate.projectId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `"${r.particulars}" belongs to a different project than this estimate.`,
          });
        }
        const err = measurementImportError(r.uom, item.unit);
        if (err) throw new TRPCError({ code: "BAD_REQUEST", message: `"${r.particulars}": ${err}` });
      }

      // One transaction: N line writes plus the item recompute have to land
      // together, or the sheet shows lines the item's quantity ignores.
      const { created, updated } = await ctx.db.transaction(async (tx) => {
        const existing = await tx
          .select({ rowId: estimateMeasurements.sourceMeasurementRowId })
          .from(estimateMeasurements)
          .where(eq(estimateMeasurements.estimateItemId, input.estimateItemId));
        const alreadyLinked = new Set(existing.map((e) => e.rowId).filter(Boolean) as string[]);

        const maxSort = await tx
          .select({ n: estimateMeasurements.sortOrder })
          .from(estimateMeasurements)
          .where(eq(estimateMeasurements.estimateItemId, input.estimateItemId))
          .orderBy(desc(estimateMeasurements.sortOrder))
          .limit(1);
        let sort = (maxSort[0]?.n ?? 0) + 10;

        let c = 0;
        let u = 0;
        for (const r of rows) {
          // mm → m for display; quantity itself comes from the book unchanged.
          const line = {
            description: r.particulars,
            nos: 1,
            length: (r.lengthMm ?? 0) / 1000,
            breadth: (r.breadthMm ?? 0) / 1000,
            depth: (r.heightMm ?? 0) / 1000,
            quantity: r.quantity,
          };
          if (alreadyLinked.has(r.id)) u += 1;
          else c += 1;
          // Upsert on the (item, source row) unique index rather than
          // read-then-write, so two concurrent imports cannot collide.
          await tx
            .insert(estimateMeasurements)
            .values({
              ...line,
              estimateItemId: input.estimateItemId,
              sortOrder: sort,
              sourceMeasurementRowId: r.id,
            })
            .onConflictDoUpdate({
              target: [
                estimateMeasurements.estimateItemId,
                estimateMeasurements.sourceMeasurementRowId,
              ],
              // The unique index is partial (…WHERE source_measurement_row_id
              // IS NOT NULL), so Postgres only infers it as the arbiter when
              // the predicate is repeated here.
              targetWhere: isNotNull(estimateMeasurements.sourceMeasurementRowId),
              set: line,
            });
          sort += 10;
        }

        await recomputeItemFromMeasurements(tx, input.estimateItemId);
        return { created: c, updated: u };
      });

      await writeAudit(ctx.db, {
        entity: "estimate_item",
        entityId: input.estimateItemId,
        action: "IMPORT_MEASUREMENTS",
        actorId: ctx.user.id,
        after: { created, updated, rowIds: rows.map((r) => r.id) },
      });
      return { ok: true as const, created, updated };
    }),

  removeMeasurement: manage
    .input(z.object({ id: z.string().uuid(), estimateItemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(estimateMeasurements).where(eq(estimateMeasurements.id, input.id));
      await recomputeItemFromMeasurements(ctx.db, input.estimateItemId, { emptiedByDelete: true });
      return { ok: true };
    }),
});
