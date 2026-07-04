import { describe, expect, it } from "vitest";
import {
  EstimateMeasurement,
  deriveColumn,
  derivationChildDims,
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

describe("deductions (negative Nos)", () => {
  it("schema accepts a negative Nos but rejects a negative dimension", () => {
    expect(EstimateMeasurement.safeParse({ nos: -1, l: 1, b: 2.1 }).success).toBe(true);
    expect(EstimateMeasurement.safeParse({ nos: 1, l: -1 }).success).toBe(false);
  });
  it("a deduction column subtracts from the line total", () => {
    const ms = [
      { nos: 1, l: 10, b: 3 }, // +30 m²
      { nos: -1, l: 1.0, b: 2.1 }, // door void −2.1 m²
    ];
    expect(lineQuantity(ms, "sqm")).toBeCloseTo(27.9, 3);
  });
});

describe("deriveColumn — dependency geometry (fixed L/B/H)", () => {
  it("column shuttering: perimeter × height = 2(L+B)·H", () => {
    // 300×450 column, 3.0 m high → 2(0.3+0.45)·3.0 = 4.5 m²
    const child = deriveColumn("PERIMETER_X_HEIGHT", { nos: 1, l: 0.3, b: 0.45, h: 3.0 });
    expect(child).toEqual({ nos: 1, l: 1.5, b: 3.0 });
    expect(measurementQty(child!, "sqm")).toBeCloseTo(4.5, 6);
  });
  it("beam shuttering: 3-side girth × length = (B+2H)·L", () => {
    // 230 wide × 450 deep × 4.0 long → (0.23+0.9)·4.0 = 4.52 m²
    const child = deriveColumn("THREE_SIDE_X_LENGTH", { nos: 1, l: 4.0, b: 0.23, h: 0.45 });
    expect(child!.nos).toBe(1);
    expect(child!.l).toBe(4.0);
    expect(child!.b).toBeCloseTo(1.13, 9); // 0.23 + 2·0.45 (float)
    expect(measurementQty(child!, "sqm")).toBeCloseTo(4.52, 6);
  });
  it("wall plaster: length × height = L·H (breadth/thickness ignored)", () => {
    const child = deriveColumn("LENGTH_X_HEIGHT", { nos: 1, l: 10, b: 0.23, h: 3 });
    expect(child).toEqual({ nos: 1, l: 10, b: 3 });
    expect(measurementQty(child!, "sqm")).toBe(30);
  });
  it("plan area: length × breadth = L·B (height ignored)", () => {
    const child = deriveColumn("LENGTH_X_BREADTH", { nos: 2, l: 4, b: 3, h: 0.15 });
    expect(child).toEqual({ nos: 2, l: 4, b: 3 });
    expect(measurementQty(child!, "sqm")).toBe(24);
  });
  it("carries a deduction (negative Nos) through to the child", () => {
    const child = deriveColumn("LENGTH_X_HEIGHT", { nos: -1, l: 1.0, b: 0.23, h: 2.1 });
    expect(child!.nos).toBe(-1);
    expect(measurementQty(child!, "sqm")).toBeCloseTo(-2.1, 6);
  });
  it("returns null for the non-geometric derivations", () => {
    expect(deriveColumn("MANUAL", { nos: 1, l: 1 })).toBeNull();
    expect(deriveColumn("RATIO", { nos: 1, l: 1 })).toBeNull();
  });

  it("declares a 2-D (area) child unit for every geometric derivation", () => {
    // Guard the engine must enforce: a geometric derivation on a non-2-D child
    // unit would silently miscompute, so the child unit must be an area.
    for (const d of ["PERIMETER_X_HEIGHT", "THREE_SIDE_X_LENGTH", "LENGTH_X_HEIGHT", "LENGTH_X_BREADTH"] as const) {
      expect(derivationChildDims(d)).toBe(2);
      expect(deriveColumn(d, { nos: 1, l: 1, b: 1, h: 1 })).not.toBeNull();
    }
    expect(derivationChildDims("MANUAL")).toBeNull();
    expect(derivationChildDims("RATIO")).toBeNull();
  });
});
