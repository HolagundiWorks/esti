import type { BbmpComplianceInput } from "../bbmp/types.js";

const noRoad = {
  abutsRoad: false,
  roadWidthM: 0,
  roadClass: "LOCAL" as const,
  distanceCentreToBoundaryM: 0,
};

const bbmpSecondaryDefaults = {
  exemptAreaSqm: 0,
  treesPlanted: 0,
  hasBasement: false,
  basementHeightM: 0,
  basementMechanicalParking: false,
  basementProjectionAboveGroundM: 0,
} as const;

/** Canonical BBMP Residential Zone A — 200 sqm, local road 5 m (doc example band). */
export const BBMP_RESIDENTIAL_ZONE_A_200: BbmpComplianceInput = {
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
  rear: noRoad,
  left: noRoad,
  right: noRoad,
  ...bbmpSecondaryDefaults,
};

/** BBMP Commercial Zone B high-rise — uniform 6 m setbacks above 9.5 m. */
export const BBMP_COMMERCIAL_ZONE_B_HIGHRISE: BbmpComplianceInput = {
  projectType: "COMMERCIAL",
  developmentArea: "B",
  siteAreaSqm: 800,
  plotWidthM: 20,
  plotDepthM: 40,
  buildingHeightM: 16,
  floorCount: 5,
  dwellingUnits: 0,
  unitAreaSqm: 0,
  commercialFloorAreaSqm: 500,
  front: noRoad,
  rear: noRoad,
  left: noRoad,
  right: noRoad,
  ...bbmpSecondaryDefaults,
};

/** BBMP Residential with RBL governing front setback (12 m local road). */
export const BBMP_RESIDENTIAL_RBL_FRONT: BbmpComplianceInput = {
  ...BBMP_RESIDENTIAL_ZONE_A_200,
  front: {
    abutsRoad: true,
    roadWidthM: 12,
    roadClass: "LOCAL",
    distanceCentreToBoundaryM: 4,
  },
};

export type BbmpJurisdictionFixture = {
  id: string;
  label: string;
  authority: string;
  input: BbmpComplianceInput;
  expect: {
    farAllowed?: number;
    coverageAllowed?: number;
    permissibleBuiltup?: number;
    frontSetback?: number;
    frontGovernedBy?: "Bylaw" | "RBL";
  };
};

/** Regression fixtures — cited inputs reproduced in `bbmp-fixtures.test.ts`. */
export const BBMP_JURISDICTION_FIXTURES: BbmpJurisdictionFixture[] = [
  {
    id: "bbmp-res-a-200",
    label: "Residential Zone A · 200 sqm · 5 m road",
    authority: "BBMP",
    input: BBMP_RESIDENTIAL_ZONE_A_200,
    expect: { farAllowed: 0.75, coverageAllowed: 50, permissibleBuiltup: 150 },
  },
  {
    id: "bbmp-comm-b-highrise",
    label: "Commercial Zone B · high-rise",
    authority: "BBMP",
    input: BBMP_COMMERCIAL_ZONE_B_HIGHRISE,
    expect: { frontSetback: 6 },
  },
  {
    id: "bbmp-res-rbl-front",
    label: "Residential · RBL governs front",
    authority: "BBMP",
    input: BBMP_RESIDENTIAL_RBL_FRONT,
    expect: { frontSetback: 5, frontGovernedBy: "RBL" },
  },
];
