/**
 * Estimation interchange (`.aormsest`) + the pure re-costing / take-off engine.
 *
 * The split (see docs/esti/ESTIMATION-ARCHITECTURE.md):
 *   • the Estimate desktop app MEASURES and freezes quantities, then exports an
 *     `.aormsest` file (items + frozen measurements + material take-off + steel);
 *   • AORMS only IMPORTS, VIEWS and RE-COSTS it — quantities are authoritative,
 *     price is the one live lever (swap the project rate book → every amount
 *     recomputes). Costing is always computed, never stored as truth.
 *
 * Everything here is a PURE function over plain data — no IO, browser-safe (no
 * node builtins), so it is shared by the desktop app, the backend and the SPA,
 * and is exhaustively unit-tested. Money is integer paise throughout.
 */
import { z } from "zod";
import type { DerivationRule } from "./ese-packs.js";
import { scheduleByDiameter, type BbsMember } from "./bbs-engine.js";

export const AORMSEST_FORMAT_VERSION = 1;

// ── .aormsest interchange schema ──────────────────────────────────────────────
export const EstimateMeasurement = z.object({
  desc: z.string().optional(),
  nos: z.number().default(1),
  l: z.number().nullable().default(null),
  b: z.number().nullable().default(null),
  h: z.number().nullable().default(null),
  qty: z.number(), // authoritative (as computed by the desktop app)
});
export type EstimateMeasurement = z.infer<typeof EstimateMeasurement>;

export const EstimateItem = z.object({
  code: z.string(), // join key AORMS re-prices against its own rate book
  itemCode: z.string().optional(), // parent work item / section join
  shortName: z.string(),
  specification: z.string().optional(),
  attributes: z.record(z.string(), z.string()).default({}),
  uom: z.string(),
  ratePaise: z.number().int().nonnegative(), // as-estimated (advisory)
  measurements: z.array(EstimateMeasurement).default([]),
  qty: z.number(), // authoritative
  amountPaise: z.number().int().nonnegative(),
  section: z.string().optional(), // BOQ grouping label
  derivedFrom: z.string().optional(), // parent item code, if this line was derived
});
export type EstimateItem = z.infer<typeof EstimateItem>;

export const EstimateMaterial = z.object({
  code: z.string(),
  name: z.string(),
  unit: z.string(),
  qty: z.number(),
  ratePaise: z.number().int().nonnegative().optional(),
  amountPaise: z.number().int().nonnegative().optional(),
});
export type EstimateMaterial = z.infer<typeof EstimateMaterial>;

export const EstimateSteel = z.object({
  diaMm: z.number(),
  unitWeightKgM: z.number(),
  weightKg: z.number(),
  ratePaise: z.number().int().nonnegative().optional(), // ₹/kg
  amountPaise: z.number().int().nonnegative().optional(),
  ref: z.string().optional(),
});
export type EstimateSteel = z.infer<typeof EstimateSteel>;

export const EstimateRateBookRef = z.object({ code: z.string(), name: z.string() });
export type EstimateRateBookRef = z.infer<typeof EstimateRateBookRef>;

export const EstimateMeta = z.object({
  estimateName: z.string(),
  projectName: z.string().optional(),
  createdAt: z.string(), // ISO
  appVersion: z.string().default("0.0.0"),
  currency: z.literal("INR").default("INR"),
});
export type EstimateMeta = z.infer<typeof EstimateMeta>;

export const EstimateFile = z.object({
  formatVersion: z.literal(AORMSEST_FORMAT_VERSION),
  meta: EstimateMeta,
  rateBook: EstimateRateBookRef, // what the desktop used (for provenance)
  items: z.array(EstimateItem).default([]),
  materials: z.array(EstimateMaterial).default([]),
  steel: z.array(EstimateSteel).default([]),
  checksum: z.string().optional(), // caller-computed envelope seal
});
export type EstimateFile = z.infer<typeof EstimateFile>;

// ── Project rate book (the live lever AORMS re-costs against) ──────────────────
export const RateBookRates = z.object({
  code: z.string(),
  name: z.string(),
  itemRatePaise: z.record(z.string(), z.number().int().nonnegative()).default({}),
  materialRatePaise: z.record(z.string(), z.number().int().nonnegative()).default({}),
  steelRatePaiseByDia: z.record(z.string(), z.number().int().nonnegative()).default({}),
});
export type RateBookRates = z.infer<typeof RateBookRates>;

// ── Math helpers (integer paise; qty/weight to 3 dp) ──────────────────────────
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const amountPaise = (qty: number, ratePaise: number) => Math.round(qty * ratePaise);

// ── 1. Measurement → quantity ─────────────────────────────────────────────────
/** qty = nos × (each present dimension). Absent (null) dimensions are skipped,
 *  so a pure count (all dims null) returns `nos`, an area is nos·l·h, etc. */
