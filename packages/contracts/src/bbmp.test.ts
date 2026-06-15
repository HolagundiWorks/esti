import { describe, expect, it } from "vitest";
import { computeBbmpCompliance } from "./bbmp/engine.js";
import {
  computePostConstructionAudit,
  computePreConstructionPotential,
} from "./bbmp/workflows.js";
import { computeRblSetback, lookupFarRule, lookupFarRuleResult, computeParkingEcs } from "./bbmp/rules.js";
import { computeBylawEnvelope } from "./bylawcalc.js";

describe("BBMP compliance engine", () => {
  it("applies Zone A FAR from doc example (240 sqm, 6 m road, residential)", () => {
    const row = lookupFarRule("A", 200, 5);
    expect(row.residentialFar).toBe(0.75);
    const result = computeBbmpCompliance({
      projectType: "RESIDENTIAL",
      developmentArea: "A",
      siteAreaSqm: 200,
      plotWidthM: 14,
      plotDepthM: 14,
      buildingHeightM: 9,
      floorCount: 2,
      dwellingUnits: 1,
      unitAreaSqm: 120,
      front: { abutsRoad: true, roadWidthM: 5, roadClass: "LOCAL", distanceCentreToBoundaryM: 2 },
      rear: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      left: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      right: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      hasBasement: false,
      basementHeightM: 0,
      basementMechanicalParking: false,
      basementProjectionAboveGroundM: 0,
    });
    expect(result.farAllowed).toBe(0.75);
    expect(result.permissibleBuiltup).toBe(150);
    expect(result.coverageAllowed).toBe(50);
  });

  it("limits FAR by lesser road width when site area is in a higher band", () => {
    const lookup = lookupFarRuleResult("A", 600, 5);
    expect(lookup.basis).toBe("road");
    expect(lookup.row.residentialFar).toBe(0.75);
    expect(lookup.row.maxCoverage).toBe(50);
    const result = computeBbmpCompliance({
      projectType: "RESIDENTIAL",
      developmentArea: "A",
      siteAreaSqm: 600,
      plotWidthM: 20,
      plotDepthM: 30,
      buildingHeightM: 9,
      floorCount: 2,
      dwellingUnits: 2,
      unitAreaSqm: 120,
      front: { abutsRoad: true, roadWidthM: 5, roadClass: "LOCAL", distanceCentreToBoundaryM: 2 },
      rear: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      left: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      right: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      hasBasement: false,
      basementHeightM: 0,
      basementMechanicalParking: false,
      basementProjectionAboveGroundM: 0,
    });
    expect(result.farAllowed).toBe(0.75);
    expect(result.coverageAllowed).toBe(50);
    expect(result.notes.some((n) => n.includes("limited by governing road width"))).toBe(true);
  });

  it("uses site band when road width meets the band requirement", () => {
    const lookup = lookupFarRuleResult("A", 600, 10);
    expect(lookup.basis).toBe("exact");
    expect(lookup.row.residentialFar).toBe(1.0);
    expect(lookup.row.maxCoverage).toBe(55);
  });

  it("uses Table 4 low-rise setbacks by plot depth/width", () => {
    const result = computeBbmpCompliance({
      projectType: "RESIDENTIAL",
      developmentArea: "A",
      siteAreaSqm: 216,
      plotWidthM: 15,
      plotDepthM: 15,
      buildingHeightM: 9,
      floorCount: 2,
      dwellingUnits: 1,
      unitAreaSqm: 100,
      front: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      rear: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      left: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      right: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      hasBasement: false,
      basementHeightM: 0,
      basementMechanicalParking: false,
      basementProjectionAboveGroundM: 0,
    });
    expect(result.setbacks.front.value).toBe(3);
    expect(result.setbacks.rear.value).toBe(1.5);
    expect(result.setbacks.left.value).toBe(1.5);
    expect(result.setbacks.right.value).toBe(3);
  });

  it("uses uniform high-rise setbacks when height > 9.5 m", () => {
    const result = computeBbmpCompliance({
      projectType: "COMMERCIAL",
      developmentArea: "B",
      siteAreaSqm: 800,
      plotWidthM: 20,
      plotDepthM: 40,
      buildingHeightM: 16,
      floorCount: 5,
      dwellingUnits: 0,
      unitAreaSqm: 0,
      front: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      rear: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      left: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      right: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      hasBasement: false,
      basementHeightM: 0,
      basementMechanicalParking: false,
      basementProjectionAboveGroundM: 0,
    });
    expect(result.setbacks.front.value).toBe(6);
    expect(result.setbacks.left.value).toBe(6);
  });

  it("computes RBL setback per BYLAWS-BBMP §7", () => {
    // road 12 m local (margin 3) → rblFromCentre = 6+3=9; boundary at 4 m → setback 5 m
    expect(computeRblSetback(12, "LOCAL", 4)).toBe(5);
  });

  it("RBL governs when greater than table setback", () => {
    const result = computeBbmpCompliance({
      projectType: "RESIDENTIAL",
      developmentArea: "A",
      siteAreaSqm: 200,
      plotWidthM: 14,
      plotDepthM: 14,
      buildingHeightM: 9,
      floorCount: 2,
      dwellingUnits: 1,
      unitAreaSqm: 120,
      front: {
        abutsRoad: true,
        roadWidthM: 12,
        roadClass: "LOCAL",
        distanceCentreToBoundaryM: 4,
      },
      rear: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      left: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      right: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      hasBasement: false,
      basementHeightM: 0,
      basementMechanicalParking: false,
      basementProjectionAboveGroundM: 0,
    });
    expect(result.setbacks.front.governedBy).toBe("RBL");
    expect(result.setbacks.front.value).toBe(5);
  });

  it("residential parking: 1 ECS per unit when unit ≤ 150 sqm", () => {
    const p = computeParkingEcs("RESIDENTIAL", 500, 4, 120);
    expect(p.requiredECS).toBe(4);
    expect(p.visitorECS).toBe(1);
    expect(p.total).toBe(5);
  });

  it("commercial parking: 1 ECS per 50 sqm + 10% visitor", () => {
    const p = computeParkingEcs("COMMERCIAL", 1000, 0, 0, 500);
    expect(p.requiredECS).toBe(10);
    expect(p.total).toBe(11);
    expect(p.formulaKey).toBe("COMMERCIAL_FLOOR_AREA");
  });

  const samplePreInput = {
    buildingType: "RESIDENTIAL" as const,
    developmentArea: "A" as const,
    siteAreaSqm: 200,
    plotWidthM: 14,
    plotDepthM: 14,
    proposedHeightM: 9,
    floorCount: 2,
    dwellingUnits: 1,
    unitAreaSqm: 120,
    front: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL" as const, distanceCentreToBoundaryM: 0 },
    rear: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL" as const, distanceCentreToBoundaryM: 0 },
    left: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL" as const, distanceCentreToBoundaryM: 0 },
    right: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL" as const, distanceCentreToBoundaryM: 0 },
  };

  it("pre-construction potential does not flag violations", () => {
    const pre = computePreConstructionPotential(samplePreInput);
    expect(pre.farAllowed).toBe(0.75);
    expect(pre.permissibleBuiltup).toBe(150);
    expect(pre.calculationTrace.far.basis).toBeDefined();
  });

  it("post-construction audit detects FAR violation", () => {
    const audit = computePostConstructionAudit(samplePreInput, {
      totalFloorAreaSqm: 200,
      exemptAreaSqm: 0,
      actualFrontSetbackM: 3,
      actualRearSetbackM: 1.5,
      actualLeftSetbackM: 1.5,
      actualRightSetbackM: 3,
      providedParkingEcs: 2,
    });
    expect(audit.parameters.far!.status).toBe("failed");
    expect(audit.parameters.far!.actual).toBe(1);
    expect(audit.hasViolations).toBe(true);
    expect(audit.overallStatus).toBe("non_compliant");
  });

  it("computeBylawEnvelope exposes legacy aliases", () => {
    const env = computeBylawEnvelope({
      buildingType: "RESIDENTIAL",
      developmentArea: "A",
      siteAreaSqm: 200,
      plotWidthM: 14,
      plotDepthM: 14,
      proposedHeightM: 9,
      dwellingUnits: 2,
      unitAreaSqm: 100,
      front: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      rear: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      left: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
      right: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
    });
    expect(env.far).toBe(env.farAllowed);
    expect(env.maxBuiltUpSqm).toBe(env.permissibleBuiltup);
    expect(env.parking.total).toBeGreaterThan(0);
  });
});
