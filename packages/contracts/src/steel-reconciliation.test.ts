import { describe, expect, it } from "vitest";
import {
  bbsDiameterSummary,
  bbsFloorSummary,
  steelReconLineVariance,
  steelReconTotals,
  steelWastageSeverity,
} from "./steel-reconciliation.js";

describe("bbsDiameterSummary", () => {
  it("sums weight per diameter, sorted ascending", () => {
    const out = bbsDiameterSummary([
      { diaMm: 16, weightKg: 100 },
      { diaMm: 8, weightKg: 20 },
      { diaMm: 16, weightKg: 50.5 },
      { diaMm: 8, weightKg: 5 },
    ]);
    expect(out).toEqual([
      { diaMm: 8, weightKg: 25 },
      { diaMm: 16, weightKg: 150.5 },
    ]);
  });

  it("treats missing weight as zero", () => {
    expect(bbsDiameterSummary([{ diaMm: 12 }, { diaMm: 12, weightKg: 30 }])).toEqual([
      { diaMm: 12, weightKg: 30 },
    ]);
  });

  it("is empty for no items", () => {
    expect(bbsDiameterSummary([])).toEqual([]);
  });
});

describe("bbsFloorSummary", () => {
  it("sums weight per floor and folds blank floors into a dash", () => {
    const out = bbsFloorSummary([
      { diaMm: 16, weightKg: 100, floor: "GF" },
      { diaMm: 16, weightKg: 40, floor: "FF" },
      { diaMm: 8, weightKg: 10, floor: "GF" },
      { diaMm: 8, weightKg: 5, floor: null },
      { diaMm: 8, weightKg: 5, floor: "  " },
    ]);
    expect(out).toEqual([
      { floor: "—", weightKg: 10 },
      { floor: "FF", weightKg: 40 },
      { floor: "GF", weightKg: 110 },
    ]);
  });
});

describe("steelWastageSeverity", () => {
  it("classifies against default 3% warn / 5% exceed thresholds", () => {
    expect(steelWastageSeverity(2)).toBe("WITHIN_LIMIT");
    expect(steelWastageSeverity(3)).toBe("WITHIN_LIMIT");
    expect(steelWastageSeverity(4)).toBe("WARNING");
    expect(steelWastageSeverity(5)).toBe("WARNING");
    expect(steelWastageSeverity(6)).toBe("EXCEEDED");
  });

  it("never flags negative wastage", () => {
    expect(steelWastageSeverity(-10)).toBe("WITHIN_LIMIT");
  });

  it("honours custom thresholds", () => {
    expect(steelWastageSeverity(8, { warnPct: 5, exceedPct: 10 })).toBe("WARNING");
    expect(steelWastageSeverity(12, { warnPct: 5, exceedPct: 10 })).toBe("EXCEEDED");
  });
});

describe("steelReconLineVariance", () => {
  it("computes wastage as issued − consumed with a percentage of issued", () => {
    const v = steelReconLineVariance({ scheduledKg: 1000, issuedKg: 1050, consumedKg: 1000 });
    expect(v.wastageKg).toBe(50);
    expect(v.wastagePct).toBeCloseTo(4.76, 2);
    expect(v.issuedVsScheduledKg).toBe(50);
    expect(v.issuedVsScheduledPct).toBe(5);
    expect(v.severity).toBe("WARNING");
  });

  it("flags an over-limit line", () => {
    const v = steelReconLineVariance({ scheduledKg: 100, issuedKg: 100, consumedKg: 90 });
    expect(v.wastageKg).toBe(10);
    expect(v.wastagePct).toBe(10);
    expect(v.severity).toBe("EXCEEDED");
  });

  it("guards divide-by-zero when nothing is issued", () => {
    const v = steelReconLineVariance({ scheduledKg: 0, issuedKg: 0, consumedKg: 0 });
    expect(v.wastagePct).toBe(0);
    expect(v.issuedVsScheduledPct).toBe(0);
    expect(v.severity).toBe("WITHIN_LIMIT");
  });
});

describe("steelReconTotals", () => {
  it("sums each column and derives total wastage", () => {
    const t = steelReconTotals([
      { scheduledKg: 1000, issuedKg: 1050, consumedKg: 1000 },
      { scheduledKg: 500, issuedKg: 520, consumedKg: 500 },
    ]);
    expect(t).toEqual({ scheduledKg: 1500, issuedKg: 1570, consumedKg: 1500, wastageKg: 70 });
  });

  it("is all zeros for no lines", () => {
    expect(steelReconTotals([])).toEqual({
      scheduledKg: 0,
      issuedKg: 0,
      consumedKg: 0,
      wastageKg: 0,
    });
  });
});
