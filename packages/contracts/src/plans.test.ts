import { describe, expect, it } from "vitest";
import {
  Plan,
  PRO_STORAGE_BYTES,
  asPlan,
  planAllows,
  planQuota,
  storageCapBytes,
  withinQuota,
  withinStorage,
} from "./plans.js";

describe("three-tier plan model (LITE / PRO / ENTERPRISE)", () => {
  it("has the three current editions", () => {
    expect(Plan.options).toEqual(["LITE", "PRO", "ENTERPRISE"]);
  });

  it("resolves plan codes: ENTERPRISE and PRO are first-class, CORE folds onto PRO", () => {
    // Existing licence tokens / .env FIRM_PLAN may carry CORE — it must resolve
    // to a valid edition, never brick to a default that loses access.
    expect(asPlan("CORE")).toBe("PRO");
    expect(asPlan("ENTERPRISE")).toBe("ENTERPRISE");
    expect(asPlan("PRO")).toBe("PRO");
    expect(asPlan("LITE")).toBe("LITE");
    expect(asPlan(null)).toBe("LITE");
    expect(asPlan(undefined)).toBe("LITE");
    expect(asPlan("nonsense")).toBe("LITE");
  });

  it("gates former Core/Enterprise features behind PRO; BYOS behind ENTERPRISE", () => {
    for (const f of ["ai", "hr", "gstFiling", "esticad"] as const) {
      expect(planAllows("LITE", f)).toBe(false);
      expect(planAllows("PRO", f)).toBe(true);
      expect(planAllows("ENTERPRISE", f)).toBe(true);
    }
    // BYOS is Enterprise-only now (Pro has a capped cloud store instead).
    expect(planAllows("LITE", "byos")).toBe(false);
    expect(planAllows("PRO", "byos")).toBe(false);
    expect(planAllows("ENTERPRISE", "byos")).toBe(true);
    // Enterprise ⊇ Pro: everything Pro unlocks, Enterprise unlocks too.
    expect(planAllows("ENTERPRISE", "aiByoApi")).toBe(true);
    expect(planAllows("ENTERPRISE", "sso")).toBe(true);
    // The view-only contractor portal stays available on Lite.
    expect(planAllows("LITE", "contractorPortal")).toBe(true);
  });

  it("keeps Lite seat caps and makes Pro/Enterprise unlimited", () => {
    expect(planQuota("LITE", "staff")).toBe(3);
    expect(planQuota("LITE", "accountants")).toBe(0);
    expect(planQuota("PRO", "staff")).toBeNull();
    expect(planQuota("ENTERPRISE", "staff")).toBeNull();
    expect(withinQuota("ENTERPRISE", "staff", 999)).toBe(true);
    expect(withinQuota("LITE", "staff", 3)).toBe(false);
  });

  it("Lite has no cloud cap, Pro is 10 GB, Enterprise (BYOS) is uncapped", () => {
    expect(storageCapBytes("LITE")).toBeNull();
    expect(storageCapBytes("PRO")).toBe(PRO_STORAGE_BYTES);
    expect(storageCapBytes("ENTERPRISE")).toBeNull();
  });

  it("purchased add-on storage lifts the Pro cap (no-op on unlimited plans)", () => {
    const addon = 5 * 1024 * 1024 * 1024;
    expect(storageCapBytes("PRO", addon)).toBe(PRO_STORAGE_BYTES + addon);
    // A write that would exceed 10 GB fails, but succeeds once add-on is bought.
    const used = PRO_STORAGE_BYTES - 1;
    expect(withinStorage("PRO", used, 2)).toBe(false);
    expect(withinStorage("PRO", used, 2, addon)).toBe(true);
    // Lite (local) and Enterprise (BYOS) never block on cap.
    expect(withinStorage("LITE", Number.MAX_SAFE_INTEGER, 1)).toBe(true);
    expect(withinStorage("ENTERPRISE", Number.MAX_SAFE_INTEGER, 1)).toBe(true);
  });
});
