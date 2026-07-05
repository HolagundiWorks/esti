/**
 * Bar Bending Schedule (BBS) constants + formulas, per primary Indian Standards
 * (IS 456:2000, IS 2502:1963, SP 34:1987, IS 1786:2008). All lengths in mm.
 * These values are cited/verified — see docs/esti/ESTIMATION-ARCHITECTURE.md §5.
 * Shared so the Estimate app, the ESE and AORMS all compute steel identically.
 */

export const STEEL_GRADE_FY = { Fe415: 415, Fe500: 500, Fe500D: 500, Fe550: 550, Fe550D: 550 } as const;
export type SteelGrade = keyof typeof STEEL_GRADE_FY;

export const STANDARD_BAR_DIAMETERS_MM = [6, 8, 10, 12, 16, 20, 25, 32] as const;

/** Bar unit mass (kg/m) = D²/162 (162.27 exact). e.g. 12 mm → 0.888. */
export function barUnitWeightKgM(diaMm: number): number {
  return (diaMm * diaMm) / 162;
}

/** Cut-length bend deduction, in bar diameters, per bend angle (IS 2502 practice). */
export const BEND_DEDUCTION_D: Record<45 | 90 | 135 | 180, number> = { 45: 1, 90: 2, 135: 3, 180: 4 };

/** Hook allowance (× dia) by bend coefficient k (IS 2502). k: 2 mild · 3 medium · 4 HYSD · 6 >25 mm. */
export const HOOK_ALLOWANCE_D: Record<2 | 3 | 4 | 6, number> = { 2: 9, 3: 11, 4: 13, 6: 17 };

/** Element minimum clear cover (mm) — SP 34 §4.1. Effective cover = max(element, exposure). */
export const ELEMENT_COVER_MM = { slab: 15, beam: 25, column: 40, footing: 50 } as const;
/** Durability cover by exposure (mm) — IS 456 Table 16. */
export const EXPOSURE_COVER_MM = { mild: 20, moderate: 30, severe: 45, verySevere: 50, extreme: 75 } as const;

export function effectiveCoverMm(
  element: keyof typeof ELEMENT_COVER_MM,
  exposure: keyof typeof EXPOSURE_COVER_MM,
): number {
  return Math.max(ELEMENT_COVER_MM[element], EXPOSURE_COVER_MM[exposure]);
}

/** Design bond stress τbd (N/mm²) — IS 456 cl.26.2.1.1. Plain bars in tension by grade;
 *  +60 % for deformed (HYSD) bars, +25 % in compression. */
export function designBondStress(
  concreteGradeMpa: number,
  opts: { deformed?: boolean; compression?: boolean } = {},
): number {
  const table: Record<number, number> = { 15: 1.0, 20: 1.2, 25: 1.4, 30: 1.5, 35: 1.7, 40: 1.9 };
  const g = concreteGradeMpa >= 40 ? 40 : concreteGradeMpa;
  let tbd = table[g] ?? 1.9;
  if (opts.deformed ?? true) tbd *= 1.6;
  if (opts.compression) tbd *= 1.25;
  return tbd;
}

/** Development length Ld (mm) — IS 456 cl.26.2.1: Ld = φ·σs/(4·τbd), σs = 0.87·fy. */
export function developmentLengthMm(
  diaMm: number,
  grade: SteelGrade,
  concreteGradeMpa: number,
  opts: { compression?: boolean } = {},
): number {
  const sigmaS = 0.87 * STEEL_GRADE_FY[grade];
  const tbd = designBondStress(concreteGradeMpa, { deformed: true, compression: opts.compression });
  return (diaMm * sigmaS) / (4 * tbd);
}

/** Lap length (mm) — IS 456 cl.26.2.5.1. Tension = max(Ld, 30φ); compression = max(Ld_comp, 24φ). */
export function lapLengthMm(
  diaMm: number,
  grade: SteelGrade,
  concreteGradeMpa: number,
  mode: "tension" | "compression",
): number {
  if (mode === "compression") {
    return Math.max(developmentLengthMm(diaMm, grade, concreteGradeMpa, { compression: true }), 24 * diaMm);
  }
  return Math.max(developmentLengthMm(diaMm, grade, concreteGradeMpa), 30 * diaMm);
}

/** Slab crank (45° bent-up) extra length = 0.42 × h, h = vertical crank height (mm). */
export function crankExtraMm(crankHeightMm: number): number {
  return 0.42 * crankHeightMm;
}

/** Number of bars over a run = ⌊length / spacing⌋ + 1. */
export function barCount(clearLengthMm: number, spacingMm: number): number {
  return Math.floor(clearLengthMm / spacingMm) + 1;
}
