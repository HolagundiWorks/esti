import { describe, expect, it } from "vitest";
import { computeHosapeteZonal, computeZonalCompliance } from "./index.js";

describe("computeHosapeteZonal", () => {
  const base = {
    cityId: "hosapete" as const,
    zone: "Residential" as const,
    buildingType: "Residential building (single unit)",
    widthM: 12.5,
    depthM: 20,
    roadFrontM: 12,
    roadRearM: 0,
    roadLeftM: 0,
    roadRightM: 0,
    roadClass: "Other / local road (no building line)",
    tenements: 1,
    parkingQty: 0,
  };

  it("computes asymmetric side setbacks for residential width 12.5 m", () => {
    const r = computeHosapeteZonal(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.leftM).toBe(1.5);
    expect(r.rightM).toBe(2.0);
    expect(r.permissibleFar).toBe(1.75);
  });

  it("returns error for invalid dimensions via computeZonalCompliance", () => {
    const r = computeZonalCompliance({ ...base, widthM: 0 });
    expect(r.ok).toBe(false);
  });

  it("blocks cities without a wired calculator", () => {
    const r = computeZonalCompliance({ ...base, cityId: "pune" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("Pune");
  });
});
