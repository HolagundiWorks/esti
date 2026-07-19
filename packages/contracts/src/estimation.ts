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
 * and derives a rounded SI quantity; the estimate sheet stores float dimensions
 * and classifies the item's free-text `unit` into a MeasureShape.
 *
 * Rather than re-deriving through the second model (which would round twice and
 * could silently disagree), the import carries the book's already-derived
 * quantity across and only checks that the two units describe the *same kind of
 * measure*. A mismatch is refused, never converted.
 */
export const MEASUREMENT_UOM_SHAPE: Record<string, MeasureShape> = {
  RMT: "LENGTH",
  SQM: "AREA",
  CUM: "VOLUME",
  NOS: "COUNT",
  KG: "WEIGHT",
  LTR: "WEIGHT",
};

/**
 * Null when a measurement-book row may be imported onto an estimate item;
 * otherwise a human-readable reason to show the user.
 */
export function measurementImportError(rowUom: string, itemUnit: string): string | null {
  const rowShape = MEASUREMENT_UOM_SHAPE[rowUom.toUpperCase()];
  if (!rowShape) return `Unsupported measurement unit "${rowUom}".`;
  const itemShape = shapeForUnit(itemUnit);
  // LUMPSUM items take any quantity as a direct figure.
  if (itemShape === "LUMPSUM") return null;
  if (itemShape !== rowShape) {
    return `Unit mismatch: the measurement is ${rowUom} (${rowShape.toLowerCase()}) but the estimate item is "${itemUnit}" (${itemShape.toLowerCase()}). Import refused — fix the item unit or the measurement.`;
  }
  return null;
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

export const EstimateMeasurementUpsert = z.object({
  id: z.string().uuid().optional(),
  estimateItemId: z.string().uuid(),
  description: z.string().max(200).optional(),
  nos: z.number().default(1),
  length: z.number().default(0),
  breadth: z.number().default(0),
  depth: z.number().default(0),
  directQuantity: z.number().default(0),
});
export type EstimateMeasurementUpsert = z.infer<typeof EstimateMeasurementUpsert>;

/** Pull marked-up quantities from a measurement book onto one estimate item. */
export const EstimateImportFromMeasurementBook = z.object({
  estimateItemId: z.string().uuid(),
  measurementRowIds: z.array(z.string().uuid()).min(1).max(500),
});
export type EstimateImportFromMeasurementBook = z.infer<typeof EstimateImportFromMeasurementBook>;
