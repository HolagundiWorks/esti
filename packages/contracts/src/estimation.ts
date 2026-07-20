import { z } from "zod";
import { pct } from "./money.js";
import type { TagColor } from "./schemas.js";

/**
 * Estimation (Rate Books + BOQ Estimates) — consultancy-scoped costing, ported
 * from the domain model + calculation logic of
 * github.com/HolagundiWorks/Construction-Billing-System (C++/wxWidgets desktop
 * app; MeasureShape classification and the qty/rate/contingency/GST rollup are
 * a direct port of its core/Units.cpp and domain/EstimateCalculator.cpp).
 * Deliberately excludes that app's Contracts/Running-Bills/BBS — those are
 * construction-administration territory AORMS scoped out in the 2026-06-29
 * consultancy-only pivot. This is the architect's own costed BOQ for a client,
 * not contractor billing.
 */

// --- Measurement shape — classifies a unit of measurement so the measurement
// book knows which dimension fields apply (mirrors core/Units.h DimSpec). ---

export const MeasureShape = z.enum(["COUNT", "LENGTH", "AREA", "VOLUME", "WEIGHT", "LUMPSUM"]);
export type MeasureShape = z.infer<typeof MeasureShape>;

export const MEASURE_SHAPE_LABEL: Record<MeasureShape, string> = {
  COUNT: "Count",
  LENGTH: "Length",
  AREA: "Area",
  VOLUME: "Volume",
  WEIGHT: "Weight (direct qty)",
  LUMPSUM: "Lump sum (direct qty)",
};

export interface ShapeDims {
  nos: boolean;
  length: boolean;
  breadth: boolean;
  depth: boolean;
  direct: boolean;
  lengthLabel?: string;
  breadthLabel?: string;
  depthLabel?: string;
}

export const SHAPE_DIMS: Record<MeasureShape, ShapeDims> = {
  COUNT: { nos: true, length: false, breadth: false, depth: false, direct: false },
  LENGTH: { nos: true, length: true, breadth: false, depth: false, direct: false, lengthLabel: "Length (m)" },
  AREA: {
    nos: true,
    length: true,
    breadth: true,
    depth: false,
    direct: false,
    lengthLabel: "Length (m)",
    breadthLabel: "Height (m)",
  },
  VOLUME: {
    nos: true,
    length: true,
    breadth: true,
    depth: true,
    direct: false,
    lengthLabel: "Length (m)",
    breadthLabel: "Breadth (m)",
    depthLabel: "Depth (m)",
  },
  WEIGHT: { nos: false, length: false, breadth: false, depth: false, direct: true },
  LUMPSUM: { nos: false, length: false, breadth: false, depth: false, direct: true },
};

