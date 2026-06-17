import { describe, expect, it } from "vitest";
import {
  BUILDING_DSR_TAKEOFF_RATES_PAISE,
  BUILDING_DSR_VERSION_LABEL,
  buildingDsrCatalogItems,
} from "./building-dsr-catalog.js";
import { TAKEOFF_CATALOG } from "./takeoff.js";

describe("building DSR catalog", () => {
  it("has a version label", () => {
    expect(BUILDING_DSR_VERSION_LABEL).toContain("Building");
  });

  it("includes every takeoff-linked DSR code with a rate", () => {
    const takeoffCodes = TAKEOFF_CATALOG.map((e) => e.dsrItemCode).filter(Boolean) as string[];
    for (const code of takeoffCodes) {
      expect(BUILDING_DSR_TAKEOFF_RATES_PAISE[code]).toBeGreaterThan(0);
    }
  });

  it("builds catalog with takeoff and supplementary items", () => {
    const items = buildingDsrCatalogItems();
    expect(items.length).toBeGreaterThan(TAKEOFF_CATALOG.length);
    expect(items.find((i) => i.code === "BM-230")?.unit).toBe("rm");
    expect(items.find((i) => i.code === "PLASTER-INT")).toBeDefined();
    const codes = items.map((i) => i.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
