import { describe, expect, it } from "vitest";
import {
  billableBalance,
  isWithinBalance,
  RunningBillCreate,
  WorkPackageFromEstimate,
} from "./pmc.js";

describe("billableBalance (double-billing golden rule)", () => {
  it("balance = approved + variation − previously billed", () => {
    expect(billableBalance({ approvedQty: 100, previousBilledQty: 0 })).toBe(100);
    expect(billableBalance({ approvedQty: 100, previousBilledQty: 40 })).toBe(60);
    expect(billableBalance({ approvedQty: 100, variationQty: 10, previousBilledQty: 40 })).toBe(70);
  });

  it("goes to zero when fully billed and negative when over-billed", () => {
    expect(billableBalance({ approvedQty: 100, previousBilledQty: 100 })).toBe(0);
    expect(billableBalance({ approvedQty: 100, previousBilledQty: 120 })).toBe(-20);
  });

  it("rounds to 4 dp for stable quantities", () => {
    expect(billableBalance({ approvedQty: 1.23456789, previousBilledQty: 0 })).toBe(1.2346);
  });
});

describe("isWithinBalance", () => {
  it("allows billing up to and including the balance", () => {
    expect(isWithinBalance(60, 60)).toBe(true);
    expect(isWithinBalance(59.5, 60)).toBe(true);
  });

  it("blocks billing beyond the balance", () => {
    expect(isWithinBalance(60.5, 60)).toBe(false);
    expect(isWithinBalance(100, 0)).toBe(false);
  });

  it("tolerates 4 dp float noise at the boundary", () => {
    expect(isWithinBalance(60.00005, 60)).toBe(true);
  });
});

describe("RunningBillCreate links", () => {
  it("accepts plain free-text items (no estimation link)", () => {
    const parsed = RunningBillCreate.parse({
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "RA 1",
      items: [{ description: "Brickwork", unit: "cum", qty: 5, ratePaise: 1000 }],
    });
    expect(parsed.items[0]!.boqItemId).toBeUndefined();
  });

  it("accepts items carrying a BOQ / work-package link", () => {
    const parsed = RunningBillCreate.parse({
      projectId: "11111111-1111-1111-1111-111111111111",
      workPackageId: "22222222-2222-2222-2222-222222222222",
      title: "RA 1",
      items: [
        {
          description: "PCC",
          unit: "cum",
          qty: 5,
          ratePaise: 1000,
          boqItemId: "33333333-3333-3333-3333-333333333333",
          workPackageItemId: "44444444-4444-4444-4444-444444444444",
        },
      ],
    });
    expect(parsed.items[0]!.boqItemId).toBe("33333333-3333-3333-3333-333333333333");
  });
});

describe("WorkPackageFromEstimate", () => {
  it("defaults packageType and allows an optional cost-head filter", () => {
    const parsed = WorkPackageFromEstimate.parse({
      projectId: "11111111-1111-1111-1111-111111111111",
      estimateVersionId: "55555555-5555-5555-5555-555555555555",
      name: "Civil package",
      costHeads: ["SUBSTRUCTURE", "SUPERSTRUCTURE"],
    });
    expect(parsed.packageType).toBe("CIVIL");
    expect(parsed.costHeads).toEqual(["SUBSTRUCTURE", "SUPERSTRUCTURE"]);
  });
});
