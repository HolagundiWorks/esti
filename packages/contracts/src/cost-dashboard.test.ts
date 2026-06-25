import { describe, expect, it } from "vitest";
import {
  costOverrunPct,
  costStatusFor,
  deriveCostRiskNotes,
  type CostRiskItemLike,
  type CostRiskPackageLike,
} from "./cost-dashboard.js";

describe("costOverrunPct", () => {
  it("returns null when there is no estimate (Grey)", () => {
    expect(
      costOverrunPct({ estimatedPaise: 0, awardedPaise: 500, variationPaise: 0 }),
    ).toBeNull();
  });

  it("computes growth of (awarded + variations) over the estimate", () => {
    // estimate 100, awarded 110, variation 10 → projected 120 → +20%
    expect(
      costOverrunPct({ estimatedPaise: 10000, awardedPaise: 11000, variationPaise: 1000 }),
    ).toBeCloseTo(20);
  });

  it("is negative when the contract came in under estimate", () => {
    expect(
      costOverrunPct({ estimatedPaise: 10000, awardedPaise: 9000, variationPaise: 0 }),
    ).toBeCloseTo(-10);
  });
});

describe("costStatusFor", () => {
  const base = {
    contractPaise: 100000,
    variationPaise: 0,
    billedPaise: 0,
    openDeviations: 0,
    started: true,
  };

  it("is GREY when not started", () => {
    expect(costStatusFor({ ...base, started: false })).toBe("GREY");
  });

  it("is GREY when there is no contract value", () => {
    expect(costStatusFor({ ...base, contractPaise: 0 })).toBe("GREY");
  });

  it("is GREEN comfortably within budget", () => {
    expect(costStatusFor({ ...base, billedPaise: 50000 })).toBe("GREEN");
  });

  it("is AMBER at exactly 90% billed", () => {
    expect(costStatusFor({ ...base, billedPaise: 90000 })).toBe("AMBER");
  });

  it("is AMBER just under the ceiling", () => {
    expect(costStatusFor({ ...base, billedPaise: 99999 })).toBe("AMBER");
  });

  it("is RED when billed past the ceiling", () => {
    expect(costStatusFor({ ...base, billedPaise: 100001 })).toBe("RED");
  });

  it("counts approved variations toward the ceiling", () => {
    // ceiling 100000 + 20000 = 120000; 110000 billed → within, but ≥90% → AMBER
    expect(
      costStatusFor({ ...base, variationPaise: 20000, billedPaise: 110000 }),
    ).toBe("AMBER");
  });

  it("is RED while a deviation is still open, even if under budget", () => {
    expect(costStatusFor({ ...base, billedPaise: 10000, openDeviations: 1 })).toBe("RED");
  });
});

describe("deriveCostRiskNotes", () => {
  const cleanItem: CostRiskItemLike = {
    description: "M25 concrete",
    unit: "cum",
    cumulativeBilledQty: 50,
    contractedQty: 100,
    awardedRatePaise: 500000,
    estimateRatePaise: 500000,
  };
  const cleanPkg: CostRiskPackageLike = {
    name: "Civil works",
    ceilingPaise: 10000000,
    billedPaise: 4000000,
  };

  it("stays silent on a clean spine", () => {
    expect(
      deriveCostRiskNotes({ items: [cleanItem], packages: [cleanPkg] }),
    ).toEqual([]);
  });

  it("flags DUPLICATE_BILLING (HIGH) when an item is over-billed", () => {
    const notes = deriveCostRiskNotes({
      items: [{ ...cleanItem, cumulativeBilledQty: 120, contractedQty: 100 }],
      packages: [cleanPkg],
    });
    const dup = notes.find((n) => n.kind === "DUPLICATE_BILLING");
    expect(dup).toBeDefined();
    expect(dup!.severity).toBe("HIGH");
    expect(dup!.detail).toContain("20");
  });

  it("does not flag over-billing exactly at the contracted quantity", () => {
    const notes = deriveCostRiskNotes({
      items: [{ ...cleanItem, cumulativeBilledQty: 100, contractedQty: 100 }],
      packages: [cleanPkg],
    });
    expect(notes.some((n) => n.kind === "DUPLICATE_BILLING")).toBe(false);
  });

  it("flags UNBALANCED_BID (MEDIUM) past the ±25% threshold", () => {
    const notes = deriveCostRiskNotes({
      items: [{ ...cleanItem, awardedRatePaise: 650000, estimateRatePaise: 500000 }], // +30%
      packages: [cleanPkg],
    });
    const unb = notes.find((n) => n.kind === "UNBALANCED_BID");
    expect(unb).toBeDefined();
    expect(unb!.severity).toBe("MEDIUM");
    expect(unb!.detail).toContain("30%");
    expect(unb!.detail).toContain("above");
  });

  it("does not flag a rate exactly at the 25% threshold", () => {
    const notes = deriveCostRiskNotes({
      items: [{ ...cleanItem, awardedRatePaise: 625000, estimateRatePaise: 500000 }], // +25%
      packages: [cleanPkg],
    });
    expect(notes.some((n) => n.kind === "UNBALANCED_BID")).toBe(false);
  });

  it("skips the unbalanced check when there is no estimate baseline", () => {
    const notes = deriveCostRiskNotes({
      items: [{ ...cleanItem, awardedRatePaise: 999999, estimateRatePaise: 0 }],
      packages: [cleanPkg],
    });
    expect(notes.some((n) => n.kind === "UNBALANCED_BID")).toBe(false);
  });

  it("flags BILL_DEVIATION MEDIUM when billed just past the ceiling", () => {
    const notes = deriveCostRiskNotes({
      items: [cleanItem],
      packages: [{ ...cleanPkg, ceilingPaise: 10000000, billedPaise: 10500000 }], // +5%
    });
    const dev = notes.find((n) => n.kind === "BILL_DEVIATION");
    expect(dev).toBeDefined();
    expect(dev!.severity).toBe("MEDIUM");
  });

  it("escalates BILL_DEVIATION to HIGH past 110% of the awarded value", () => {
    const notes = deriveCostRiskNotes({
      items: [cleanItem],
      packages: [{ ...cleanPkg, ceilingPaise: 10000000, billedPaise: 12000000 }], // +20%
    });
    const dev = notes.find((n) => n.kind === "BILL_DEVIATION");
    expect(dev!.severity).toBe("HIGH");
  });
});
