import { z } from "zod";
import { canonicalUnit } from "./rate-import.js";

/**
 * Estimate sheet (Estimation OS rebuild, phase 1) — the Excel-inspired
 * keyboard-first measurement sheet. Pure measurement math + line shapes;
 * persistence lives in the backend `estimates` router.
 *
 * A line is one Knowledge-Bank element (or a dependency of one) plus its
 * recorded measurements. Each measurement is a column punched top-to-bottom:
 * Nos, then the dimensions the element's unit calls for —
 *   m (running)  → Length
 *   m2           → Length + Breadth/Height
 *   m3           → Length + Breadth + Height
 *   anything else (no/kg/t/LS…) → quantity only (the Nos row doubles as Qty).
 */

/** How many dimension rows (beyond Nos) the unit needs on the sheet. */
export function dimensionCount(unit: string | null | undefined): 0 | 1 | 2 | 3 {
  switch (canonicalUnit(unit)) {
    case "m":
    case "rft": // imperial running foot — linear, like metre
      return 1;
    case "m2":
    case "sqft":
      return 2;
    case "m3":
      return 3;
    default:
      return 0;
  }
}

/** Parameter row labels for a unit (always starts with Nos). */
export function measurementRows(unit: string | null | undefined): string[] {
  const dims = dimensionCount(unit);
  if (dims === 0) return ["Qty"];
  return ["Nos", "Length", "Breadth/Height", "Breadth/Height"].slice(0, dims + 1);
}

export const EstimateMeasurement = z.object({
  /** Count multiplier — for 0-dimension units this IS the quantity. A NEGATIVE
   *  Nos denotes a deduction (a door opening in a plaster line, a void in a
   *  concrete line): its qty subtracts from the line total. Dimensions stay
   *  non-negative — the deduction sign is carried only by Nos. */
  nos: z.number().finite(),
  l: z.number().finite().nonnegative().optional(),
  b: z.number().finite().nonnegative().optional(),
  h: z.number().finite().nonnegative().optional(),
});
export type EstimateMeasurement = z.infer<typeof EstimateMeasurement>;

/** Quantity of one measurement column under the unit's dimension rule. */
export function measurementQty(m: EstimateMeasurement, unit: string | null | undefined): number {
  const dims = dimensionCount(unit);
  let qty = m.nos;
  if (dims >= 1) qty *= m.l ?? 0;
  if (dims >= 2) qty *= m.b ?? 0;
  if (dims >= 3) qty *= m.h ?? 0;
  return qty;
}

/** Total line quantity — sum of measurement columns, rounded to 3 decimals. */
export function lineQuantity(
  measurements: readonly EstimateMeasurement[],
  unit: string | null | undefined,
): number {
  const total = measurements.reduce((sum, m) => sum + measurementQty(m, unit), 0);
  return Math.round(total * 1000) / 1000;
}

export const ESTIMATE_MAX_MEASUREMENTS = 500;

/**
 * Dependency measurement derivation — how a child activity's measurement is
 * computed from its parent's. Configured per parent→child edge in the Knowledge
 * Bank (esti_kb_item_dependency.derivation). Dimensions use the FIXED L/B/H
 * convention (Length, Breadth, Height — no per-element flipping):
 *
 *   MANUAL              punched by hand (today's behaviour)
 *   RATIO               child qty = parent line qty × edge.ratio (scalar; not geometric)
 *   PERIMETER_X_HEIGHT  2·(L+B) × H     — column shuttering (girth × height)
 *   THREE_SIDE_X_LENGTH (B + 2H) × L    — beam shuttering (bottom + 2 sides × length)
 *   LENGTH_X_HEIGHT     L × H           — wall face (internal/external plaster)
 *   LENGTH_X_BREADTH    L × B           — plan area (flooring, slab, ceiling plaster)
 */
