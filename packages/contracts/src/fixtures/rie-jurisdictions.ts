import type { RuleVersionData, SiteInputs } from "../rie.js";

/** Published BBMP Residential rule data — mirrors migration `0018_rie_knowledge_bank.sql` seed. */
export const RIE_BBMP_RESIDENTIAL_RULE: RuleVersionData = {
  far: [
    { maxRoadWidthM: 12, far: 1.75, coveragePct: 60, clause: "BBMP §6.1" },
    { maxRoadWidthM: 18, far: 2.25, coveragePct: 60, clause: "BBMP §6.2" },
    { maxRoadWidthM: 24, far: 2.5, coveragePct: 60, clause: "BBMP §6.3" },
    { maxRoadWidthM: 30, far: 3.0, coveragePct: 60, clause: "BBMP §6.4" },
    { maxRoadWidthM: 9999, far: 3.25, coveragePct: 60, clause: "BBMP §6.5" },
  ],
  setbacks: [
    { maxHeightM: 11.5, frontM: 3.0, rearM: 1.5, sideM: 1.5, clause: "BBMP §7.1" },
    { maxHeightM: 15, frontM: 5.0, rearM: 3.0, sideM: 3.0, clause: "BBMP §7.2" },
    { maxHeightM: 18, frontM: 6.0, rearM: 3.0, sideM: 3.0, clause: "BBMP §7.3" },
    { maxHeightM: 24, frontM: 7.0, rearM: 5.0, sideM: 5.0, clause: "BBMP §7.4" },
    { maxHeightM: 9999, frontM: 10.0, rearM: 7.0, sideM: 7.0, clause: "BBMP §7.5" },
  ],
  heightLimits: { absoluteMaxM: 45, floorHeightM: 3.0, clause: "BBMP §8.1" },
  parking: {
    car: { sqmPerECS: 100, basis: "built_up", clause: "BBMP §15.2" },
    twoWheeler: { ratioOfCar: 0.5, clause: "BBMP §15.3" },
    cycle: { sqmPerSlot: 200, clause: "BBMP §15.4" },
  },
  basement: {
    maxDepthM: 4.5,
    ventilationOpeningPct: 2.5,
    permittedUses: ["PARKING", "UTILITIES", "STORAGE"],
    clause: "BBMP §20",
  },
  sustainability: {
    rainwaterHarvesting: { minPitVolumeLtrPerSqm: 0.5, clause: "BBMP §30.1" },
    solarPanels: { minSqmPer100SqmBuiltUp: 0, clause: "" },
    evCharging: { minPctParking: 20, clause: "BBMP §31.2" },
    greenCover: { minPctSiteArea: 10, clause: "BBMP §32.1" },
  },
  approvalDocs: [
    { id: "ownership", label: "Title deed / ownership document", required: true },
    { id: "topo_survey", label: "Topographic survey plan", required: true },
    { id: "site_plan", label: "Site plan (scale 1:500 or better)", required: true },
    { id: "building_plan", label: "Building plan (floor plans, elevations, sections)", required: true },
    { id: "structural_cert", label: "Structural stability certificate", required: true },
    { id: "fire_noc", label: "Fire NOC (buildings >15 m height)", required: false },
    { id: "khata", label: "Khata extract (A or B)", required: true },
    { id: "encumbrance", label: "Encumbrance certificate (13 years)", required: true },
    { id: "tax_receipts", label: "Property tax paid receipts", required: true },
    { id: "undertaking", label: "Architect / owner undertaking", required: true },
  ],
};

const noRoad = {
  abutsRoad: false,
  roadWidthM: 0,
  roadClass: "LOCAL" as const,
  distanceCentreToBoundaryM: 0,
};

/** 240 sqm residential plot on a 6 m approach road — canonical RIE regression site. */
export const RIE_BBMP_RESIDENTIAL_SITE: SiteInputs = {
  buildingUse: "RESIDENTIAL",
  developmentArea: "A",
  assessmentPhase: "PRE_DESIGN",
  siteAreaSqm: 240,
  plotWidthM: 12,
  plotDepthM: 20,
  proposedHeightM: 9,
  floorCount: 2,
  dwellingUnits: 1,
  unitAreaSqm: 120,
  excludedAreaSqm: 0,
  topography: "FLAT",
  approachRoadWidthM: 6,
  front: { abutsRoad: true, roadWidthM: 6, roadClass: "LOCAL", distanceCentreToBoundaryM: 3 },
  rear: noRoad,
  left: noRoad,
  right: noRoad,
  hasBasement: false,
  basementDepthM: 0,
  basementHeightM: 0,
  basementUses: [],
  solarPanelSqm: 0,
  rainwaterPitVolumeLtr: 0,
  evChargingPct: 0,
  greenCoverPct: 0,
  treesPlanted: 0,
  existingPermits: [],
};

export type RieJurisdictionFixture = {
  id: string;
  label: string;
  rule: RuleVersionData;
  site: SiteInputs;
  permits?: string[];
  expect: {
    maxFar: number;
    maxBuiltUpSqm: number;
    maxCoveragePct: number;
    overallScoreMin: number;
    postDesignViolationParameter?: string;
  };
};

export const RIE_JURISDICTION_FIXTURES: RieJurisdictionFixture[] = [
  {
    id: "rie-bbmp-res-pre",
    label: "BBMP Residential · PRE_DESIGN envelope",
    rule: RIE_BBMP_RESIDENTIAL_RULE,
    site: RIE_BBMP_RESIDENTIAL_SITE,
    permits: ["ownership", "khata"],
    expect: {
      maxFar: 0.75,
      maxBuiltUpSqm: 180,
      maxCoveragePct: 50,
      overallScoreMin: 40,
    },
  },
  {
    id: "rie-bbmp-res-post-violation",
    label: "BBMP Residential · POST_DESIGN FAR violation",
    rule: RIE_BBMP_RESIDENTIAL_RULE,
    site: {
      ...RIE_BBMP_RESIDENTIAL_SITE,
      assessmentPhase: "POST_DESIGN",
      proposedBuiltUpSqm: 500,
      proposedGroundCoverPct: 55,
      actualFrontSetbackM: 3,
      actualRearSetbackM: 1.5,
      actualLeftSetbackM: 1.5,
      actualRightSetbackM: 3,
    },
    expect: {
      maxFar: 0.75,
      maxBuiltUpSqm: 180,
      maxCoveragePct: 50,
      overallScoreMin: 40,
      postDesignViolationParameter: "FAR",
    },
  },
];
