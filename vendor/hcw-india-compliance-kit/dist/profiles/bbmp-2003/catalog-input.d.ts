import { z } from "zod";
export declare const FarRuleRowInput: z.ZodObject<{
    developmentArea: z.ZodEnum<["A", "B", "C"]>;
    siteAreaMin: z.ZodNumber;
    siteAreaMax: z.ZodNumber;
    roadWidthMin: z.ZodNumber;
    roadWidthMax: z.ZodNumber;
    residentialFar: z.ZodNumber;
    commercialFar: z.ZodNumber;
    semiPublicFar: z.ZodNumber;
    publicFar: z.ZodNumber;
    maxCoverage: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    developmentArea: "A" | "B" | "C";
    siteAreaMin: number;
    siteAreaMax: number;
    roadWidthMin: number;
    roadWidthMax: number;
    residentialFar: number;
    commercialFar: number;
    semiPublicFar: number;
    publicFar: number;
    maxCoverage: number;
}, {
    developmentArea: "A" | "B" | "C";
    siteAreaMin: number;
    siteAreaMax: number;
    roadWidthMin: number;
    roadWidthMax: number;
    residentialFar: number;
    commercialFar: number;
    semiPublicFar: number;
    publicFar: number;
    maxCoverage: number;
}>;
export declare const LowriseSetbackRowInput: z.ZodObject<{
    depthMin: z.ZodNumber;
    depthMax: z.ZodNumber;
    widthMin: z.ZodNumber;
    widthMax: z.ZodNumber;
    front: z.ZodNumber;
    rear: z.ZodNumber;
    left: z.ZodNumber;
    right: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    front: number;
    rear: number;
    left: number;
    right: number;
    depthMin: number;
    depthMax: number;
    widthMin: number;
    widthMax: number;
}, {
    front: number;
    rear: number;
    left: number;
    right: number;
    depthMin: number;
    depthMax: number;
    widthMin: number;
    widthMax: number;
}>;
export declare const HighriseSetbackRowInput: z.ZodObject<{
    heightMin: z.ZodNumber;
    heightMax: z.ZodNumber;
    uniformSetback: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    heightMin: number;
    heightMax: number;
    uniformSetback: number;
}, {
    heightMin: number;
    heightMax: number;
    uniformSetback: number;
}>;
export declare const RoadMarginRowInput: z.ZodObject<{
    roadClass: z.ZodEnum<["NH", "SH", "ARTERIAL", "COLLECTOR", "LOCAL"]>;
    roadMarginM: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
    roadMarginM: number;
}, {
    roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
    roadMarginM: number;
}>;
export declare const ParkingRuleRowInput: z.ZodObject<{
    projectType: z.ZodEnum<["RESIDENTIAL", "COMMERCIAL", "SEMI_PUBLIC", "PUBLIC"]>;
    useCategory: z.ZodDefault<z.ZodString>;
    unitAreaMin: z.ZodDefault<z.ZodNumber>;
    unitAreaMax: z.ZodNumber;
    floorAreaMin: z.ZodDefault<z.ZodNumber>;
    floorAreaMax: z.ZodNumber;
    formulaKey: z.ZodEnum<["RESIDENTIAL_STANDARD", "RESIDENTIAL_LARGE_UNIT", "COMMERCIAL_FLOOR_AREA"]>;
    sqmPerEcs: z.ZodOptional<z.ZodNumber>;
    visitorParkingPct: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
    useCategory: string;
    unitAreaMin: number;
    unitAreaMax: number;
    floorAreaMin: number;
    floorAreaMax: number;
    formulaKey: "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
    visitorParkingPct: number;
    sqmPerEcs?: number | undefined;
}, {
    projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
    unitAreaMax: number;
    floorAreaMax: number;
    formulaKey: "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
    useCategory?: string | undefined;
    unitAreaMin?: number | undefined;
    floorAreaMin?: number | undefined;
    sqmPerEcs?: number | undefined;
    visitorParkingPct?: number | undefined;
}>;
export declare const SecondaryRuleRowInput: z.ZodObject<{
    ruleKey: z.ZodEnum<["RAINWATER_HARVESTING", "TREE_PLANTING", "SOLAR_WATER_HEATING", "EARTHQUAKE_DESIGN"]>;
    description: z.ZodString;
    siteAreaMin: z.ZodOptional<z.ZodNumber>;
    plinthAreaMin: z.ZodOptional<z.ZodNumber>;
    heightMinM: z.ZodOptional<z.ZodNumber>;
    floorsMin: z.ZodOptional<z.ZodNumber>;
    requirementJson: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    ruleKey: "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
    description: string;
    requirementJson: Record<string, unknown>;
    siteAreaMin?: number | undefined;
    plinthAreaMin?: number | undefined;
    heightMinM?: number | undefined;
    floorsMin?: number | undefined;
}, {
    ruleKey: "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
    description: string;
    siteAreaMin?: number | undefined;
    plinthAreaMin?: number | undefined;
    heightMinM?: number | undefined;
    floorsMin?: number | undefined;
    requirementJson?: Record<string, unknown> | undefined;
}>;
export declare const EngineConstantsInput: z.ZodObject<{
    lowriseHeightM: z.ZodNumber;
    basementMinHeightM: z.ZodNumber;
    basementMaxHeightM: z.ZodNumber;
    basementMechParkingHeightM: z.ZodNumber;
    basementMaxProjectionM: z.ZodNumber;
    visitorParkingPct: z.ZodNumber;
    sqmPerEcs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    sqmPerEcs: number;
    visitorParkingPct: number;
    lowriseHeightM: number;
    basementMinHeightM: number;
    basementMaxHeightM: number;
    basementMechParkingHeightM: number;
    basementMaxProjectionM: number;
}, {
    sqmPerEcs: number;
    visitorParkingPct: number;
    lowriseHeightM: number;
    basementMinHeightM: number;
    basementMaxHeightM: number;
    basementMechParkingHeightM: number;
    basementMaxProjectionM: number;
}>;
/** Full modular catalog payload for create/update of a BBMP rule set. */
export declare const BbmpRuleCatalogInput: z.ZodObject<{
    far: z.ZodArray<z.ZodObject<{
        developmentArea: z.ZodEnum<["A", "B", "C"]>;
        siteAreaMin: z.ZodNumber;
        siteAreaMax: z.ZodNumber;
        roadWidthMin: z.ZodNumber;
        roadWidthMax: z.ZodNumber;
        residentialFar: z.ZodNumber;
        commercialFar: z.ZodNumber;
        semiPublicFar: z.ZodNumber;
        publicFar: z.ZodNumber;
        maxCoverage: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        developmentArea: "A" | "B" | "C";
        siteAreaMin: number;
        siteAreaMax: number;
        roadWidthMin: number;
        roadWidthMax: number;
        residentialFar: number;
        commercialFar: number;
        semiPublicFar: number;
        publicFar: number;
        maxCoverage: number;
    }, {
        developmentArea: "A" | "B" | "C";
        siteAreaMin: number;
        siteAreaMax: number;
        roadWidthMin: number;
        roadWidthMax: number;
        residentialFar: number;
        commercialFar: number;
        semiPublicFar: number;
        publicFar: number;
        maxCoverage: number;
    }>, "many">;
    lowriseSetbacks: z.ZodArray<z.ZodObject<{
        depthMin: z.ZodNumber;
        depthMax: z.ZodNumber;
        widthMin: z.ZodNumber;
        widthMax: z.ZodNumber;
        front: z.ZodNumber;
        rear: z.ZodNumber;
        left: z.ZodNumber;
        right: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        front: number;
        rear: number;
        left: number;
        right: number;
        depthMin: number;
        depthMax: number;
        widthMin: number;
        widthMax: number;
    }, {
        front: number;
        rear: number;
        left: number;
        right: number;
        depthMin: number;
        depthMax: number;
        widthMin: number;
        widthMax: number;
    }>, "many">;
    highriseSetbacks: z.ZodArray<z.ZodObject<{
        heightMin: z.ZodNumber;
        heightMax: z.ZodNumber;
        uniformSetback: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        heightMin: number;
        heightMax: number;
        uniformSetback: number;
    }, {
        heightMin: number;
        heightMax: number;
        uniformSetback: number;
    }>, "many">;
    roadMargins: z.ZodArray<z.ZodObject<{
        roadClass: z.ZodEnum<["NH", "SH", "ARTERIAL", "COLLECTOR", "LOCAL"]>;
        roadMarginM: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
        roadMarginM: number;
    }, {
        roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
        roadMarginM: number;
    }>, "many">;
    parkingRules: z.ZodArray<z.ZodObject<{
        projectType: z.ZodEnum<["RESIDENTIAL", "COMMERCIAL", "SEMI_PUBLIC", "PUBLIC"]>;
        useCategory: z.ZodDefault<z.ZodString>;
        unitAreaMin: z.ZodDefault<z.ZodNumber>;
        unitAreaMax: z.ZodNumber;
        floorAreaMin: z.ZodDefault<z.ZodNumber>;
        floorAreaMax: z.ZodNumber;
        formulaKey: z.ZodEnum<["RESIDENTIAL_STANDARD", "RESIDENTIAL_LARGE_UNIT", "COMMERCIAL_FLOOR_AREA"]>;
        sqmPerEcs: z.ZodOptional<z.ZodNumber>;
        visitorParkingPct: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
        useCategory: string;
        unitAreaMin: number;
        unitAreaMax: number;
        floorAreaMin: number;
        floorAreaMax: number;
        formulaKey: "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
        visitorParkingPct: number;
        sqmPerEcs?: number | undefined;
    }, {
        projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
        unitAreaMax: number;
        floorAreaMax: number;
        formulaKey: "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
        useCategory?: string | undefined;
        unitAreaMin?: number | undefined;
        floorAreaMin?: number | undefined;
        sqmPerEcs?: number | undefined;
        visitorParkingPct?: number | undefined;
    }>, "many">;
    secondaryRules: z.ZodArray<z.ZodObject<{
        ruleKey: z.ZodEnum<["RAINWATER_HARVESTING", "TREE_PLANTING", "SOLAR_WATER_HEATING", "EARTHQUAKE_DESIGN"]>;
        description: z.ZodString;
        siteAreaMin: z.ZodOptional<z.ZodNumber>;
        plinthAreaMin: z.ZodOptional<z.ZodNumber>;
        heightMinM: z.ZodOptional<z.ZodNumber>;
        floorsMin: z.ZodOptional<z.ZodNumber>;
        requirementJson: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        ruleKey: "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
        description: string;
        requirementJson: Record<string, unknown>;
        siteAreaMin?: number | undefined;
        plinthAreaMin?: number | undefined;
        heightMinM?: number | undefined;
        floorsMin?: number | undefined;
    }, {
        ruleKey: "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
        description: string;
        siteAreaMin?: number | undefined;
        plinthAreaMin?: number | undefined;
        heightMinM?: number | undefined;
        floorsMin?: number | undefined;
        requirementJson?: Record<string, unknown> | undefined;
    }>, "many">;
    engineConstants: z.ZodObject<{
        lowriseHeightM: z.ZodNumber;
        basementMinHeightM: z.ZodNumber;
        basementMaxHeightM: z.ZodNumber;
        basementMechParkingHeightM: z.ZodNumber;
        basementMaxProjectionM: z.ZodNumber;
        visitorParkingPct: z.ZodNumber;
        sqmPerEcs: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sqmPerEcs: number;
        visitorParkingPct: number;
        lowriseHeightM: number;
        basementMinHeightM: number;
        basementMaxHeightM: number;
        basementMechParkingHeightM: number;
        basementMaxProjectionM: number;
    }, {
        sqmPerEcs: number;
        visitorParkingPct: number;
        lowriseHeightM: number;
        basementMinHeightM: number;
        basementMaxHeightM: number;
        basementMechParkingHeightM: number;
        basementMaxProjectionM: number;
    }>;
}, "strip", z.ZodTypeAny, {
    far: {
        developmentArea: "A" | "B" | "C";
        siteAreaMin: number;
        siteAreaMax: number;
        roadWidthMin: number;
        roadWidthMax: number;
        residentialFar: number;
        commercialFar: number;
        semiPublicFar: number;
        publicFar: number;
        maxCoverage: number;
    }[];
    lowriseSetbacks: {
        front: number;
        rear: number;
        left: number;
        right: number;
        depthMin: number;
        depthMax: number;
        widthMin: number;
        widthMax: number;
    }[];
    highriseSetbacks: {
        heightMin: number;
        heightMax: number;
        uniformSetback: number;
    }[];
    roadMargins: {
        roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
        roadMarginM: number;
    }[];
    parkingRules: {
        projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
        useCategory: string;
        unitAreaMin: number;
        unitAreaMax: number;
        floorAreaMin: number;
        floorAreaMax: number;
        formulaKey: "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
        visitorParkingPct: number;
        sqmPerEcs?: number | undefined;
    }[];
    secondaryRules: {
        ruleKey: "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
        description: string;
        requirementJson: Record<string, unknown>;
        siteAreaMin?: number | undefined;
        plinthAreaMin?: number | undefined;
        heightMinM?: number | undefined;
        floorsMin?: number | undefined;
    }[];
    engineConstants: {
        sqmPerEcs: number;
        visitorParkingPct: number;
        lowriseHeightM: number;
        basementMinHeightM: number;
        basementMaxHeightM: number;
        basementMechParkingHeightM: number;
        basementMaxProjectionM: number;
    };
}, {
    far: {
        developmentArea: "A" | "B" | "C";
        siteAreaMin: number;
        siteAreaMax: number;
        roadWidthMin: number;
        roadWidthMax: number;
        residentialFar: number;
        commercialFar: number;
        semiPublicFar: number;
        publicFar: number;
        maxCoverage: number;
    }[];
    lowriseSetbacks: {
        front: number;
        rear: number;
        left: number;
        right: number;
        depthMin: number;
        depthMax: number;
        widthMin: number;
        widthMax: number;
    }[];
    highriseSetbacks: {
        heightMin: number;
        heightMax: number;
        uniformSetback: number;
    }[];
    roadMargins: {
        roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
        roadMarginM: number;
    }[];
    parkingRules: {
        projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
        unitAreaMax: number;
        floorAreaMax: number;
        formulaKey: "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
        useCategory?: string | undefined;
        unitAreaMin?: number | undefined;
        floorAreaMin?: number | undefined;
        sqmPerEcs?: number | undefined;
        visitorParkingPct?: number | undefined;
    }[];
    secondaryRules: {
        ruleKey: "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
        description: string;
        siteAreaMin?: number | undefined;
        plinthAreaMin?: number | undefined;
        heightMinM?: number | undefined;
        floorsMin?: number | undefined;
        requirementJson?: Record<string, unknown> | undefined;
    }[];
    engineConstants: {
        sqmPerEcs: number;
        visitorParkingPct: number;
        lowriseHeightM: number;
        basementMinHeightM: number;
        basementMaxHeightM: number;
        basementMechParkingHeightM: number;
        basementMaxProjectionM: number;
    };
}>;
export type BbmpRuleCatalogInput = z.infer<typeof BbmpRuleCatalogInput>;
export declare const BbmpRuleSetCreate: z.ZodObject<{
    label: z.ZodString;
    effectiveDate: z.ZodString;
    sourceCitation: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    catalog: z.ZodObject<{
        far: z.ZodArray<z.ZodObject<{
            developmentArea: z.ZodEnum<["A", "B", "C"]>;
            siteAreaMin: z.ZodNumber;
            siteAreaMax: z.ZodNumber;
            roadWidthMin: z.ZodNumber;
            roadWidthMax: z.ZodNumber;
            residentialFar: z.ZodNumber;
            commercialFar: z.ZodNumber;
            semiPublicFar: z.ZodNumber;
            publicFar: z.ZodNumber;
            maxCoverage: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            developmentArea: "A" | "B" | "C";
            siteAreaMin: number;
            siteAreaMax: number;
            roadWidthMin: number;
            roadWidthMax: number;
            residentialFar: number;
            commercialFar: number;
            semiPublicFar: number;
            publicFar: number;
            maxCoverage: number;
        }, {
            developmentArea: "A" | "B" | "C";
            siteAreaMin: number;
            siteAreaMax: number;
            roadWidthMin: number;
            roadWidthMax: number;
            residentialFar: number;
            commercialFar: number;
            semiPublicFar: number;
            publicFar: number;
            maxCoverage: number;
        }>, "many">;
        lowriseSetbacks: z.ZodArray<z.ZodObject<{
            depthMin: z.ZodNumber;
            depthMax: z.ZodNumber;
            widthMin: z.ZodNumber;
            widthMax: z.ZodNumber;
            front: z.ZodNumber;
            rear: z.ZodNumber;
            left: z.ZodNumber;
            right: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            front: number;
            rear: number;
            left: number;
            right: number;
            depthMin: number;
            depthMax: number;
            widthMin: number;
            widthMax: number;
        }, {
            front: number;
            rear: number;
            left: number;
            right: number;
            depthMin: number;
            depthMax: number;
            widthMin: number;
            widthMax: number;
        }>, "many">;
        highriseSetbacks: z.ZodArray<z.ZodObject<{
            heightMin: z.ZodNumber;
            heightMax: z.ZodNumber;
            uniformSetback: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            heightMin: number;
            heightMax: number;
            uniformSetback: number;
        }, {
            heightMin: number;
            heightMax: number;
            uniformSetback: number;
        }>, "many">;
        roadMargins: z.ZodArray<z.ZodObject<{
            roadClass: z.ZodEnum<["NH", "SH", "ARTERIAL", "COLLECTOR", "LOCAL"]>;
            roadMarginM: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
            roadMarginM: number;
        }, {
            roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
            roadMarginM: number;
        }>, "many">;
        parkingRules: z.ZodArray<z.ZodObject<{
            projectType: z.ZodEnum<["RESIDENTIAL", "COMMERCIAL", "SEMI_PUBLIC", "PUBLIC"]>;
            useCategory: z.ZodDefault<z.ZodString>;
            unitAreaMin: z.ZodDefault<z.ZodNumber>;
            unitAreaMax: z.ZodNumber;
            floorAreaMin: z.ZodDefault<z.ZodNumber>;
            floorAreaMax: z.ZodNumber;
            formulaKey: z.ZodEnum<["RESIDENTIAL_STANDARD", "RESIDENTIAL_LARGE_UNIT", "COMMERCIAL_FLOOR_AREA"]>;
            sqmPerEcs: z.ZodOptional<z.ZodNumber>;
            visitorParkingPct: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
            useCategory: string;
            unitAreaMin: number;
            unitAreaMax: number;
            floorAreaMin: number;
            floorAreaMax: number;
            formulaKey: "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
            visitorParkingPct: number;
            sqmPerEcs?: number | undefined;
        }, {
            projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
            unitAreaMax: number;
            floorAreaMax: number;
            formulaKey: "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
            useCategory?: string | undefined;
            unitAreaMin?: number | undefined;
            floorAreaMin?: number | undefined;
            sqmPerEcs?: number | undefined;
            visitorParkingPct?: number | undefined;
        }>, "many">;
        secondaryRules: z.ZodArray<z.ZodObject<{
            ruleKey: z.ZodEnum<["RAINWATER_HARVESTING", "TREE_PLANTING", "SOLAR_WATER_HEATING", "EARTHQUAKE_DESIGN"]>;
            description: z.ZodString;
            siteAreaMin: z.ZodOptional<z.ZodNumber>;
            plinthAreaMin: z.ZodOptional<z.ZodNumber>;
            heightMinM: z.ZodOptional<z.ZodNumber>;
            floorsMin: z.ZodOptional<z.ZodNumber>;
            requirementJson: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            ruleKey: "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
            description: string;
            requirementJson: Record<string, unknown>;
            siteAreaMin?: number | undefined;
            plinthAreaMin?: number | undefined;
            heightMinM?: number | undefined;
            floorsMin?: number | undefined;
        }, {
            ruleKey: "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
            description: string;
            siteAreaMin?: number | undefined;
            plinthAreaMin?: number | undefined;
            heightMinM?: number | undefined;
            floorsMin?: number | undefined;
            requirementJson?: Record<string, unknown> | undefined;
        }>, "many">;
        engineConstants: z.ZodObject<{
            lowriseHeightM: z.ZodNumber;
            basementMinHeightM: z.ZodNumber;
            basementMaxHeightM: z.ZodNumber;
            basementMechParkingHeightM: z.ZodNumber;
            basementMaxProjectionM: z.ZodNumber;
            visitorParkingPct: z.ZodNumber;
            sqmPerEcs: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            sqmPerEcs: number;
            visitorParkingPct: number;
            lowriseHeightM: number;
            basementMinHeightM: number;
            basementMaxHeightM: number;
            basementMechParkingHeightM: number;
            basementMaxProjectionM: number;
        }, {
            sqmPerEcs: number;
            visitorParkingPct: number;
            lowriseHeightM: number;
            basementMinHeightM: number;
            basementMaxHeightM: number;
            basementMechParkingHeightM: number;
            basementMaxProjectionM: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        far: {
            developmentArea: "A" | "B" | "C";
            siteAreaMin: number;
            siteAreaMax: number;
            roadWidthMin: number;
            roadWidthMax: number;
            residentialFar: number;
            commercialFar: number;
            semiPublicFar: number;
            publicFar: number;
            maxCoverage: number;
        }[];
        lowriseSetbacks: {
            front: number;
            rear: number;
            left: number;
            right: number;
            depthMin: number;
            depthMax: number;
            widthMin: number;
            widthMax: number;
        }[];
        highriseSetbacks: {
            heightMin: number;
            heightMax: number;
            uniformSetback: number;
        }[];
        roadMargins: {
            roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
            roadMarginM: number;
        }[];
        parkingRules: {
            projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
            useCategory: string;
            unitAreaMin: number;
            unitAreaMax: number;
            floorAreaMin: number;
            floorAreaMax: number;
            formulaKey: "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
            visitorParkingPct: number;
            sqmPerEcs?: number | undefined;
        }[];
        secondaryRules: {
            ruleKey: "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
            description: string;
            requirementJson: Record<string, unknown>;
            siteAreaMin?: number | undefined;
            plinthAreaMin?: number | undefined;
            heightMinM?: number | undefined;
            floorsMin?: number | undefined;
        }[];
        engineConstants: {
            sqmPerEcs: number;
            visitorParkingPct: number;
            lowriseHeightM: number;
            basementMinHeightM: number;
            basementMaxHeightM: number;
            basementMechParkingHeightM: number;
            basementMaxProjectionM: number;
        };
    }, {
        far: {
            developmentArea: "A" | "B" | "C";
            siteAreaMin: number;
            siteAreaMax: number;
            roadWidthMin: number;
            roadWidthMax: number;
            residentialFar: number;
            commercialFar: number;
            semiPublicFar: number;
            publicFar: number;
            maxCoverage: number;
        }[];
        lowriseSetbacks: {
            front: number;
            rear: number;
            left: number;
            right: number;
            depthMin: number;
            depthMax: number;
            widthMin: number;
            widthMax: number;
        }[];
        highriseSetbacks: {
            heightMin: number;
            heightMax: number;
            uniformSetback: number;
        }[];
        roadMargins: {
            roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
            roadMarginM: number;
        }[];
        parkingRules: {
            projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
            unitAreaMax: number;
            floorAreaMax: number;
            formulaKey: "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
            useCategory?: string | undefined;
            unitAreaMin?: number | undefined;
            floorAreaMin?: number | undefined;
            sqmPerEcs?: number | undefined;
            visitorParkingPct?: number | undefined;
        }[];
        secondaryRules: {
            ruleKey: "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
            description: string;
            siteAreaMin?: number | undefined;
            plinthAreaMin?: number | undefined;
            heightMinM?: number | undefined;
            floorsMin?: number | undefined;
            requirementJson?: Record<string, unknown> | undefined;
        }[];
        engineConstants: {
            sqmPerEcs: number;
            visitorParkingPct: number;
            lowriseHeightM: number;
            basementMinHeightM: number;
            basementMaxHeightM: number;
            basementMechParkingHeightM: number;
            basementMaxProjectionM: number;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    label: string;
    effectiveDate: string;
    catalog: {
        far: {
            developmentArea: "A" | "B" | "C";
            siteAreaMin: number;
            siteAreaMax: number;
            roadWidthMin: number;
            roadWidthMax: number;
            residentialFar: number;
            commercialFar: number;
            semiPublicFar: number;
            publicFar: number;
            maxCoverage: number;
        }[];
        lowriseSetbacks: {
            front: number;
            rear: number;
            left: number;
            right: number;
            depthMin: number;
            depthMax: number;
            widthMin: number;
            widthMax: number;
        }[];
        highriseSetbacks: {
            heightMin: number;
            heightMax: number;
            uniformSetback: number;
        }[];
        roadMargins: {
            roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
            roadMarginM: number;
        }[];
        parkingRules: {
            projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
            useCategory: string;
            unitAreaMin: number;
            unitAreaMax: number;
            floorAreaMin: number;
            floorAreaMax: number;
            formulaKey: "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
            visitorParkingPct: number;
            sqmPerEcs?: number | undefined;
        }[];
        secondaryRules: {
            ruleKey: "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
            description: string;
            requirementJson: Record<string, unknown>;
            siteAreaMin?: number | undefined;
            plinthAreaMin?: number | undefined;
            heightMinM?: number | undefined;
            floorsMin?: number | undefined;
        }[];
        engineConstants: {
            sqmPerEcs: number;
            visitorParkingPct: number;
            lowriseHeightM: number;
            basementMinHeightM: number;
            basementMaxHeightM: number;
            basementMechParkingHeightM: number;
            basementMaxProjectionM: number;
        };
    };
    sourceCitation?: string | undefined;
    notes?: string | undefined;
}, {
    label: string;
    effectiveDate: string;
    catalog: {
        far: {
            developmentArea: "A" | "B" | "C";
            siteAreaMin: number;
            siteAreaMax: number;
            roadWidthMin: number;
            roadWidthMax: number;
            residentialFar: number;
            commercialFar: number;
            semiPublicFar: number;
            publicFar: number;
            maxCoverage: number;
        }[];
        lowriseSetbacks: {
            front: number;
            rear: number;
            left: number;
            right: number;
            depthMin: number;
            depthMax: number;
            widthMin: number;
            widthMax: number;
        }[];
        highriseSetbacks: {
            heightMin: number;
            heightMax: number;
            uniformSetback: number;
        }[];
        roadMargins: {
            roadClass: "NH" | "SH" | "ARTERIAL" | "COLLECTOR" | "LOCAL";
            roadMarginM: number;
        }[];
        parkingRules: {
            projectType: "RESIDENTIAL" | "COMMERCIAL" | "SEMI_PUBLIC" | "PUBLIC";
            unitAreaMax: number;
            floorAreaMax: number;
            formulaKey: "RESIDENTIAL_STANDARD" | "RESIDENTIAL_LARGE_UNIT" | "COMMERCIAL_FLOOR_AREA";
            useCategory?: string | undefined;
            unitAreaMin?: number | undefined;
            floorAreaMin?: number | undefined;
            sqmPerEcs?: number | undefined;
            visitorParkingPct?: number | undefined;
        }[];
        secondaryRules: {
            ruleKey: "RAINWATER_HARVESTING" | "TREE_PLANTING" | "SOLAR_WATER_HEATING" | "EARTHQUAKE_DESIGN";
            description: string;
            siteAreaMin?: number | undefined;
            plinthAreaMin?: number | undefined;
            heightMinM?: number | undefined;
            floorsMin?: number | undefined;
            requirementJson?: Record<string, unknown> | undefined;
        }[];
        engineConstants: {
            sqmPerEcs: number;
            visitorParkingPct: number;
            lowriseHeightM: number;
            basementMinHeightM: number;
            basementMaxHeightM: number;
            basementMechParkingHeightM: number;
            basementMaxProjectionM: number;
        };
    };
    sourceCitation?: string | undefined;
    notes?: string | undefined;
}>;
export type BbmpRuleSetCreate = z.infer<typeof BbmpRuleSetCreate>;
//# sourceMappingURL=catalog-input.d.ts.map