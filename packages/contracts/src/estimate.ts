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
export const ESTIMATE_MAX_BYTES = 25 * 1024 * 1024;
export const ESTIMATE_EXTENSIONS = [".aormsest", ".json"] as const;

/** Canonical, key-sorted JSON of the file content with the `checksum` field
 *  excluded — the string a caller hashes to seal / verify an `.aormsest`.
 *  Pure and browser-safe (no crypto), so the desktop app, backend and SPA all
 *  agree on the bytes to hash. */
export function estimateSealString(file: Record<string, unknown>): string {
  const { checksum: _drop, ...rest } = file;
  void _drop;
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      const src = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(src).sort()) if (src[k] !== undefined) out[k] = sort(src[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(sort(rest));
}

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

/** Lead (carriage) — the standard Indian-estimation add-on for conveying material
 *  a distance to site. Frozen per item like the quantity; `chargePaise` is the
 *  extra cost per 1 UOM of the item at that lead. */
export const EstimateLead = z.object({
  km: z.number().nonnegative().optional(), // lead distance
  desc: z.string().optional(), // e.g. "Carriage of coarse aggregate, 12 km"
  chargePaise: z.number().int().nonnegative().default(0), // extra ₹/UOM
});
export type EstimateLead = z.infer<typeof EstimateLead>;

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
  lead: EstimateLead.optional(), // per-item carriage/lead add-on
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
/** Where the costed rate came from: a project override, the office rate book, or
 *  (fallback) the as-estimated rate carried in the file. */
export type RateSource = "project" | "rateBook" | "estimate";
export interface AbstractRow {
  code: string;
  itemCode?: string;
  shortName: string;
  specification?: string;
  uom: string;
  qty: number;
  ratePaiseEstimated: number;
  amountPaiseEstimated: number;
  ratePaise: number; // as-costed (base rate, excl. lead)
  leadChargePaise: number; // per-UOM carriage add-on (frozen)
  leadAmountPaise: number; // qty × leadCharge
  amountPaise: number; // as-costed, INCLUDING lead
  variancePaise: number; // costed − estimated (lead cancels → pure rate delta)
  rateSource: RateSource;
  section?: string;
}
export interface Abstract {
  rows: AbstractRow[];
  totalEstimatedPaise: number;
  totalCostedPaise: number;
  totalVariancePaise: number;
  totalLeadPaise: number;
}
/** Optional re-cost overrides — a project rate book layered over the office one. */
export interface RecostOptions {
  /** Project rate overrides by item code; win over the office rate book. */
  projectItemRatePaise?: Record<string, number>;
}
/** Re-cost every item: project override → office rate book → as-estimated rate.
 *  The frozen per-item lead (carriage) is added to both estimated and costed
 *  amounts, so it never distorts the variance (which stays a pure rate delta). */
export function recostAbstract(items: EstimateItem[], rb: RateBookRates, opts: RecostOptions = {}): Abstract {
  let totalEstimatedPaise = 0;
  let totalCostedPaise = 0;
  let totalLeadPaise = 0;
  const rows: AbstractRow[] = items.map((it) => {
    const projectRate = opts.projectItemRatePaise?.[it.code];
    const bookRate = rb.itemRatePaise[it.code];
    const rateSource: RateSource = projectRate != null ? "project" : bookRate != null ? "rateBook" : "estimate";
    const ratePaise = projectRate ?? bookRate ?? it.ratePaise;

    const leadChargePaise = it.lead?.chargePaise ?? 0;
    const leadAmountPaise = amountPaise(it.qty, leadChargePaise);
    const amountEst = amountPaise(it.qty, it.ratePaise) + leadAmountPaise;
    const amount = amountPaise(it.qty, ratePaise) + leadAmountPaise;
    totalEstimatedPaise += amountEst;
    totalCostedPaise += amount;
    totalLeadPaise += leadAmountPaise;
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
      leadChargePaise,
      leadAmountPaise,
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
    totalLeadPaise,
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
export function recostBOQ(items: EstimateItem[], rb: RateBookRates, opts: RecostOptions = {}): Boq {
  const abstract = recostAbstract(items, rb, opts);
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
export function recostEstimate(file: EstimateFile, rb: RateBookRates, opts: RecostOptions = {}): CostedEstimate {
  const abstract = recostAbstract(file.items, rb, opts);
  return {
    abstract,
    boq: recostBOQ(file.items, rb, opts),
    materials: recostMaterials(file.materials, rb),
    steel: recostSteel(file.steel, rb),
    grandTotalPaise: abstract.totalCostedPaise,
  };
}
