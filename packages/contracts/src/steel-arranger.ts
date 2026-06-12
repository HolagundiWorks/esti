/**
 * SteelFlow AI — Interactive Steel Arranger + Automated BBS Generator.
 * Types, schemas, and pure calculation functions (IS:456 / IS:2502).
 *
 * ARCHITECTURE:
 *   Calculation Engine = Truth   (deterministic, no AI)
 *   Validation Engine  = Rules   (IS code checks)
 *   AI Agent           = Assistant (suggestions only, never calculations)
 */
import { z } from "zod";

// ─── Constants ────────────────────────────────────────────────────────────────

export const SF_BAR_DIAS = [6, 8, 10, 12, 16, 20, 25, 32] as const;
export type SfBarDia = (typeof SF_BAR_DIAS)[number];

export const SF_ELEMENT_TYPES = ["BEAM", "COLUMN", "SLAB", "FOOTING"] as const;
export type SfElementType = (typeof SF_ELEMENT_TYPES)[number];

export const SF_BAR_TYPES = [
  "TOP_MAIN",
  "BOTTOM_MAIN",
  "EXTRA_TOP",
  "EXTRA_BOTTOM",
  "SIDE_FACE",
] as const;
export type SfBarType = (typeof SF_BAR_TYPES)[number];

export const SF_BAR_TYPE_LABEL: Record<SfBarType, string> = {
  TOP_MAIN:     "Top main",
  BOTTOM_MAIN:  "Bottom main",
  EXTRA_TOP:    "Extra top",
  EXTRA_BOTTOM: "Extra bottom",
  SIDE_FACE:    "Side face",
};

export const SF_STIRRUP_TYPES = [
  "CLOSED",
  "OPEN",
  "TWO_LEG",
  "FOUR_LEG",
  "U_SHAPE",
  "DIAMOND",
] as const;
export type SfStirrupType = (typeof SF_STIRRUP_TYPES)[number];

export const SF_STIRRUP_LABEL: Record<SfStirrupType, string> = {
  CLOSED:  "Closed",
  OPEN:    "Open",
  TWO_LEG: "2-Leg",
  FOUR_LEG:"4-Leg",
  U_SHAPE: "U-Shape",
  DIAMOND: "Diamond",
};

export const SF_SHAPE_CODES = [
  "A", // straight
  "B", // L-shape
  "C", // Z-shape
  "D", // U-shape (hairpin)
  "E", // cranked
  "F", // closed stirrup
] as const;
export type SfShapeCode = (typeof SF_SHAPE_CODES)[number];

// ─── Session ──────────────────────────────────────────────────────────────────

export const SfSessionCreate = z.object({
  name: z.string().min(1).max(100),
  projectId: z.string().uuid().optional(),
});
export type SfSessionCreate = z.infer<typeof SfSessionCreate>;

// ─── Element ─────────────────────────────────────────────────────────────────

export const SfElementCreate = z.object({
  sessionId: z.string().uuid(),
  elementType: z.enum(SF_ELEMENT_TYPES),
  elementCode: z.string().min(1).max(20),
  lengthMm: z.number().int().min(300).max(30000),
  widthMm: z.number().int().min(100).max(3000),
  depthMm: z.number().int().min(100).max(3000),
  coverMm: z.number().int().min(15).max(75).default(25),
  fck: z.number().int().default(25),
  fy: z.number().int().default(500),
});
export type SfElementCreate = z.infer<typeof SfElementCreate>;

export const SfElementUpdate = SfElementCreate.partial().extend({
  id: z.string().uuid(),
});
export type SfElementUpdate = z.infer<typeof SfElementUpdate>;

// ─── Rebar ────────────────────────────────────────────────────────────────────

export const SfRebarCreate = z.object({
  elementId: z.string().uuid(),
  barMark: z.string().min(1).max(10),
  diaMm: z.number().int().refine((v): v is SfBarDia =>
    (SF_BAR_DIAS as readonly number[]).includes(v), { message: "Invalid bar diameter" }),
  barType: z.enum(SF_BAR_TYPES),
  quantity: z.number().int().min(1).max(50),
  cuttingLengthMm: z.number().int().min(100).optional(),
  shapeCode: z.string().max(4).default("A"),
  posX: z.number().optional(),
  posY: z.number().optional(),
});
export type SfRebarCreate = z.infer<typeof SfRebarCreate>;

