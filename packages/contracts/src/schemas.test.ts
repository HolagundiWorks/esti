import { describe, expect, it } from "vitest";
import { DEFAULT_PHASE_PLAN, PhaseCode } from "./schemas.js";

describe("general project stages", () => {
  it("uses only valid neutral stage codes", () => {
    for (const stage of DEFAULT_PHASE_PLAN) expect(PhaseCode.parse(stage.code)).toBe(stage.code);
  });

  it("allocates the full project fee", () => {
    expect(DEFAULT_PHASE_PLAN.reduce((total, stage) => total + stage.billingPct, 0)).toBe(100);
  });
});
