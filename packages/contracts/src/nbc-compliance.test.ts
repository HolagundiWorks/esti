import { describe, expect, it } from "vitest";
import { NBC_RULES, NBC_ZONES, computeNbcPermissible, nbcZone } from "./nbc-compliance.js";

describe("NBC zones + rules data", () => {
  it("has 13 land-use zones and 21 NBC rules", () => {
    expect(NBC_ZONES).toHaveLength(13);
    expect(NBC_RULES).toHaveLength(21);
    expect(nbcZone("R-1")?.maxFar).toBe(1.8);
    expect(nbcZone("C-2")?.maxHeightM).toBe(45);
  });
});

describe("computeNbcPermissible", () => {
  it("derives the envelope for an R-1 plot (1000 m², 25×40, 25 frontage)", () => {
    const r = computeNbcPermissible({
      landUseCode: "R-1",
      siteAreaSqm: 1000,
      siteWidthM: 25,
      siteDepthM: 40,
      frontageM: 25,
    });
    expect(r.ok).toBe(true);
    expect(r.zoneLabel).toBe("R-1 — Primary Residential Zone");
    // FAR 1.8 → 1800 m² built-up; coverage 0.5 → 500 m²
    const builtUp = r.items.find((i) => i.label === "Max permissible built-up area");
    expect(builtUp?.value).toBe(1800);
    const coverage = r.items.find((i) => i.label === "Max ground coverage (by ratio)");
    expect(coverage?.value).toBe(500);
    // footprint after 3 m setbacks: (25-6)×(40-6) = 19×34 = 646; coverage 500 governs
    const footprint = r.items.find((i) => i.label === "Governing ground-floor footprint");
    expect(footprint?.value).toBe(500);
    // height 15 m / 3 = 5 floors
    const floorsByHeight = r.items.find((i) => i.label === "Max floors (by height)");
    expect(floorsByHeight?.value).toBe(5);
    // parking: ceil(1800 / 100) = 18 ECS
    const parking = r.items.find((i) => i.label === "Min parking for max build");
    expect(parking?.value).toBe(18);
    // grouped for display
    expect(Object.keys(r.groups)).toEqual([
      "FAR & Coverage",
      "Setbacks",
      "Height & Floors",
      "Parking & Open Space",
    ]);
  });

  it("flags a plot too small for setbacks (no buildable footprint)", () => {
    const r = computeNbcPermissible({
      landUseCode: "I-3", // 12/9/9/9 setbacks
      siteAreaSqm: 100,
      siteWidthM: 10,
      siteDepthM: 10,
      frontageM: 10,
    });
    expect(r.ok).toBe(true);
    const footprint = r.items.find((i) => i.label === "Buildable footprint within setbacks");
    expect(footprint?.value).toBe(0);
    expect(r.notes.some((n) => /too small for the required setbacks/.test(n))).toBe(true);
  });

  it("returns an error for an unknown zone", () => {
    const r = computeNbcPermissible({ landUseCode: "Z-9", siteAreaSqm: 500, siteWidthM: 20, siteDepthM: 25, frontageM: 20 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Unknown land-use code/);
  });
});
