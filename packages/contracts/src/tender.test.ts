import { describe, expect, it } from "vitest";
import {
  bidTotalFromItems,
  rankBids,
  tenderItemAmount,
  TenderItemAdd,
  TenderItemBidInput,
  TenderItemsFromEstimate,
} from "./tender.js";

describe("tenderItemAmount", () => {
  it("is qty × rate, rounded to whole paise", () => {
    expect(tenderItemAmount(10, 12_500)).toBe(125_000);
    expect(tenderItemAmount(0, 12_500)).toBe(0);
    expect(tenderItemAmount(2.5, 99)).toBe(248); // 247.5 → 248
  });
});

describe("bidTotalFromItems", () => {
  it("sums the priced lines (qty from the tender item)", () => {
    const total = bidTotalFromItems([
      { qty: 10, ratePaise: 12_500 }, // 125000
      { qty: 4, ratePaise: 5_000 }, //  20000
    ]);
    expect(total).toBe(145_000);
  });

  it("is zero for an empty bid", () => {
    expect(bidTotalFromItems([])).toBe(0);
  });
});

describe("rankBids", () => {
  it("ranks ascending, lowest first, without mutating the input", () => {
    const input = [
      { contractorId: "a", totalPaise: 300 },
      { contractorId: "b", totalPaise: 100 },
      { contractorId: "c", totalPaise: 200 },
    ];
    const ranked = rankBids(input);
    expect(ranked.map((r) => r.contractorId)).toEqual(["b", "c", "a"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(ranked.map((r) => r.lowest)).toEqual([true, false, false]);
    expect(input[0]!.contractorId).toBe("a"); // input untouched
  });

  it("flags every contractor tied at the lowest total", () => {
    const ranked = rankBids([
      { contractorId: "a", totalPaise: 100 },
      { contractorId: "b", totalPaise: 100 },
      { contractorId: "c", totalPaise: 250 },
    ]);
    expect(ranked.filter((r) => r.lowest).map((r) => r.contractorId).sort()).toEqual(["a", "b"]);
  });

  it("handles an empty set", () => {
    expect(rankBids([])).toEqual([]);
  });
});

describe("tender item schemas", () => {
  it("TenderItemsFromEstimate accepts an optional cost-head filter", () => {
    const parsed = TenderItemsFromEstimate.parse({
      tenderId: "11111111-1111-1111-1111-111111111111",
      estimateVersionId: "22222222-2222-2222-2222-222222222222",
      costHeads: ["SUBSTRUCTURE", "SUPERSTRUCTURE"],
    });
    expect(parsed.costHeads).toEqual(["SUBSTRUCTURE", "SUPERSTRUCTURE"]);
  });

  it("TenderItemAdd defaults estRatePaise and sortOrder", () => {
    const parsed = TenderItemAdd.parse({
      tenderId: "11111111-1111-1111-1111-111111111111",
      description: "Brickwork in CM 1:6",
      unit: "cum",
      qty: 12,
    });
    expect(parsed.estRatePaise).toBe(0);
    expect(parsed.sortOrder).toBe(0);
  });

  it("TenderItemBidInput requires at least one priced line", () => {
    expect(() =>
      TenderItemBidInput.parse({ invitationId: "11111111-1111-1111-1111-111111111111", items: [] }),
    ).toThrow();
  });
});
