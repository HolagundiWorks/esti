import { z } from "zod";
/** BBMP development zone (RMP category). */
export const DevelopmentArea = z.enum(["A", "B", "C"]);
export const DEVELOPMENT_AREA_LABEL = {
    A: "Zone A (core / legacy)",
    B: "Zone B",
    C: "Zone C (peripheral)",
};
/** Building occupancy / use — maps to doc ProjectType. */
export const BbmpProjectType = z.enum(["RESIDENTIAL", "COMMERCIAL", "SEMI_PUBLIC", "PUBLIC"]);
export const BBMP_PROJECT_TYPE_LABEL = {
    RESIDENTIAL: "Residential",
    COMMERCIAL: "Commercial",
    SEMI_PUBLIC: "Semi-public",
    PUBLIC: "Public building",
};
export const RoadClass = z.enum(["NH", "SH", "ARTERIAL", "COLLECTOR", "LOCAL"]);
export const ROAD_CLASS_LABEL = {
    NH: "National Highway",
    SH: "State Highway",
    ARTERIAL: "Arterial",
    COLLECTOR: "Collector",
    LOCAL: "Local",
};
const sideInput = z.object({
    abutsRoad: z.boolean().default(false),
    roadWidthM: z.number().nonnegative().default(0),
    roadClass: RoadClass.default("LOCAL"),
    /** Distance from road centreline to plot boundary (m). */
    distanceCentreToBoundaryM: z.number().nonnegative().default(0),
    /** @deprecated Legacy field — treated as distanceCentreToBoundaryM when set. */
    rblFromCentreM: z.number().nonnegative().optional(),
});
export const BbmpComplianceInput = z.object({
    projectType: BbmpProjectType,
    developmentArea: DevelopmentArea.default("A"),
    siteAreaSqm: z.number().positive(),
    plotWidthM: z.number().positive(),
    plotDepthM: z.number().positive(),
    buildingHeightM: z.number().positive().default(9.0),
    floorCount: z.number().int().positive().default(2),
    plinthAreaSqm: z.number().nonnegative().optional(),
    /** Gross floor area for FAR exemption check (optional). */
    totalFloorAreaSqm: z.number().nonnegative().optional(),
    exemptAreaSqm: z.number().nonnegative().default(0),
    /** Residential parking inputs */
    dwellingUnits: z.number().int().nonnegative().default(1),
    unitAreaSqm: z.number().nonnegative().default(120),
    /** Commercial parking — defaults to permissible built-up when unset */
    commercialFloorAreaSqm: z.number().nonnegative().optional(),
    front: sideInput,
    rear: sideInput,
    left: sideInput,
    right: sideInput,
    hasBasement: z.boolean().default(false),
    basementHeightM: z.number().nonnegative().default(0),
    basementMechanicalParking: z.boolean().default(false),
    basementProjectionAboveGroundM: z.number().nonnegative().default(0),
    treesPlanted: z.number().int().nonnegative().default(0),
    /** Proposed ground coverage % — enables coverage compliance check. */
    proposedGroundCoverPct: z.number().nonnegative().optional(),
    /** Actual setbacks (m) — enables setback compliance when all four provided. */
    actualSetbacks: z
        .object({
        front: z.number().nonnegative().optional(),
        rear: z.number().nonnegative().optional(),
        left: z.number().nonnegative().optional(),
        right: z.number().nonnegative().optional(),
    })
        .optional(),
    /** Provided parking ECS — enables parking compliance check. */
    providedParkingEcs: z.number().nonnegative().optional(),
});
