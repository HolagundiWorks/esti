import { describe, expect, it } from "vitest";
import {
  procurementStatusFor,
  summarizeProcurementForecast,
  UNCATEGORISED_COST_HEAD,
  type ProcurementForecastItemLike,
} from "./procurement-forecast.js";

function item(over: Partial<ProcurementForecastItemLike> = {}): ProcurementForecastItemLike {
  return {
    workPackageId: "wp-1",
    workPackageRef: "WP-01",
    workPackageName: "Civil works",
    contractor: "Acme Build",
    description: "M20 concrete",
    unit: "cum",
    costHead: "Concrete",
    contractedQty: 100,
    billedQty: 40,
    ratePaise: 500_00, // ₹500 / cum
    ...over,
  };
}

describe("procurementStatusFor", () => {
  it("is NOT_STARTED when nothing billed", () => {
    expect(procurementStatusFor({ contractedQty: 100, billedQty: 0 })).toBe("NOT_STARTED");
  });
  it("is IN_PROGRESS when partly billed", () => {
    expect(procurementStatusFor({ contractedQty: 100, billedQty: 40 })).toBe("IN_PROGRESS");
  });
  it("is FULLY_BILLED when billed meets or exceeds contracted", () => {
    expect(procurementStatusFor({ contractedQty: 100, billedQty: 100 })).toBe("FULLY_BILLED");
    expect(procurementStatusFor({ contractedQty: 100, billedQty: 120 })).toBe("FULLY_BILLED");
  });
  it("treats zero-contracted as fully executed (nothing to procure)", () => {
    expect(procurementStatusFor({ contractedQty: 0, billedQty: 0 })).toBe("FULLY_BILLED");
  });
});

describe("summarizeProcurementForecast — item math", () => {
  it("computes outstanding qty/value at the awarded rate", () => {
    const { items } = summarizeProcurementForecast([item()]);
    expect(items).toHaveLength(1);
    const it0 = items[0]!;
    expect(it0.outstandingQty).toBe(60);
    expect(it0.contractedValuePaise).toBe(100 * 500_00);
    expect(it0.billedValuePaise).toBe(40 * 500_00);
    expect(it0.outstandingValuePaise).toBe(60 * 500_00);
    expect(it0.status).toBe("IN_PROGRESS");
  });

  it("clamps outstanding at zero when over-billed", () => {
    const { items, totals } = summarizeProcurementForecast([item({ contractedQty: 100, billedQty: 130 })]);
    expect(items[0]!.outstandingQty).toBe(0);
    expect(items[0]!.outstandingValuePaise).toBe(0);
    expect(items[0]!.status).toBe("FULLY_BILLED");
    expect(totals.outstandingItemCount).toBe(0);
  });

  it("rounds fractional qty × rate to integer paise", () => {
    const { items } = summarizeProcurementForecast([
      item({ contractedQty: 10, billedQty: 7, ratePaise: 333 }),
    ]);
    // outstanding 3 × 333 = 999
    expect(items[0]!.outstandingValuePaise).toBe(999);
  });

  it("falls back to Uncategorised when the BOQ line has no cost head", () => {
    const { items, byCostHead } = summarizeProcurementForecast([item({ costHead: null })]);
    expect(items[0]!.costHead).toBe(UNCATEGORISED_COST_HEAD);
    expect(byCostHead[0]!.costHead).toBe(UNCATEGORISED_COST_HEAD);
  });
});

describe("summarizeProcurementForecast — rollups", () => {
  const rows: ProcurementForecastItemLike[] = [
    item({ description: "Steel", costHead: "Steel", contractedQty: 10, billedQty: 0, ratePaise: 1000_00 }), // out 10×₹1000 = ₹10,000
    item({ description: "M20 concrete", costHead: "Concrete", contractedQty: 100, billedQty: 40, ratePaise: 500_00 }), // out 60×₹500 = ₹30,000
    item({
      workPackageId: "wp-2",
      workPackageRef: "WP-02",
      workPackageName: "Finishes",
      description: "Plaster",
      costHead: "Concrete",
      contractedQty: 50,
      billedQty: 50,
      ratePaise: 200_00,
    }), // fully billed, out 0
  ];

  it("groups by cost head, outstanding-value first", () => {
    const { byCostHead } = summarizeProcurementForecast(rows);
    expect(byCostHead.map((c) => c.costHead)).toEqual(["Concrete", "Steel"]);
    const concrete = byCostHead.find((c) => c.costHead === "Concrete")!;
    expect(concrete.itemCount).toBe(2); // M20 + plaster
    expect(concrete.outstandingItemCount).toBe(1); // only M20 still outstanding
    expect(concrete.outstandingValuePaise).toBe(60 * 500_00);
  });

  it("groups by work package with an aggregate status, sorted by ref", () => {
    const { byPackage } = summarizeProcurementForecast(rows);
    expect(byPackage.map((p) => p.ref)).toEqual(["WP-01", "WP-02"]);
    const wp1 = byPackage.find((p) => p.ref === "WP-01")!;
    expect(wp1.itemCount).toBe(2);
    expect(wp1.status).toBe("IN_PROGRESS"); // some billed, some outstanding
    const wp2 = byPackage.find((p) => p.ref === "WP-02")!;
    expect(wp2.status).toBe("FULLY_BILLED");
    expect(wp2.outstandingValuePaise).toBe(0);
  });

  it("totals contracted/billed/outstanding and counts", () => {
    const { totals } = summarizeProcurementForecast(rows);
    expect(totals.itemCount).toBe(3);
    expect(totals.outstandingItemCount).toBe(2); // steel + M20
    expect(totals.packageCount).toBe(2);
    expect(totals.costHeadCount).toBe(2);
    expect(totals.outstandingValuePaise).toBe(10 * 1000_00 + 60 * 500_00);
  });

  it("returns items outstanding-value first", () => {
    const { items } = summarizeProcurementForecast(rows);
    expect(items.map((i) => i.description)).toEqual(["M20 concrete", "Steel", "Plaster"]);
  });
});
