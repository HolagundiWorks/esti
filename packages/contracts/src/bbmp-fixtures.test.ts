import { describe, expect, it } from "vitest";
import { computeBbmpCompliance } from "./bbmp/engine.js";
import { BBMP_JURISDICTION_FIXTURES } from "./fixtures/bbmp-jurisdictions.js";

describe("BBMP jurisdiction fixtures", () => {
  for (const fx of BBMP_JURISDICTION_FIXTURES) {
    it(`${fx.id}: ${fx.label}`, () => {
      const result = computeBbmpCompliance(fx.input);
      if (fx.expect.farAllowed !== undefined) {
        expect(result.farAllowed).toBe(fx.expect.farAllowed);
      }
      if (fx.expect.coverageAllowed !== undefined) {
        expect(result.coverageAllowed).toBe(fx.expect.coverageAllowed);
      }
      if (fx.expect.permissibleBuiltup !== undefined) {
        expect(result.permissibleBuiltup).toBe(fx.expect.permissibleBuiltup);
      }
      if (fx.expect.frontSetback !== undefined) {
        expect(result.setbacks.front.value).toBe(fx.expect.frontSetback);
      }
      if (fx.expect.frontGovernedBy !== undefined) {
        expect(result.setbacks.front.governedBy).toBe(fx.expect.frontGovernedBy);
      }
      expect(result.calculationTrace).toBeDefined();
    });
  }
});
