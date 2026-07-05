/**
 * BBS engine — element → bar schedule. Pure functions built on the verified
 * IS-code constants in bbs.ts (IS 456 / IS 2502). Given a member's geometry and
 * bar config, it computes each bar's count, cut length and weight, and rolls up
 * the schedule. This is the "enter geometry, get the schedule" automation core;
 * the Estimate app calls it, AORMS only displays the result.
 *
 * Detailing assumptions (all standard, all parameterised with sane defaults):
 *  - straight bar: cut = clearDim − 2·cover + 2·(hook 9d) − 2·(90° bend, 2d)
 *  - stirrup/tie (2-legged, 135° hooks): cut = 2(a+b) + 2·(10d) − 3·(90° bend, 2d)
 *  - column vertical: cut = height + tension lap (one splice per storey)
 */
import {
  HOOK_ALLOWANCE_D,
  BEND_DEDUCTION_D,
  barCount,
  barUnitWeightKgM,
  effectiveCoverMm,
  lapLengthMm,
  type SteelGrade,
} from "./bbs.js";

export type Exposure = "mild" | "moderate" | "severe" | "verySevere" | "extreme";
export type BarRole =
  | "main"
  | "distribution"
  | "top"
  | "stirrup"
  | "tie"
  | "vertical"
  | "bent-up"
  | "dowel";

export interface BbsBar {
  mark: string;
  role: BarRole;
  diaMm: number;
  nos: number;
  cutLengthMm: number;
  unitWtKgM: number;
  weightKg: number;
  shape: string;
}

export interface BbsMember {
  element: "SLAB" | "BEAM" | "COLUMN" | "FOOTING";
  ref?: string;
  bars: BbsBar[];
  totalWeightKg: number;
  byDiameter: { diaMm: number; weightKg: number }[];
}

