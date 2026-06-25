/**
 * BBS Calculation Engine — pure functions, no side effects.
 * Wraps the IS:456/IS:2502 functions from @esti/contracts with
 * higher-level bar positioning and BBS row computation.
 */
import {
  steelAutoPositionBars,
  steelWeight,
  steelStirrupCount,
  steelStirrupLength,
  steelUnitWeight,
  type SteelBbsRow,
} from "@esti/contracts";

export interface BarSpec {
  id: string;
  barMark: string;
  diaMm: number;
  barType: string;
  quantity: number;
  cuttingLengthMm?: number;
  shapeCode: string;
  posX?: number;
  posY?: number;
}

export interface StirrupSpec {
  id: string;
  diaMm: number;
  stirrupType: string;
  spacingMm: number;
  hookAngle: number;
  zone: string;
}

export interface ElementSpec {
  id: string;
  elementCode: string;
  elementType: string;
  lengthMm: number;
  widthMm: number;
  depthMm: number;
  coverMm: number;
  fck: number;
  fy: number;
}

export function autoPositionRebars(
  bars: BarSpec[],
  el: ElementSpec,
): BarSpec[] {
  const topBars = bars.filter(
    (b) => b.barType === "TOP_MAIN" || b.barType === "EXTRA_TOP",
  );
  const botBars = bars.filter(
    (b) => b.barType === "BOTTOM_MAIN" || b.barType === "EXTRA_BOTTOM",
  );
  const sideItems = bars.filter((b) => b.barType === "SIDE_FACE");
  const other = bars.filter(
    (b) =>
      !["TOP_MAIN", "EXTRA_TOP", "BOTTOM_MAIN", "EXTRA_BOTTOM", "SIDE_FACE"].includes(
        b.barType,
      ),
  );

  const positioned: BarSpec[] = [];

  for (const bar of [...topBars]) {
    const xs = steelAutoPositionBars(
      bar.quantity,
      el.widthMm,
      el.coverMm,
      bar.diaMm,
    );
    const y = el.depthMm - el.coverMm - bar.diaMm / 2;
    positioned.push({ ...bar, posX: xs[0] ?? el.widthMm / 2, posY: y });
  }

  for (const bar of [...botBars]) {
    const xs = steelAutoPositionBars(
      bar.quantity,
      el.widthMm,
      el.coverMm,
      bar.diaMm,
    );
    const y = el.coverMm + bar.diaMm / 2;
    positioned.push({ ...bar, posX: xs[0] ?? el.widthMm / 2, posY: y });
  }

  for (const bar of sideItems) {
    positioned.push({
      ...bar,
      posX: el.coverMm + bar.diaMm / 2,
      posY: el.depthMm / 2,
    });
  }

  return [...positioned, ...other];
}

export function computeBbsRows(
  el: ElementSpec,
  bars: BarSpec[],
  stirrups: StirrupSpec[],
): SteelBbsRow[] {
  const rows: SteelBbsRow[] = [];

  for (const b of bars) {
    const cl = b.cuttingLengthMm ?? el.lengthMm;
    const uw = steelUnitWeight(b.diaMm);
    rows.push({
      elementCode: el.elementCode,
      barMark: b.barMark,
      diaMm: b.diaMm,
      shapeCode: b.shapeCode,
      quantity: b.quantity,
      cuttingLengthMm: cl,
      totalLengthMm: cl * b.quantity,
      unitWeightKgPerM: Math.round(uw * 1000) / 1000,
      totalWeightKg: Math.round(steelWeight(b.diaMm, cl, b.quantity) * 100) / 100,
    });
  }

  let sIdx = 1;
  for (const s of stirrups) {
    const cl = Math.round(
      steelStirrupLength(el.widthMm, el.depthMm, el.coverMm, s.diaMm, s.hookAngle),
    );
    const qty = steelStirrupCount(el.lengthMm, s.spacingMm);
    const uw = steelUnitWeight(s.diaMm);
    rows.push({
      elementCode: el.elementCode,
      barMark: `S${sIdx++}`,
      diaMm: s.diaMm,
      shapeCode: "F",
      quantity: qty,
      cuttingLengthMm: cl,
      totalLengthMm: cl * qty,
      unitWeightKgPerM: Math.round(uw * 1000) / 1000,
      totalWeightKg: Math.round(steelWeight(s.diaMm, cl, qty) * 100) / 100,
    });
  }

  return rows;
}

export function totalSteelKg(rows: SteelBbsRow[]): number {
  return Math.round(rows.reduce((s, r) => s + r.totalWeightKg, 0) * 100) / 100;
}