/** Lower-cases and strips everything but letters/digits ("Sq. M." -> "sqm"). */
function normaliseUnit(unit: string): string {
  return unit.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Classifies a unit-of-measurement string into a MeasureShape, unit-string tolerant. */
export function shapeForUnit(unit: string): MeasureShape {
  const u = normaliseUnit(unit);
  if (!u) return "COUNT";

  if (
    u === "cum" || u === "cm" || u === "m3" || u === "cbm" || u.includes("cum") || u.includes("cubic") ||
    u === "cft" || u === "cuft" || u === "ft3" || u.includes("cuft") || u.includes("cft") || u === "brass"
  ) {
    return "VOLUME";
  }
  if (
    u === "sqm" || u === "m2" || u === "sm" || u === "sqft" || u === "sft" || u === "ft2" ||
    u.includes("sqm") || u.includes("sqmt") || u.includes("sqmtr") || u.includes("sqft") ||
    u.includes("sft") || u.includes("sq") || u.includes("square")
  ) {
    return "AREA";
  }
  if (
    u === "rmt" || u === "rm" || u === "m" || u === "mtr" || u === "rmtr" || u === "metre" || u === "meter" ||
    u === "lm" || u === "rft" || u === "ft" || u === "feet" || u === "foot" || u === "rf" ||
    u.includes("running") || u.includes("rmt") || u.includes("rft")
  ) {
    return "LENGTH";
  }
  if (
    u === "kg" || u === "kgs" || u === "kilogram" || u === "mt" || u === "ton" || u === "tonne" ||
    u === "tonnes" || u === "quintal" || u === "qtl" || u.includes("kg") || u.includes("ton") || u.includes("quintal")
  ) {
    return "WEIGHT";
  }
  if (u === "ls" || u === "lumpsum" || u === "lump" || u === "job" || u.includes("lump")) {
    return "LUMPSUM";
  }
  return "COUNT";
}

/** Quantity contributed by one measurement line, given the item's shape (mirrors measurementQuantity). */
export function measurementQuantity(
  shape: MeasureShape,
  nos: number,
  length: number,
  breadth: number,
  depth: number,
  directQuantity: number,
): number {
  const n = nos === 0 ? 1 : nos;
  switch (shape) {
    case "COUNT":
      return n;
    case "LENGTH":
      return n * length;
    case "AREA":
      return n * length * breadth;
    case "VOLUME":
      return n * length * breadth * depth;
    case "WEIGHT":
    case "LUMPSUM":
      return directQuantity;
  }
}

// --- Browser takeoff → estimate bridge (2026-07-19) ---

/**
 * The measurement book and the estimate sheet model quantities differently:
 * the book stores integer millimetres with a MeasurementUom (RMT/SQM/CUM/NOS...)
 * and derives a rounded SI quantity; the estimate sheet stores a free-text
 * `unit` string.
 *
 * The import carries the book's derived quantity across **unconverted**, so the
 * two units must be the *same unit* — not merely the same kind of measure.
 * Comparing MeasureShape is not enough: `shapeForUnit` maps both "sqm" and
 * "sqft" to AREA (Indian BOQs use both), so a shape check would happily import
 * 100 SQM onto a ₹/sqft item and understate it by 10.76x. Likewise KG onto MT
 * (1000x) and CUM onto cft (35.3x).
 *
 * So each MeasurementUom lists the item-unit spellings that mean exactly it.
 * Anything else is refused with a message naming both units. No conversion is
 * attempted: guessing between rate bases is how estimates go quietly wrong.
 */
export const MEASUREMENT_UOM_SHAPE: Record<string, MeasureShape> = {
  RMT: "LENGTH",
  SQM: "AREA",
  CUM: "VOLUME",
  NOS: "COUNT",
  KG: "WEIGHT",
  LTR: "WEIGHT",
};

/** Item-unit spellings that denote exactly the same unit as each MeasurementUom. */
const UOM_EQUIVALENT_UNITS: Record<string, readonly string[]> = {
  RMT: ["rmt", "rm", "rmtr", "m", "mt", "mtr", "metre", "meter", "runningmetre", "runningmeter"],
  SQM: ["sqm", "sqmt", "sqmtr", "sqmtrs", "m2", "sm", "squaremetre", "squaremeter"],
  CUM: ["cum", "cumt", "cumtr", "m3", "cbm", "cubicmetre", "cubicmeter"],
  NOS: ["nos", "no", "num", "number", "each", "ea", "pcs", "pc", "piece", "count", "job", "set"],
  KG: ["kg", "kgs", "kilogram", "kilograms", "kilo"],
  LTR: ["ltr", "l", "lit", "litre", "liter", "litres", "liters"],
};

/**
 * Null when a measurement-book row may be imported onto an estimate item;
 * otherwise a human-readable reason to show the user.
 */
export function measurementImportError(rowUom: string, itemUnit: string): string | null {
  const uom = rowUom.toUpperCase();
  const rowShape = MEASUREMENT_UOM_SHAPE[uom];
  if (!rowShape) return `Unsupported measurement unit "${rowUom}".`;

  const normalised = normaliseUnit(itemUnit);
  if (!normalised) return `The estimate item has no unit — set one before importing.`;

  if (UOM_EQUIVALENT_UNITS[uom]?.includes(normalised)) return null;

  // Same kind of measure but a different unit is the dangerous case: the
  // quantity would look plausible and be wrong by a conversion factor.
  const itemShape = shapeForUnit(itemUnit);
  if (itemShape === rowShape) {
    return `Unit mismatch: the measurement is in ${rowUom} but the estimate item is priced per "${itemUnit}". Both measure ${rowShape.toLowerCase()}, but importing would carry the figure across unconverted. Import refused — price the item per ${rowUom.toLowerCase()}, or re-measure in the item's unit.`;
  }
  return `Unit mismatch: the measurement is ${rowUom} (${rowShape.toLowerCase()}) but the estimate item is "${itemUnit}" (${itemShape.toLowerCase()}). Import refused — fix the item unit or the measurement.`;
}

// --- Estimate totals (mirrors EstimateCalculator::totals) ---

export interface EstimateTotals {
  itemsSubtotalPaise: number;
  contingencyPaise: number;
  taxablePaise: number;
  gstPaise: number;
  grandTotalPaise: number;
}

/** amount = round(rate * qty), same rounding rule as Money::multiplyQty. */
export function estimateItemAmountPaise(ratePaise: number, quantity: number): number {
  return Math.round(ratePaise * quantity);
}

export function computeEstimateTotalsFromSubtotal(
  itemsSubtotalPaise: number,
  contingencyPct: number,
  gstPct: number,
): EstimateTotals {
  const contingencyPaise = pct(itemsSubtotalPaise, contingencyPct);
  const taxablePaise = itemsSubtotalPaise + contingencyPaise;
  const gstPaise = pct(taxablePaise, gstPct);
  const grandTotalPaise = taxablePaise + gstPaise;
  return { itemsSubtotalPaise, contingencyPaise, taxablePaise, gstPaise, grandTotalPaise };
}

export function computeEstimateTotals(
  items: { ratePaise: number; quantity: number }[],
  contingencyPct: number,
  gstPct: number,
): EstimateTotals {
  const itemsSubtotalPaise = items.reduce(
    (sum, it) => sum + estimateItemAmountPaise(it.ratePaise, it.quantity),
    0,
  );
  return computeEstimateTotalsFromSubtotal(itemsSubtotalPaise, contingencyPct, gstPct);
}

// --- Status ---

export const EstimateStatus = z.enum(["DRAFT", "FINALISED", "APPROVED", "CANCELLED"]);
export type EstimateStatus = z.infer<typeof EstimateStatus>;

export const ESTIMATE_STATUS_LABEL: Record<EstimateStatus, string> = {
  DRAFT: "Draft",
  FINALISED: "Finalised",
  APPROVED: "Approved",
  CANCELLED: "Cancelled",
};

export const ESTIMATE_STATUS_TAG: Record<EstimateStatus, TagColor> = {
  DRAFT: "gray",
  FINALISED: "blue",
  APPROVED: "green",
  CANCELLED: "red",
};

/** Legal manual transitions for an estimate's document status. */
export const ESTIMATE_TRANSITIONS: Record<EstimateStatus, EstimateStatus[]> = {
  DRAFT: ["FINALISED", "CANCELLED"],
  FINALISED: ["APPROVED", "DRAFT", "CANCELLED"],
  APPROVED: ["CANCELLED"],
  CANCELLED: ["DRAFT"],
};

export function canTransitionEstimate(from: EstimateStatus, to: EstimateStatus): boolean {
  if (from === to) return true;
  return ESTIMATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Whether an estimate's contents (items, measurements, contingency, GST) may
 * still change. APPROVED means a number has been quoted to a client and
 * CANCELLED is closed, so both are frozen — re-price by moving the estimate
 * back to DRAFT, which leaves a status trail, or by raising a revision.
 *
 * `canTransitionEstimate` governs only the status field; this governs content.
 */
export function isEstimateEditable(status: EstimateStatus): boolean {
  return status === "DRAFT" || status === "FINALISED";
}

/** Null when the estimate may be edited, else a message naming why not. */
export function estimateLockedError(status: EstimateStatus): string | null {
  if (isEstimateEditable(status)) return null;
  return status === "APPROVED"
    ? "This estimate is approved and cannot be changed. Move it back to draft to re-price it."
    : "This estimate is cancelled and cannot be changed.";
}

// --- Input schemas ---

export const RateBookCreate = z.object({
  name: z.string().min(1).max(200),
  versionLabel: z.string().max(60).optional(),
  effectiveDate: z.string().date().optional(),
  description: z.string().max(2000).optional(),
});
export type RateBookCreate = z.infer<typeof RateBookCreate>;

export const RateBookItemUpsert = z.object({
  id: z.string().uuid().optional(),
  rateBookId: z.string().uuid(),
  itemCode: z.string().max(40).optional(),
  description: z.string().min(1).max(500),
  specification: z.string().max(2000).optional(),
  unit: z.string().min(1).max(30),
  ratePaise: z.number().int().nonnegative(),
});
export type RateBookItemUpsert = z.infer<typeof RateBookItemUpsert>;

export const EstimateCreate = z.object({
  projectId: z.string().uuid(),
  rateBookId: z.string().uuid(),
  title: z.string().min(1).max(200),
  date: z.string().date().optional(),
  contingencyPct: z.number().min(0).max(100).default(0),
  gstPct: z.number().min(0).max(100).default(0),
  notes: z.string().max(2000).optional(),
});
export type EstimateCreate = z.infer<typeof EstimateCreate>;

export const EstimateUpdateHeader = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  date: z.string().date().nullable().optional(),
  contingencyPct: z.number().min(0).max(100).optional(),
  gstPct: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type EstimateUpdateHeader = z.infer<typeof EstimateUpdateHeader>;

export const EstimateItemUpsert = z.object({
  id: z.string().uuid().optional(),
  estimateId: z.string().uuid(),
  rateBookItemId: z.string().uuid().optional(),
  itemCode: z.string().max(40).optional(),
  description: z.string().min(1).max(500),
  unit: z.string().min(1).max(30),
  quantity: z.number().nonnegative().default(0),
  ratePaise: z.number().int().nonnegative(),
  linkedItemId: z.string().uuid().optional(),
});
export type EstimateItemUpsert = z.infer<typeof EstimateItemUpsert>;

/**
 * Dimensions are non-negative and finite. A negative length silently subtracts
 * money — 1 x 10 x 5 then 1 x -10 x 5 nets an item to zero — and `1e400`
 * becomes Infinity, which reaches a bigint amount column as a driver error
 * rather than a validation message. Deductions belong in an explicit deduction
 * line, not a minus sign smuggled into a dimension.
 */
const dimension = (fallback: number) => z.number().finite().nonnegative().default(fallback);

export const EstimateMeasurementUpsert = z.object({
  id: z.string().uuid().optional(),
  estimateItemId: z.string().uuid(),
  description: z.string().max(200).optional(),
  nos: dimension(1),
  length: dimension(0),
  breadth: dimension(0),
  depth: dimension(0),
  directQuantity: dimension(0),
});
export type EstimateMeasurementUpsert = z.infer<typeof EstimateMeasurementUpsert>;

/** Pull marked-up quantities from a measurement book onto one estimate item. */
export const EstimateImportFromMeasurementBook = z.object({
  estimateItemId: z.string().uuid(),
  measurementRowIds: z.array(z.string().uuid()).min(1).max(500),
});
export type EstimateImportFromMeasurementBook = z.infer<typeof EstimateImportFromMeasurementBook>;