interface CommonInput {
  ref?: string;
  coverMm?: number;
  exposure?: Exposure;
  concreteGradeMpa: number;
  steelGrade: SteelGrade;
  /** Standard end hook, in bar diameters (default 9d, IS 2502 mild-steel value). */
  hookD?: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

function bar(mark: string, role: BarRole, diaMm: number, nos: number, cutLengthMm: number, shape: string): BbsBar {
  const unitWtKgM = barUnitWeightKgM(diaMm);
  return {
    mark,
    role,
    diaMm,
    nos,
    cutLengthMm: Math.round(cutLengthMm),
    unitWtKgM: round(unitWtKgM),
    weightKg: round((cutLengthMm / 1000) * unitWtKgM * nos),
    shape,
  };
}

function assemble(element: BbsMember["element"], ref: string | undefined, bars: BbsBar[]): BbsMember {
  const byDia = new Map<number, number>();
  let total = 0;
  for (const b of bars) {
    total += b.weightKg;
    byDia.set(b.diaMm, (byDia.get(b.diaMm) ?? 0) + b.weightKg);
  }
  return {
    element,
    ref,
    bars,
    totalWeightKg: round(total),
    byDiameter: [...byDia.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([diaMm, weightKg]) => ({ diaMm, weightKg: round(weightKg) })),
  };
}

/** Straight bar cut length: clearDim − 2·cover + 2·hook − 2·(90° bend deduction). */
function straightCut(clearDimMm: number, coverMm: number, diaMm: number, hookD: number): number {
  return clearDimMm - 2 * coverMm + 2 * hookD * diaMm - 2 * BEND_DEDUCTION_D[90] * diaMm;
}

/** 2-legged closed stirrup/tie cut length around an (a × b) core with 135° hooks. */
function stirrupCut(sideAMm: number, sideBMm: number, diaMm: number): number {
  const a = sideAMm; // core width  = section − 2·cover
  const b = sideBMm; // core depth  = section − 2·cover
  const hook = 10 * diaMm; // 135° hook, standard 10d each
  return 2 * (a + b) + 2 * hook - 3 * BEND_DEDUCTION_D[90] * diaMm;
}

// ── Slab (one-way: bottom main + distribution) ────────────────────────────────
export interface SlabInput extends CommonInput {
  lengthMm: number; // span in the main-bar direction
  widthMm: number;
  mainDiaMm: number;
  mainSpacingMm: number;
  distDiaMm: number;
  distSpacingMm: number;
}
export function computeSlabBBS(i: SlabInput): BbsMember {
  const cover = i.coverMm ?? effectiveCoverMm("slab", i.exposure ?? "mild");
  const hookD = i.hookD ?? HOOK_ALLOWANCE_D[2]; // 9d
  const main = bar(
    "S1",
    "main",
    i.mainDiaMm,
    barCount(i.widthMm, i.mainSpacingMm),
    straightCut(i.lengthMm, cover, i.mainDiaMm, hookD),
    "straight",
  );
  const dist = bar(
    "S2",
    "distribution",
    i.distDiaMm,
    barCount(i.lengthMm, i.distSpacingMm),
    straightCut(i.widthMm, cover, i.distDiaMm, hookD),
    "straight",
  );
  return assemble("SLAB", i.ref, [main, dist]);
}

// ── Beam (simply supported: bottom + top longitudinal + 2-legged stirrups) ─────
export interface BeamInput extends CommonInput {
  clearSpanMm: number;
  widthMm: number;
  depthMm: number;
  bottomDiaMm: number;
  bottomNos: number;
  topDiaMm: number;
  topNos: number;
  stirrupDiaMm: number;
  stirrupSpacingMm: number;
}
export function computeBeamBBS(i: BeamInput): BbsMember {
  const cover = i.coverMm ?? effectiveCoverMm("beam", i.exposure ?? "moderate");
  const hookD = i.hookD ?? HOOK_ALLOWANCE_D[2];
  const bottom = bar(
    "B1",
    "main",
    i.bottomDiaMm,
    i.bottomNos,
    straightCut(i.clearSpanMm, cover, i.bottomDiaMm, hookD),
    "straight",
  );
  const top = bar("B2", "top", i.topDiaMm, i.topNos, straightCut(i.clearSpanMm, cover, i.topDiaMm, hookD), "straight");
  const stirrup = bar(
    "B3",
    "stirrup",
    i.stirrupDiaMm,
    barCount(i.clearSpanMm, i.stirrupSpacingMm),
    stirrupCut(i.widthMm - 2 * cover, i.depthMm - 2 * cover, i.stirrupDiaMm),
    "stirrup",
  );
  return assemble("BEAM", i.ref, [bottom, top, stirrup]);
}

// ── Column (vertical bars + lateral ties) ─────────────────────────────────────
export interface ColumnInput extends CommonInput {
  heightMm: number; // storey clear height
  widthMm: number;
  depthMm: number;
  verticalDiaMm: number;
  verticalNos: number;
  tieDiaMm: number;
  tieSpacingMm: number;
}
export function computeColumnBBS(i: ColumnInput): BbsMember {
  const cover = i.coverMm ?? effectiveCoverMm("column", i.exposure ?? "moderate");
  const lap = lapLengthMm(i.verticalDiaMm, i.steelGrade, i.concreteGradeMpa, "compression");
  const vertical = bar("C1", "vertical", i.verticalDiaMm, i.verticalNos, i.heightMm + lap, "straight+lap");
  const tie = bar(
    "C2",
    "tie",
    i.tieDiaMm,
    barCount(i.heightMm, i.tieSpacingMm),
    stirrupCut(i.widthMm - 2 * cover, i.depthMm - 2 * cover, i.tieDiaMm),
    "tie",
  );
  return assemble("COLUMN", i.ref, [vertical, tie]);
}

// ── Footing (two-way bottom mesh) ─────────────────────────────────────────────
export interface FootingInput extends CommonInput {
  lengthMm: number;
  widthMm: number;
  xDiaMm: number;
  xSpacingMm: number;
  yDiaMm: number;
  ySpacingMm: number;
}
export function computeFootingBBS(i: FootingInput): BbsMember {
  const cover = i.coverMm ?? effectiveCoverMm("footing", i.exposure ?? "moderate");
  const hookD = i.hookD ?? HOOK_ALLOWANCE_D[2];
  const xbar = bar(
    "F1",
    "main",
    i.xDiaMm,
    barCount(i.widthMm, i.xSpacingMm),
    straightCut(i.lengthMm, cover, i.xDiaMm, hookD),
    "straight",
  );
  const ybar = bar(
    "F2",
    "distribution",
    i.yDiaMm,
    barCount(i.lengthMm, i.ySpacingMm),
    straightCut(i.widthMm, cover, i.yDiaMm, hookD),
    "straight",
  );
  return assemble("FOOTING", i.ref, [xbar, ybar]);
}

export type MemberInput =
  | ({ element: "SLAB" } & SlabInput)
  | ({ element: "BEAM" } & BeamInput)
  | ({ element: "COLUMN" } & ColumnInput)
  | ({ element: "FOOTING" } & FootingInput);

/** Dispatch to the right element engine. */
export function computeMemberBBS(input: MemberInput): BbsMember {
  switch (input.element) {
    case "SLAB":
      return computeSlabBBS(input);
    case "BEAM":
      return computeBeamBBS(input);
    case "COLUMN":
      return computeColumnBBS(input);
    case "FOOTING":
      return computeFootingBBS(input);
  }
}

/** Roll up many members into one schedule grouped by diameter. */
export function scheduleByDiameter(members: BbsMember[]): { diaMm: number; weightKg: number }[] {
  const byDia = new Map<number, number>();
  for (const m of members)
    for (const d of m.byDiameter) byDia.set(d.diaMm, (byDia.get(d.diaMm) ?? 0) + d.weightKg);
  return [...byDia.entries()].sort((a, b) => a[0] - b[0]).map(([diaMm, weightKg]) => ({ diaMm, weightKg: round(weightKg) }));
}
