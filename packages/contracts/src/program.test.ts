import { describe, expect, it } from "vitest";
import { summarizeProgram, type ProgramSpaceLike } from "./program.js";

const spaces: ProgramSpaceLike[] = [
  { id: "1", name: "Living", category: "LIVING", floorLevel: 0, unitAreaSqm: 30, count: 1 },
  { id: "2", name: "Bedroom", category: "BEDROOM", floorLevel: 1, unitAreaSqm: 18, count: 3 },
  { id: "3", name: "Bathroom", category: "BATHROOM", floorLevel: 1, unitAreaSqm: 5, count: 2 },
  { id: "4", name: "Kitchen", category: "KITCHEN", floorLevel: 0, unitAreaSqm: 12, count: 1 },
];

describe("summarizeProgram", () => {
  it("computes total area, rollups, and utilization within the envelope", () => {
    // total = 30 + 54 + 10 + 12 = 106
    const s = summarizeProgram(spaces, 236.25); // feasibility super-builtup
    expect(s.totalProgrammedAreaSqm).toBeCloseTo(106);
    expect(s.maxBuiltAreaSqm).toBe(236.25);
    expect(s.utilizationPct).toBeCloseTo((106 / 236.25) * 100);
    expect(s.remainingAreaSqm).toBeCloseTo(130.25);
    expect(s.overEnvelope).toBe(false);
    expect(s.floorsUsed).toBe(2);
  });

  it("flags over-envelope when programmed area exceeds feasibility", () => {
    const s = summarizeProgram(spaces, 100);
    expect(s.overEnvelope).toBe(true);
    expect(s.remainingAreaSqm).toBeCloseTo(-6);
  });

  it("returns null utilization when no feasibility envelope is set", () => {
    const s = summarizeProgram(spaces, 0);
    expect(s.utilizationPct).toBeNull();
    expect(s.remainingAreaSqm).toBeNull();
    expect(s.overEnvelope).toBe(false);
  });

  it("rolls up by floor ascending and by category by area desc", () => {
    const s = summarizeProgram(spaces, 236.25);
    expect(s.byFloor.map((f) => f.floorLevel)).toEqual([0, 1]);
    // floor 0 = 30 + 12 = 42; floor 1 = 54 + 10 = 64
    expect(s.byFloor[0]?.areaSqm).toBeCloseTo(42);
    expect(s.byFloor[1]?.areaSqm).toBeCloseTo(64);
    // bedrooms (54) is the largest category
    expect(s.byCategory[0]?.category).toBe("BEDROOM");
    expect(s.byCategory[0]?.areaSqm).toBeCloseTo(54);
  });

  it("multiplies unit area by count", () => {
    const s = summarizeProgram(
      [{ id: "x", name: "Cabin", category: "COMMERCIAL", floorLevel: 0, unitAreaSqm: 10, count: 5 }],
      0,
    );
    expect(s.spaces[0]?.areaSqm).toBe(50);
    expect(s.totalProgrammedAreaSqm).toBe(50);
  });
});
