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
  ESTIMATE_STATUS_LABEL,
  EstimateLineCreate,
  EstimateMeasurementAdd,
  EstimateStatus,
  MeasurementDerivation,
  can,
  deriveColumn,
  derivationChildDims,
  dimensionCount,
  lineQuantity,
  specRatePaise,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import {
  estimateLines,
  estimateMeasurements,
  estimates,
  kbItemDependencies,
  kbItems,
  kbLabor,
  kbMaterials,
  kbSpecLabor,
  kbSpecMaterials,
  kbSpecifications,
} from "../../db/schema.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";
import { getProjectById } from "../projectoffice/queries.js";
import { firmPayload } from "../../lib/firm.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet } from "../../lib/storage.js";

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

/** Content edits are allowed only while an estimate is IN_PROGRESS. FOR_REVIEW
 *  and APPROVED are locked — approved is revised by cloning. */
async function assertEditable(db: Parameters<typeof getProjectById>[0], estimateId: string) {
  const [row] = await db
    .select({ status: estimates.status })
    .from(estimates)
    .where(eq(estimates.id, estimateId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Estimate not found" });
  if (row.status !== "IN_PROGRESS") {
    const parsed = EstimateStatus.safeParse(row.status);
    const label = parsed.success ? ESTIMATE_STATUS_LABEL[parsed.data] : row.status;
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `This estimate is ${label} and locked; only in-progress estimates can be edited.`,
    });
  }
}

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

/**
 * Priced BOQ + material abstract for an estimate. Each line priced at its mapped
 * spec's analysed rate (qty × rate); materials aggregated across every priced
 * line from the spec recipes (qty × qty-per-unit × (1+wastage)). Shared by the
 * `costing` read query and the BOQ-PDF snapshot.
 */
