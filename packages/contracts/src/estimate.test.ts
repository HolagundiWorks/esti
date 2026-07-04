import { describe, expect, it } from "vitest";
import {
  dimensionCount,
  lineQuantity,
  measurementQty,
  measurementRows,
} from "./estimate.js";

describe("dimensionCount", () => {
  it("maps units to sheet dimension rows", () => {
    expect(dimensionCount("m")).toBe(1);
    expect(dimensionCount("rm")).toBe(1);
    expect(dimensionCount("rmt")).toBe(1);
    expect(dimensionCount("sqm")).toBe(2);
    expect(dimensionCount("m2")).toBe(2);
    expect(dimensionCount("cum")).toBe(3);
    expect(dimensionCount("m3")).toBe(3);
    // imperial units are handled consistently with their metric counterparts
    expect(dimensionCount("rft")).toBe(1);
    expect(dimensionCount("ft")).toBe(1);
    expect(dimensionCount("sqft")).toBe(2);
    expect(dimensionCount("nos")).toBe(0);
    expect(dimensionCount("kg")).toBe(0);
    expect(dimensionCount("LS")).toBe(0);
    expect(dimensionCount(null)).toBe(0);
  });
});

describe("measurementRows", () => {
  it("shows Nos plus the unit's dimensions", () => {
    expect(measurementRows("rm")).toEqual(["Nos", "Length"]);
    expect(measurementRows("sqm")).toEqual(["Nos", "Length", "Breadth/Height"]);
    expect(measurementRows("cum")).toEqual(["Nos", "Length", "Breadth/Height", "Breadth/Height"]);
    expect(measurementRows("nos")).toEqual(["Qty"]);
  });
});

describe("measurementQty / lineQuantity", () => {
  it("multiplies only the dimensions the unit uses", () => {
    const m = { nos: 2, l: 4.5, b: 3, h: 0.15 };
    expect(measurementQty(m, "rm")).toBe(9);
    expect(measurementQty(m, "sqm")).toBe(27);
    expect(measurementQty(m, "cum")).toBeCloseTo(4.05, 5);
    expect(measurementQty(m, "nos")).toBe(2);
  });

  it("treats missing required dimensions as zero (incomplete column = no qty)", () => {
    expect(measurementQty({ nos: 2, l: 4 }, "cum")).toBe(0);
  });

  it("sums columns and rounds to 3 decimals", () => {
    const ms = [
      { nos: 1, l: 4.5, b: 3.0, h: 0.15 },
      { nos: 2, l: 3.2, b: 1.2, h: 0.15 },
    ];
    expect(lineQuantity(ms, "cum")).toBeCloseTo(3.177, 3);
    expect(lineQuantity([], "cum")).toBe(0);
  });
});
