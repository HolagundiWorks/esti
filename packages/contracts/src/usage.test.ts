import { describe, expect, it } from "vitest";
import {
  AORMS_ID_USAGE_MINUTES,
  USAGE_PING_MAX_CREDIT_MINUTES,
  aormsIdEligible,
  usageCreditMinutes,
} from "./usage.js";

const at = (iso: string) => new Date(iso);

describe("usageCreditMinutes", () => {
  it("credits nothing on the first ping (no previous ping)", () => {
    expect(usageCreditMinutes(null, at("2026-07-03T10:00:00Z"))).toBe(0);
    expect(usageCreditMinutes(undefined, at("2026-07-03T10:00:00Z"))).toBe(0);
  });

  it("credits the elapsed minutes since the previous ping", () => {
    expect(usageCreditMinutes(at("2026-07-03T10:00:00Z"), at("2026-07-03T10:05:00Z"))).toBe(5);
    expect(usageCreditMinutes(at("2026-07-03T10:00:00Z"), at("2026-07-03T10:07:30Z"))).toBe(8);
  });

  it("clamps a long gap (sleep/offline) to the max credit", () => {
    expect(usageCreditMinutes(at("2026-07-01T10:00:00Z"), at("2026-07-03T10:00:00Z"))).toBe(
      USAGE_PING_MAX_CREDIT_MINUTES,
    );
  });

  it("never credits negative time (clock skew)", () => {
    expect(usageCreditMinutes(at("2026-07-03T10:05:00Z"), at("2026-07-03T10:00:00Z"))).toBe(0);
  });
});

describe("aormsIdEligible", () => {
  it("requires 100 hours of active use", () => {
    expect(AORMS_ID_USAGE_MINUTES).toBe(6000);
    expect(aormsIdEligible(0)).toBe(false);
    expect(aormsIdEligible(5999)).toBe(false);
    expect(aormsIdEligible(6000)).toBe(true);
    expect(aormsIdEligible(12000)).toBe(true);
  });
});
