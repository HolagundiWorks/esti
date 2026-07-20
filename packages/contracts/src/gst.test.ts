import { describe, expect, it } from "vitest";
import {
  GST_RATES,
  GstSystem,
  TDS_194J_THRESHOLD_PAISE,
  computeGst,
  computeTds194j,
  tds194jApplies,
} from "./gst.js";

const R = (rupees: number) => rupees * 100;

describe("computeGst — REGULAR", () => {
  it("splits intra-state into CGST + SGST at half the rate each", () => {
    const g = computeGst(GstSystem.REGULAR, R(10_000), false);
    expect(g.cgst).toBe(R(900));
    expect(g.sgst).toBe(R(900));
    expect(g.igst).toBe(0);
    expect(g.gstTotal).toBe(R(1_800));
    expect(g.grandTotal).toBe(R(11_800));
    expect(g.documentKind).toBe("TAX_INVOICE");
  });

  it("charges IGST alone inter-state", () => {
    const g = computeGst(GstSystem.REGULAR, R(10_000), true);
    expect(g.igst).toBe(R(1_800));
    expect(g.cgst).toBe(0);
    expect(g.sgst).toBe(0);
    expect(g.gstTotal).toBe(R(1_800));
  });

  it("rounds each head to a whole rupee (CGST s.170), not half of a rounded total", () => {
    // ₹5,616 at 18% = ₹1,010.88. Halving a rounded ₹1,011 total gives two
    // ₹505.50 heads — not lawful tax amounts, and ₹1 more than per-head.
    const g = computeGst(GstSystem.REGULAR, R(5_616), false);
    expect(g.cgst).toBe(R(505));
    expect(g.sgst).toBe(R(505));
    expect(g.gstTotal).toBe(R(1_010));
    expect(g.cgst % 100).toBe(0);
    expect(g.sgst % 100).toBe(0);
  });

  it("keeps gstTotal exactly equal to the heads actually charged", () => {
    for (const rupees of [1, 7, 99, 333, 1_234.57, 5_616, 87_654.32]) {
      const intra = computeGst(GstSystem.REGULAR, Math.round(R(rupees)), false);
      expect(intra.cgst + intra.sgst).toBe(intra.gstTotal);
      expect(intra.taxable + intra.gstTotal).toBe(intra.grandTotal);
      const inter = computeGst(GstSystem.REGULAR, Math.round(R(rupees)), true);
      expect(inter.igst).toBe(inter.gstTotal);
    }
  });

  it("every tax head is a whole number of rupees", () => {
    for (const rupees of [1, 7, 99, 333, 1_234.57, 5_616, 87_654.32]) {
      const g = computeGst(GstSystem.REGULAR, Math.round(R(rupees)), false);
      expect(g.cgst % 100, `cgst for ${rupees}`).toBe(0);
      expect(g.sgst % 100, `sgst for ${rupees}`).toBe(0);
    }
  });
});

describe("computeGst — COMPOSITION and NOT_APPLICABLE", () => {
  it("collects no tax under composition and issues a bill of supply", () => {
    const g = computeGst(GstSystem.COMPOSITION, R(10_000), false);
    expect(g.documentKind).toBe("BILL_OF_SUPPLY");
    expect(g.cgst + g.sgst + g.igst).toBe(0);
    expect(g.gstTotal).toBe(0);
    // The 6% s.10(2A) levy is borne by the firm, not added to the client's bill.
    expect(g.compositionLevy).toBe(R(600));
    expect(g.grandTotal).toBe(R(10_000));
  });

  it("charges nothing when the firm is unregistered", () => {
    const g = computeGst(GstSystem.NOT_APPLICABLE, R(10_000), false);
    expect(g.documentKind).toBe("INVOICE");
    expect(g.gstTotal).toBe(0);
    expect(g.compositionLevy).toBe(0);
    expect(g.grandTotal).toBe(R(10_000));
  });

  it("ignores the inter-state flag when no tax is charged", () => {
    for (const system of [GstSystem.COMPOSITION, GstSystem.NOT_APPLICABLE]) {
      expect(computeGst(system, R(10_000), true)).toEqual(computeGst(system, R(10_000), false));
    }
  });
});

describe("TDS u/s 194J", () => {
  it("is 10% of the fee, rounded to a rupee", () => {
    expect(computeTds194j(R(1_00_000))).toBe(R(10_000));
    expect(GST_RATES.REGULAR).toBe(18);
  });

  it("does not apply below the ₹30,000 annual threshold", () => {
    // First ₹10,000 invoice of the year: the client deducts nothing, so neither
    // should we — otherwise the invoice shows a permanent phantom shortfall.
    const r = tds194jApplies({ priorTaxablePaise: 0, taxablePaise: R(10_000) });
    expect(r.applies).toBe(false);
    expect(r.crossesNow).toBe(false);
  });

  it("does not apply exactly at the threshold, only above it", () => {
    expect(
      tds194jApplies({ priorTaxablePaise: 0, taxablePaise: TDS_194J_THRESHOLD_PAISE }).applies,
    ).toBe(false);
    expect(
      tds194jApplies({ priorTaxablePaise: 0, taxablePaise: TDS_194J_THRESHOLD_PAISE + 100 })
        .applies,
    ).toBe(true);
  });

  it("applies once the year's aggregate for that client crosses the threshold", () => {
    // ₹25,000 already billed, now ₹10,000 more → aggregate ₹35,000.
    const r = tds194jApplies({ priorTaxablePaise: R(25_000), taxablePaise: R(10_000) });
    expect(r.applies).toBe(true);
    expect(r.aggregatePaise).toBe(R(35_000));
    // Flags that earlier under-threshold invoices are now catchable too.
    expect(r.crossesNow).toBe(true);
  });

  it("keeps applying once past the threshold, without re-flagging the crossing", () => {
    const r = tds194jApplies({ priorTaxablePaise: R(80_000), taxablePaise: R(10_000) });
    expect(r.applies).toBe(true);
    expect(r.crossesNow).toBe(false);
  });
});