export const SfRebarUpdate = SfRebarCreate.partial().extend({
  id: z.string().uuid(),
});
export type SfRebarUpdate = z.infer<typeof SfRebarUpdate>;

// ─── Stirrup ─────────────────────────────────────────────────────────────────

export const SfStirrupCreate = z.object({
  elementId: z.string().uuid(),
  diaMm: z.number().int().refine((v): v is SfBarDia =>
    (SF_BAR_DIAS as readonly number[]).includes(v), { message: "Invalid stirrup diameter" }),
  stirrupType: z.enum(SF_STIRRUP_TYPES),
  spacingMm: z.number().int().min(50).max(500),
  hookAngle: z.number().int().default(135),
  hookLengthMm: z.number().int().optional(),
  zone: z.enum(["FULL", "END_ZONE", "MID_ZONE"]).default("FULL"),
});
export type SfStirrupCreate = z.infer<typeof SfStirrupCreate>;

export const SfStirrupUpdate = SfStirrupCreate.partial().extend({
  id: z.string().uuid(),
});
export type SfStirrupUpdate = z.infer<typeof SfStirrupUpdate>;

// ─── BBS Row (computed, not stored) ──────────────────────────────────────────

export interface SfBbsRow {
  elementCode: string;
  barMark: string;
  diaMm: number;
  shapeCode: string;
  quantity: number;
  cuttingLengthMm: number;
  totalLengthMm: number;
  unitWeightKgPerM: number;
  totalWeightKg: number;
}

// ─── AI Review ────────────────────────────────────────────────────────────────

export const SfAiReviewInput = z.object({
  elementId: z.string().uuid(),
  sessionId: z.string().uuid(),
});
export type SfAiReviewInput = z.infer<typeof SfAiReviewInput>;

export interface SfAiReview {
  warnings: string[];
  suggestions: string[];
  summary: { totalSteelKg: number; steelPercentage: number };
}

// ─── Calculation Engine (IS:456 / IS:2502) ───────────────────────────────────

/** Unit weight of a steel bar, kg/m (IS standard formula D²/162). */
export function sfUnitWeight(diaMm: number): number {
  return (diaMm * diaMm) / 162;
}

/** Total steel weight in kg. */
export function sfSteelWeight(diaMm: number, lengthMm: number, qty: number): number {
  return sfUnitWeight(diaMm) * (lengthMm / 1000) * qty;
}

/**
 * Stirrup cutting length for a closed rectangular stirrup (IS:2502).
 * Returns length in mm.
 */
export function sfStirrupLength(
  widthMm: number,
  depthMm: number,
  coverMm: number,
  stirrupDiaMm: number,
  hookAngle: number = 135,
): number {
  // Clear inner dimensions (inside of stirrup)
  const a = widthMm - 2 * coverMm - stirrupDiaMm;
  const b = depthMm - 2 * coverMm - stirrupDiaMm;
  // Hook allowance: 10d for 135° hook
  const hookAllowance = hookAngle >= 135 ? 10 * stirrupDiaMm : 6 * stirrupDiaMm;
  // Bend deduction: 2 bends at 90° = 2×2d (IS:2502 Table 2)
  const bendDeduction = 4 * stirrupDiaMm;
  return 2 * (a + b) + 2 * hookAllowance - bendDeduction;
}

/** Number of stirrups for a given zone length and spacing. */
export function sfStirrupCount(lengthMm: number, spacingMm: number): number {
  return Math.floor(lengthMm / spacingMm) + 1;
}

/** Development length Ld in mm (IS:456 clause 26.2, simplified). */
export function sfDevelopmentLength(
  diaMm: number,
  fy: number = 500,
  fck: number = 25,
): number {
  // Design bond stress τbd for M25 (IS:456 Table 26): 1.4 MPa (Fe 415/500)
  const tau = fck >= 25 ? 1.4 : fck >= 20 ? 1.2 : 1.0;
  return Math.ceil((0.87 * fy * diaMm) / (4 * tau));
}

/** Minimum bar spacing (IS:456 clause 26.3.1). */
export function sfMinBarSpacing(diaMm: number, maxAggSizeMm: number = 20): number {
  return Math.max(diaMm, maxAggSizeMm + 5, 25);
}

/**
 * Auto-compute x positions for n bars in a row.
 * Returns array of x coordinates (mm from left face of beam).
 */
