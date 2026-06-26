import { describe, expect, it } from "vitest";
import {
  materialReconStatusFor,
  summarizeMaterialRecon,
  type MaterialReconItemLike,
} from "./grn.js";

describe("materialReconStatusFor", () => {
  it("NOT_STARTED when nothing received", () => {
    expect(materialReconStatusFor({ contractedQty: 100, receivedQty: 0 })).toBe("NOT_STARTED");
  });

  it("IN_PROGRESS on partial delivery", () => {
    expect(materialReconStatusFor({ contractedQty: 100, receivedQty: 60 })).toBe("IN_PROGRESS");
  });

  it("FULLY_RECEIVED when received equals contracted", () => {
    expect(materialReconStatusFor({ contractedQty: 100, receivedQty: 100 })).toBe("FULLY_RECEIVED");
  });

  it("FULLY_RECEIVED within floating-point epsilon", () => {
    expect(materialReconStatusFor({ contractedQty: 100, receivedQty: 100 - 1e-8 })).toBe("FULLY_RECEIVED");
  });

  it("OVER_RECEIVED when more arrived than contracted", () => {
    expect(materialReconStatusFor({ contractedQty: 100, receivedQty: 110 })).toBe("OVER_RECEIVED");
  });
});

const baseRow: MaterialReconItemLike = {
  workPackageItemId: "wpi-1",
  workPackageId: "wp-1",
  workPackageRef: "WP-01",
  workPackageName: "Superstructure",
  contractor: "ABC Builders",
  description: "M25 RMC",
  unit: "cum",
  costHead: "Concrete",
  contractedQty: 200,
  receivedQty: 120,
  billedQty: 80,
  ratePaise: 800_00, // ₹800/cum = 80000 paise
};

describe("summarizeMaterialRecon", () => {
  it("computes derived quantities", () => {
    const { items } = summarizeMaterialRecon([baseRow]);
    const item = items[0]!;
    expect(item.onSiteQty).toBe(40);          // 120 − 80
    expect(item.pendingDeliveryQty).toBe(80); // 200 − 120
    expect(item.contractedValuePaise).toBe(200 * 80_000);
    expect(item.receivedValuePaise).toBe(120 * 80_000);
    expect(item.billedValuePaise).toBe(80 * 80_000);
    expect(item.status).toBe("IN_PROGRESS");
  });

  it("excludes items with zero contracted and zero received", () => {
    const empty = { ...baseRow, contractedQty: 0, receivedQty: 0, billedQty: 0 };
    const { items } = summarizeMaterialRecon([empty]);
    expect(items).toHaveLength(0);
  });

  it("includes items where received > 0 even if contracted is 0", () => {
    const extra = { ...baseRow, contractedQty: 0, receivedQty: 5 };
    const { items } = summarizeMaterialRecon([extra]);
    expect(items).toHaveLength(1);
    expect(items[0]!.status).toBe("OVER_RECEIVED");
  });

  it("rolls totals correctly across multiple items", () => {
    const second: MaterialReconItemLike = {
      ...baseRow,
      workPackageItemId: "wpi-2",
      description: "Formwork",
      contractedQty: 500,
      receivedQty: 500,
      billedQty: 400,
      ratePaise: 200_00,
    };
    const { totals } = summarizeMaterialRecon([baseRow, second]);
    expect(totals.itemCount).toBe(2);
    expect(totals.contractedValuePaise).toBe(200 * 80_000 + 500 * 20_000);
    expect(totals.receivedValuePaise).toBe(120 * 80_000 + 500 * 20_000);
    expect(totals.onSiteValuePaise).toBe(40 * 80_000 + 100 * 20_000); // on-site: 40 + 100
    expect(totals.pendingDeliveryValuePaise).toBe(80 * 80_000 + 0);   // only first has pending
  });

  it("uses Uncategorised for null costHead", () => {
    const noCostHead = { ...baseRow, costHead: null };
    const { items } = summarizeMaterialRecon([noCostHead]);
    expect(items[0]!.costHead).toBe("Uncategorised");
  });

  it("sorts by pendingDelivery value desc", () => {
    const high: MaterialReconItemLike = { ...baseRow, workPackageItemId: "h", description: "High", contractedQty: 1000, receivedQty: 0, billedQty: 0, ratePaise: 100_00 };
    const low: MaterialReconItemLike = { ...baseRow, workPackageItemId: "l", description: "Low", contractedQty: 10, receivedQty: 0, billedQty: 0, ratePaise: 100_00 };
    const { items } = summarizeMaterialRecon([low, high]);
    expect(items[0]!.description).toBe("High");
  });
});
