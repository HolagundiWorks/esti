import { z } from "zod";
import type { BbmpRuleCatalog } from "./profiles/bbmp-2003/catalog.js";
import type { BbmpCalculationTrace, BbmpComplianceFlags, SetbackSideResult } from "./profiles/bbmp-2003/types.js";
import { BBMP_PROJECT_TYPE_LABEL, BbmpProjectType, DevelopmentArea, DEVELOPMENT_AREA_LABEL, RoadClass, ROAD_CLASS_LABEL } from "./profiles/bbmp-2003/types.js";
/**
 * BBMP development-control calculator. See docs/esti/BYLAWS-BBMP.md.
 * Delegates to the modular BBMP compliance engine (zones, Table 4/5 setbacks, RBL, parking).
 */
export declare const BuildingType: z.ZodEnum<["RESIDENTIAL", "COMMERCIAL", "SEMI_PUBLIC", "PUBLIC"]>;
export type BuildingType = BbmpProjectType;
export { BBMP_PROJECT_TYPE_LABEL as BUILDING_TYPE_LABEL };
export { DevelopmentArea, DEVELOPMENT_AREA_LABEL, RoadClass, ROAD_CLASS_LABEL };
export declare const BylawCalcInput: z.ZodObject<{
    buildingType: z.ZodEnum<["RESIDENTIAL", "COMMERCIAL", "SEMI_PUBLIC", "PUBLIC"]>;
    developmentArea: z.ZodDefault<z.ZodEnum<["A", "B", "C"]>>;
    siteAreaSqm: z.ZodNumber;
    plotWidthM: z.ZodOptional<z.ZodNumber>;
    plotDepthM: z.ZodOptional<z.ZodNumber>;
    proposedHeightM: z.ZodDefault<z.ZodNumber>;
    floorCount: z.ZodDefault<z.ZodNumber>;
    plinthAreaSqm: z.ZodOptional<z.ZodNumber>;
    dwellingUnits: z.ZodDefault<z.ZodNumber>;
    unitAreaSqm: z.ZodDefault<z.ZodNumber>;
    front: z.ZodObject<{
        abutsRoad: z.ZodDefault<z.ZodBoolean>;
        roadWidthM: z.ZodDefault<z.ZodNumber>;
        roadClass: z.ZodDefault<z.ZodEnum<["NH", "SH", "ARTERIAL", "COLLECTOR", "LOCAL"]>>;
        distanceCentreToBoundaryM: z.ZodDefault<z.ZodNumber>;
        /** @deprecated Use distanceCentreToBoundaryM */
        rblFromCentreM: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        abutsRoad: boolean;
        roadWidthM: number;
        roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
        distanceCentreToBoundaryM: number;
        rblFromCentreM?: number | undefined;
    }, {
        abutsRoad?: boolean | undefined;
        roadWidthM?: number | undefined;
        roadClass?: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL" | undefined;
        distanceCentreToBoundaryM?: number | undefined;
        rblFromCentreM?: number | undefined;
    }>;
    rear: z.ZodObject<{
        abutsRoad: z.ZodDefault<z.ZodBoolean>;
        roadWidthM: z.ZodDefault<z.ZodNumber>;
        roadClass: z.ZodDefault<z.ZodEnum<["NH", "SH", "ARTERIAL", "COLLECTOR", "LOCAL"]>>;
        distanceCentreToBoundaryM: z.ZodDefault<z.ZodNumber>;
        /** @deprecated Use distanceCentreToBoundaryM */
        rblFromCentreM: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        abutsRoad: boolean;
        roadWidthM: number;
        roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
        distanceCentreToBoundaryM: number;
        rblFromCentreM?: number | undefined;
    }, {
        abutsRoad?: boolean | undefined;
        roadWidthM?: number | undefined;
        roadClass?: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL" | undefined;
        distanceCentreToBoundaryM?: number | undefined;
        rblFromCentreM?: number | undefined;
    }>;
    left: z.ZodObject<{
        abutsRoad: z.ZodDefault<z.ZodBoolean>;
        roadWidthM: z.ZodDefault<z.ZodNumber>;
        roadClass: z.ZodDefault<z.ZodEnum<["NH", "SH", "ARTERIAL", "COLLECTOR", "LOCAL"]>>;
        distanceCentreToBoundaryM: z.ZodDefault<z.ZodNumber>;
        /** @deprecated Use distanceCentreToBoundaryM */
        rblFromCentreM: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        abutsRoad: boolean;
        roadWidthM: number;
        roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
        distanceCentreToBoundaryM: number;
        rblFromCentreM?: number | undefined;
    }, {
        abutsRoad?: boolean | undefined;
        roadWidthM?: number | undefined;
        roadClass?: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL" | undefined;
        distanceCentreToBoundaryM?: number | undefined;
        rblFromCentreM?: number | undefined;
    }>;
    right: z.ZodObject<{
        abutsRoad: z.ZodDefault<z.ZodBoolean>;
        roadWidthM: z.ZodDefault<z.ZodNumber>;
        roadClass: z.ZodDefault<z.ZodEnum<["NH", "SH", "ARTERIAL", "COLLECTOR", "LOCAL"]>>;
        distanceCentreToBoundaryM: z.ZodDefault<z.ZodNumber>;
        /** @deprecated Use distanceCentreToBoundaryM */
        rblFromCentreM: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        abutsRoad: boolean;
        roadWidthM: number;
        roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
        distanceCentreToBoundaryM: number;
        rblFromCentreM?: number | undefined;
    }, {
        abutsRoad?: boolean | undefined;
        roadWidthM?: number | undefined;
        roadClass?: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL" | undefined;
        distanceCentreToBoundaryM?: number | undefined;
        rblFromCentreM?: number | undefined;
    }>;
    hasBasement: z.ZodDefault<z.ZodBoolean>;
    basementHeightM: z.ZodDefault<z.ZodNumber>;
    basementMechanicalParking: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    developmentArea: "A" | "B" | "C";
    siteAreaSqm: number;
    floorCount: number;
    dwellingUnits: number;
    unitAreaSqm: number;
    front: {
        abutsRoad: boolean;
        roadWidthM: number;
        roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
        distanceCentreToBoundaryM: number;
        rblFromCentreM?: number | undefined;
    };
    rear: {
        abutsRoad: boolean;
        roadWidthM: number;
        roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
        distanceCentreToBoundaryM: number;
        rblFromCentreM?: number | undefined;
    };
    left: {
        abutsRoad: boolean;
        roadWidthM: number;
        roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
        distanceCentreToBoundaryM: number;
        rblFromCentreM?: number | undefined;
    };
    right: {
        abutsRoad: boolean;
        roadWidthM: number;
        roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
        distanceCentreToBoundaryM: number;
        rblFromCentreM?: number | undefined;
    };
    hasBasement: boolean;
    basementHeightM: number;
    basementMechanicalParking: boolean;
    buildingType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
    proposedHeightM: number;
    plotWidthM?: number | undefined;
    plotDepthM?: number | undefined;
    plinthAreaSqm?: number | undefined;
}, {
    siteAreaSqm: number;
    front: {
        abutsRoad?: boolean | undefined;
        roadWidthM?: number | undefined;
        roadClass?: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL" | undefined;
        distanceCentreToBoundaryM?: number | undefined;
        rblFromCentreM?: number | undefined;
    };
    rear: {
        abutsRoad?: boolean | undefined;
        roadWidthM?: number | undefined;
        roadClass?: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL" | undefined;
        distanceCentreToBoundaryM?: number | undefined;
        rblFromCentreM?: number | undefined;
    };
    left: {
        abutsRoad?: boolean | undefined;
        roadWidthM?: number | undefined;
        roadClass?: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL" | undefined;
        distanceCentreToBoundaryM?: number | undefined;
        rblFromCentreM?: number | undefined;
    };
    right: {
        abutsRoad?: boolean | undefined;
        roadWidthM?: number | undefined;
        roadClass?: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL" | undefined;
        distanceCentreToBoundaryM?: number | undefined;
        rblFromCentreM?: number | undefined;
    };
    buildingType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
    developmentArea?: "A" | "B" | "C" | undefined;
    plotWidthM?: number | undefined;
    plotDepthM?: number | undefined;
    floorCount?: number | undefined;
    plinthAreaSqm?: number | undefined;
    dwellingUnits?: number | undefined;
    unitAreaSqm?: number | undefined;
    hasBasement?: boolean | undefined;
    basementHeightM?: number | undefined;
    basementMechanicalParking?: boolean | undefined;
    proposedHeightM?: number | undefined;
}>;
export type BylawCalcInput = z.infer<typeof BylawCalcInput>;
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
/** Pure, deterministic envelope computation (shared by backend + SPA). */
export declare function computeBylawEnvelope(input: BylawCalcInput, catalog?: BbmpRuleCatalog): BylawEnvelope;
//# sourceMappingURL=bylawcalc.d.ts.map