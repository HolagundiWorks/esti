import { z } from "zod";
/** BBMP development zone (RMP category). */
export declare const DevelopmentArea: z.ZodEnum<["A", "B", "C"]>;
export type DevelopmentArea = z.infer<typeof DevelopmentArea>;
export declare const DEVELOPMENT_AREA_LABEL: Record<DevelopmentArea, string>;
/** Building occupancy / use — maps to doc ProjectType. */
export declare const BbmpProjectType: z.ZodEnum<["RESIDENTIAL", "COMMERCIAL", "SEMI_PUBLIC", "PUBLIC"]>;
export type BbmpProjectType = z.infer<typeof BbmpProjectType>;
export declare const BBMP_PROJECT_TYPE_LABEL: Record<BbmpProjectType, string>;
export declare const RoadClass: z.ZodEnum<["NH", "SH", "ARTERIAL", "COLLECTOR", "LOCAL"]>;
export type RoadClass = z.infer<typeof RoadClass>;
export declare const ROAD_CLASS_LABEL: Record<RoadClass, string>;
export declare const BbmpComplianceInput: z.ZodObject<{
    projectType: z.ZodEnum<["RESIDENTIAL", "COMMERCIAL", "SEMI_PUBLIC", "PUBLIC"]>;
    developmentArea: z.ZodDefault<z.ZodEnum<["A", "B", "C"]>>;
    siteAreaSqm: z.ZodNumber;
    plotWidthM: z.ZodNumber;
    plotDepthM: z.ZodNumber;
    buildingHeightM: z.ZodDefault<z.ZodNumber>;
    floorCount: z.ZodDefault<z.ZodNumber>;
    plinthAreaSqm: z.ZodOptional<z.ZodNumber>;
    /** Gross floor area for FAR exemption check (optional). */
    totalFloorAreaSqm: z.ZodOptional<z.ZodNumber>;
    exemptAreaSqm: z.ZodDefault<z.ZodNumber>;
    /** Residential parking inputs */
    dwellingUnits: z.ZodDefault<z.ZodNumber>;
    unitAreaSqm: z.ZodDefault<z.ZodNumber>;
    /** Commercial parking — defaults to permissible built-up when unset */
    commercialFloorAreaSqm: z.ZodOptional<z.ZodNumber>;
    front: z.ZodObject<{
        abutsRoad: z.ZodDefault<z.ZodBoolean>;
        roadWidthM: z.ZodDefault<z.ZodNumber>;
        roadClass: z.ZodDefault<z.ZodEnum<["NH", "SH", "ARTERIAL", "COLLECTOR", "LOCAL"]>>;
        /** Distance from road centreline to plot boundary (m). */
        distanceCentreToBoundaryM: z.ZodDefault<z.ZodNumber>;
        /** @deprecated Legacy field — treated as distanceCentreToBoundaryM when set. */
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
        /** Distance from road centreline to plot boundary (m). */
        distanceCentreToBoundaryM: z.ZodDefault<z.ZodNumber>;
        /** @deprecated Legacy field — treated as distanceCentreToBoundaryM when set. */
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
        /** Distance from road centreline to plot boundary (m). */
        distanceCentreToBoundaryM: z.ZodDefault<z.ZodNumber>;
        /** @deprecated Legacy field — treated as distanceCentreToBoundaryM when set. */
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
        /** Distance from road centreline to plot boundary (m). */
        distanceCentreToBoundaryM: z.ZodDefault<z.ZodNumber>;
        /** @deprecated Legacy field — treated as distanceCentreToBoundaryM when set. */
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
    basementProjectionAboveGroundM: z.ZodDefault<z.ZodNumber>;
    treesPlanted: z.ZodDefault<z.ZodNumber>;
    /** Proposed ground coverage % — enables coverage compliance check. */
    proposedGroundCoverPct: z.ZodOptional<z.ZodNumber>;
    /** Actual setbacks (m) — enables setback compliance when all four provided. */
    actualSetbacks: z.ZodOptional<z.ZodObject<{
        front: z.ZodOptional<z.ZodNumber>;
        rear: z.ZodOptional<z.ZodNumber>;
        left: z.ZodOptional<z.ZodNumber>;
        right: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        front?: number | undefined;
        rear?: number | undefined;
        left?: number | undefined;
        right?: number | undefined;
    }, {
        front?: number | undefined;
        rear?: number | undefined;
        left?: number | undefined;
        right?: number | undefined;
    }>>;
    /** Provided parking ECS — enables parking compliance check. */
    providedParkingEcs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
    developmentArea: "A" | "B" | "C";
    siteAreaSqm: number;
    plotWidthM: number;
    plotDepthM: number;
    buildingHeightM: number;
    floorCount: number;
    exemptAreaSqm: number;
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
    basementProjectionAboveGroundM: number;
    treesPlanted: number;
    plinthAreaSqm?: number | undefined;
    totalFloorAreaSqm?: number | undefined;
    commercialFloorAreaSqm?: number | undefined;
    proposedGroundCoverPct?: number | undefined;
    actualSetbacks?: {
        front?: number | undefined;
        rear?: number | undefined;
        left?: number | undefined;
        right?: number | undefined;
    } | undefined;
    providedParkingEcs?: number | undefined;
}, {
    projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
    siteAreaSqm: number;
    plotWidthM: number;
    plotDepthM: number;
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
    developmentArea?: "A" | "B" | "C" | undefined;
    buildingHeightM?: number | undefined;
    floorCount?: number | undefined;
    plinthAreaSqm?: number | undefined;
    totalFloorAreaSqm?: number | undefined;
    exemptAreaSqm?: number | undefined;
    dwellingUnits?: number | undefined;
    unitAreaSqm?: number | undefined;
    commercialFloorAreaSqm?: number | undefined;
    hasBasement?: boolean | undefined;
    basementHeightM?: number | undefined;
    basementMechanicalParking?: boolean | undefined;
    basementProjectionAboveGroundM?: number | undefined;
    treesPlanted?: number | undefined;
    proposedGroundCoverPct?: number | undefined;
    actualSetbacks?: {
        front?: number | undefined;
        rear?: number | undefined;
        left?: number | undefined;
        right?: number | undefined;
    } | undefined;
    providedParkingEcs?: number | undefined;
}>;
export type BbmpComplianceInput = z.infer<typeof BbmpComplianceInput>;
export type SetbackGovernance = "Bylaw" | "RBL";
export interface SetbackSideResult {
    value: number;
    governedBy: SetbackGovernance;
}
export interface BbmpComplianceFlags {
    isFarCompliant: boolean | null;
    isCoverageCompliant: boolean | null;
    isSetbackCompliant: boolean | null;
    isParkingCompliant: boolean | null;
    isBasementCompliant: boolean | null;
    isOverallCompliant: boolean | null;
}
export interface BbmpCalculationTrace {
    far: {
        basis: string;
        developmentArea: DevelopmentArea;
        governingRoadWidthM: number;
        farAllowed: number;
        coverageAllowed: number;
    };
    setbacks: Record<"front" | "rear" | "left" | "right", {
        required: number;
        governedBy: SetbackGovernance;
        actual?: number;
    }>;
    parking: {
        formulaKey: string;
        requiredECS: number;
        visitorECS: number;
        total: number;
    };
    secondary: Array<{
        ruleKey: string;
        required: boolean;
        description: string;
    }>;
    basement: {
        compliant: boolean | null;
        allowed: boolean;
    };
}
export interface BbmpComplianceResult {
    farAllowed: number;
    coverageAllowed: number;
    permissibleBuiltup: number;
    maxFootprint: number;
    actualFar: number | null;
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
    basementCompliant: boolean | null;
    secondaryCompliance: {
        rainwaterHarvesting: boolean;
        solarWaterHeating: boolean;
        treePlanting: boolean;
        earthquakeDesign: boolean;
    };
    governingRoadWidthM: number;
    notes: string[];
    compliance: BbmpComplianceFlags;
    calculationTrace: BbmpCalculationTrace;
}
//# sourceMappingURL=types.d.ts.map