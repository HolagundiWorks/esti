import { describe, expect, it } from "vitest";
import {
  computeBeamBBS,
  computeColumnBBS,
  computeFootingBBS,
  computeMemberBBS,
  computeSlabBBS,
  scheduleByDiameter,
} from "./bbs-engine.js";

describe("BBS engine — element → schedule", () => {
  it("slab: main + distribution bars, counts from spacing, positive weights", () => {
    const m = computeSlabBBS({
      lengthMm: 4000,
      widthMm: 5000,
      mainDiaMm: 12,
      mainSpacingMm: 150,
      distDiaMm: 8,
      distSpacingMm: 200,
      concreteGradeMpa: 25,
      steelGrade: "Fe500",
      coverMm: 15,
    });
    expect(m.element).toBe("SLAB");
    const main = m.bars.find((b) => b.role === "main")!;
    const dist = m.bars.find((b) => b.role === "distribution")!;
    expect(main.nos).toBe(Math.floor(5000 / 150) + 1); // 34
    expect(dist.nos).toBe(Math.floor(4000 / 200) + 1); // 21
    // main bar cut ≈ 4000 − 2·15 + 2·9·12 − 2·2·12 = 4138 mm
    expect(main.cutLengthMm).toBe(4138);
    expect(m.totalWeightKg).toBeGreaterThan(0);
    expect(m.byDiameter.map((d) => d.diaMm)).toEqual([8, 12]);
  });

  it("beam: stirrup count over span, stirrup cut wraps the core", () => {
    const m = computeBeamBBS({
      clearSpanMm: 6000,
      widthMm: 300,
      depthMm: 450,
      bottomDiaMm: 16,
      bottomNos: 3,
      topDiaMm: 12,
      topNos: 2,
      stirrupDiaMm: 8,
      stirrupSpacingMm: 150,
      concreteGradeMpa: 25,
      steelGrade: "Fe500",
      coverMm: 25,
    });
    const stirrup = m.bars.find((b) => b.role === "stirrup")!;
    expect(stirrup.nos).toBe(Math.floor(6000 / 150) + 1); // 41
    // core 250 × 400 (cover 25): 2(250+400) + 2·10·8 − 3·2·8 = 1300 + 160 − 48 = 1412
    expect(stirrup.cutLengthMm).toBe(1412);
    expect(m.bars.find((b) => b.role === "main")!.nos).toBe(3);
  });

  it("column: verticals carry a compression lap; ties count over height", () => {
    const m = computeColumnBBS({
      heightMm: 3000,
      widthMm: 300,
      depthMm: 300,
      verticalDiaMm: 20,
      verticalNos: 6,
      tieDiaMm: 8,
      tieSpacingMm: 150,
      concreteGradeMpa: 25,
      steelGrade: "Fe500",
    });
    const v = m.bars.find((b) => b.role === "vertical")!;
    expect(v.cutLengthMm).toBeGreaterThan(3000); // height + lap
    expect(m.bars.find((b) => b.role === "tie")!.nos).toBe(Math.floor(3000 / 150) + 1);
  });

  it("footing: two-way mesh; roll-up groups by diameter", () => {
    const f = computeFootingBBS({
      lengthMm: 2000,
      widthMm: 2000,
      xDiaMm: 12,
      xSpacingMm: 150,
      yDiaMm: 12,
      ySpacingMm: 150,
      concreteGradeMpa: 25,
      steelGrade: "Fe500",
    });
    expect(f.byDiameter).toHaveLength(1);
    expect(f.byDiameter[0]!.diaMm).toBe(12);

    const schedule = scheduleByDiameter([f, f]);
    expect(schedule[0]!.weightKg).toBeCloseTo(f.byDiameter[0]!.weightKg * 2, 1);
  });

  it("dispatcher routes by element", () => {
    const m = computeMemberBBS({
      element: "SLAB",
      lengthMm: 3000,
      widthMm: 3000,
      mainDiaMm: 10,
      mainSpacingMm: 150,
      distDiaMm: 8,
      distSpacingMm: 200,
      concreteGradeMpa: 20,
      steelGrade: "Fe415",
    });
    expect(m.element).toBe("SLAB");
  });
});
