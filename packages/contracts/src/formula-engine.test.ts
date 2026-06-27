import { describe, expect, it } from "vitest";
import { evaluate, extractVariables, parseExpression, validateExpression } from "./formula-engine.js";

describe("formula-engine: evaluate", () => {
  it("basic arithmetic + precedence + parentheses", () => {
    expect(evaluate("1 + 2 * 3")).toBe(7);
    expect(evaluate("(1 + 2) * 3")).toBe(9);
    expect(evaluate("10 / 4")).toBe(2.5);
    expect(evaluate("2 ^ 10")).toBe(1024);
    expect(evaluate("-5 + 3")).toBe(-2);
    expect(evaluate("7 % 3")).toBe(1);
  });

  it("brick wall volume — (nos*length*height*thickness)/1e9 (mm → cum)", () => {
    // Nos 2, Length 5000mm, Height 3000mm, Thickness 230mm
    const v = evaluate("(nos * length * height * thickness) / 1000000000", {
      nos: 2,
      length: 5000,
      height: 3000,
      thickness: 230,
    });
    expect(v).toBe(6.9); // 2*5000*3000*230 / 1e9 = 6.9 cum
  });

  it("material splitters off the primary volume", () => {
    const volume = 6.9;
    expect(evaluate("volume * 500", { volume })).toBe(3450); // bricks
    expect(evaluate("volume * 1.5", { volume })).toBe(10.35); // cement bags
    expect(evaluate("volume * 0.30", { volume })).toBe(2.07); // sand cum
  });

  it("dependency mappings — plaster both sides, paint coats", () => {
    const wall_area = 100;
    const plaster_area = evaluate("wall_area * 2", { wall_area });
    expect(plaster_area).toBe(200);
    const coats = 2;
    expect(evaluate("plaster_area * coats", { plaster_area, coats })).toBe(400);
  });

  it("deduction percentage", () => {
    // gross area 100, 12% openings deduction
    expect(evaluate("area * (1 - deduction / 100)", { area: 100, deduction: 12 })).toBe(88);
  });

  it("whitelisted functions", () => {
    expect(evaluate("max(a, b)", { a: 3, b: 7 })).toBe(7);
    expect(evaluate("round(area * 1.5)", { area: 6.9 })).toBe(10);
    expect(evaluate("ceil(volume * 1.5)", { volume: 6.9 })).toBe(11);
  });

  it("rounds the result to 4 dp", () => {
    expect(evaluate("1 / 3")).toBe(0.3333);
  });
});

describe("formula-engine: safety + errors", () => {
  it("rejects division and modulo by zero", () => {
    expect(() => evaluate("1 / 0")).toThrow(/Division by zero/);
    expect(() => evaluate("1 % 0")).toThrow(/Modulo by zero/);
  });

  it("rejects a missing variable", () => {
    expect(() => evaluate("length * width", { length: 5 })).toThrow(/'width'/);
  });

  it("rejects an unknown function (no arbitrary code)", () => {
    expect(() => evaluate("alert(1)")).toThrow(/Unknown function 'alert'/);
  });

  it("rejects malformed syntax", () => {
    expect(() => parseExpression("1 +")).toThrow();
    expect(() => parseExpression("(1 + 2")).toThrow();
    expect(() => parseExpression("1 2")).toThrow();
    expect(() => parseExpression("@")).toThrow();
  });
});

describe("formula-engine: introspection + validation", () => {
  it("extracts distinct variables, excluding function names", () => {
    expect(extractVariables("(nos * length * height) / 1000 + max(a, b)").sort()).toEqual([
      "a",
      "b",
      "height",
      "length",
      "nos",
    ]);
  });

  it("validates against an allowed variable set", () => {
    expect(validateExpression("wall_area * 2", ["wall_area"])).toEqual({ ok: true, unknownVars: [] });
    const bad = validateExpression("wall_area * coats", ["wall_area"]);
    expect(bad.ok).toBe(false);
    expect(bad.unknownVars).toEqual(["coats"]);
  });

  it("reports a parse error during validation", () => {
    const r = validateExpression("1 +", ["x"]);
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });
});
