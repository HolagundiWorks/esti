import { describe, expect, it } from "vitest";
import { canonicalUnit, normName, parseRateText } from "./import-text.js";

describe("canonicalUnit", () => {
  it("maps common Indian abbreviations", () => {
    expect(canonicalUnit("Cum")).toBe("m3");
    expect(canonicalUnit("Sqm")).toBe("m2");
    expect(canonicalUnit("bag")).toBe("bag");
    expect(canonicalUnit("Rmt")).toBe("m");
  });

  it("returns null for unknown units", () => {
    expect(canonicalUnit("widget")).toBeNull();
  });
});

describe("normName", () => {
  it("strips leading item numbers", () => {
    expect(normName("1. OPC 53 cement")).toBe("opc 53 cement");
  });
});

describe("parseRateText", () => {
  it("parses numbered material lines", () => {
    const { rows } = parseRateText("1. OPC 53 cement   bag   420\n2. River sand   Cum   2400", "material");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      description: "OPC 53 cement",
      rawUnit: "bag",
      ratePaise: 42000,
    });
    expect(rows[1]).toMatchObject({
      description: "River sand",
      rawUnit: "Cum",
      ratePaise: 240000,
    });
  });
});
