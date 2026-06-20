import { z } from "zod";
import type { BbmpRuleCatalog } from "./catalog.js";
import type { BbmpCalculationTrace, BbmpComplianceResult } from "./types.js";
import type { BylawCalcInput, BylawEnvelope } from "../../bylawcalc.js";
/** Actual constructed / drawing values for post-construction audit. */
export declare const PostConstructionActuals: z.ZodObject<{
    totalFloorAreaSqm: z.ZodNumber;
    exemptAreaSqm: z.ZodDefault<z.ZodNumber>;
    groundFootprintSqm: z.ZodOptional<z.ZodNumber>;
    groundCoverPct: z.ZodOptional<z.ZodNumber>;
    actualFrontSetbackM: z.ZodOptional<z.ZodNumber>;
    actualRearSetbackM: z.ZodOptional<z.ZodNumber>;
    actualLeftSetbackM: z.ZodOptional<z.ZodNumber>;
    actualRightSetbackM: z.ZodOptional<z.ZodNumber>;
    providedParkingEcs: z.ZodOptional<z.ZodNumber>;
    buildingHeightM: z.ZodOptional<z.ZodNumber>;
    floorCount: z.ZodOptional<z.ZodNumber>;
    treesPlanted: z.ZodDefault<z.ZodNumber>;
    hasBasement: z.ZodDefault<z.ZodBoolean>;
    basementHeightM: z.ZodDefault<z.ZodNumber>;
    basementMechanicalParking: z.ZodDefault<z.ZodBoolean>;
    basementProjectionAboveGroundM: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    totalFloorAreaSqm: number;
    exemptAreaSqm: number;
    hasBasement: boolean;
    basementHeightM: number;
    basementMechanicalParking: boolean;
    basementProjectionAboveGroundM: number;
    treesPlanted: number;
    buildingHeightM?: number | undefined;
    floorCount?: number | undefined;
    providedParkingEcs?: number | undefined;
    groundFootprintSqm?: number | undefined;
    groundCoverPct?: number | undefined;
    actualFrontSetbackM?: number | undefined;
    actualRearSetbackM?: number | undefined;
    actualLeftSetbackM?: number | undefined;
    actualRightSetbackM?: number | undefined;
}, {
    totalFloorAreaSqm: number;
    buildingHeightM?: number | undefined;
    floorCount?: number | undefined;
    exemptAreaSqm?: number | undefined;
    hasBasement?: boolean | undefined;
    basementHeightM?: number | undefined;
    basementMechanicalParking?: boolean | undefined;
    basementProjectionAboveGroundM?: number | undefined;
    treesPlanted?: number | undefined;
    providedParkingEcs?: number | undefined;
    groundFootprintSqm?: number | undefined;
    groundCoverPct?: number | undefined;
    actualFrontSetbackM?: number | undefined;
    actualRearSetbackM?: number | undefined;
    actualLeftSetbackM?: number | undefined;
    actualRightSetbackM?: number | undefined;
}>;
export type PostConstructionActuals = z.infer<typeof PostConstructionActuals>;
export type AuditCheckStatus = "passed" | "failed" | "not_evaluated";
export type ViolationSeverity = "none" | "minor" | "major" | "critical";
export interface AuditParameterResult {
    label: string;
    unit: string;
    allowed: number;
    actual: number | null;
    status: AuditCheckStatus;
    violation: number | null;
    severity: ViolationSeverity;
    reason?: string;
    governedBy?: string;
}
/** Pre-construction envelope — how much can legally be built. No violations. */
export interface PreConstructionPotential {
    farAllowed: number;
    permissibleBuiltup: number;
    coverageAllowed: number;
    maxFootprint: number;
    setbacks: BylawEnvelope["setbacks"];
    parking: BylawEnvelope["parking"];
    basementAllowed: boolean;
    secondaryRequirements: {
        rainwaterHarvesting: boolean;
        solarWaterHeating: boolean;
        treePlanting: boolean;
        earthquakeDesign: boolean;
    };
    governingRoadWidthM: number;
    notes: string[];
    calculationTrace: BbmpCalculationTrace;
}
/** Post-construction audit — what has been violated. */
export interface PostConstructionAudit {
    parameters: Record<string, AuditParameterResult>;
    overallStatus: "compliant" | "non_compliant" | "incomplete";
    hasViolations: boolean;
    calculationTrace: BbmpCalculationTrace;
}
/**
 * System 1 — Pre-Construction Development Potential.
 * Answers: how much can we legally build? Does not detect violations.
 */
export declare function computePreConstructionPotential(preInput: BylawCalcInput, catalog?: BbmpRuleCatalog): PreConstructionPotential;
/**
 * System 2 — Post-Construction Compliance Checker.
 * Compares actual values against the shared rule engine. Answers: what has been violated?
 */
export declare function computePostConstructionAudit(preInput: BylawCalcInput, actuals: PostConstructionActuals, catalog?: BbmpRuleCatalog): PostConstructionAudit;
/** Map a full BBMP compliance run to pre-construction display (internal helper). */
export declare function preConstructionFromResult(envelope: BylawEnvelope, bbmp: BbmpComplianceResult): PreConstructionPotential;
//# sourceMappingURL=workflows.d.ts.map