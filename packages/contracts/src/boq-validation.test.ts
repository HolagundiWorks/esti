import { describe, expect, it } from "vitest";
import {
  BoqValidationItem,
  summarizeBoqValidation,
  validateBoqItems,
} from "./boq-validation.js";

/** A fully-valid base line; spread + override to craft each case. */
function item(over: Partial<BoqValidationItem> & { id: string }): BoqValidationItem {
  return {
    description: "Cement concrete 1:2:4",
    unit: "cum",
    qty: 10,
    ratePaise: 500000,
    costHead: "STRUCTURE",
    calculationType: "RATE_BOOK",
    pct: null,
    basisSelector: {},
    componentId: null,
    estimateComponentId: null,
    sortOrder: 0,
    ...over,
  };
}

function kinds(items: BoqValidationItem[]): string[] {
  return validateBoqItems(items).map((i) => i.kind);
}

describe("validateBoqItems", () => {
  it("returns no issues for a clean BOQ", () => {
    const issues = validateBoqItems([
      item({ id: "a", description: "PCC", sortOrder: 0 }),
      item({ id: "b", description: "RCC", sortOrder: 1 }),
    ]);
    expect(issues).toHaveLength(0);
    expect(summarizeBoqValidation(issues).clean).toBe(true);
  });

  it("flags a missing unit of measure (HIGH)", () => {
    expect(kinds([item({ id: "a", unit: "  " })])).toContain("MISSING_UOM");
  });

  it("flags zero or negative quantity (HIGH), but not for percentage lines", () => {
    expect(kinds([item({ id: "a", qty: 0 })])).toContain("NON_POSITIVE_QTY");
    expect(kinds([item({ id: "b", qty: -5 })])).toContain("NON_POSITIVE_QTY");
    // A percentage line legitimately has no quantity.
    expect(
      kinds([
        item({ id: "c", calculationType: "PERCENTAGE", qty: 0, pct: 5, basisSelector: { head: "ALL" } }),
      ]),
    ).not.toContain("NON_POSITIVE_QTY");
  });

  it("flags a zero rate (MEDIUM), but not for percentage lines", () => {
    expect(kinds([item({ id: "a", ratePaise: 0 })])).toContain("ZERO_RATE");
    expect(
      kinds([
        item({ id: "b", calculationType: "PERCENTAGE", ratePaise: 0, pct: 5, basisSelector: { head: "ALL" } }),
      ]),
    ).not.toContain("ZERO_RATE");
  });

  it("flags a missing trade / cost head (LOW)", () => {
    expect(kinds([item({ id: "a", costHead: null })])).toContain("MISSING_COST_HEAD");
    expect(kinds([item({ id: "b", costHead: "" })])).toContain("MISSING_COST_HEAD");
  });

  it("flags a percentage item without a percentage or basis (MEDIUM)", () => {
    expect(
      kinds([item({ id: "a", calculationType: "PERCENTAGE", pct: null, basisSelector: {} })]),
    ).toContain("PERCENTAGE_WITHOUT_BASIS");
    expect(
      kinds([item({ id: "b", calculationType: "PERCENTAGE", pct: 5, basisSelector: {} })]),
    ).toContain("PERCENTAGE_WITHOUT_BASIS");
    // With both pct and a basis it is valid.
    expect(
      kinds([
        item({ id: "c", calculationType: "PERCENTAGE", pct: 5, basisSelector: { head: "ALL" }, ratePaise: 0 }),
      ]),
    ).not.toContain("PERCENTAGE_WITHOUT_BASIS");
  });

  it("flags a component item with no component link (LOW)", () => {
    expect(
      kinds([item({ id: "a", calculationType: "COMPONENT", componentId: null, estimateComponentId: null })]),
    ).toContain("COMPONENT_WITHOUT_LINK");
    // Linked via either column → valid.
    expect(
      kinds([item({ id: "b", calculationType: "COMPONENT", componentId: "comp-1" })]),
    ).not.toContain("COMPONENT_WITHOUT_LINK");
  });

  it("flags every line in a duplicate-description group (case/space-insensitive)", () => {
    const issues = validateBoqItems([
      item({ id: "a", description: "Brick masonry", sortOrder: 0 }),
      item({ id: "b", description: "  brick MASONRY ", sortOrder: 1 }),
      item({ id: "c", description: "Plaster", sortOrder: 2 }),
    ]);
    const dups = issues.filter((i) => i.kind === "DUPLICATE_DESCRIPTION");
    expect(dups.map((i) => i.itemId).sort()).toEqual(["a", "b"]);
  });

  it("sorts issues HIGH-first then by item order, and summarizes counts", () => {
    const issues = validateBoqItems([
      item({ id: "a", description: "PCC", costHead: null, sortOrder: 0 }), // LOW (missing cost head)
      item({ id: "b", description: "RCC", unit: "", sortOrder: 1 }), // HIGH (missing uom)
    ]);
    expect(issues[0]!.severity).toBe("HIGH");
    const summary = summarizeBoqValidation(issues);
    expect(summary.high).toBe(1);
    expect(summary.low).toBe(1);
    expect(summary.total).toBe(2);
    expect(summary.clean).toBe(false);
  });
});
