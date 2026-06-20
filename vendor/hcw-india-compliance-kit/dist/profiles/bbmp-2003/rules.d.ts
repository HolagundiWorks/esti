import type { BbmpRuleCatalog } from "./catalog.js";
import type { BbmpEngineConstants } from "./catalog.js";
import type { BbmpProjectType, DevelopmentArea, RoadClass } from "./types.js";
/** FAR + coverage — keyed by zone, plot area band, road width band. See BYLAWS-BBMP.md §4. */
export interface FarRuleRow {
    developmentArea: DevelopmentArea;
    siteAreaMin: number;
    siteAreaMax: number;
    roadWidthMin: number;
    roadWidthMax: number;
    residentialFar: number;
    commercialFar: number;
    semiPublicFar: number;
    publicFar: number;
    maxCoverage: number;
}
export interface LowriseSetbackRow {
    depthMin: number;
    depthMax: number;
    widthMin: number;
    widthMax: number;
    front: number;
    rear: number;
    left: number;
    right: number;
}
export interface HighriseSetbackRow {
    heightMin: number;
    heightMax: number;
    uniformSetback: number;
}
export interface RoadMarginRow {
    roadClass: RoadClass;
    roadMarginM: number;
}
export type ParkingFormulaKey = "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
export interface ParkingRuleRow {
    projectType: BbmpProjectType;
    useCategory: string;
    unitAreaMin: number;
    unitAreaMax: number;
    floorAreaMin: number;
    floorAreaMax: number;
    formulaKey: ParkingFormulaKey;
    ecsPerUnit?: number;
    ecsPerSqm?: number;
    sqmPerEcs?: number;
    visitorParkingPct: number;
}
export interface SolarRuleRow {
    occupancyType: string;
    lpdRequired: number;
    basis: string;
}
export type SecondaryRuleKey = "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
export interface SecondaryRuleRow {
    ruleKey: SecondaryRuleKey;
    description: string;
    siteAreaMin?: number;
    plinthAreaMin?: number;
    heightMinM?: number;
    floorsMin?: number;
    requirementJson: Record<string, unknown>;
}
export declare const BBMP_ENGINE_CONSTANT_DEFAULTS: {
    readonly lowriseHeightM: 9.5;
    readonly basementMinHeightM: 2.4;
    readonly basementMaxHeightM: 2.75;
    readonly basementMechParkingHeightM: 3.6;
    readonly basementMaxProjectionM: 1;
    readonly visitorParkingPct: 0.1;
    readonly sqmPerEcs: 18;
};
/** @deprecated Use catalog.engineConstants — kept for callers that import the object shape. */
export declare const BBMP_ENGINE_CONSTANTS: {
    LOWRISE_HEIGHT_M: 9.5;
    BASEMENT_MIN_HEIGHT: 2.4;
    BASEMENT_MAX_HEIGHT: 2.75;
    MECH_PARKING_HEIGHT: 3.6;
    BASEMENT_MAX_PROJECTION: 1;
};
export declare function engineConstants(catalog?: BbmpRuleCatalog): BbmpEngineConstants;
/** BBMP Building Bye-Laws 2003 seed rules — verify against current gazette before production use. */
export declare const BBMP_FAR_RULES: FarRuleRow[];
/** Table 4 — height ≤ 9.5 m (plot dimension based). BYLAWS-BBMP.md §6 Case 1. */
export declare const BBMP_LOWRISE_SETBACK_RULES: LowriseSetbackRow[];
/** Table 5 — height > 9.5 m (uniform). BYLAWS-BBMP.md §6 Case 2. */
export declare const BBMP_HIGHRISE_SETBACK_RULES: HighriseSetbackRow[];
/** Road centreline restriction margins — BYLAWS-BBMP.md §8. */
export declare const BBMP_ROAD_MARGINS: RoadMarginRow[];
/** Parking — BYLAWS-BBMP.md Engine 5. */
export declare const BBMP_PARKING_RULES: ParkingRuleRow[];
/** Solar LPD reference — occupancy-specific lookup (future). */
export declare const BBMP_SOLAR_RULES: SolarRuleRow[];
/** Secondary compliance — BYLAWS-BBMP.md Engine 6. */
export declare const BBMP_SECONDARY_RULES: SecondaryRuleRow[];
export declare function farForProjectType(row: FarRuleRow, projectType: BbmpProjectType): number;
/** How the FAR row was chosen when site area and road width bands do not both match one row. */
export type FarLookupBasis = "exact" | "road" | "site" | "fallback";
export interface FarRuleLookup {
    row: FarRuleRow;
    basis: FarLookupBasis;
}
/** Human-readable sq m band for rule tables (e.g. `240–500`, `2000+`). */
export declare function formatSqmBand(min: number, max: number): string;
/** Human-readable road width band in metres. */
export declare function formatRoadBandM(min: number, max: number): string;
export declare function farRuleRowKey(row: FarRuleRow): string;
export declare function lookupFarRuleResult(area: DevelopmentArea, siteAreaSqm: number, governingRoadWidthM: number, catalog?: BbmpRuleCatalog): FarRuleLookup;
export declare function lookupFarRule(area: DevelopmentArea, siteAreaSqm: number, governingRoadWidthM: number, catalog?: BbmpRuleCatalog): FarRuleRow;
export declare function lookupLowriseSetbacks(plotDepthM: number, plotWidthM: number, catalog?: BbmpRuleCatalog): {
    front: number;
    rear: number;
    left: number;
    right: number;
};
export declare function lookupHighriseSetback(heightM: number, catalog?: BbmpRuleCatalog): number;
export declare function roadMarginM(roadClass: RoadClass, catalog?: BbmpRuleCatalog): number;
export declare function computeRblSetback(roadWidthM: number, roadClass: RoadClass, distanceCentreToBoundaryM: number, catalog?: BbmpRuleCatalog): number;
export declare function lookupParkingRule(projectType: BbmpProjectType, unitAreaSqm: number, catalog?: BbmpRuleCatalog): ParkingRuleRow;
export declare function computeParkingEcs(projectType: BbmpProjectType, permissibleBuiltup: number, dwellingUnits: number, unitAreaSqm: number, commercialFloorAreaSqm: number | undefined, catalog?: BbmpRuleCatalog): {
    requiredECS: number;
    visitorECS: number;
    total: number;
    formulaKey: ParkingFormulaKey;
};
export declare function checkBasementCompliance(hasBasement: boolean, heightM: number, mechanicalParking: boolean, projectionM: number, catalog?: BbmpRuleCatalog): {
    allowed: boolean;
    compliant: boolean | null;
};
export declare function secondaryComplianceFlags(siteAreaSqm: number, plinthAreaSqm: number, buildingHeightM: number, floorCount: number, treesPlanted: number, catalog?: BbmpRuleCatalog): {
    rainwaterHarvesting: boolean;
    solarWaterHeating: boolean;
    treePlanting: boolean;
    earthquakeDesign: boolean;
};
export declare function secondaryRequirements(siteAreaSqm: number, plinthAreaSqm: number, buildingHeightM: number, floorCount: number, catalog?: BbmpRuleCatalog): Array<{
    ruleKey: SecondaryRuleKey;
    required: boolean;
    description: string;
}>;
//# sourceMappingURL=rules.d.ts.map