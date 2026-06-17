import { describe, expect, it } from "vitest";
import {
  buildTakeoffEstimateLines,
  computeTakeoffBoq,
  matchTakeoffToDsr,
  takeoffElement,
  takeoffElementsForCategory,
} from "./takeoff.js";

describe("takeoff catalog", () => {
  it("includes standard wall thicknesses", () => {
    expect(takeoffElement("WALL_230")?.thicknessMm).toBe(230);
    expect(takeoffElement("WALL_115")?.label).toContain("4½");
    expect(takeoffElementsForCategory("WALL").length).toBeGreaterThan(3);
  });

  it("computes linear wall qty in rm from mm drawing unit", () => {
    const r = computeTakeoffBoq({
      elementTypeId: "WALL_230",
      measureKind: "LINEAR",
      realLength: 6000,
      unit: "mm",
    });
    expect(r.boqQty).toBe(6);
    expect(r.boqUnit).toBe("rm");
  });

  it("computes slab area in sqm", () => {
    const r = computeTakeoffBoq({
      elementTypeId: "SLAB_150",
      measureKind: "AREA",
      realLength: 1_000_000,
      unit: "mm",
    });
    expect(r.boqQty).toBe(1);
    expect(r.boqUnit).toBe("sqm");
  });

  it("computes column count", () => {
    const r = computeTakeoffBoq({
      elementTypeId: "COL_300x300",
      measureKind: "COUNT",
      realLength: 0,
      unit: "mm",
      itemCount: 4,
    });
    expect(r.boqQty).toBe(4);
    expect(r.boqUnit).toBe("nos");
  });

  it("matches takeoff element to DSR by code", () => {
    const dsr = matchTakeoffToDsr("WALL_230", [
      { id: "1", code: "BM-230", description: "Brick 230", unit: "rm", ratePaise: 125000 },
    ]);
    expect(dsr?.ratePaise).toBe(125000);
  });

  it("builds estimate lines with DSR rates", () => {
    const lines = buildTakeoffEstimateLines(
      [
        {
          elementTypeId: "WALL_230",
          label: "Grid A1",
          boqQty: 6,
          boqUnit: "rm",
          boqDescription: "Wall",
        },
      ],
      [{ id: "d1", code: "BM-230", description: "DSR wall 230", unit: "rm", ratePaise: 100000 }],
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]!.qty).toBe(6);
    expect(lines[0]!.ratePaise).toBe(100000);
    expect(lines[0]!.dsrMatched).toBe(true);
    expect(lines[0]!.takeoffNames).toEqual(["Grid A1"]);
  });
});