export function measureQty(m: { nos?: number; l?: number | null; b?: number | null; h?: number | null }): number {
  let product = m.nos ?? 1;
  for (const d of [m.l, m.b, m.h]) if (d != null) product *= d;
  return round3(product);
}
export function measurementsTotal(ms: { qty: number }[]): number {
  return round3(ms.reduce((s, m) => s + m.qty, 0));
}

// ── 2. Material take-off from recipes (for one item's quantity) ───────────────
export interface TakeoffLine {
  materialCode: string;
  qty: number;
  wastagePct: number;
}
/** qty(material) = itemQty × coefficient × (1 + wastage%). Coefficient is per 1
 *  UOM of the item; wastage is per recipe line. */
export function takeoffMaterials(
  itemQty: number,
  recipes: { materialCode: string; coefficient: number; wastagePct?: number }[],
): TakeoffLine[] {
  return recipes.map((r) => ({
    materialCode: r.materialCode,
    qty: round3(itemQty * r.coefficient * (1 + (r.wastagePct ?? 0) / 100)),
    wastagePct: r.wastagePct ?? 0,
  }));
}

// ── 3. Derived measurements — measure once → linked quantities ────────────────
export interface DerivedLine {
  childItemCode: string;
  qty: number;
  rule: DerivationRule["rule"];
}
/** One parent measurement → child quantities (brick wall → plaster ×2 faces →
 *  paint ×2). `openingsArea[childCode]` is deducted for NET_OF_OPENINGS. */
export function deriveLinked(
  parentQty: number,
  rules: DerivationRule[],
  ctx: { openingsArea?: Record<string, number> } = {},
): DerivedLine[] {
  return rules.map((rule) => {
    const base = parentQty * (rule.factor ?? 1);
    let qty: number;
    switch (rule.rule) {
      case "NET_OF_OPENINGS":
        qty = Math.max(0, base - (ctx.openingsArea?.[rule.childItemCode] ?? 0));
        break;
      case "FACTOR":
      case "PERIMETER_X_HEIGHT":
      default:
        qty = base;
    }
    return { childItemCode: rule.childItemCode, qty: round3(qty), rule: rule.rule };
  });
}

// ── 4. Re-costing — the abstract (item × rate = amount), as-estimated vs costed ─
export type RateSource = "rateBook" | "estimate";
export interface AbstractRow {
  code: string;
  itemCode?: string;
  shortName: string;
  specification?: string;
  uom: string;
  qty: number;
  ratePaiseEstimated: number;
  amountPaiseEstimated: number;
  ratePaise: number; // as-costed
  amountPaise: number; // as-costed
  variancePaise: number; // costed − estimated
  rateSource: RateSource;
  section?: string;
}
export interface Abstract {
  rows: AbstractRow[];
  totalEstimatedPaise: number;
  totalCostedPaise: number;
  totalVariancePaise: number;
}
/** Re-cost every item against the rate book; fall back to the as-estimated rate
 *  when the book has no entry for that code. Estimated and costed amounts are
 *  recomputed with identical math (qty × rate) so the variance is purely the
 *  rate delta. */
export function recostAbstract(items: EstimateItem[], rb: RateBookRates): Abstract {
  let totalEstimatedPaise = 0;
  let totalCostedPaise = 0;
  const rows: AbstractRow[] = items.map((it) => {
    const bookRate = rb.itemRatePaise[it.code];
    const rateSource: RateSource = bookRate != null ? "rateBook" : "estimate";
    const ratePaise = bookRate ?? it.ratePaise;
    const amountEst = amountPaise(it.qty, it.ratePaise);
    const amount = amountPaise(it.qty, ratePaise);
    totalEstimatedPaise += amountEst;
    totalCostedPaise += amount;
    return {
      code: it.code,
      itemCode: it.itemCode,
      shortName: it.shortName,
      specification: it.specification,
      uom: it.uom,
      qty: it.qty,
      ratePaiseEstimated: it.ratePaise,
      amountPaiseEstimated: amountEst,
      ratePaise,
      amountPaise: amount,
      variancePaise: amount - amountEst,
      rateSource,
      section: it.section ?? it.itemCode,
    };
  });
  return {
    rows,
    totalEstimatedPaise,
    totalCostedPaise,
    totalVariancePaise: totalCostedPaise - totalEstimatedPaise,
  };
}

// ── 5. BOQ — the abstract, grouped into sections ──────────────────────────────
export interface BoqSection {
  section: string;
  rows: AbstractRow[];
  subtotalPaise: number;
}
export interface Boq {
  sections: BoqSection[];
  totalPaise: number;
}
export function recostBOQ(items: EstimateItem[], rb: RateBookRates): Boq {
  const abstract = recostAbstract(items, rb);
  const bySection = new Map<string, AbstractRow[]>();
  for (const row of abstract.rows) {
    const key = row.section || "General";
    (bySection.get(key) ?? bySection.set(key, []).get(key)!).push(row);
  }
  const sections: BoqSection[] = [...bySection.entries()].map(([section, rows]) => ({
    section,
    rows,
    subtotalPaise: rows.reduce((s, r) => s + r.amountPaise, 0),
  }));
  return { sections, totalPaise: abstract.totalCostedPaise };
}