export function sfAutoPositionBars(
  n: number,
  beamWidthMm: number,
  coverMm: number,
  diaMm: number,
): number[] {
  if (n <= 0) return [];
  const usable = beamWidthMm - 2 * coverMm;
  if (n === 1) return [beamWidthMm / 2];
  const gap = usable / (n - 1);
  return Array.from({ length: n }, (_, i) => coverMm + i * gap);
}

// ─── Bent-bar cutting-length formulas (IS:2502) ───────────────────────────────

export const SF_SHAPE_CODE_LABEL: Record<string, string> = {
  A: "Straight",
  B: "L-bend (one end)",
  C: "Z-shape / S-bend",
  D: "Hairpin (U-shape)",
  E: "Cranked / cog",
  F: "Closed stirrup",
};

/**
 * Bend deduction per 90° bend (IS:2502 Table 2).
 * 1 bend × 2d.
 */
function bendDeduct(diaMm: number, bends: number = 1) {
  return 2 * diaMm * bends;
}

/** Hook allowance: 9d for 90°, 12d for 135°. */
function hookAllowance(diaMm: number, angle: number = 90) {
  return angle >= 135 ? 12 * diaMm : 9 * diaMm;
}

/**
 * Shape B — L-bend (one 90° leg at one end).
 * cuttingLength = mainLeg + sideLeg + 1 hook − 1 bend deduction
 */
export function sfLShapeCuttingLength(
  mainLegMm: number,
  sideLegMm: number,
  diaMm: number,
): number {
  return Math.ceil(mainLegMm + sideLegMm + hookAllowance(diaMm) - bendDeduct(diaMm));
}

/**
 * Shape D — Hairpin / U-shape (two parallel legs + bottom).
 * cuttingLength = 2×height + width + 2 hooks − 2 bend deductions
 */
export function sfHairpinCuttingLength(
  heightMm: number,
  widthMm: number,
  diaMm: number,
): number {
  return Math.ceil(
    2 * heightMm + widthMm + 2 * hookAllowance(diaMm) - bendDeduct(diaMm, 2),
  );
}

/**
 * Shape E — Cranked bar (one diagonal cranked portion in the middle).
 * Additional diagonal length = crankHeight / sin(θ) − crankHeight / tan(θ)
 * Applied twice (crank up + crank down) by default.
 */
export function sfCrankedBarCuttingLength(
  totalSpanMm: number,
  crankHeightMm: number,
  crankAngleDeg: number = 45,
): number {
  const theta = (crankAngleDeg * Math.PI) / 180;
  const diagonal = crankHeightMm / Math.sin(theta);
  const horizontal = crankHeightMm / Math.tan(theta);
  const extraPerCrank = diagonal - horizontal;
  return Math.ceil(totalSpanMm + 2 * extraPerCrank);
}

/**
 * Shape C — Z-shape / S-bend (two 90° bends, cranked between two parallel levels).
 * cuttingLength = leg1 + offset + leg2 + 2 hooks − 2 bend deductions
 */
export function sfZShapeCuttingLength(
  leg1Mm: number,
  offsetMm: number,
  leg2Mm: number,
  diaMm: number,
): number {
  return Math.ceil(leg1Mm + offsetMm + leg2Mm + 2 * hookAllowance(diaMm) - bendDeduct(diaMm, 2));
}

/**
 * Dispatcher: compute cutting length for any shape code given element length
 * and optional bent-bar dimensions.
 */
export function sfShapeCuttingLength(
  shapeCode: string,
  elementLengthMm: number,
  diaMm: number,
  opts: {
    leg2?: number;       // B: side leg
    hairpinH?: number;   // D: height
    hairpinW?: number;   // D: width
    crankH?: number;     // E: crank height
    crankAngle?: number; // E: crank angle (default 45)
    leg1?: number;       // C: first leg
    offset?: number;     // C: crank offset
  } = {},
): number {
  switch (shapeCode) {
    case "B":
      return sfLShapeCuttingLength(elementLengthMm, opts.leg2 ?? 300, diaMm);
    case "D":
      return sfHairpinCuttingLength(opts.hairpinH ?? 300, opts.hairpinW ?? 150, diaMm);
    case "E":
      return sfCrankedBarCuttingLength(elementLengthMm, opts.crankH ?? 50, opts.crankAngle ?? 45);
    case "C":
      return sfZShapeCuttingLength(opts.leg1 ?? 300, opts.offset ?? 150, opts.leg2 ?? 300, diaMm);
    default:
      return elementLengthMm; // A: straight
  }
}
