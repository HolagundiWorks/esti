/**
 * Estimates (Estimation OS rebuild, phase 1) — the keyboard-first measurement
 * sheet. Backend semantics mirror the sheet's keyboard grammar:
 *
 *   Space (select element) + single Enter → `openLine` creates the LINE row
 *     (the measurement sheet opening IS the line's birth)
 *   single Enter on the last parameter row → `addMeasurement` inserts one row
 *     into the measurements table (a separate table, one row per column)
 *   double Enter → `closeLine`: a line that recorded nothing is pruned
 *     (skip semantics); otherwise it stays with its measurement rows
 *
 * Elements come from the Knowledge Bank item library; a main line's mapped
 * child items (esti_kb_item_dependency) drive the dependency queue.
 * Quantities are always computed from measurement rows — never stored.
 *
 * Access: staff-wide. Every procedure uses `protectedProcedure`, which admits
 * the full staff ladder (Owner/Partner/Senior/Associate — and read-only Viewers
 * for queries) while rejecting CLIENT / CONTRACTOR portal users and external
 * CONSULTANT collaborators. Estimates carry internal costing, so keep this tier:
 * do not drop to `authedProcedure`/`publicProcedure`.
 */
import {
  EstimateLineCreate,
  EstimateMeasurementAdd,
  MeasurementDerivation,
  deriveColumn,
  derivationChildDims,
  dimensionCount,
  lineQuantity,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import {
  estimateLines,
  estimateMeasurements,
  estimates,
  kbItemDependencies,
  kbItems,
} from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { getProjectById } from "../projectoffice/queries.js";

const childItem = alias(kbItems, "child_item");

async function requireEstimate(db: Parameters<typeof getProjectById>[0], id: string) {
  const [row] = await db.select().from(estimates).where(eq(estimates.id, id)).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Estimate not found" });
  return row;
}

async function requireLine(db: Parameters<typeof getProjectById>[0], id: string) {
  const [row] = await db.select().from(estimateLines).where(eq(estimateLines.id, id)).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Estimate line not found" });
  return row;
}

const touch = (db: Parameters<typeof getProjectById>[0], estimateId: string) =>
  db.update(estimates).set({ updatedAt: new Date() }).where(eq(estimates.id, estimateId));

/** Row (nullable dims) → contract measurement (undefined dims). */
const toMeasurement = (m: { nos: number; l: number | null; b: number | null; h: number | null }) => ({
  nos: m.nos,
  l: m.l ?? undefined,
  b: m.b ?? undefined,
  h: m.h ?? undefined,
});

/** A scalar quantity (RATIO derivation) expressed as a measurement whose
 *  measurementQty equals the quantity, for the child unit's dimensionality. */
function scalarMeasurement(qty: number, unit: string) {
  const dims = dimensionCount(unit);
  return {
    nos: Math.round(qty * 1000) / 1000,
    l: dims >= 1 ? 1 : null,
    b: dims >= 2 ? 1 : null,
    h: dims >= 3 ? 1 : null,
  };
}

export const estimatesRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(estimates)
        .where(eq(estimates.projectId, input.projectId))
        .orderBy(asc(estimates.createdAt)),
    ),

  create: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), title: z.string().trim().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(ctx.db, input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const [row] = await ctx.db
        .insert(estimates)
        .values({ projectId: input.projectId, title: input.title })
        .returning();
      return row!;
    }),

  /** Estimate + lines + their measurement rows (grouped per line, in order). */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const estimate = await requireEstimate(ctx.db, input.id);
      const lines = await ctx.db
        .select()
        .from(estimateLines)
        .where(eq(estimateLines.estimateId, input.id))
        .orderBy(asc(estimateLines.sortOrder), asc(estimateLines.createdAt));
      const lineIds = lines.map((l) => l.id);
      const ms = lineIds.length
        ? await ctx.db
            .select()
            .from(estimateMeasurements)
            .where(inArray(estimateMeasurements.lineId, lineIds))
            .orderBy(asc(estimateMeasurements.sortOrder), asc(estimateMeasurements.createdAt))
        : [];
      const byLine = new Map<string, typeof ms>();
      for (const m of ms) {
        const list = byLine.get(m.lineId) ?? [];
        list.push(m);
        byLine.set(m.lineId, list);
      }
      return {
        ...estimate,
        lines: lines.map((l) => ({ ...l, measurements: byLine.get(l.id) ?? [] })),
      };
    }),

  /** "/" element search — active KB items, substring match, capped. */
  searchElements: protectedProcedure
    .input(z.object({ q: z.string().trim().max(120) }))
    .query(async ({ ctx, input }) => {
      const base = ctx.db
        .select({
          id: kbItems.id,
          name: kbItems.name,
          category: kbItems.category,
          unit: kbItems.unit,
        })
        .from(kbItems);
      if (!input.q) {
        return base
          .where(eq(kbItems.active, true))
          .orderBy(asc(kbItems.category), asc(kbItems.name))
          .limit(12);
      }
      return base
        .where(and(eq(kbItems.active, true), ilike(kbItems.name, `%${input.q}%`)))
        .orderBy(asc(kbItems.name))
        .limit(12);
    }),

  /** Mapped child items of an element — the sheet's dependency queue. */
  elementChildren: protectedProcedure
    .input(z.object({ kbItemId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select({
          kbItemId: kbItemDependencies.childItemId,
          name: childItem.name,
          unit: childItem.unit,
          ratio: kbItemDependencies.ratio,
          dependencyType: kbItemDependencies.dependencyType,
          derivation: kbItemDependencies.derivation,
        })
        .from(kbItemDependencies)
        .innerJoin(childItem, eq(kbItemDependencies.childItemId, childItem.id))
        .where(eq(kbItemDependencies.parentItemId, input.kbItemId))
        .orderBy(asc(childItem.name)),
    ),

  /** Single Enter after selecting an element — the measurement sheet opens,
   *  which in the backend is the line row being created. */
  openLine: protectedProcedure.input(EstimateLineCreate).mutation(async ({ ctx, input }) => {
    await requireEstimate(ctx.db, input.estimateId);
    if (input.parentLineId) {
      const parent = await requireLine(ctx.db, input.parentLineId);
      if (parent.estimateId !== input.estimateId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Parent line is in another estimate" });
      }
      if (parent.parentLineId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Dependencies nest only one level" });
      }
    }
    const [agg] = await ctx.db
      .select({ next: sql<number>`coalesce(max(${estimateLines.sortOrder}), 0) + 1` })
      .from(estimateLines)
      .where(eq(estimateLines.estimateId, input.estimateId));
    const [row] = await ctx.db
      .insert(estimateLines)
      .values({
        estimateId: input.estimateId,
        parentLineId: input.parentLineId ?? null,
        kbItemId: input.kbItemId ?? null,
        sortOrder: agg?.next ?? 1,
        code: input.code ?? null,
        description: input.description,
        unit: input.unit,
      })
      .returning();
    await touch(ctx.db, input.estimateId);
    return row!;
  }),

  /** Single Enter on the last parameter row — one recorded measurement column. */
  addMeasurement: protectedProcedure
    .input(EstimateMeasurementAdd)
    .mutation(async ({ ctx, input }) => {
      const line = await requireLine(ctx.db, input.lineId);
      const [agg] = await ctx.db
        .select({ next: sql<number>`coalesce(max(${estimateMeasurements.sortOrder}), 0) + 1` })
        .from(estimateMeasurements)
        .where(eq(estimateMeasurements.lineId, input.lineId));
      const [row] = await ctx.db
        .insert(estimateMeasurements)
        .values({
          lineId: input.lineId,
          sortOrder: agg?.next ?? 1,
          label: input.label ?? null,
          nos: input.nos,
          l: input.l ?? null,
          b: input.b ?? null,
          h: input.h ?? null,
        })
        .returning();
      await touch(ctx.db, line.estimateId);
      return row!;
    }),

  removeMeasurement: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [owner] = await ctx.db
        .select({ estimateId: estimateLines.estimateId })
        .from(estimateMeasurements)
        .innerJoin(estimateLines, eq(estimateMeasurements.lineId, estimateLines.id))
        .where(eq(estimateMeasurements.id, input.id))
        .limit(1);
      await ctx.db.delete(estimateMeasurements).where(eq(estimateMeasurements.id, input.id));
      if (owner) await touch(ctx.db, owner.estimateId);
      return { ok: true };
    }),

  /** Double Enter — close the sheet. An empty line (nothing recorded) is
   *  pruned so a skipped item/dependency leaves no residue. */
  closeLine: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const line = await requireLine(ctx.db, input.id);
      const [agg] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(estimateMeasurements)
        .where(eq(estimateMeasurements.lineId, line.id));
      const count = agg?.count ?? 0;
      if (count === 0) {
        // Cascades take any (impossible in practice) children with it.
        await ctx.db.delete(estimateLines).where(eq(estimateLines.parentLineId, line.id));
        await ctx.db.delete(estimateLines).where(eq(estimateLines.id, line.id));
        await touch(ctx.db, line.estimateId);
        return { kept: false as const };
      }
      await touch(ctx.db, line.estimateId);
      return { kept: true as const };
    }),

  /**
   * Auto-create the parent line's dependency children from its measurements.
   * For each KB dependency edge of the parent's item:
   *   - MANUAL            → returned in `manual` for the sheet to queue (hand entry)
   *   - RATIO             → one child column: parent line qty × edge.ratio
   *   - geometric (2-D)   → one derived child column per parent column (deriveColumn)
   * A geometric derivation whose child unit is not 2-D falls back to manual entry.
   * Idempotent: prior AUTO (derived) children of this parent are replaced; any
   * manual/overridden children are left untouched — so it doubles as re-derive.
   */
  deriveDependencies: protectedProcedure
    .input(z.object({ parentLineId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const parent = await requireLine(ctx.db, input.parentLineId);
      if (parent.parentLineId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only a main line derives dependencies." });
      }
      if (!parent.kbItemId) return { created: [] as string[], manual: [] };

      const parentMs = await ctx.db
        .select()
        .from(estimateMeasurements)
        .where(eq(estimateMeasurements.lineId, parent.id))
        .orderBy(asc(estimateMeasurements.sortOrder), asc(estimateMeasurements.createdAt));

      const edges = await ctx.db
        .select({
          childItemId: kbItemDependencies.childItemId,
          name: childItem.name,
          unit: childItem.unit,
          ratio: kbItemDependencies.ratio,
          derivation: kbItemDependencies.derivation,
        })
        .from(kbItemDependencies)
        .innerJoin(childItem, eq(kbItemDependencies.childItemId, childItem.id))
        .where(eq(kbItemDependencies.parentItemId, parent.kbItemId))
        .orderBy(asc(childItem.name));

      // Re-derivation: drop this parent's prior AUTO children (manual ones survive).
      await ctx.db
        .delete(estimateLines)
        .where(and(eq(estimateLines.parentLineId, parent.id), eq(estimateLines.derived, true)));

      const created: string[] = [];
      const manual: { kbItemId: string; name: string; unit: string }[] = [];

      for (const edge of edges) {
        const parsed = MeasurementDerivation.safeParse(edge.derivation);
        const derivation = parsed.success ? parsed.data : "MANUAL";

        let childCols: { nos: number; l: number | null; b: number | null; h: number | null }[] = [];
        if (derivation === "MANUAL") {
          manual.push({ kbItemId: edge.childItemId, name: edge.name, unit: edge.unit });
          continue;
        } else if (derivation === "RATIO") {
          const qty = lineQuantity(parentMs.map(toMeasurement), parent.unit) * edge.ratio;
          childCols = [scalarMeasurement(qty, edge.unit)];
        } else {
          // Geometric — needs a 2-D child unit; otherwise fall back to manual entry.
          if (derivationChildDims(derivation) !== dimensionCount(edge.unit)) {
            manual.push({ kbItemId: edge.childItemId, name: edge.name, unit: edge.unit });
            continue;
          }
          childCols = parentMs
            .map((m) => deriveColumn(derivation, toMeasurement(m)))
            .filter((c): c is NonNullable<typeof c> => c != null)
            .map((c) => ({ nos: c.nos, l: c.l ?? null, b: c.b ?? null, h: c.h ?? null }));
        }
        if (childCols.length === 0) continue;

        const [agg] = await ctx.db
          .select({ next: sql<number>`coalesce(max(${estimateLines.sortOrder}), 0) + 1` })
          .from(estimateLines)
          .where(eq(estimateLines.estimateId, parent.estimateId));
        const [line] = await ctx.db
          .insert(estimateLines)
          .values({
            estimateId: parent.estimateId,
            parentLineId: parent.id,
            kbItemId: edge.childItemId,
            sortOrder: agg?.next ?? 1,
            description: edge.name,
            unit: edge.unit,
            derived: true,
          })
          .returning();
        await ctx.db.insert(estimateMeasurements).values(
          childCols.map((c, i) => ({
            lineId: line!.id,
            sortOrder: i + 1,
            nos: c.nos,
            l: c.l,
            b: c.b,
            h: c.h,
          })),
        );
        created.push(line!.id);
      }

      await touch(ctx.db, parent.estimateId);
      return { created, manual };
    }),

  updateLine: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        description: z.string().trim().min(1).max(500).optional(),
        code: z.string().trim().max(40).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = {};
      if (input.description !== undefined) patch.description = input.description;
      if (input.code !== undefined) patch.code = input.code;
      if (Object.keys(patch).length === 0) return requireLine(ctx.db, input.id);
      const [row] = await ctx.db
        .update(estimateLines)
        .set(patch)
        .where(eq(estimateLines.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  /** Remove a line — dependency lines fall with their parent; measurement
   *  rows cascade via FK. */
  removeLine: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const line = await requireLine(ctx.db, input.id);
      await ctx.db.delete(estimateLines).where(eq(estimateLines.parentLineId, input.id));
      await ctx.db.delete(estimateLines).where(eq(estimateLines.id, input.id));
      await touch(ctx.db, line.estimateId);
      return { ok: true };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(estimates).where(eq(estimates.id, input.id));
      return { ok: true };
    }),
});