async function computeCosting(db: Parameters<typeof getProjectById>[0], id: string) {
  const estimate = await requireEstimate(db, id);
  const lines = await db
    .select()
    .from(estimateLines)
    .where(eq(estimateLines.estimateId, id))
    .orderBy(asc(estimateLines.sortOrder), asc(estimateLines.createdAt));
  const lineIds = lines.map((l) => l.id);
  const ms = lineIds.length
    ? await db.select().from(estimateMeasurements).where(inArray(estimateMeasurements.lineId, lineIds))
    : [];
  const msByLine = new Map<string, typeof ms>();
  for (const m of ms) {
    const a = msByLine.get(m.lineId) ?? [];
    a.push(m);
    msByLine.set(m.lineId, a);
  }
  const qtyOf = (lineId: string, unit: string) =>
    lineQuantity((msByLine.get(lineId) ?? []).map(toMeasurement), unit);

  const specIds = [...new Set(lines.map((l) => l.specificationId).filter((x): x is string => !!x))];
  type MatLine = { materialId: string; name: string; unit: string; quantityPerUnit: number; wastageFactor: number; ratePaise: number };
  type LabLine = { laborId: string; name: string; unit: string; quantityPerUnit: number; ratePaise: number };
  const specInfo = new Map<string, { name: string; ratePaise: number; materials: MatLine[]; labor: LabLine[] }>();
  for (const specId of specIds) {
    const [spec] = await db.select().from(kbSpecifications).where(eq(kbSpecifications.id, specId));
    const mats = await db
      .select({
        materialId: kbSpecMaterials.materialId,
        name: kbMaterials.name,
        unit: kbMaterials.unit,
        quantityPerUnit: kbSpecMaterials.quantityPerUnit,
        wastageFactor: kbSpecMaterials.wastageFactor,
        ratePaise: kbMaterials.defaultRatePaise,
      })
      .from(kbSpecMaterials)
      .innerJoin(kbMaterials, eq(kbSpecMaterials.materialId, kbMaterials.id))
      .where(eq(kbSpecMaterials.specificationId, specId));
    const labs = await db
      .select({
        laborId: kbSpecLabor.laborId,
        name: kbLabor.name,
        unit: kbLabor.unit,
        quantityPerUnit: kbSpecLabor.quantityPerUnit,
        ratePaise: kbLabor.defaultRatePaise,
      })
      .from(kbSpecLabor)
      .innerJoin(kbLabor, eq(kbSpecLabor.laborId, kbLabor.id))
      .where(eq(kbSpecLabor.specificationId, specId));
    specInfo.set(specId, { name: spec?.name ?? "", ratePaise: specRatePaise(mats, labs), materials: mats, labor: labs });
  }

  const boq = lines.map((l) => {
    const qty = qtyOf(l.id, l.unit);
    const info = l.specificationId ? specInfo.get(l.specificationId) : undefined;
    const ratePaise = info ? info.ratePaise : null;
    const amountPaise = ratePaise != null ? Math.round(qty * ratePaise) : null;
    return {
      lineId: l.id,
      description: l.description,
      unit: l.unit,
      derived: l.derived,
      parentLineId: l.parentLineId,
      specName: info?.name ?? null,
      qty: Math.round(qty * 1000) / 1000,
      ratePaise,
      amountPaise,
    };
  });
  const totalPaise = boq.reduce((s, r) => s + (r.amountPaise ?? 0), 0);

  const agg = new Map<string, { name: string; unit: string; qty: number; ratePaise: number }>();
  for (const l of lines) {
    if (!l.specificationId) continue;
    const info = specInfo.get(l.specificationId);
    if (!info) continue;
    const qty = qtyOf(l.id, l.unit);
    for (const m of info.materials) {
      const consumed = qty * m.quantityPerUnit * (1 + m.wastageFactor);
      const cur = agg.get(m.materialId) ?? { name: m.name, unit: m.unit, qty: 0, ratePaise: m.ratePaise };
      cur.qty += consumed;
      agg.set(m.materialId, cur);
    }
  }
  const materials = [...agg.entries()]
    .map(([materialId, v]) => ({
      materialId,
      name: v.name,
      unit: v.unit,
      qty: Math.round(v.qty * 1000) / 1000,
      ratePaise: v.ratePaise,
      amountPaise: Math.round(v.qty * v.ratePaise),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const materialTotalPaise = materials.reduce((s, m) => s + m.amountPaise, 0);

  // Labour abstract — aggregate labour resource-days across every priced line.
  const labAgg = new Map<string, { name: string; unit: string; qty: number; ratePaise: number }>();
  for (const l of lines) {
    if (!l.specificationId) continue;
    const info = specInfo.get(l.specificationId);
    if (!info) continue;
    const qty = qtyOf(l.id, l.unit);
    for (const lab of info.labor) {
      const cur = labAgg.get(lab.laborId) ?? { name: lab.name, unit: lab.unit, qty: 0, ratePaise: lab.ratePaise };
      cur.qty += qty * lab.quantityPerUnit;
      labAgg.set(lab.laborId, cur);
    }
  }
  const labor = [...labAgg.entries()]
    .map(([laborId, v]) => ({
      laborId,
      name: v.name,
      unit: v.unit,
      qty: Math.round(v.qty * 1000) / 1000,
      ratePaise: v.ratePaise,
      amountPaise: Math.round(v.qty * v.ratePaise),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const laborTotalPaise = labor.reduce((s, m) => s + m.amountPaise, 0);

  return { estimate, boq, totalPaise, materials, materialTotalPaise, labor, laborTotalPaise };
}

export const estimatesRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select({
          id: estimates.id,
          title: estimates.title,
          status: estimates.status,
          revisionNo: estimates.revisionNo,
          revisionOf: estimates.revisionOf,
          createdAt: estimates.createdAt,
          // Last-generated BOQ total (jsonb extract, not the whole snapshot).
          boqTotalPaise: sql<number | null>`(${estimates.boqSnapshot} ->> 'totalPaise')::double precision`,
        })
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
    await assertEditable(ctx.db, input.estimateId);
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
      await assertEditable(ctx.db, line.estimateId);
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
      if (owner) await assertEditable(ctx.db, owner.estimateId);
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
      await assertEditable(ctx.db, line.estimateId);
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
      await assertEditable(ctx.db, parent.estimateId);

      // Re-derivation: always drop this parent's prior AUTO children first (manual
      // ones survive), so re-deriving is idempotent even if the KB item is gone
      // (kbItemId set null on item delete) and no edges are found below.
      await ctx.db
        .delete(estimateLines)
        .where(and(eq(estimateLines.parentLineId, parent.id), eq(estimateLines.derived, true)));

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
          if (qty === 0) continue; // no parent qty → no child (matches the geometric path)
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
      const line = await requireLine(ctx.db, input.id);
      await assertEditable(ctx.db, line.estimateId);
      const patch: Record<string, unknown> = {};
      if (input.description !== undefined) patch.description = input.description;
      if (input.code !== undefined) patch.code = input.code;
      if (Object.keys(patch).length === 0) return line;
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
      await assertEditable(ctx.db, line.estimateId);
      await ctx.db.delete(estimateLines).where(eq(estimateLines.parentLineId, input.id));
      await ctx.db.delete(estimateLines).where(eq(estimateLines.id, input.id));
      await touch(ctx.db, line.estimateId);
      return { ok: true };
    }),

  /** Candidate specifications for a line's KB item, each with its analysed rate
   *  (approach B). Drives the post-approval spec picker. */
  specsForLine: protectedProcedure
    .input(z.object({ lineId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const line = await requireLine(ctx.db, input.lineId);
      if (!line.kbItemId) return [];
      const specs = await ctx.db
        .select()
        .from(kbSpecifications)
        .where(eq(kbSpecifications.itemId, line.kbItemId))
        .orderBy(desc(kbSpecifications.isDefault), asc(kbSpecifications.name));
      const out: { id: string; name: string; ratePaise: number }[] = [];
      for (const s of specs) {
        const mats = await ctx.db
          .select({
            quantityPerUnit: kbSpecMaterials.quantityPerUnit,
            wastageFactor: kbSpecMaterials.wastageFactor,
            ratePaise: kbMaterials.defaultRatePaise,
          })
          .from(kbSpecMaterials)
          .innerJoin(kbMaterials, eq(kbSpecMaterials.materialId, kbMaterials.id))
          .where(eq(kbSpecMaterials.specificationId, s.id));
        const labs = await ctx.db
          .select({
            quantityPerUnit: kbSpecLabor.quantityPerUnit,
            ratePaise: kbLabor.defaultRatePaise,
          })
          .from(kbSpecLabor)
          .innerJoin(kbLabor, eq(kbSpecLabor.laborId, kbLabor.id))
          .where(eq(kbSpecLabor.specificationId, s.id));
        out.push({ id: s.id, name: s.name, ratePaise: specRatePaise(mats, labs) });
      }
      return out;
    }),

  /** Map a specification onto a line (post-approval costing step). */
  setLineSpecification: protectedProcedure
    .input(z.object({ lineId: z.string().uuid(), specificationId: z.string().uuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const line = await requireLine(ctx.db, input.lineId);
      const est = await requireEstimate(ctx.db, line.estimateId);
      if (est.status !== "APPROVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Specifications are mapped after the estimate is approved.",
        });
      }
      if (input.specificationId) {
        const [spec] = await ctx.db
          .select()
          .from(kbSpecifications)
          .where(eq(kbSpecifications.id, input.specificationId));
        if (!spec) throw new TRPCError({ code: "NOT_FOUND", message: "Specification not found" });
        if (line.kbItemId && spec.itemId !== line.kbItemId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "That specification is for a different item." });
        }
        // The line is priced qty(line unit) × rate(spec unit), so the units must
        // agree. A null spec unit inherits the item/line unit and is fine.
        if (spec.unit && spec.unit !== line.unit) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Specification unit (${spec.unit}) doesn't match the line unit (${line.unit}).`,
          });
        }
      }
      const [row] = await ctx.db
        .update(estimateLines)
        .set({ specificationId: input.specificationId })
        .where(eq(estimateLines.id, input.lineId))
        .returning();
      await touch(ctx.db, line.estimateId);
      return row!;
    }),

  /**
   * Priced BOQ + material abstract for an estimate. Each line priced at its
   * mapped spec's analysed rate (qty × rate); materials aggregated across lines
   * from the spec recipes (qty × qty-per-unit × (1+wastage)).
   */
  costing: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const c = await computeCosting(ctx.db, input.id);
      const boqPdfUrl = c.estimate.boqPdfKey
        ? await presignedGet(c.estimate.boqPdfKey).catch(() => null)
        : null;
      return {
        estimate: { id: c.estimate.id, title: c.estimate.title, status: c.estimate.status },
        boq: c.boq,
        totalPaise: c.totalPaise,
        materials: c.materials,
        materialTotalPaise: c.materialTotalPaise,
        labor: c.labor,
        laborTotalPaise: c.laborTotalPaise,
        boqPdfStatus: c.estimate.boqPdfStatus,
        boqPdfUrl,
      };
    }),

  /** Freeze the priced BOQ + material abstract to a snapshot and render it to a
   *  letterhead PDF (worker). Approved estimates only. */
  generateBoqPdf: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const c = await computeCosting(ctx.db, input.id);
      if (c.estimate.status !== "APPROVED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Generate the BOQ after the estimate is approved." });
      }
      const snapshot = {
        title: c.estimate.title,
        boq: c.boq,
        totalPaise: c.totalPaise,
        materials: c.materials,
        materialTotalPaise: c.materialTotalPaise,
        labor: c.labor,
        laborTotalPaise: c.laborTotalPaise,
        generatedAt: new Date().toISOString(),
      };
      await ctx.db
        .update(estimates)
        .set({ boqSnapshot: snapshot, boqPdfStatus: "PENDING" })
        .where(eq(estimates.id, input.id));
      await enqueueJob(
        "render_pdf",
        { target: "estimate_boq", id: input.id, firm: await firmPayload(ctx.db) },
        ctx.requestId,
      );
      return { ok: true };
    }),

  /**
   * Estimate lifecycle: IN_PROGRESS → FOR_REVIEW (submit), FOR_REVIEW →
   * IN_PROGRESS (send back), FOR_REVIEW → APPROVED (approve — team lead only).
   * APPROVED is terminal; revise it via cloneRevision.
   */
  setStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: EstimateStatus }))
    .mutation(async ({ ctx, input }) => {
      const est = await requireEstimate(ctx.db, input.id);
      const from = est.status;
      const to = input.status;
      const allowed =
        (from === "IN_PROGRESS" && to === "FOR_REVIEW") ||
        (from === "FOR_REVIEW" && to === "IN_PROGRESS") ||
        (from === "FOR_REVIEW" && to === "APPROVED");
      if (!allowed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot move an estimate from ${from} to ${to}.` });
      }
      if (to === "APPROVED" && !can(ctx.user.role, "estimate:approve")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only a team lead can approve an estimate." });
      }
      const [row] = await ctx.db
        .update(estimates)
        .set({ status: to, updatedAt: new Date() })
        .where(eq(estimates.id, input.id))
        .returning();
      return row!;
    }),

  /**
   * Clone an APPROVED estimate into a fresh IN_PROGRESS revision (deep copy of
   * lines + measurements, remapping dependency parents). Team lead only. The
   * approved original stays immutable; every revision chains to it (revisionOf).
   */
  cloneRevision: capabilityProcedure("estimate:approve")
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const src = await requireEstimate(ctx.db, input.id);
      if (src.status !== "APPROVED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only an approved estimate can be revised." });
      }
      const srcLines = await ctx.db
        .select()
        .from(estimateLines)
        .where(eq(estimateLines.estimateId, src.id))
        .orderBy(asc(estimateLines.sortOrder), asc(estimateLines.createdAt));
      const srcLineIds = srcLines.map((l) => l.id);
      const srcMs = srcLineIds.length
        ? await ctx.db
            .select()
            .from(estimateMeasurements)
            .where(inArray(estimateMeasurements.lineId, srcLineIds))
            .orderBy(asc(estimateMeasurements.sortOrder), asc(estimateMeasurements.createdAt))
        : [];

      // Next revision number = max across the whole chain + 1, so Rev-N stays
      // linear even if the same approved baseline is cloned more than once.
      const root = src.revisionOf ?? src.id;
      const [maxRow] = await ctx.db
        .select({ max: sql<number>`coalesce(max(${estimates.revisionNo}), 0)` })
        .from(estimates)
        .where(or(eq(estimates.id, root), eq(estimates.revisionOf, root)));
      const revisionNo = (maxRow?.max ?? 0) + 1;
      const base = src.title.replace(/\s*\(Rev \d+\)\s*$/i, "");

      // One transaction so a mid-copy failure never leaves a partial revision.
      return ctx.db.transaction(async (tx) => {
        const [newEst] = await tx
          .insert(estimates)
          .values({
            projectId: src.projectId,
            title: `${base} (Rev ${revisionNo})`,
            status: "IN_PROGRESS",
            revisionNo,
            revisionOf: root,
          })
          .returning();

        // Remap old line id → new line id: main lines first so dependency lines
        // can point their parentLineId at the new parent.
        const idMap = new Map<string, string>();
        const copyLine = async (l: (typeof srcLines)[number], parentLineId: string | null) => {
          const [n] = await tx
            .insert(estimateLines)
            .values({
              estimateId: newEst!.id,
              parentLineId,
              kbItemId: l.kbItemId,
              sortOrder: l.sortOrder,
              code: l.code,
              description: l.description,
              unit: l.unit,
              derived: l.derived,
            })
            .returning({ id: estimateLines.id });
          idMap.set(l.id, n!.id);
        };
        for (const l of srcLines.filter((x) => !x.parentLineId)) await copyLine(l, null);
        for (const l of srcLines.filter((x) => x.parentLineId)) {
          await copyLine(l, l.parentLineId ? idMap.get(l.parentLineId) ?? null : null);
        }
        if (srcMs.length) {
          await tx.insert(estimateMeasurements).values(
            srcMs.map((m) => ({
              lineId: idMap.get(m.lineId)!,
              sortOrder: m.sortOrder,
              label: m.label,
              nos: m.nos,
              l: m.l,
              b: m.b,
              h: m.h,
            })),
          );
        }
        return newEst!;
      });
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const est = await requireEstimate(ctx.db, input.id);
      if (est.status === "APPROVED") {
        throw new TRPCError({ code: "FORBIDDEN", message: "An approved estimate cannot be deleted." });
      }
      await ctx.db.delete(estimates).where(eq(estimates.id, input.id));
      return { ok: true };
    }),
});
