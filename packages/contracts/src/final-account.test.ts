import { describe, expect, it } from "vitest";
import {
  defaultFinalCertified,
  finalAccountBalance,
  finalAccountChecklist,
  finalAccountFinancials,
} from "./final-account.js";

describe("finalAccountFinancials", () => {
  it("splits original contract vs variation from the work-package items", () => {
    const f = finalAccountFinancials({
      items: [
        { approvedQty: 100, variationQty: 10, ratePaise: 50_00 }, // 5,00,000 + 50,000
        { approvedQty: 0, variationQty: 4, ratePaise: 25_00 }, // extra item → variation only
      ],
      bills: [],
    });
    expect(f.originalContractPaise).toBe(100 * 50_00);
    expect(f.variationPaise).toBe(10 * 50_00 + 4 * 25_00);
  });

  it("sums gross / deduction block / net paid across the package's bills", () => {
    const f = finalAccountFinancials({
      items: [],
      bills: [
        {
          totalPaise: 1_000_00,
          retentionPaise: 50_00,
          advanceRecoveryPaise: 20_00,
          taxTdsPaise: 10_00,
          otherRecoveryPaise: 0,
          netPayablePaise: 920_00,
        },
        {
          totalPaise: 500_00,
          retentionPaise: 25_00,
          advanceRecoveryPaise: 0,
          taxTdsPaise: 5_00,
          otherRecoveryPaise: 10_00,
          netPayablePaise: 460_00,
        },
      ],
    });
    expect(f.grossBilledPaise).toBe(1_500_00);
    expect(f.retentionHeldPaise).toBe(75_00);
    expect(f.advanceRecoveredPaise).toBe(20_00);
    expect(f.taxTdsPaise).toBe(15_00);
    expect(f.otherRecoveryPaise).toBe(10_00);
    expect(f.netPaidPaise).toBe(1_380_00);
  });

  it("is all zeros for no items and no bills", () => {
    const f = finalAccountFinancials({ items: [], bills: [] });
    expect(f).toEqual({
      originalContractPaise: 0,
      variationPaise: 0,
      grossBilledPaise: 0,
      retentionHeldPaise: 0,
      advanceRecoveredPaise: 0,
      taxTdsPaise: 0,
      otherRecoveryPaise: 0,
      netPaidPaise: 0,
    });
  });
});

describe("defaultFinalCertified / finalAccountBalance", () => {
  it("seeds final certified as original + variations", () => {
    expect(defaultFinalCertified({ originalContractPaise: 5_00_000, variationPaise: 50_000 })).toBe(
      5_50_000,
    );
  });

  it("balance due is final certified less net already paid (positive = owed)", () => {
    expect(finalAccountBalance({ finalCertifiedPaise: 5_50_000, netPaidPaise: 5_00_000 })).toBe(
      50_000,
    );
    expect(finalAccountBalance({ finalCertifiedPaise: 5_00_000, netPaidPaise: 5_20_000 })).toBe(
      -20_000,
    );
  });
});

describe("finalAccountChecklist (Rule 6 closure gate)", () => {
  const allClear = {
    openDeviations: 0,
    openVariations: 0,
    unbilledApprovedMeasurements: 0,
    steelReconFinalized: true,
    noClaimReceived: true,
    clientFinalApproval: true,
  };

  it("can close when every blocking item is satisfied", () => {
    const { canClose, items } = finalAccountChecklist(allClear);
    expect(canClose).toBe(true);
    expect(items.every((i) => i.ok)).toBe(true);
  });

  it("blocks closure with an open deviation (Rule 6)", () => {
    const { canClose, items } = finalAccountChecklist({ ...allClear, openDeviations: 1 });
    expect(canClose).toBe(false);
    expect(items.find((i) => i.key === "no_open_deviations")).toMatchObject({ ok: false, blocking: true });
  });

  it("blocks closure with an open variation (Rule 6)", () => {
    const { canClose } = finalAccountChecklist({ ...allClear, openVariations: 2 });
    expect(canClose).toBe(false);
  });

  it("blocks closure without the no-claim cert / client approval", () => {
    expect(finalAccountChecklist({ ...allClear, noClaimReceived: false }).canClose).toBe(false);
    expect(finalAccountChecklist({ ...allClear, clientFinalApproval: false }).canClose).toBe(false);
  });

  it("treats unbilled measurements and unfinalized steel recon as advisory only", () => {
    const { canClose, items } = finalAccountChecklist({
      ...allClear,
      unbilledApprovedMeasurements: 3,
      steelReconFinalized: false,
    });
    expect(canClose).toBe(true);
    expect(items.find((i) => i.key === "measurements_billed")).toMatchObject({ ok: false, blocking: false });
    expect(items.find((i) => i.key === "steel_reconciled")).toMatchObject({ ok: false, blocking: false });
  });
});
