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
  /** Count multiplier — for 0-dimension units this IS the quantity. */
  nos: z.number().finite().nonnegative(),
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
