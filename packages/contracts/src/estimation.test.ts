import { describe, expect, it } from "vitest";
import {
  canTransitionEstimate,
  computeEstimateTotals,
  estimateItemAmountPaise,
  measurementQuantity,
  shapeForUnit,
} from "./estimation.js";

describe("shapeForUnit", () => {
  it("classifies volume units", () => {
    for (const u of ["cum", "Cu.M.", "CFT", "cft", "brass"]) {
      expect(shapeForUnit(u)).toBe("VOLUME");
    }
  });
  it("classifies area units", () => {
    for (const u of ["sqm", "Sq. M.", "sqft", "SFT"]) {
      expect(shapeForUnit(u)).toBe("AREA");
    }
  });
  it("classifies length units", () => {
    for (const u of ["rmt", "m", "Mtr", "rft", "ft"]) {
      expect(shapeForUnit(u)).toBe("LENGTH");
    }
  });
  it("classifies weight units", () => {
    for (const u of ["kg", "MT", "tonne", "quintal"]) {
      expect(shapeForUnit(u)).toBe("WEIGHT");
    }
  });
  it("classifies lump sum", () => {
    expect(shapeForUnit("LS")).toBe("LUMPSUM");
    expect(shapeForUnit("job")).toBe("LUMPSUM");
  });
  it("falls back to count for nos/each/blank", () => {
    expect(shapeForUnit("nos")).toBe("COUNT");
    expect(shapeForUnit("each")).toBe("COUNT");
    expect(shapeForUnit("")).toBe("COUNT");
  });
});

describe("measurementQuantity", () => {
  it("count: nos only (defaults to 1 when nos is 0)", () => {
    expect(measurementQuantity("COUNT", 0, 0, 0, 0, 0)).toBe(1);
    expect(measurementQuantity("COUNT", 5, 0, 0, 0, 0)).toBe(5);
  });
  it("length: nos x length", () => {
    expect(measurementQuantity("LENGTH", 2, 3, 0, 0, 0)).toBe(6);
  });
  it("area: nos x length x breadth(height)", () => {
    expect(measurementQuantity("AREA", 1, 4, 3, 0, 0)).toBe(12);
  });
  it("volume: nos x length x breadth x depth", () => {
    expect(measurementQuantity("VOLUME", 2, 2, 2, 2, 0)).toBe(16);
  });
  it("weight/lumpsum: direct quantity, ignoring dimensions", () => {
    expect(measurementQuantity("WEIGHT", 5, 5, 5, 5, 42)).toBe(42);
    expect(measurementQuantity("LUMPSUM", 5, 5, 5, 5, 1)).toBe(1);
  });
});

describe("estimateItemAmountPaise", () => {
  it("rounds rate x quantity to the nearest paise", () => {
    // 1234 paise/unit x 2.5 units = 3085 paise exactly
    expect(estimateItemAmountPaise(1234, 2.5)).toBe(3085);
    // 100 paise x 0.005 = 0.5, rounds to 1 (round-half-up)
    expect(estimateItemAmountPaise(100, 0.005)).toBe(1);
  });
});

describe("computeEstimateTotals", () => {
  it("rolls up subtotal -> contingency -> taxable -> GST -> grand total", () => {
    // Two items: 100000p x 2 = 200000p, 50000p x 1 = 50000p -> subtotal 250000p
    const items = [
      { ratePaise: 100_000, quantity: 2 },
      { ratePaise: 50_000, quantity: 1 },
    ];
    const t = computeEstimateTotals(items, 5, 18);
    expect(t.itemsSubtotalPaise).toBe(250_000);
    expect(t.contingencyPaise).toBe(12_500); // 5% of 250000
    expect(t.taxablePaise).toBe(262_500);
    expect(t.gstPaise).toBe(47_250); // 18% of 262500
    expect(t.grandTotalPaise).toBe(309_750);
  });

  it("zero contingency/GST leaves grand total equal to the subtotal", () => {
    const t = computeEstimateTotals([{ ratePaise: 1000, quantity: 10 }], 0, 0);
    expect(t.grandTotalPaise).toBe(10_000);
  });
});

describe("canTransitionEstimate", () => {
  it("allows the documented forward path", () => {
    expect(canTransitionEstimate("DRAFT", "FINALISED")).toBe(true);
    expect(canTransitionEstimate("FINALISED", "APPROVED")).toBe(true);
  });
  it("allows a finalised estimate back to draft for rework", () => {
    expect(canTransitionEstimate("FINALISED", "DRAFT")).toBe(true);
  });
  it("blocks skipping straight from draft to approved", () => {
    expect(canTransitionEstimate("DRAFT", "APPROVED")).toBe(false);
  });
  it("blocks any transition out of a cancelled estimate except back to draft", () => {
    expect(canTransitionEstimate("CANCELLED", "APPROVED")).toBe(false);
    expect(canTransitionEstimate("CANCELLED", "DRAFT")).toBe(true);
  });
});
