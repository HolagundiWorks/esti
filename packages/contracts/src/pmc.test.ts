import { describe, expect, it } from "vitest";
import {
  billableBalance,
  billDeductionTotal,
  isWithinBalance,
  measurementLocationKey,
  netPayable,
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

describe("RunningBillCreate (Phase C strict)", () => {
  it("accepts free-text-only bills and defaults billType to RA", () => {
    const parsed = RunningBillCreate.parse({
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "RA 1",
      items: [{ description: "Brickwork", unit: "cum", qty: 5, ratePaise: 1000 }],
    });
    expect(parsed.billType).toBe("RA");
    expect(parsed.items![0]!.ratePaise).toBe(1000);
  });

  it("accepts a bill sourced from approved measurement records + deductions", () => {
    const parsed = RunningBillCreate.parse({
      projectId: "11111111-1111-1111-1111-111111111111",
      workPackageId: "22222222-2222-2222-2222-222222222222",
      title: "RA 2",
      billType: "FINAL",
      measurementRecordIds: ["33333333-3333-3333-3333-333333333333"],
      deductions: { retentionPaise: 5000, taxTdsPaise: 2000 },
    });
    expect(parsed.billType).toBe("FINAL");
    expect(parsed.measurementRecordIds).toHaveLength(1);
    expect(parsed.deductions!.retentionPaise).toBe(5000);
  });

  it("rejects an empty bill (no measurements and no free-text lines)", () => {
    expect(() =>
      RunningBillCreate.parse({
        projectId: "11111111-1111-1111-1111-111111111111",
        title: "RA empty",
      }),
    ).toThrow();
  });
});

describe("bill deductions → net payable", () => {
  it("sums the four deduction buckets", () => {
    expect(
      billDeductionTotal({
        retentionPaise: 5000,
        advanceRecoveryPaise: 1000,
        taxTdsPaise: 2000,
        otherRecoveryPaise: 500,
      }),
    ).toBe(8500);
    expect(billDeductionTotal(null)).toBe(0);
    expect(billDeductionTotal({ retentionPaise: 5000 })).toBe(5000);
  });

  it("net payable = gross − deductions (and may go negative)", () => {
    expect(netPayable(100000, { retentionPaise: 5000, taxTdsPaise: 2000 })).toBe(93000);
    expect(netPayable(100000, null)).toBe(100000);
    expect(netPayable(1000, { retentionPaise: 5000 })).toBe(-4000);
  });
});

describe("measurementLocationKey (duplicate-location guard)", () => {
  it("normalises case and whitespace", () => {
    const a = measurementLocationKey({ location: "Grid  A1", floor: "First", zone: "Block B" });
    const b = measurementLocationKey({ location: "grid a1", floor: "FIRST", zone: "block b" });
    expect(a).toBe(b);
  });

  it("distinguishes different floors / zones", () => {
    const first = measurementLocationKey({ location: "A1", floor: "1" });
    const second = measurementLocationKey({ location: "A1", floor: "2" });
    expect(first).not.toBe(second);
  });

  it("treats missing fields as empty segments", () => {
    expect(measurementLocationKey({})).toBe("||");
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
