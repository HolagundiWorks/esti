import { describe, expect, it } from "vitest";
import {
  areaTokenToM2,
  formatResult,
  isIncompleteCalcExpr,
  lengthTokenToMeters,
  safeEval,
  tokenizeCalc,
  volumeTokenToM3,
} from "./FloatingCalculator.js";

describe("calc length tokens", () => {
  it("bare number = metres", () => {
    expect(lengthTokenToMeters("25")).toBe(25);
  });
  it("feet and inches", () => {
    expect(lengthTokenToMeters("36'3\"")).toBeCloseTo(36 * 0.3048 + 3 * 0.0254, 6);
  });
  it("feet only", () => {
    expect(lengthTokenToMeters("12'")).toBeCloseTo(12 * 0.3048, 6);
  });
  it("inches only", () => {
    expect(lengthTokenToMeters('6"')).toBeCloseTo(6 * 0.0254, 6);
  });
});

describe("calc area tokens", () => {
  it("m2 suffix", () => {
    expect(areaTokenToM2("25m2")).toBe(25);
    expect(areaTokenToM2("25m²")).toBe(25);
  });
  it("ft2 suffix converts to m²", () => {
    expect(areaTokenToM2("10.7639104167ft2")).toBeCloseTo(1, 6);
  });
});

describe("calc volume tokens", () => {
  it("m3 suffix", () => {
    expect(volumeTokenToM3("25m3")).toBe(25);
    expect(volumeTokenToM3("25m³")).toBe(25);
  });
  it("ft3 suffix converts to m³", () => {
    expect(volumeTokenToM3("35.314666721ft3")).toBeCloseTo(1, 6);
  });
});

describe("safeEval mixed units", () => {
  it("25 m + 36'3\"", () => {
    const imperial = 36 * 0.3048 + 3 * 0.0254;
    expect(safeEval(`25+36'3"`)?.value).toBeCloseTo(25 + imperial, 6);
    expect(safeEval(`25+36'3"`)?.dimension).toBe("length");
  });
  it("tokenises imperial", () => {
    expect(tokenizeCalc(`25+36'3"`)).toEqual(["25", "+", "36'3\""]);
  });
  it("adds cubic metres", () => {
    expect(safeEval("25m3+10m3")).toEqual({ value: 35, dimension: "volume" });
  });
  it("adds square metres", () => {
    expect(safeEval("25m2+10m2")).toEqual({ value: 35, dimension: "area" });
  });
  it("tokenises m3", () => {
    expect(tokenizeCalc("25m3+10m³")).toEqual(["25m3", "+", "10m³"]);
  });
  it("tokenises m2", () => {
    expect(tokenizeCalc("25m2+10m²")).toEqual(["25m2", "+", "10m²"]);
  });
});

describe("isIncompleteCalcExpr", () => {
  it("treats trailing operators as incomplete", () => {
    expect(isIncompleteCalcExpr("25+")).toBe(true);
    expect(isIncompleteCalcExpr("25*")).toBe(true);
    expect(isIncompleteCalcExpr("(25+3")).toBe(true);
  });
  it("treats partial imperial as incomplete", () => {
    expect(isIncompleteCalcExpr("36'3")).toBe(true);
    expect(isIncompleteCalcExpr("36'")).toBe(false);
  });
  it("treats complete expressions as not incomplete", () => {
    expect(isIncompleteCalcExpr("25+36'3\"")).toBe(false);
    expect(isIncompleteCalcExpr("25m2+10m2")).toBe(false);
  });
  it("treats garbage as not incomplete (shows invalid instead)", () => {
    expect(isIncompleteCalcExpr("25+abc")).toBe(false);
  });
});

describe("formatResult", () => {
  it("metric length", () => {
    expect(formatResult({ value: 25, dimension: "length" }, "metric")).toBe("25 m");
  });
  it("imperial length", () => {
    const m = 36 * 0.3048 + 3 * 0.0254;
    expect(formatResult({ value: m, dimension: "length" }, "imperial")).toMatch(/^\d+'[\d.]+"$/);
  });
  it("metric volume", () => {
    expect(formatResult({ value: 25, dimension: "volume" }, "metric")).toBe("25 m³");
  });
  it("imperial volume converts to cubic feet", () => {
    expect(formatResult({ value: 1, dimension: "volume" }, "imperial")).toBe("35.31466672 ft³");
  });
  it("metric area", () => {
    expect(formatResult({ value: 25, dimension: "area" }, "metric")).toBe("25 m²");
  });
  it("imperial area converts to square feet", () => {
    expect(formatResult({ value: 1, dimension: "area" }, "imperial")).toBe("10.76391042 ft²");
  });
});
