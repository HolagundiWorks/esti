import { describe, expect, it } from "vitest";
import {
  measurementBookQty,
  measurementColumnsForUnit,
  measurementRowQty,
  parseDsrCsvText,
} from "./boq.js";

describe("measurement book", () => {
  it("picks dimension columns from the unit", () => {
    expect(measurementColumnsForUnit("cum")).toEqual(["length", "breadth", "depth"]);
    expect(measurementColumnsForUnit("sqm")).toEqual(["length", "breadth"]);
    expect(measurementColumnsForUnit("Sq.M")).toEqual(["length", "breadth"]);
    expect(measurementColumnsForUnit("rmt")).toEqual(["length"]);
    expect(measurementColumnsForUnit("nos")).toEqual([]);
    expect(measurementColumnsForUnit("widget")).toEqual(["length", "breadth"]); // default
    expect(measurementColumnsForUnit(null)).toEqual(["length", "breadth"]);
  });

  it("computes a row qty as nos × filled dims (blanks count as 1)", () => {
    // Wall: 2 nos × 5m × 3m = 30 (area)
    expect(measurementRowQty({ label: "Wall A", nos: 2, length: 5, breadth: 3 })).toBe(30);
    // Beam: 1 × 4m length only (breadth/depth blank → 1)
    expect(measurementRowQty({ label: "Beam", nos: 1, length: 4 })).toBe(4);
    // Volume: 1 × 5 × 3 × 0.23 = 3.45
    expect(measurementRowQty({ label: "Slab", nos: 1, length: 5, breadth: 3, depth: 0.23 })).toBe(
      3.45,
    );
    // nos 0 → 0 regardless of dims
    expect(measurementRowQty({ label: "x", nos: 0, length: 5, breadth: 3 })).toBe(0);
  });

  it("sums the book into the parent quantity (rounded 4dp)", () => {
    const rows = [
      { label: "Wall A", nos: 2, length: 5, breadth: 3 }, // 30
      { label: "Wall B", nos: 1, length: 4, breadth: 3 }, // 12
    ];
    expect(measurementBookQty(rows)).toBe(42);
    expect(measurementBookQty([])).toBe(0);
  });
});

describe("parseDsrCsvText", () => {
  it("parses header and data rows with rates in rupees", () => {
    const text = `code,description,unit,rate
BM-230,Brick masonry,cum,8500
EXC-SITE,Excavation,cum,480`;
    const rows = parseDsrCsvText(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      code: "BM-230",
      description: "Brick masonry",
      unit: "cum",
      ratePaise: 850_000,
    });
  });

  it("skips invalid lines", () => {
    expect(parseDsrCsvText("BM-230,Only two cols")).toHaveLength(0);
  });
});
