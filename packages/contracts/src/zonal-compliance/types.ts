export const ZONAL_ZONES = [
  "Residential",
  "Commercial",
  "Public & Semi-Public",
  "Industrial",
] as const;

export type ZonalZone = (typeof ZONAL_ZONES)[number];

export type ZonalCityId =
  | "hosapete"
  | "belgaum"
  | "gulbarga"
  | "hubli-dharwad"
  | "mysuru"
  | "tumkur"
  | "greater-bengaluru"
  | "pune"
  | "kcbb";

export interface ZonalCityMeta {
  id: ZonalCityId;
  label: string;
  region: string;
  source: string;
  /** When true, the interactive calculator is wired for this authority. */
  calculatorReady: boolean;
  referenceFile?: string;
}

export interface ZonalSiteInput {
  cityId: ZonalCityId;
  zone: ZonalZone;
  buildingType: string;
  widthM: number;
  depthM: number;
  plotAreaSqm?: number;
  roadFrontM: number;
  roadRearM: number;
  roadLeftM: number;
  roadRightM: number;
  roadClass: string;
  tenements: number;
  parkingQty: number;
}

export interface ZonalSetbackRow {
  side: string;
  roadWidthM: string;
  setbackM: number;
}

export interface ZonalComplianceResult {
  ok: true;
  city: ZonalCityMeta;
  plotAreaSqm: number;
  permissibleFar: number;
  maxBuiltUpSqm: number;
  groundCoveragePct: number;
  maxGroundCoverageSqm: number;
  determiningRoadM: number;
  setbacks: ZonalSetbackRow[];
  frontSetbackM: number;
  rearM: number;
  leftM: number;
  rightM: number;
  buildableWidthM: number;
  buildableDepthM: number;
  buildableEnvelopeSqm: number;
  buildingLineFromCentreM: number | null;
  buildingLineFromBoundaryM: number | null;
  corridorCategory: string;
  corridorWidthM: number;
  carSpaces: number;
  twoWheelerSpaces: number;
  parkingBasis: string;
  bandLabels: { frontRear: string; sides: string };
}

export interface ZonalComplianceError {
  ok: false;
  error: string;
}

export type ZonalComplianceReport = ZonalComplianceResult | ZonalComplianceError;