// ── 6. Materials take-off summary (procurement / PO basis) ─────────────────────
export interface MaterialSummaryRow {
  code: string;
  name: string;
  unit: string;
  qty: number;
  ratePaise: number;
  amountPaise: number;
  rateSource: RateSource;
}
/** Aggregate material lines by code (summing quantity), then re-price against the
 *  rate book (fall back to the as-estimated material rate). */
export function recostMaterials(
  materials: EstimateMaterial[],
  rb: RateBookRates,
): { rows: MaterialSummaryRow[]; totalPaise: number } {
  const agg = new Map<string, { name: string; unit: string; qty: number; estRate: number }>();
  for (const m of materials) {
    const cur = agg.get(m.code);
    if (cur) cur.qty = round3(cur.qty + m.qty);
    else agg.set(m.code, { name: m.name, unit: m.unit, qty: m.qty, estRate: m.ratePaise ?? 0 });
  }
  let totalPaise = 0;
  const rows: MaterialSummaryRow[] = [...agg.entries()].map(([code, v]) => {
    const bookRate = rb.materialRatePaise[code];
    const rateSource: RateSource = bookRate != null ? "rateBook" : "estimate";
    const ratePaise = bookRate ?? v.estRate;
    const amount = amountPaise(v.qty, ratePaise);
    totalPaise += amount;
    return { code, name: v.name, unit: v.unit, qty: v.qty, ratePaise, amountPaise: amount, rateSource };
  });
  return { rows, totalPaise };
}

// ── 7. Steel summary — by diameter, priced by weight ──────────────────────────
export interface SteelSummaryRow {
  diaMm: number;
  unitWeightKgM: number;
  weightKg: number;
  ratePaise: number; // ₹/kg
  amountPaise: number;
  rateSource: RateSource;
}
export function recostSteel(
  steel: EstimateSteel[],
  rb: RateBookRates,
): { rows: SteelSummaryRow[]; totalWeightKg: number; totalPaise: number } {
  const agg = new Map<number, { unitWeightKgM: number; weightKg: number; estRate: number }>();
  for (const s of steel) {
    const cur = agg.get(s.diaMm);
    if (cur) cur.weightKg = round3(cur.weightKg + s.weightKg);
    else agg.set(s.diaMm, { unitWeightKgM: s.unitWeightKgM, weightKg: s.weightKg, estRate: s.ratePaise ?? 0 });
  }
  let totalWeightKg = 0;
  let totalPaise = 0;
  const rows: SteelSummaryRow[] = [...agg.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([diaMm, v]) => {
      const bookRate = rb.steelRatePaiseByDia[String(diaMm)];
      const rateSource: RateSource = bookRate != null ? "rateBook" : "estimate";
      const ratePaise = bookRate ?? v.estRate;
      const amount = amountPaise(v.weightKg, ratePaise);
      totalWeightKg = round3(totalWeightKg + v.weightKg);
      totalPaise += amount;
      return { diaMm, unitWeightKgM: v.unitWeightKgM, weightKg: v.weightKg, ratePaise, amountPaise: amount, rateSource };
    });
  return { rows, totalWeightKg, totalPaise };
}

// ── 8. Bridge: BBS members → estimate steel lines ─────────────────────────────
/** Turn computed BBS members into `.aormsest` steel lines (by diameter). Wastage
 *  and laps are already inside the BBS weights; optionally price by ₹/kg per dia. */
export function steelFromBBS(members: BbsMember[], ratePaiseByDia?: Record<number, number>): EstimateSteel[] {
  return scheduleByDiameter(members).map((d) => {
    const rate = ratePaiseByDia?.[d.diaMm];
    return {
      diaMm: d.diaMm,
      unitWeightKgM: round3((d.diaMm * d.diaMm) / 162),
      weightKg: round3(d.weightKg),
      ratePaise: rate,
      amountPaise: rate != null ? amountPaise(d.weightKg, rate) : undefined,
    };
  });
}

// ── 9. Whole estimate → all four costed views ─────────────────────────────────
export interface CostedEstimate {
  abstract: Abstract;
  boq: Boq;
  materials: { rows: MaterialSummaryRow[]; totalPaise: number };
  steel: { rows: SteelSummaryRow[]; totalWeightKg: number; totalPaise: number };
  /** The estimate value = the item abstract total (item rates already include
   *  material + labour). Materials/steel are procurement take-off, not additive. */
  grandTotalPaise: number;
}
export function recostEstimate(file: EstimateFile, rb: RateBookRates): CostedEstimate {
  const abstract = recostAbstract(file.items, rb);
  return {
    abstract,
    boq: recostBOQ(file.items, rb),
    materials: recostMaterials(file.materials, rb),
    steel: recostSteel(file.steel, rb),
    grandTotalPaise: abstract.totalCostedPaise,
  };
}
