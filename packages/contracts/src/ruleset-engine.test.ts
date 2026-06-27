import { describe, expect, it } from "vitest";
import {
  aggregateMaterials,
  collectMaterials,
  deriveRuleSet,
  type RuleSetNode,
} from "./ruleset-engine.js";

function registry(nodes: RuleSetNode[]): Map<string, RuleSetNode> {
  return new Map(nodes.map((n) => [n.code, n]));
}

const BRICK_WALL: RuleSetNode = {
  code: "BW-230",
  name: "Brick Wall 230mm",
  uom: "cum",
  quantityFormula: "nos * length * height * thickness",
  boqSplitters: [{ outputName: "wall_area", formula: "nos * length * height", uom: "sqm" }],
  materialSplitters: [
    { materialName: "Bricks", formula: "quantity * 500", uom: "nos" },
    { materialName: "Cement", formula: "quantity * 1.5", uom: "bags" },
    { materialName: "Sand", formula: "quantity * 0.30", uom: "cum" },
  ],
  dependencies: [{ childCode: "PLASTER", quantityFormula: "wall_area * 2", sequence: 1 }],
};
const PLASTER: RuleSetNode = {
  code: "PLASTER",
  name: "Plastering",
  uom: "sqm",
  quantityFormula: "area",
  boqSplitters: [],
  materialSplitters: [],
  dependencies: [{ childCode: "PRIMER", quantityFormula: "quantity", sequence: 1 }],
};
const PRIMER: RuleSetNode = {
  code: "PRIMER",
  name: "Primer",
  uom: "sqm",
  quantityFormula: "area",
  boqSplitters: [],
  materialSplitters: [],
  dependencies: [{ childCode: "PAINT", quantityFormula: "quantity * 2", sequence: 1 }],
};
const PAINT: RuleSetNode = {
  code: "PAINT",
  name: "Paint",
  uom: "sqm",
  quantityFormula: "area",
  boqSplitters: [],
  materialSplitters: [],
  dependencies: [],
};

describe("ruleset-engine: Brick Wall → Plaster → Primer → Paint", () => {
  const reg = registry([BRICK_WALL, PLASTER, PRIMER, PAINT]);
  const derived = deriveRuleSet("BW-230", { nos: 2, length: 5, height: 3, thickness: 0.23 }, reg);

  it("derives the parent primary quantity (volume)", () => {
    expect(derived.quantity).toBe(6.9); // 2 * 5 * 3 * 0.23
  });

  it("splits the BOQ measurable output", () => {
    expect(derived.boq).toEqual([{ outputName: "wall_area", uom: "sqm", quantity: 30 }]);
  });

  it("splits materials off the primary quantity", () => {
    expect(derived.materials).toEqual([
      { materialName: "Bricks", uom: "nos", quantity: 3450 },
      { materialName: "Cement", uom: "bags", quantity: 10.35 },
      { materialName: "Sand", uom: "cum", quantity: 2.07 },
    ]);
  });

  it("auto-generates the dependency chain with mapped quantities", () => {
    const plaster = derived.children[0]!;
    expect(plaster.code).toBe("PLASTER");
    expect(plaster.quantity).toBe(60); // wall_area * 2 = 30 * 2

    const primer = plaster.children[0]!;
    expect(primer.code).toBe("PRIMER");
    expect(primer.quantity).toBe(60); // = plaster quantity

    const paint = primer.children[0]!;
    expect(paint.code).toBe("PAINT");
    expect(paint.quantity).toBe(120); // primer quantity * 2 coats
  });
});

describe("ruleset-engine: material rollup", () => {
  const reg = registry([BRICK_WALL, PLASTER, PRIMER, PAINT]);
  const tree = deriveRuleSet("BW-230", { nos: 2, length: 5, height: 3, thickness: 0.23 }, reg);

  it("collects materials across the whole tree", () => {
    expect(collectMaterials(tree)).toEqual([
      { materialName: "Bricks", uom: "nos", quantity: 3450 },
      { materialName: "Cement", uom: "bags", quantity: 10.35 },
      { materialName: "Sand", uom: "cum", quantity: 2.07 },
    ]);
  });

  it("aggregates duplicate materials by name + unit", () => {
    const agg = aggregateMaterials([
      { materialName: "Cement", uom: "bags", quantity: 10.35 },
      { materialName: "Cement", uom: "bags", quantity: 5 },
      { materialName: "Bricks", uom: "nos", quantity: 100 },
    ]);
    expect(agg).toEqual([
      { materialName: "Cement", uom: "bags", quantity: 15.35 },
      { materialName: "Bricks", uom: "nos", quantity: 100 },
    ]);
  });
});

describe("ruleset-engine: safety", () => {
  it("throws on an unknown dependency", () => {
    const reg = registry([
      { ...BRICK_WALL, dependencies: [{ childCode: "MISSING", quantityFormula: "quantity", sequence: 1 }] },
    ]);
    expect(() => deriveRuleSet("BW-230", { nos: 1, length: 1, height: 1, thickness: 1 }, reg)).toThrow(
      /Unknown dependency 'MISSING'/,
    );
  });

  it("throws on a cyclic dependency", () => {
    const a: RuleSetNode = {
      code: "A",
      name: "A",
      uom: "nos",
      quantityFormula: "1",
      boqSplitters: [],
      materialSplitters: [],
      dependencies: [{ childCode: "B", quantityFormula: "quantity", sequence: 1 }],
    };
    const b: RuleSetNode = { ...a, code: "B", name: "B", dependencies: [{ childCode: "A", quantityFormula: "quantity", sequence: 1 }] };
    expect(() => deriveRuleSet("A", {}, registry([a, b]))).toThrow(/Cyclic dependency/);
  });
});
