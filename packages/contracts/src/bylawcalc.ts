import { z } from "zod";
import { computeBbmpCompliance } from "./bbmp/engine.js";
import type { BbmpRuleCatalog } from "./bbmp/catalog.js";
import { DEFAULT_BBMP_RULE_CATALOG } from "./bbmp/catalog.js";
import type { BbmpCalculationTrace, BbmpComplianceFlags } from "./bbmp/types.js";
import {
  BBMP_PROJECT_TYPE_LABEL,
  BbmpProjectType,
  DevelopmentArea,
  DEVELOPMENT_AREA_LABEL,
  RoadClass,
  ROAD_CLASS_LABEL,
} from "./bbmp/types.js";

/**
 * BBMP development-control calculator. See docs/esti/BYLAWS-BBMP.md.
 * Delegates to the modular BBMP compliance engine (zones, Table 4/5 setbacks, RBL, parking).
 */
export const BuildingType = BbmpProjectType;
export type BuildingType = BbmpProjectType;
export { BBMP_PROJECT_TYPE_LABEL as BUILDING_TYPE_LABEL };
export { DevelopmentArea, DEVELOPMENT_AREA_LABEL, RoadClass, ROAD_CLASS_LABEL };

const sideInput = z.object({
  abutsRoad: z.boolean().default(false),
  roadWidthM: z.number().nonnegative().default(0),
  roadClass: RoadClass.default("LOCAL"),
  distanceCentreToBoundaryM: z.number().nonnegative().default(0),
  /** @deprecated Use distanceCentreToBoundaryM */
  rblFromCentreM: z.number().nonnegative().optional(),
});

export const BylawCalcInput = z.object({
  buildingType: BuildingType,
  developmentArea: DevelopmentArea.default("A"),
  siteAreaSqm: z.number().positive(),
  plotWidthM: z.number().positive().optional(),
  plotDepthM: z.number().positive().optional(),
  proposedHeightM: z.number().positive().default(9.0),
  floorCount: z.number().int().positive().default(2),
  plinthAreaSqm: z.number().nonnegative().optional(),
  dwellingUnits: z.number().int().nonnegative().default(1),
  unitAreaSqm: z.number().nonnegative().default(120),
  front: sideInput,
  rear: sideInput,
  left: sideInput,
  right: sideInput,
  hasBasement: z.boolean().default(false),
  basementHeightM: z.number().nonnegative().default(0),
  basementMechanicalParking: z.boolean().default(false),
});
export type BylawCalcInput = z.infer<typeof BylawCalcInput>;

export interface SetbackSideResult {
  value: number;
  governedBy: "Bylaw" | "RBL";
}

export interface BylawEnvelope {
  farAllowed: number;
  coverageAllowed: number;
  permissibleBuiltup: number;
  maxFootprint: number;
  setbacks: {
    front: SetbackSideResult;
    rear: SetbackSideResult;
    left: SetbackSideResult;
    right: SetbackSideResult;
  };
  parking: {
    requiredECS: number;
    visitorECS: number;
    total: number;
  };
  basementAllowed: boolean;
  secondaryCompliance: {
    rainwaterHarvesting: boolean;
    solarWaterHeating: boolean;
    treePlanting: boolean;
    earthquakeDesign: boolean;
  };
  governingRoadWidthM: number;
  notes: string[];
  /** @deprecated Use farAllowed */
  far: number;
  /** @deprecated Use coverageAllowed */
  coveragePct: number;
  /** @deprecated Use permissibleBuiltup */
  maxBuiltUpSqm: number;
  /** @deprecated Use maxFootprint */
  maxFootprintSqm: number;
  /** @deprecated Use parking.total */
  parkingLabel: string;
  compliance: BbmpComplianceFlags;
  calculationTrace: BbmpCalculationTrace;
}

function estimatePlotDims(siteAreaSqm: number, width?: number, depth?: number) {
  if (width && depth) return { plotWidthM: width, plotDepthM: depth };
  const side = Math.sqrt(siteAreaSqm);
  return { plotWidthM: side, plotDepthM: side };
}

/** Pure, deterministic envelope computation (shared by backend + SPA). */
export function computeBylawEnvelope(
  input: BylawCalcInput,
  catalog: BbmpRuleCatalog = DEFAULT_BBMP_RULE_CATALOG,
): BylawEnvelope {
  const { plotWidthM, plotDepthM } = estimatePlotDims(
    input.siteAreaSqm,
    input.plotWidthM,
    input.plotDepthM,
  );
  const result = computeBbmpCompliance({
    projectType: input.buildingType,
    developmentArea: input.developmentArea,
    siteAreaSqm: input.siteAreaSqm,
    plotWidthM,
    plotDepthM,
    buildingHeightM: input.proposedHeightM,
    floorCount: input.floorCount,
    plinthAreaSqm: input.plinthAreaSqm,
    dwellingUnits: input.dwellingUnits,
    unitAreaSqm: input.unitAreaSqm,
    exemptAreaSqm: 0,
    treesPlanted: 0,
    front: input.front,
    rear: input.rear,
    left: input.left,
    right: input.right,
    hasBasement: input.hasBasement,
    basementHeightM: input.basementHeightM,
    basementMechanicalParking: input.basementMechanicalParking,
    basementProjectionAboveGroundM: 0,
  }, catalog);

  const parkingLabel =
    input.buildingType === "RESIDENTIAL"
      ? `${result.parking.total} ECS (${result.parking.requiredECS} + ${result.parking.visitorECS} visitor)`
      : `${result.parking.total} ECS (incl. ${result.parking.visitorECS} visitor)`;

  return {
    farAllowed: result.farAllowed,
    coverageAllowed: result.coverageAllowed,
    permissibleBuiltup: result.permissibleBuiltup,
    maxFootprint: result.maxFootprint,
    setbacks: result.setbacks,
    parking: result.parking,
    basementAllowed: result.basementAllowed,
    secondaryCompliance: result.secondaryCompliance,
    governingRoadWidthM: result.governingRoadWidthM,
    notes: result.notes,
    far: result.farAllowed,
    coveragePct: result.coverageAllowed,
    maxBuiltUpSqm: result.permissibleBuiltup,
    maxFootprintSqm: result.maxFootprint,
    parkingLabel,
    compliance: result.compliance,
    calculationTrace: result.calculationTrace,
  };
}
