import { describe, expect, it } from "vitest";
import {
  barCount,
  barUnitWeightKgM,
  crankExtraMm,
  developmentLengthMm,
  effectiveCoverMm,
  lapLengthMm,
} from "./bbs.js";

describe("BBS constants & formulas (IS 456 / IS 2502)", () => {
  it("bar unit weight = D²/162 (12 mm ≈ 0.888 kg/m)", () => {
    expect(barUnitWeightKgM(12)).toBeCloseTo(0.889, 3); // 144/162 = 0.8889
    expect(barUnitWeightKgM(8)).toBeCloseTo(0.395, 3);
    expect(barUnitWeightKgM(25)).toBeCloseTo(3.858, 3);
  });

  it("development length Fe500/M25 ≈ 48d, Fe415/M20 ≈ 47d (deformed)", () => {
    expect(developmentLengthMm(12, "Fe500", 25) / 12).toBeCloseTo(48.5, 0);
    expect(developmentLengthMm(16, "Fe415", 20) / 16).toBeCloseTo(47, 0);
  });

  it("tension lap = max(Ld, 30φ); never a flat 40d", () => {
    const lap = lapLengthMm(12, "Fe500", 25, "tension");
    expect(lap).toBeGreaterThanOrEqual(30 * 12);
    expect(lap).toBeCloseTo(developmentLengthMm(12, "Fe500", 25), 5); // Ld governs here (>30φ)
  });

  it("compression lap ≥ 24φ", () => {
    expect(lapLengthMm(10, "Fe500", 25, "compression")).toBeGreaterThanOrEqual(24 * 10);
  });

  it("effective cover = greater of element and exposure minima (footing severe = 50)", () => {
    expect(effectiveCoverMm("footing", "moderate")).toBe(50); // element 50 > exposure 30
    expect(effectiveCoverMm("slab", "severe")).toBe(45); // exposure 45 > element 15
  });

  it("bar count = floor(length/spacing)+1; crank extra = 0.42h", () => {
    expect(barCount(5000, 150)).toBe(34);
    expect(crankExtraMm(150)).toBeCloseTo(63, 5);
  });
});
