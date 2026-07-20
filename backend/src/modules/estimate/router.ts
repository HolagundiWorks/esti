import {
  EstimateCreate,
  EstimateImportFromMeasurementBook,
  EstimateItemUpsert,
  EstimateMeasurementUpsert,
  EstimateStatus,
  EstimateUpdateHeader,
  canTransitionEstimate,
  estimateLockedError,
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
 * Refuse to change the contents of an estimate that is no longer editable.
 *
 * `canTransitionEstimate` only ever governed the status field, so an APPROVED
 * estimate — a number already quoted to a client — could still have its items,
 * measurements, contingency or GST rewritten through the API. The read-only
 * treatment existed solely in the React component.
 */
async function assertEstimateEditable(db: DB, estimateId: string): Promise<void> {
  const [row] = await db
    .select({ status: estimates.status })
    .from(estimates)
    .where(eq(estimates.id, estimateId));
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Estimate not found" });
  const err = estimateLockedError(row.status as EstimateStatus);
  if (err) throw new TRPCError({ code: "PRECONDITION_FAILED", message: err });
}

/** Same guard, reached through an item id. */
async function assertEstimateEditableForItem(db: DB, estimateItemId: string): Promise<void> {
  const [item] = await db
    .select({ estimateId: estimateItems.estimateId })
    .from(estimateItems)
    .where(eq(estimateItems.id, estimateItemId));
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Estimate item not found" });
  await assertEstimateEditable(db, item.estimateId);
}

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
      // Scoped to this project's estimates. Without the WHERE this summed
      // every estimate item in the database on every call and then threw all
      // but a handful away — a sequential scan that grows with the whole firm.
      const ids = rows.map((e) => e.id);
      const totalsByEstimate = ids.length
        ? await ctx.db
            .select({
              estimateId: estimateItems.estimateId,
              subtotal: sql<number>`coalesce(sum(${estimateItems.amountPaise}), 0)::bigint`,
            })
            .from(estimateItems)
            .where(inArray(estimateItems.estimateId, ids))
            .groupBy(estimateItems.estimateId)
        : [];
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
    const lockErr = estimateLockedError(before.status as EstimateStatus);
    if (lockErr) throw new TRPCError({ code: "PRECONDITION_FAILED", message: lockErr });
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
    // Contingency and GST move the contract sum, so header edits are audited —
    // previously `before` was loaded here and then discarded, leaving no trail.
    await writeAudit(ctx.db, {
      entity: "estimate",
      entityId: input.id,
      action: "UPDATE_HEADER",
      actorId: ctx.user.id,
      before: { contingencyPct: before.contingencyPct, gstPct: before.gstPct, title: before.title },
      after: { contingencyPct: row!.contingencyPct, gstPct: row!.gstPct, title: row!.title },
    });
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
    await assertEstimateEditable(ctx.db, input.estimateId);
    const amountPaise = estimateItemAmountPaise(input.ratePaise, input.quantity);
    if (input.id) {
      const [existing] = await ctx.db
        .select({ unit: estimateItems.unit })
        .from(estimateItems)
        .where(and(eq(estimateItems.id, input.id), eq(estimateItems.estimateId, input.estimateId)));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const lines = await ctx.db
        .select({ id: estimateMeasurements.id })
        .from(estimateMeasurements)
        .where(eq(estimateMeasurements.estimateItemId, input.id));
      const measured = lines.length > 0;

      /**
       * A measured item's quantity belongs to its lines. Writing the caller's
       * `quantity` here let an edit that only meant to fix a description carry
       * a stale figure and replace a measured 56.100 with 1.
       */
      const [row] = await ctx.db
        .update(estimateItems)
        .set({
          rateBookItemId: input.rateBookItemId ?? null,
          itemCode: input.itemCode ?? null,
          description: input.description,
          unit: input.unit,
          ...(measured ? {} : { quantity: input.quantity, amountPaise }),
          ratePaise: input.ratePaise,
          linkedItemId: input.linkedItemId ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(estimateItems.id, input.id), eq(estimateItems.estimateId, input.estimateId)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      if (measured) {
        /**
         * Line quantities are derived from the item's unit at write time
         * (shapeForUnit picks L / L*B / L*B*D), so changing the unit leaves
         * every stored line derived under the old shape — an sqm item switched
         * to cum kept 1 x 10 x 5 = 50 and printed 50 cum. Re-derive each line
         * against the new unit, then recompute the item from them.
         */
        if (existing.unit !== input.unit) {
          const shape = shapeForUnit(input.unit);
          const full = await ctx.db
            .select()
            .from(estimateMeasurements)
            .where(eq(estimateMeasurements.estimateItemId, input.id));
          for (const l of full) {
            // Imported lines carry the measurement book's figure verbatim; the
            // book owns their unit, so they are left alone (and the import
            // guard refuses a mismatched unit in the first place).
            if (l.sourceMeasurementRowId) continue;
            await ctx.db
              .update(estimateMeasurements)
              .set({ quantity: measurementQuantity(shape, l.nos, l.length, l.breadth, l.depth, 0) })
              .where(eq(estimateMeasurements.id, l.id));
          }
        }
        await recomputeItemFromMeasurements(ctx.db, input.id);
        const [fresh] = await ctx.db
          .select()
          .from(estimateItems)
          .where(eq(estimateItems.id, input.id));
        return fresh!;
      }
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
    await assertEstimateEditableForItem(ctx.db, input.id);
    const [deleted] = await ctx.db
      .delete(estimateItems)
      .where(eq(estimateItems.id, input.id))
      .returning();
    if (deleted) {
      await writeAudit(ctx.db, {
        entity: "estimate",
        entityId: deleted.estimateId,
        action: "REMOVE_ITEM",
        actorId: ctx.user.id,
        before: {
          description: deleted.description,
          quantity: deleted.quantity,
          amountPaise: deleted.amountPaise,
        },
      });
    }
    return { ok: true };
  }),

  upsertMeasurement: manage.input(EstimateMeasurementUpsert).mutation(async ({ ctx, input }) => {
    await assertEstimateEditableForItem(ctx.db, input.estimateItemId);
    const [item] = await ctx.db.select().from(estimateItems).where(eq(estimateItems.id, input.estimateItemId));
    if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Estimate item not found" });
    const shape = shapeForUnit(item.unit);
    const quantity = measurementQuantity(shape, input.nos, input.length, input.breadth, input.depth, input.directQuantity);

    if (input.id) {
      /**
       * Imported lines are derived data: their quantity is the measurement
       * book's figure, and their dimensions do not necessarily reconstruct it —
       * a polygon AREA row carries the enclosed area with no L or B at all.
       * Re-deriving from dimensions here would silently rewrite 45.200 sqm to
       * 0 on a save that changed nothing. Send them back to the book instead,
       * where the measurement actually lives.
       */
      const [existing] = await ctx.db
        .select({ sourceRow: estimateMeasurements.sourceMeasurementRowId })
        .from(estimateMeasurements)
        .where(eq(estimateMeasurements.id, input.id));
      if (existing?.sourceRow) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This line came from the measurement book, so its quantity is maintained there. " +
            "Edit the measured row and send it to the estimate again, or remove this line to enter it by hand.",
        });
      }

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
      await assertEstimateEditableForItem(ctx.db, input.estimateItemId);
      // Scope the delete to the item the caller named, and recompute from the
      // row actually deleted. The two ids used to be independent: deleting
      // item A's line while naming item B left A over-billing (never
      // recomputed) and zeroed B's hand-typed quantity, in one call.
      const [deleted] = await ctx.db
        .delete(estimateMeasurements)
        .where(
          and(
            eq(estimateMeasurements.id, input.id),
            eq(estimateMeasurements.estimateItemId, input.estimateItemId),
          ),
        )
        .returning();
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Measurement line not found on that estimate item",
        });
      }
      await recomputeItemFromMeasurements(ctx.db, deleted.estimateItemId, {
        emptiedByDelete: true,
      });
      await writeAudit(ctx.db, {
        entity: "estimate_item",
        entityId: deleted.estimateItemId,
        action: "REMOVE_MEASUREMENT",
        actorId: ctx.user.id,
        before: { quantity: deleted.quantity, description: deleted.description },
      });
      return { ok: true };
    }),
});
