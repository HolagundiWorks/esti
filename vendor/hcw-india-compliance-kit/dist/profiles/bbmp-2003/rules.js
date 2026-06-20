import { DEFAULT_BBMP_RULE_CATALOG } from "./catalog.js";
export const BBMP_ENGINE_CONSTANT_DEFAULTS = {
    lowriseHeightM: 9.5,
    basementMinHeightM: 2.4,
    basementMaxHeightM: 2.75,
    basementMechParkingHeightM: 3.6,
    basementMaxProjectionM: 1.0,
    visitorParkingPct: 0.1,
    sqmPerEcs: 18,
};
/** @deprecated Use catalog.engineConstants — kept for callers that import the object shape. */
export const BBMP_ENGINE_CONSTANTS = {
    LOWRISE_HEIGHT_M: BBMP_ENGINE_CONSTANT_DEFAULTS.lowriseHeightM,
    BASEMENT_MIN_HEIGHT: BBMP_ENGINE_CONSTANT_DEFAULTS.basementMinHeightM,
    BASEMENT_MAX_HEIGHT: BBMP_ENGINE_CONSTANT_DEFAULTS.basementMaxHeightM,
    MECH_PARKING_HEIGHT: BBMP_ENGINE_CONSTANT_DEFAULTS.basementMechParkingHeightM,
    BASEMENT_MAX_PROJECTION: BBMP_ENGINE_CONSTANT_DEFAULTS.basementMaxProjectionM,
};
export function engineConstants(catalog = DEFAULT_BBMP_RULE_CATALOG) {
    return catalog.engineConstants ?? BBMP_ENGINE_CONSTANT_DEFAULTS;
}
/** BBMP Building Bye-Laws 2003 seed rules — verify against current gazette before production use. */
export const BBMP_FAR_RULES = [
    // Zone A — doc examples
    { developmentArea: "A", siteAreaMin: 0, siteAreaMax: 240, roadWidthMin: 0, roadWidthMax: 6, residentialFar: 0.75, commercialFar: 1.0, semiPublicFar: 1.0, publicFar: 1.0, maxCoverage: 50 },
    { developmentArea: "A", siteAreaMin: 240, siteAreaMax: 500, roadWidthMin: 6, roadWidthMax: 9, residentialFar: 0.75, commercialFar: 1.0, semiPublicFar: 1.0, publicFar: 1.0, maxCoverage: 50 },
    { developmentArea: "A", siteAreaMin: 500, siteAreaMax: 1000, roadWidthMin: 9, roadWidthMax: 12, residentialFar: 1.0, commercialFar: 1.25, semiPublicFar: 1.25, publicFar: 1.25, maxCoverage: 55 },
    { developmentArea: "A", siteAreaMin: 1000, siteAreaMax: 2000, roadWidthMin: 12, roadWidthMax: 18, residentialFar: 1.25, commercialFar: 1.5, semiPublicFar: 1.5, publicFar: 1.5, maxCoverage: 55 },
    { developmentArea: "A", siteAreaMin: 2000, siteAreaMax: Infinity, roadWidthMin: 18, roadWidthMax: Infinity, residentialFar: 1.5, commercialFar: 1.75, semiPublicFar: 1.75, publicFar: 1.75, maxCoverage: 60 },
    // Zone B — moderate intensity
    { developmentArea: "B", siteAreaMin: 0, siteAreaMax: 500, roadWidthMin: 0, roadWidthMax: 9, residentialFar: 1.0, commercialFar: 1.25, semiPublicFar: 1.25, publicFar: 1.25, maxCoverage: 55 },
    { developmentArea: "B", siteAreaMin: 500, siteAreaMax: 2000, roadWidthMin: 9, roadWidthMax: 18, residentialFar: 1.5, commercialFar: 1.75, semiPublicFar: 1.75, publicFar: 1.75, maxCoverage: 60 },
    { developmentArea: "B", siteAreaMin: 2000, siteAreaMax: Infinity, roadWidthMin: 18, roadWidthMax: Infinity, residentialFar: 1.75, commercialFar: 2.0, semiPublicFar: 2.0, publicFar: 2.0, maxCoverage: 60 },
    // Zone C — peripheral / greenfield
    { developmentArea: "C", siteAreaMin: 0, siteAreaMax: 1000, roadWidthMin: 0, roadWidthMax: 12, residentialFar: 1.25, commercialFar: 1.5, semiPublicFar: 1.5, publicFar: 1.5, maxCoverage: 55 },
    { developmentArea: "C", siteAreaMin: 1000, siteAreaMax: Infinity, roadWidthMin: 12, roadWidthMax: Infinity, residentialFar: 1.75, commercialFar: 2.25, semiPublicFar: 2.25, publicFar: 2.25, maxCoverage: 65 },
];
/** Table 4 — height ≤ 9.5 m (plot dimension based). BYLAWS-BBMP.md §6 Case 1. */
export const BBMP_LOWRISE_SETBACK_RULES = [
    { depthMin: 0, depthMax: 12, widthMin: 0, widthMax: 12, front: 2.0, rear: 1.0, left: 1.0, right: 2.0 },
    { depthMin: 12, depthMax: 18, widthMin: 12, widthMax: 18, front: 3.0, rear: 1.5, left: 1.5, right: 3.0 },
    { depthMin: 18, depthMax: 24, widthMin: 18, widthMax: 24, front: 4.0, rear: 2.0, left: 2.0, right: 4.0 },
    { depthMin: 24, depthMax: Infinity, widthMin: 24, widthMax: Infinity, front: 5.0, rear: 2.5, left: 2.5, right: 5.0 },
];
/** Table 5 — height > 9.5 m (uniform). BYLAWS-BBMP.md §6 Case 2. */
export const BBMP_HIGHRISE_SETBACK_RULES = [
    { heightMin: 9.5, heightMax: 12, uniformSetback: 4.5 },
    { heightMin: 12, heightMax: 15, uniformSetback: 5.0 },
    { heightMin: 15, heightMax: 18, uniformSetback: 6.0 },
    { heightMin: 18, heightMax: 24, uniformSetback: 7.5 },
    { heightMin: 24, heightMax: 30, uniformSetback: 9.0 },
    { heightMin: 30, heightMax: 35, uniformSetback: 11.0 },
    { heightMin: 35, heightMax: Infinity, uniformSetback: 12.0 },
];
/** Road centreline restriction margins — BYLAWS-BBMP.md §8. */
export const BBMP_ROAD_MARGINS = [
    { roadClass: "NH", roadMarginM: 12 },
    { roadClass: "SH", roadMarginM: 9 },
    { roadClass: "ARTERIAL", roadMarginM: 6 },
    { roadClass: "COLLECTOR", roadMarginM: 4.5 },
    { roadClass: "LOCAL", roadMarginM: 3 },
];
/** Parking — BYLAWS-BBMP.md Engine 5. */
export const BBMP_PARKING_RULES = [
    {
        projectType: "RESIDENTIAL",
        useCategory: "DEFAULT",
        unitAreaMin: 0,
        unitAreaMax: 150,
        floorAreaMin: 0,
        floorAreaMax: Infinity,
        formulaKey: "RESIDENTIAL_STANDARD",
        visitorParkingPct: 0.1,
    },
    {
        projectType: "RESIDENTIAL",
        useCategory: "DEFAULT",
        unitAreaMin: 150,
        unitAreaMax: Infinity,
        floorAreaMin: 0,
        floorAreaMax: Infinity,
        formulaKey: "RESIDENTIAL_LARGE_UNIT",
        visitorParkingPct: 0.1,
    },
    {
        projectType: "COMMERCIAL",
        useCategory: "DEFAULT",
        unitAreaMin: 0,
        unitAreaMax: Infinity,
        floorAreaMin: 0,
        floorAreaMax: Infinity,
        formulaKey: "COMMERCIAL_FLOOR_AREA",
        sqmPerEcs: 50,
        visitorParkingPct: 0.1,
    },
    {
        projectType: "SEMI_PUBLIC",
        useCategory: "DEFAULT",
        unitAreaMin: 0,
        unitAreaMax: Infinity,
        floorAreaMin: 0,
        floorAreaMax: Infinity,
        formulaKey: "COMMERCIAL_FLOOR_AREA",
        sqmPerEcs: 50,
        visitorParkingPct: 0.1,
    },
    {
        projectType: "PUBLIC",
        useCategory: "DEFAULT",
        unitAreaMin: 0,
        unitAreaMax: Infinity,
        floorAreaMin: 0,
        floorAreaMax: Infinity,
        formulaKey: "COMMERCIAL_FLOOR_AREA",
        sqmPerEcs: 50,
        visitorParkingPct: 0.1,
    },
];
/** Solar LPD reference — occupancy-specific lookup (future). */
export const BBMP_SOLAR_RULES = [
    { occupancyType: "HOSPITAL", lpdRequired: 100, basis: "100 LPD per 4 beds" },
    { occupancyType: "RESIDENTIAL", lpdRequired: 0, basis: "Site area trigger via secondary rule" },
];
/** Secondary compliance — BYLAWS-BBMP.md Engine 6. */
export const BBMP_SECONDARY_RULES = [
    {
        ruleKey: "RAINWATER_HARVESTING",
        description: "Rainwater harvesting mandatory",
        siteAreaMin: 200,
        plinthAreaMin: 100,
        requirementJson: { type: "rainwater" },
    },
    {
        ruleKey: "TREE_PLANTING",
        description: "Minimum tree planting",
        siteAreaMin: 200,
        requirementJson: { minTrees: 2 },
    },
    {
        ruleKey: "SOLAR_WATER_HEATING",
        description: "Solar water heating mandatory",
        siteAreaMin: 200,
        requirementJson: { type: "solar" },
    },
    {
        ruleKey: "EARTHQUAKE_DESIGN",
        description: "Earthquake-resistant design (IS 1893)",
        heightMinM: 15,
        floorsMin: 5,
        requirementJson: { standard: "IS 1893" },
    },
];
export function farForProjectType(row, projectType) {
    switch (projectType) {
        case "COMMERCIAL":
            return row.commercialFar;
        case "SEMI_PUBLIC":
            return row.semiPublicFar;
        case "PUBLIC":
            return row.publicFar;
        default:
            return row.residentialFar;
    }
}
const OPEN_BAND = 999_999_999;
/** Human-readable sq m band for rule tables (e.g. `240–500`, `2000+`). */
export function formatSqmBand(min, max) {
    if (!Number.isFinite(max) || max >= OPEN_BAND) {
        return min === 0 ? "any" : `${min}+`;
    }
    if (min === 0)
        return `< ${max}`;
    return `${min}–${max}`;
}
/** Human-readable road width band in metres. */
export function formatRoadBandM(min, max) {
    if (!Number.isFinite(max) || max >= OPEN_BAND) {
        return min === 0 ? "any" : `${min} m+`;
    }
    if (min === 0)
        return `< ${max} m`;
    return `${min}–${max} m`;
}
export function farRuleRowKey(row) {
    return `${row.developmentArea}|${row.siteAreaMin}|${row.siteAreaMax}|${row.roadWidthMin}|${row.roadWidthMax}`;
}
export function lookupFarRuleResult(area, siteAreaSqm, governingRoadWidthM, catalog = DEFAULT_BBMP_RULE_CATALOG) {
    const zoneRules = catalog.far.filter((r) => r.developmentArea === area);
    if (!zoneRules.length) {
        return { row: catalog.far[0], basis: "fallback" };
    }
    const exact = zoneRules.find((r) => inBand(siteAreaSqm, r.siteAreaMin, r.siteAreaMax) &&
        inBand(governingRoadWidthM, r.roadWidthMin, r.roadWidthMax));
    if (exact)
        return { row: exact, basis: "exact" };
    const siteMatches = zoneRules.filter((r) => inBand(siteAreaSqm, r.siteAreaMin, r.siteAreaMax));
    const roadMatches = zoneRules.filter((r) => inBand(governingRoadWidthM, r.roadWidthMin, r.roadWidthMax));
    if (siteMatches.length && roadMatches.length) {
        // Large site on a narrow road: apply the lesser road-width band, not the site-only tier.
        const roadLimited = roadMatches
            .filter((r) => siteAreaSqm >= r.siteAreaMin)
            .sort((a, b) => b.siteAreaMin - a.siteAreaMin)[0] ??
            roadMatches.reduce((best, r) => farForProjectType(r, "RESIDENTIAL") < farForProjectType(best, "RESIDENTIAL") ? r : best);
        if (siteAreaSqm >= roadLimited.siteAreaMin) {
            return { row: roadLimited, basis: "road" };
        }
        // Wide road relative to site tier — site band governs.
        const siteGoverned = siteMatches
            .filter((r) => governingRoadWidthM >= r.roadWidthMin)
            .sort((a, b) => b.roadWidthMin - a.roadWidthMin)[0] ?? siteMatches[0];
        return { row: siteGoverned, basis: "site" };
    }
    if (siteMatches.length) {
        const qualifying = siteMatches
            .filter((r) => governingRoadWidthM >= r.roadWidthMin)
            .sort((a, b) => b.roadWidthMin - a.roadWidthMin)[0];
        if (qualifying) {
            return {
                row: qualifying,
                basis: inBand(governingRoadWidthM, qualifying.roadWidthMin, qualifying.roadWidthMax)
                    ? "exact"
                    : "site",
            };
        }
        return { row: siteMatches[0], basis: "site" };
    }
    if (roadMatches.length) {
        return { row: roadMatches[0], basis: "road" };
    }
    return { row: zoneRules[zoneRules.length - 1], basis: "fallback" };
}
export function lookupFarRule(area, siteAreaSqm, governingRoadWidthM, catalog = DEFAULT_BBMP_RULE_CATALOG) {
    return lookupFarRuleResult(area, siteAreaSqm, governingRoadWidthM, catalog).row;
}
function inBand(value, min, max) {
    return value >= min && value < max;
}
export function lookupLowriseSetbacks(plotDepthM, plotWidthM, catalog = DEFAULT_BBMP_RULE_CATALOG) {
    const rows = catalog.lowriseSetbacks;
    const depthRow = rows.find((r) => inBand(plotDepthM, r.depthMin, r.depthMax)) ??
        rows[rows.length - 1];
    const widthRow = rows.find((r) => inBand(plotWidthM, r.widthMin, r.widthMax)) ??
        rows[rows.length - 1];
    return {
        front: depthRow.front,
        rear: depthRow.rear,
        left: widthRow.left,
        right: widthRow.right,
    };
}
export function lookupHighriseSetback(heightM, catalog = DEFAULT_BBMP_RULE_CATALOG) {
    const rows = catalog.highriseSetbacks;
    const row = rows.find((r) => heightM >= r.heightMin && heightM < r.heightMax) ??
        rows[rows.length - 1];
    return row.uniformSetback;
}
export function roadMarginM(roadClass, catalog = DEFAULT_BBMP_RULE_CATALOG) {
    return catalog.roadMargins.find((r) => r.roadClass === roadClass)?.roadMarginM ?? 3;
}
export function computeRblSetback(roadWidthM, roadClass, distanceCentreToBoundaryM, catalog = DEFAULT_BBMP_RULE_CATALOG) {
    const rblFromCentre = roadWidthM / 2 + roadMarginM(roadClass, catalog);
    return Math.max(0, rblFromCentre - distanceCentreToBoundaryM);
}
export function lookupParkingRule(projectType, unitAreaSqm, catalog = DEFAULT_BBMP_RULE_CATALOG) {
    const rules = catalog.parkingRules.filter((r) => r.projectType === projectType);
    const match = rules.find((r) => inBand(unitAreaSqm, r.unitAreaMin, r.unitAreaMax)) ??
        rules[rules.length - 1];
    if (match)
        return match;
    return (catalog.parkingRules.find((r) => r.formulaKey === "COMMERCIAL_FLOOR_AREA") ??
        BBMP_PARKING_RULES[2]);
}
export function computeParkingEcs(projectType, permissibleBuiltup, dwellingUnits, unitAreaSqm, commercialFloorAreaSqm, catalog = DEFAULT_BBMP_RULE_CATALOG) {
    const constants = engineConstants(catalog);
    const rule = lookupParkingRule(projectType, unitAreaSqm, catalog);
    const visitorPct = rule.visitorParkingPct ?? constants.visitorParkingPct;
    let requiredECS;
    switch (rule.formulaKey) {
        case "RESIDENTIAL_STANDARD":
            requiredECS = Math.max(1, dwellingUnits);
            break;
        case "RESIDENTIAL_LARGE_UNIT":
            requiredECS =
                dwellingUnits +
                    Math.floor((unitAreaSqm - 150) / 100) * Math.max(1, dwellingUnits);
            break;
        case "COMMERCIAL_FLOOR_AREA":
        default: {
            const floorArea = commercialFloorAreaSqm ?? permissibleBuiltup;
            const sqmPerEcs = rule.sqmPerEcs ?? constants.sqmPerEcs;
            requiredECS = Math.max(1, Math.ceil(floorArea / sqmPerEcs));
            break;
        }
    }
    const visitorECS = Math.max(0, Math.ceil(requiredECS * visitorPct));
    return {
        requiredECS,
        visitorECS,
        total: requiredECS + visitorECS,
        formulaKey: rule.formulaKey,
    };
}
export function checkBasementCompliance(hasBasement, heightM, mechanicalParking, projectionM, catalog = DEFAULT_BBMP_RULE_CATALOG) {
    if (!hasBasement)
        return { allowed: true, compliant: null };
    const c = engineConstants(catalog);
    const maxHeight = mechanicalParking
        ? c.basementMechParkingHeightM
        : c.basementMaxHeightM;
    const heightOk = heightM === 0 || (heightM >= c.basementMinHeightM && heightM <= maxHeight);
    const projectionOk = projectionM <= c.basementMaxProjectionM;
    return { allowed: true, compliant: heightOk && projectionOk };
}
export function secondaryComplianceFlags(siteAreaSqm, plinthAreaSqm, buildingHeightM, floorCount, treesPlanted, catalog = DEFAULT_BBMP_RULE_CATALOG) {
    const rules = catalog.secondaryRules.length
        ? catalog.secondaryRules
        : BBMP_SECONDARY_RULES;
    const flags = {
        rainwaterHarvesting: false,
        solarWaterHeating: false,
        treePlanting: false,
        earthquakeDesign: false,
    };
    for (const rule of rules) {
        switch (rule.ruleKey) {
            case "RAINWATER_HARVESTING":
                flags.rainwaterHarvesting =
                    (rule.plinthAreaMin == null || plinthAreaSqm > rule.plinthAreaMin) &&
                        (rule.siteAreaMin == null || siteAreaSqm > rule.siteAreaMin);
                break;
            case "TREE_PLANTING": {
                const minTrees = Number(rule.requirementJson.minTrees ?? 2);
                const applies = rule.siteAreaMin == null || siteAreaSqm > rule.siteAreaMin;
                flags.treePlanting = applies && treesPlanted >= minTrees;
                break;
            }
            case "SOLAR_WATER_HEATING":
                flags.solarWaterHeating =
                    rule.siteAreaMin == null || siteAreaSqm > rule.siteAreaMin;
                break;
            case "EARTHQUAKE_DESIGN":
                flags.earthquakeDesign =
                    (rule.heightMinM != null && buildingHeightM >= rule.heightMinM) ||
                        (rule.floorsMin != null && floorCount >= rule.floorsMin);
                break;
        }
    }
    return flags;
}
export function secondaryRequirements(siteAreaSqm, plinthAreaSqm, buildingHeightM, floorCount, catalog = DEFAULT_BBMP_RULE_CATALOG) {
    const rules = catalog.secondaryRules.length
        ? catalog.secondaryRules
        : BBMP_SECONDARY_RULES;
    return rules.map((rule) => {
        let required = false;
        switch (rule.ruleKey) {
            case "RAINWATER_HARVESTING":
                required =
                    (rule.plinthAreaMin == null || plinthAreaSqm > rule.plinthAreaMin) &&
                        (rule.siteAreaMin == null || siteAreaSqm > rule.siteAreaMin);
                break;
            case "TREE_PLANTING":
                required = rule.siteAreaMin == null || siteAreaSqm > rule.siteAreaMin;
                break;
            case "SOLAR_WATER_HEATING":
                required = rule.siteAreaMin == null || siteAreaSqm > rule.siteAreaMin;
                break;
            case "EARTHQUAKE_DESIGN":
                required =
                    (rule.heightMinM != null && buildingHeightM >= rule.heightMinM) ||
                        (rule.floorsMin != null && floorCount >= rule.floorsMin);
                break;
        }
        return { ruleKey: rule.ruleKey, required, description: rule.description };
    });
}
