import { describe, expect, it } from "vitest";
import { DEFAULT_BBMP_RULE_CATALOG } from "@hcw/india-compliance-kit/profiles/bbmp-2003";
import {
  calculatePostProjectResponse,
  calculatePreProjectResponse,
  type PostProjectApiInput,
  type PreProjectApiInput,
} from "./workflows.js";

const preInput: PreProjectApiInput = {
  city: "bangalore",
  authority: "bbmp",
  projectType: "residential",
  plot: {
    areaSqm: 1200,
    roadWidthM: 12,
    zone: "residential",
    plotDepthM: 40,
    plotWidthM: 30,
  },
  proposalPreferences: {
    targetFloors: 4,
  },
};

describe("public compliance workflows", () => {
  it("calculates pre-project permissible scope with trace", () => {
    const result = calculatePreProjectResponse(preInput, DEFAULT_BBMP_RULE_CATALOG);

    expect(result.mode).toBe("PRE_PROJECT_PLANNING");
    expect(result.results.far.totalPermissibleFar).toBeGreaterThan(0);
    expect(result.results.far.maxBuiltUpAreaSqm).toBeCloseTo(
      preInput.plot.areaSqm * result.results.far.totalPermissibleFar,
      2,
    );
    expect(result.trace.some((t) => t.check === "FAR")).toBe(true);
  });

  it("calculates post-project approved-vs-actual violations", () => {
    const result = calculatePostProjectResponse(
      {
        ...preInput,
        approved: {
          builtUpAreaSqm: 2400,
          far: 2,
          heightM: 14,
          frontSetbackM: 3,
          rearSetbackM: 2,
          sideLeftSetbackM: 1.5,
          sideRightSetbackM: 1.5,
          parkingSpaces: 12,
        },
        actual: {
          builtUpAreaSqm: 2600,
          heightM: 15,
          frontSetbackM: 2.4,
          rearSetbackM: 2,
          sideLeftSetbackM: 1.2,
          sideRightSetbackM: 1.5,
          parkingSpaces: 10,
        },
      } satisfies PostProjectApiInput,
      DEFAULT_BBMP_RULE_CATALOG,
    );

    expect(result.overallStatus).toBe("VIOLATION_FOUND");
    expect(result.violations.far.excessSqm).toBe(200);
    expect(result.violations.far.violationPercent).toBeCloseTo(8.33, 2);
    expect(result.violations.frontSetback.shortfallM).toBeCloseTo(0.6, 2);
    expect(result.violations.parking.shortfallSpaces).toBe(2);
  });
});
