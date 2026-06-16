import { describe, expect, it } from "vitest";
import { runAllEngines } from "./rie.js";
import { RIE_JURISDICTION_FIXTURES } from "./fixtures/rie-jurisdictions.js";

describe("RIE jurisdiction fixtures", () => {
  for (const fx of RIE_JURISDICTION_FIXTURES) {
    it(`${fx.id}: ${fx.label}`, () => {
      const result = runAllEngines(fx.site, fx.rule, fx.permits ?? []);
      expect(result.devControl.maxFar).toBe(fx.expect.maxFar);
      expect(result.devControl.maxBuiltUpSqm).toBe(fx.expect.maxBuiltUpSqm);
      expect(result.devControl.maxCoveragePct).toBe(fx.expect.maxCoveragePct);
      expect(result.overallScore).toBeGreaterThanOrEqual(fx.expect.overallScoreMin);
      expect(result.approvalReadiness.readiness).toBeDefined();
      expect(result.sustainability.score).toBeGreaterThanOrEqual(0);

      if (fx.expect.postDesignViolationParameter) {
        expect(result.violations.hasViolations).toBe(true);
        expect(
          result.violations.items.some((i) => i.parameter === fx.expect.postDesignViolationParameter),
        ).toBe(true);
      } else {
        expect(result.violations.items).toHaveLength(0);
        expect(result.violations.hasViolations).toBe(false);
      }
    });
  }
});
