import { describe, expect, it } from "vitest";
import {
  DEMO_BEAM_230x600_M25,
  applySteelFlowCatalogEntry,
  sfCatalogBaseLengthMm,
  sfCatalogCuttingLengthMm,
} from "./steelflow-catalog.js";

describe("applySteelFlowCatalogEntry", () => {
  it("computes extra top/bottom at L/4 for a 6000 mm span", () => {
    const applied = applySteelFlowCatalogEntry(DEMO_BEAM_230x600_M25, 6000);
    expect(applied.widthMm).toBe(230);
    expect(applied.depthMm).toBe(600);
    expect(applied.fck).toBe(25);

    const extraTop = applied.rebars.find((r) => r.barMark === "ET1");
    expect(extraTop?.cuttingLengthMm).toBe(1500);

    const mainBottom = applied.rebars.find((r) => r.barMark === "B1");
    expect(mainBottom?.cuttingLengthMm).toBe(6000);
  });

  it("includes stirrups and skin reinforcement", () => {
    const applied = applySteelFlowCatalogEntry(DEMO_BEAM_230x600_M25, 5000);
    expect(applied.stirrups).toHaveLength(1);
    expect(applied.rebars.some((r) => r.barType === "SIDE_FACE")).toBe(true);
  });
});

describe("sfCatalogBaseLengthMm", () => {
  const extra = DEMO_BEAM_230x600_M25.rebars.find((r) => r.barMark === "ET1")!;

  it("uses span fraction for support extra bars", () => {
    expect(sfCatalogBaseLengthMm(extra, 8000, 25, 500)).toBe(2000);
  });

  it("returns development length when rule is DEVELOPMENT_LENGTH", () => {
    expect(
      sfCatalogCuttingLengthMm(
        { ...extra, lengthRule: "DEVELOPMENT_LENGTH" },
        6000,
        25,
        500,
      ),
    ).toBeGreaterThan(400);
  });
});
