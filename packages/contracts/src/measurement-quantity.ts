import type { HeightFrom, MeasureKind, MeasurementUom, PlanMarkerKind } from "./item-library.js";

export type DeriveQuantityInput = {
  measureKind: MeasureKind;
  uom: MeasurementUom;
  lengthMm: number | null | undefined;
  breadthMm: number | null | undefined;
  heightMm: number | null | undefined;
  count?: number;
};

/** Derive abstract-sheet quantity from mm dimensions. */
export function deriveMeasurementQuantity(input: DeriveQuantityInput): number {
  const L = input.lengthMm ?? 0;
  const B = input.breadthMm ?? 0;
  const H = input.heightMm ?? 0;
  const count = input.count ?? 1;

  switch (input.measureKind) {
    case "L":
      return roundQty(L / 1000);
    case "LB":
      return roundQty((L * B) / 1_000_000);
    case "LBH":
      return roundQty((L * B * H) / 1_000_000_000);
    case "COUNT":
      return roundQty(count);
    default:
      return 0;
  }
}

function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Display mm as metres with 3 dp (Indian abstract convention). */
export function formatDimensionMm(mm: number | null | undefined): string {
  if (mm == null || Number.isNaN(mm)) return "—";
  return (mm / 1000).toFixed(3);
}

/** Typical Indian RCC defaults (mm) — overridable per project. */
export const DEFAULT_SLAB_THICKNESS_MM = 150;
export const DEFAULT_BEAM_DEPTH_MM = 450;
export const DEFAULT_LINTEL_HEIGHT_MM = 150;

export type StructuralDeductionsMm = {
  slabThicknessMm: number;
  beamDepthMm: number;
  lintelHeightMm: number;
};

export type StructuralDeductionOverrides = {
  slabThicknessMm?: number | null;
  beamDepthMm?: number | null;
  lintelHeightMm?: number | null;
};

/**
 * Merge project defaults ← level overrides ← row overrides.
 * Null/undefined at a narrower scope inherits the broader value.
 */
export function resolveStructuralDeductions(
  project: StructuralDeductionsMm,
  level?: StructuralDeductionOverrides | null,
  row?: StructuralDeductionOverrides | null,
): StructuralDeductionsMm {
  return {
    slabThicknessMm: row?.slabThicknessMm ?? level?.slabThicknessMm ?? project.slabThicknessMm,
    beamDepthMm: row?.beamDepthMm ?? level?.beamDepthMm ?? project.beamDepthMm,
    lintelHeightMm: row?.lintelHeightMm ?? level?.lintelHeightMm ?? project.lintelHeightMm,
  };
}

export type DeriveElementHeightInput = {
  /** Full FFL-to-FFL (or FFL→roof) storey height for the owning level. */
  storeyHeightMm: number;
  recipe: HeightFrom;
  deductions: StructuralDeductionsMm;
};

/**
 * Element clear heights from level storey height:
 * - COLUMN = lvl − slab − beam
 * - WALL   = lvl − slab − beam − lintel
 * - STOREY / LEVEL = full lvl height
 * - MANUAL = null (caller supplies)
 */
export function deriveElementHeightMm(input: DeriveElementHeightInput): number | null {
  const H = Math.max(0, input.storeyHeightMm);
  const { slabThicknessMm, beamDepthMm, lintelHeightMm } = input.deductions;
  switch (input.recipe) {
    case "COLUMN":
      return Math.max(0, H - slabThicknessMm - beamDepthMm);
    case "WALL":
      return Math.max(0, H - slabThicknessMm - beamDepthMm - lintelHeightMm);
    case "STOREY":
    case "LEVEL":
      return H;
    case "MANUAL":
      return null;
    default:
      return null;
  }
}

/** Infer height recipe from library item markers / explicit defaultHeightFrom. */
export function resolveHeightRecipe(opts: {
  defaultHeightFrom?: HeightFrom | null;
  markerKinds?: PlanMarkerKind[] | null;
}): HeightFrom {
  if (opts.defaultHeightFrom && opts.defaultHeightFrom !== "MANUAL") {
    return opts.defaultHeightFrom;
  }
  const markers = opts.markerKinds ?? [];
  if (markers.includes("COLUMN")) return "COLUMN";
  if (markers.includes("WALL")) return "WALL";
  if (opts.defaultHeightFrom === "MANUAL") return "MANUAL";
  return "STOREY";
}
