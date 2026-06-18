import { describe, expect, it } from "vitest";
import { bbsItemTotals, barWeightPerM } from "./boq.js";
import { validateBbsItem, validateBbsSchedule } from "./bbs-validation.js";
import {
  BBS_ENGINEERING_FIXTURES,
  BBS_UNIT_WEIGHT_REFERENCE,
} from "./fixtures/bbs-engineering.js";
import { sfStirrupCount, sfStirrupLength, sfUnitWeight } from "./steel-arranger.js";

describe("BBS engineering fixtures", () => {
  for (const fx of BBS_ENGINEERING_FIXTURES) {
    it(`${fx.id}: ${fx.label}`, () => {
      const totals = bbsItemTotals(fx.input);
      expect(totals.totalBars).toBe(fx.expect.totalBars);
      expect(totals.totalLengthM).toBeCloseTo(fx.expect.totalLengthM, 2);
      expect(totals.weightKg).toBeCloseTo(fx.expect.weightKg, 1);

      const validation = validateBbsItem({ ...fx.input, weightKg: totals.weightKg });
      expect(validation.filter((v) => v.severity === "error")).toHaveLength(0);
    });
  }

  it("matches IS unit-weight reference table (D²/162)", () => {
    for (const row of BBS_UNIT_WEIGHT_REFERENCE) {
      expect(barWeightPerM(row.diaMm)).toBeCloseTo(row.kgPerM, 2);
      expect(sfUnitWeight(row.diaMm)).toBeCloseTo(row.kgPerM, 2);
    }
  });

  it("derives stirrup fixture from IS:2502 closed rectangular formula", () => {
    const cutting = sfStirrupLength(230, 600, 25, 8, 135);
    expect(cutting).toBe(1556);
    expect(sfStirrupCount(6000, 150)).toBe(41);

    const totals = bbsItemTotals({
      barMark: "S1",
      diaMm: 8,
      noOfMembers: 1,
      barsPerMember: 41,
      cuttingLengthMm: cutting,
    });
    expect(totals.weightKg).toBeCloseTo(25.19, 1);
  });
});

describe("validateBbsSchedule", () => {
  it("blocks empty schedules", () => {
    const result = validateBbsSchedule([]);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "EMPTY_SCHEDULE")).toBe(true);
  });

  it("passes a valid multi-row schedule", () => {
    const rows = BBS_ENGINEERING_FIXTURES.slice(0, 2).map((fx) => {
      const totals = bbsItemTotals(fx.input);
      return { ...fx.input, weightKg: totals.weightKg };
    });
    const result = validateBbsSchedule(rows);
    expect(result.ok).toBe(true);
    expect(result.itemCount).toBe(2);
    expect(result.totalWeightKg).toBeGreaterThan(0);
  });

  it("rejects invalid diameter", () => {
    const result = validateBbsItem({
      barMark: "X1",
      diaMm: 14,
      noOfMembers: 1,
      barsPerMember: 1,
      cuttingLengthMm: 1000,
    });
    expect(result.some((i) => i.code === "INVALID_DIA")).toBe(true);
  });
});
