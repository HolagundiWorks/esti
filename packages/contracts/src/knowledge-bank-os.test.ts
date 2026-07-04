import { describe, expect, it } from "vitest";
import { specLaborCostPaise, specMaterialCostPaise, specRatePaise } from "./knowledge-bank-os.js";

describe("spec rate analysis (approach B)", () => {
  const materials = [
    // 0.25 m³ sand @ ₹800/m³ with 10% wastage → 0.25 × 1.1 × 80000 = 22000 paise
    { quantityPerUnit: 0.25, wastageFactor: 0.1, ratePaise: 80000 },
    // 1.5 bags cement @ ₹400/bag, no wastage → 1.5 × 40000 = 60000 paise
    { quantityPerUnit: 1.5, wastageFactor: 0, ratePaise: 40000 },
  ];
  const labor = [
    // 0.8 mason-day @ ₹700/day → 56000 paise
    { quantityPerUnit: 0.8, ratePaise: 70000 },
    // 1 helper-day @ ₹500/day → 50000 paise
    { quantityPerUnit: 1, ratePaise: 50000 },
  ];

  it("computes material cost with wastage", () => {
    expect(specMaterialCostPaise(materials)).toBe(22000 + 60000);
  });

  it("computes labour cost", () => {
    expect(specLaborCostPaise(labor)).toBe(56000 + 50000);
  });

  it("rate is material + labour build-up", () => {
    expect(specRatePaise(materials, labor)).toBe(82000 + 106000);
  });

  it("empty recipe → zero rate", () => {
    expect(specRatePaise([], [])).toBe(0);
  });

  it("rounds to whole paise", () => {
    // 0.333 × 1 × 100 = 33.3 → 33
    expect(specMaterialCostPaise([{ quantityPerUnit: 0.333, wastageFactor: 0, ratePaise: 100 }])).toBe(33);
  });
});
