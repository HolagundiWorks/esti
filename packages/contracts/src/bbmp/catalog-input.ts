import { z } from "zod";
import { BbmpProjectType, DevelopmentArea, RoadClass } from "./types.js";

const bandMax = z.number().nonnegative();

export const FarRuleRowInput = z.object({
  developmentArea: DevelopmentArea,
  siteAreaMin: z.number().nonnegative(),
  siteAreaMax: bandMax,
  roadWidthMin: z.number().nonnegative(),
  roadWidthMax: bandMax,
  residentialFar: z.number().positive(),
  commercialFar: z.number().positive(),
  semiPublicFar: z.number().positive(),
  publicFar: z.number().positive(),
  maxCoverage: z.number().positive().max(100),
});

export const LowriseSetbackRowInput = z.object({
  depthMin: z.number().nonnegative(),
  depthMax: bandMax,
  widthMin: z.number().nonnegative(),
  widthMax: bandMax,
  front: z.number().nonnegative(),
  rear: z.number().nonnegative(),
  left: z.number().nonnegative(),
  right: z.number().nonnegative(),
});

export const HighriseSetbackRowInput = z.object({
  heightMin: z.number().nonnegative(),
  heightMax: bandMax,
  uniformSetback: z.number().nonnegative(),
});

export const RoadMarginRowInput = z.object({
  roadClass: RoadClass,
  roadMarginM: z.number().nonnegative(),
});

export const ParkingRuleRowInput = z.object({
  projectType: BbmpProjectType,
  useCategory: z.string().default("DEFAULT"),
  unitAreaMin: z.number().nonnegative().default(0),
  unitAreaMax: bandMax,
  floorAreaMin: z.number().nonnegative().default(0),
  floorAreaMax: bandMax,
  formulaKey: z.enum(["RESIDENTIAL_STANDARD", "RESIDENTIAL_LARGE_UNIT", "COMMERCIAL_FLOOR_AREA"]),
  sqmPerEcs: z.number().positive().optional(),
  visitorParkingPct: z.number().nonnegative().max(1).default(0.1),
});

export const SecondaryRuleRowInput = z.object({
  ruleKey: z.enum([
    "RAINWATER_HARVESTING",
    "TREE_PLANTING",
    "SOLAR_WATER_HEATING",
    "EARTHQUAKE_DESIGN",
  ]),
  description: z.string(),
  siteAreaMin: z.number().nonnegative().optional(),
  plinthAreaMin: z.number().nonnegative().optional(),
  heightMinM: z.number().nonnegative().optional(),
  floorsMin: z.number().int().positive().optional(),
  requirementJson: z.record(z.unknown()).default({}),
});

export const EngineConstantsInput = z.object({
  lowriseHeightM: z.number().positive(),
  basementMinHeightM: z.number().positive(),
  basementMaxHeightM: z.number().positive(),
  basementMechParkingHeightM: z.number().positive(),
  basementMaxProjectionM: z.number().positive(),
  visitorParkingPct: z.number().nonnegative().max(1),
  sqmPerEcs: z.number().positive(),
});

/** Full modular catalog payload for create/update of a BBMP rule set. */
export const BbmpRuleCatalogInput = z.object({
  far: z.array(FarRuleRowInput).min(1),
  lowriseSetbacks: z.array(LowriseSetbackRowInput).min(1),
  highriseSetbacks: z.array(HighriseSetbackRowInput).min(1),
  roadMargins: z.array(RoadMarginRowInput).min(1),
  parkingRules: z.array(ParkingRuleRowInput).min(1),
  secondaryRules: z.array(SecondaryRuleRowInput).min(1),
  engineConstants: EngineConstantsInput,
});

export type BbmpRuleCatalogInput = z.infer<typeof BbmpRuleCatalogInput>;

export const BbmpRuleSetCreate = z.object({
  label: z.string().min(1),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceCitation: z.string().optional(),
  notes: z.string().optional(),
  catalog: BbmpRuleCatalogInput,
});

export type BbmpRuleSetCreate = z.infer<typeof BbmpRuleSetCreate>;