export const MeasurementDerivation = z.enum([
  "MANUAL",
  "RATIO",
  "PERIMETER_X_HEIGHT",
  "THREE_SIDE_X_LENGTH",
  "LENGTH_X_HEIGHT",
  "LENGTH_X_BREADTH",
]);
export type MeasurementDerivation = z.infer<typeof MeasurementDerivation>;

export const MEASUREMENT_DERIVATION_LABEL: Record<MeasurementDerivation, string> = {
  MANUAL: "Manual entry",
  RATIO: "Ratio × parent qty",
  PERIMETER_X_HEIGHT: "Perimeter × height — e.g. column shuttering",
  THREE_SIDE_X_LENGTH: "3-side girth × length — e.g. beam shuttering",
  LENGTH_X_HEIGHT: "Length × height — e.g. wall plaster",
  LENGTH_X_BREADTH: "Length × breadth — e.g. floor/ceiling area",
};

/**
 * The dimensionality the child line's unit MUST have for a derivation. Every
 * geometric derivation produces an AREA, so the child unit must be 2-dimension
 * (m²/sqm); `null` for the non-geometric derivations (MANUAL, RATIO). The engine
 * validates dimensionCount(childUnit) against this before applying deriveColumn,
 * so a misconfigured edge fails loudly instead of silently recording 0 (a 3-D
 * child, whose missing H collapses to 0) or a bare length (a 1-D child, which
 * ignores the second factor).
 */
export function derivationChildDims(d: MeasurementDerivation): 2 | null {
  switch (d) {
    case "PERIMETER_X_HEIGHT":
    case "THREE_SIDE_X_LENGTH":
    case "LENGTH_X_HEIGHT":
    case "LENGTH_X_BREADTH":
      return 2;
    default:
      return null; // MANUAL, RATIO — not a geometric area transform
  }
}

/**
 * Map one parent measurement column to the child's, for the geometric
 * derivations. The child is an AREA (2-dimension) column, so the child line's
 * unit MUST be 2-D (m²) — see derivationChildDims; the engine validates this
 * before applying. A negative Nos (deduction) is carried through, so a deducted
 * parent void deducts the child automatically. Returns null for the
 * non-geometric derivations (MANUAL, RATIO), which the engine handles separately.
 */
export function deriveColumn(
  derivation: MeasurementDerivation,
  p: EstimateMeasurement,
): EstimateMeasurement | null {
  const l = p.l ?? 0;
  const b = p.b ?? 0;
  const h = p.h ?? 0;
  switch (derivation) {
    case "PERIMETER_X_HEIGHT":
      return { nos: p.nos, l: 2 * (l + b), b: h };
    case "THREE_SIDE_X_LENGTH":
      return { nos: p.nos, l, b: b + 2 * h };
    case "LENGTH_X_HEIGHT":
      return { nos: p.nos, l, b: h };
    case "LENGTH_X_BREADTH":
      return { nos: p.nos, l, b };
    default:
      return null; // MANUAL, RATIO — not a per-column geometric transform
  }
}

/**
 * Opening the measurement sheet (the single Enter after selecting an element)
 * creates the LINE; every recorded column is then its own row in the
 * measurements table (EstimateMeasurementAdd) — no embedded JSON.
 */
export const EstimateLineCreate = z.object({
  estimateId: z.string().uuid(),
  kbItemId: z.string().uuid().nullish(),
  /** Null for main items; a main line's id for dependency lines. */
  parentLineId: z.string().uuid().nullish(),
  code: z.string().trim().max(40).nullish(),
  description: z.string().trim().min(1).max(500),
  unit: z.string().trim().min(1).max(20),
});
export type EstimateLineCreate = z.infer<typeof EstimateLineCreate>;

/** One recorded measurement column, persisted the moment it is recorded. */
export const EstimateMeasurementAdd = EstimateMeasurement.extend({
  lineId: z.string().uuid(),
  label: z.string().trim().max(120).nullish(),
});
export type EstimateMeasurementAdd = z.infer<typeof EstimateMeasurementAdd>;
