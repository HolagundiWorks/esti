import { describe, expect, it } from "vitest";
import {
  AORMS_CODE_RE,
  aormsCode,
  ComponentMasterCreate,
  evalFormula,
  parseAormsCode,
  percentageLineAmount,
} from "./estimation.js";

describe("aormsCode", () => {
  it("builds a padded [LEVEL]-[DISC]-[COMP]-[SEQ] code", () => {
    expect(aormsCode("SB", "STR", "FT", 1)).toBe("SB-STR-FT-01");
    expect(aormsCode("l2", "str", "col", 12)).toBe("L2-STR-COL-12");
  });

  it("round-trips through parseAormsCode", () => {
    expect(parseAormsCode("SB-STR-FT-01")).toEqual({
      level: "SB",
      discipline: "STR",
      component: "FT",
      sequence: 1,
    });
  });

  it("rejects malformed codes", () => {
    expect(parseAormsCode("not a code")).toBeNull();
    expect(parseAormsCode("SB-STR-FT")).toBeNull();
    expect(AORMS_CODE_RE.test("SB-STR-FT-01")).toBe(true);
  });

  it("is enforced by ComponentMasterCreate", () => {
    const bad = ComponentMasterCreate.safeParse({
      code: "bad code",
      name: "x",
      level: "SB",
      discipline: "STR",
      componentType: "FOOTING",
      uom: "cum",
      formulaKey: "VOLUME_LWH",
    });
    expect(bad.success).toBe(false);
  });
});

describe("evalFormula", () => {
  it("computes volume, area, length, steel weight and count", () => {
    expect(evalFormula("VOLUME_LWH", { length: 2, width: 1.5, height: 0.6 })).toBe(1.8);
    expect(evalFormula("AREA_LW", { length: 4, width: 3 })).toBe(12);
    expect(evalFormula("LENGTH_DIRECT", { length: 7 })).toBe(7);
    expect(evalFormula("COUNT", { count: 9 })).toBe(9);
    // 6 m of 12 mm bar: 6 × 144/162 = 5.3333 → 4 dp
    expect(evalFormula("WEIGHT_STEEL", { length: 6, dia: 12 })).toBe(5.3333);
  });

  it("throws on missing inputs", () => {
    expect(() => evalFormula("VOLUME_LWH", { length: 2, width: 1.5 })).toThrow();
  });
});

describe("percentageLineAmount", () => {
  it("rounds a percentage of a paise basis", () => {
    expect(percentageLineAmount(1_000_000, 5)).toBe(50_000);
    expect(percentageLineAmount(333_333, 3)).toBe(10_000); // 9999.99 → 10000
  });
});
