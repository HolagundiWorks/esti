import { describe, expect, it } from "vitest";
import {
  Plan,
  asPlan,
  planAllows,
  planQuota,
  storageCapBytes,
  withinQuota,
} from "./plans.js";

describe("two-edition plan model (LITE / PRO)", () => {
  it("has exactly the two current editions", () => {
    expect(Plan.options).toEqual(["LITE", "PRO"]);
  });

  it("folds legacy tier codes onto PRO (backward compat)", () => {
    // Existing licence tokens / .env FIRM_PLAN carry CORE or ENTERPRISE; they
    // must resolve to a valid edition, never brick to a default that loses access.
    expect(asPlan("CORE")).toBe("PRO");
    expect(asPlan("ENTERPRISE")).toBe("PRO");
    expect(asPlan("PRO")).toBe("PRO");
    expect(asPlan("LITE")).toBe("LITE");
    expect(asPlan(null)).toBe("LITE");
    expect(asPlan(undefined)).toBe("LITE");
    expect(asPlan("nonsense")).toBe("LITE");
  });

  it("gates every former Core/Enterprise feature behind PRO", () => {
    for (const f of ["ai", "hr", "gstFiling", "esticad", "byos"] as const) {
      expect(planAllows("LITE", f)).toBe(false);
      expect(planAllows("PRO", f)).toBe(true);
      // Legacy codes unlock the same features as PRO.
      expect(planAllows("CORE", f)).toBe(true);
      expect(planAllows("ENTERPRISE", f)).toBe(true);
    }
    // Former Enterprise-only features are now part of Pro.
    expect(planAllows("PRO", "aiByoApi")).toBe(true);
    expect(planAllows("PRO", "sso")).toBe(true);
    // The view-only contractor portal stays available on Lite.
    expect(planAllows("LITE", "contractorPortal")).toBe(true);
  });

  it("keeps Lite seat caps and makes Pro unlimited", () => {
    expect(planQuota("LITE", "staff")).toBe(3);
    expect(planQuota("LITE", "accountants")).toBe(0);
    expect(planQuota("PRO", "staff")).toBeNull();
    expect(planQuota("PRO", "accountants")).toBeNull();
    // Legacy Enterprise licences behave like Pro (unlimited).
    expect(withinQuota("ENTERPRISE", "staff", 999)).toBe(true);
    expect(withinQuota("LITE", "staff", 3)).toBe(false);
  });

  it("keeps the Lite storage cap and unlimited Pro storage", () => {
    expect(storageCapBytes("LITE")).toBe(5 * 1024 * 1024 * 1024);
    expect(storageCapBytes("PRO")).toBeNull();
  });
});
