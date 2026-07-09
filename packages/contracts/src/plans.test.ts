import { describe, expect, it } from "vitest";
import {
  DEFAULT_STORAGE_BYTES,
  STANDARD_LICENCE_LABEL,
  asPlan,
  planAllows,
  planQuota,
  storageCapBytes,
  withinQuota,
  withinStorage,
} from "./plans.js";

describe("standard licence model (2026-07)", () => {
  it("exposes one user-facing licence name", () => {
    expect(STANDARD_LICENCE_LABEL).toBe("AORMS Standard");
  });

  it("asPlan shim always resolves to PRO for back-compat", () => {
    expect(asPlan("LITE")).toBe("PRO");
    expect(asPlan("CORE")).toBe("PRO");
    expect(asPlan("ENTERPRISE")).toBe("PRO");
    expect(asPlan(null)).toBe("PRO");
  });

  it("unlocks every feature for every account", () => {
    for (const f of ["ai", "hr", "gstFiling", "byos", "contractorPortal"] as const) {
      expect(planAllows("LITE", f)).toBe(true);
      expect(planAllows("PRO", f)).toBe(true);
    }
  });

  it("has no seat caps", () => {
    expect(planQuota("LITE", "staff")).toBeNull();
    expect(withinQuota("LITE", "staff", 999)).toBe(true);
  });

  it("defaults storage to 5 GiB with optional add-ons", () => {
    expect(storageCapBytes("PRO")).toBe(DEFAULT_STORAGE_BYTES);
    const addon = 2 * 1024 * 1024 * 1024;
    expect(storageCapBytes("PRO", addon)).toBe(DEFAULT_STORAGE_BYTES + addon);
    expect(withinStorage("PRO", DEFAULT_STORAGE_BYTES - 1, 2)).toBe(false);
    expect(withinStorage("PRO", DEFAULT_STORAGE_BYTES - 1, 2, addon)).toBe(true);
  });
});
