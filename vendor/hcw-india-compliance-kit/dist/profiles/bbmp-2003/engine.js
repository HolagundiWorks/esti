import { DEFAULT_BBMP_RULE_CATALOG } from "./catalog.js";
import { checkBasementCompliance, computeParkingEcs, computeRblSetback, engineConstants, farForProjectType, lookupFarRuleResult, lookupHighriseSetback, lookupLowriseSetbacks, secondaryComplianceFlags, secondaryRequirements, } from "./rules.js";
function sideDistanceM(side) {
    if (side.distanceCentreToBoundaryM > 0)
        return side.distanceCentreToBoundaryM;
    if (side.rblFromCentreM != null && side.rblFromCentreM > 0)
        return side.rblFromCentreM;
    return 0;
}
function tableSetbacks(input, catalog) {
    const lowriseCutoff = engineConstants(catalog).lowriseHeightM;
    if (input.buildingHeightM <= lowriseCutoff) {
        return lookupLowriseSetbacks(input.plotDepthM, input.plotWidthM, catalog);
    }
    const uniform = lookupHighriseSetback(input.buildingHeightM, catalog);
    return { front: uniform, rear: uniform, left: uniform, right: uniform };
}
function governingSetbackForSide(input, side, table, notes, catalog) {
    const s = input[side];
    const tableValue = table[side];
    if (!s.abutsRoad || s.roadWidthM <= 0) {
        return { value: Number(tableValue.toFixed(2)), governedBy: "Bylaw" };
    }
    const rblSetback = computeRblSetback(s.roadWidthM, s.roadClass, sideDistanceM(s), catalog);
    const value = Math.max(tableValue, rblSetback);
    const governedBy = rblSetback > tableValue ? "RBL" : "Bylaw";
    if (governedBy === "RBL") {
        notes.push(`${side}: RBL governs (${rblSetback.toFixed(2)} m > bylaw ${tableValue} m)`);
    }
    return { value: Number(value.toFixed(2)), governedBy };
}
function buildCompliance(input, farAllowed, coverageAllowed, actualFar, setbacks, parkingTotal, basementCompliant) {
    const isFarCompliant = actualFar == null ? null : actualFar <= farAllowed;
    const isCoverageCompliant = input.proposedGroundCoverPct == null
        ? null
        : input.proposedGroundCoverPct <= coverageAllowed;
    let isSetbackCompliant = null;
    const actual = input.actualSetbacks;
    if (actual?.front != null && actual.rear != null && actual.left != null && actual.right != null) {
        isSetbackCompliant =
            actual.front >= setbacks.front.value &&
                actual.rear >= setbacks.rear.value &&
                actual.left >= setbacks.left.value &&
                actual.right >= setbacks.right.value;
    }
    const isParkingCompliant = input.providedParkingEcs == null ? null : input.providedParkingEcs >= parkingTotal;
    const isBasementCompliant = !input.hasBasement ? null : basementCompliant !== false;
    const checks = [
        isFarCompliant,
        isCoverageCompliant,
        isSetbackCompliant,
        isParkingCompliant,
        isBasementCompliant,
    ].filter((v) => v !== null);
    const isOverallCompliant = checks.length === 0 ? null : checks.every(Boolean);
    return {
        isFarCompliant,
        isCoverageCompliant,
        isSetbackCompliant,
        isParkingCompliant,
        isBasementCompliant,
        isOverallCompliant,
    };
}
/**
 * BBMP Building Compliance Engine — evaluation order per BYLAWS-BBMP.md §1.
 */
export function computeBbmpCompliance(input, catalog = DEFAULT_BBMP_RULE_CATALOG) {
    const constants = engineConstants(catalog);
    const sides = {
        front: input.front,
        rear: input.rear,
        left: input.left,
        right: input.right,
    };
    const roadWidths = Object.values(sides)
        .filter((s) => s.abutsRoad && s.roadWidthM > 0)
        .map((s) => s.roadWidthM);
    const governingRoadWidthM = roadWidths.length ? Math.max(...roadWidths) : 0;
    const notes = [];
    const farLookup = lookupFarRuleResult(input.developmentArea, input.siteAreaSqm, governingRoadWidthM, catalog);
    const farRule = farLookup.row;
    const farAllowed = farForProjectType(farRule, input.projectType);
    const coverageAllowed = farRule.maxCoverage;
    if (farLookup.basis === "road") {
        notes.push(`FAR and ground cover limited by governing road width (${governingRoadWidthM} m) — site area alone would fall in a higher band`);
    }
    else if (farLookup.basis === "site") {
        notes.push(`FAR and ground cover from site-area band; governing road (${governingRoadWidthM} m) meets or exceeds the required width for that band`);
    }
    const permissibleBuiltup = Math.round(input.siteAreaSqm * farAllowed);
    const maxFootprint = Math.round((input.siteAreaSqm * coverageAllowed) / 100);
    if (input.buildingHeightM <= constants.lowriseHeightM) {
        notes.push(`Building ≤ ${constants.lowriseHeightM} m: setbacks from plot depth/width (Table 4)`);
    }
    else {
        notes.push(`Building > ${constants.lowriseHeightM} m: uniform setbacks (Table 5)`);
    }
    const table = tableSetbacks(input, catalog);
    const setbacks = {
        front: governingSetbackForSide(input, "front", table, notes, catalog),
        rear: governingSetbackForSide(input, "rear", table, notes, catalog),
        left: governingSetbackForSide(input, "left", table, notes, catalog),
        right: governingSetbackForSide(input, "right", table, notes, catalog),
    };
    const parking = computeParkingEcs(input.projectType, permissibleBuiltup, input.dwellingUnits, input.unitAreaSqm, input.commercialFloorAreaSqm, catalog);
    const basement = checkBasementCompliance(input.hasBasement, input.basementHeightM, input.basementMechanicalParking, input.basementProjectionAboveGroundM, catalog);
    if (input.hasBasement && basement.compliant === false) {
        notes.push("Basement height or projection above ground exceeds bye-law limits");
    }
    const plinth = input.plinthAreaSqm ?? maxFootprint;
    let actualFar = null;
    if (input.totalFloorAreaSqm != null && input.totalFloorAreaSqm > 0) {
        const net = Math.max(0, input.totalFloorAreaSqm - input.exemptAreaSqm);
        actualFar = Number((net / input.siteAreaSqm).toFixed(3));
        if (actualFar > farAllowed) {
            notes.push(`Actual FAR ${actualFar} exceeds allowed ${farAllowed} (after exemptions)`);
        }
    }
    const secondaryCompliance = secondaryComplianceFlags(input.siteAreaSqm, plinth, input.buildingHeightM, input.floorCount, input.treesPlanted ?? 0, catalog);
    const compliance = buildCompliance(input, farAllowed, coverageAllowed, actualFar, setbacks, parking.total, basement.compliant);
    const calculationTrace = {
        far: {
            basis: farLookup.basis,
            developmentArea: input.developmentArea,
            governingRoadWidthM,
            farAllowed,
            coverageAllowed,
        },
        setbacks: {
            front: {
                required: setbacks.front.value,
                governedBy: setbacks.front.governedBy,
                actual: input.actualSetbacks?.front,
            },
            rear: {
                required: setbacks.rear.value,
                governedBy: setbacks.rear.governedBy,
                actual: input.actualSetbacks?.rear,
            },
            left: {
                required: setbacks.left.value,
                governedBy: setbacks.left.governedBy,
                actual: input.actualSetbacks?.left,
            },
            right: {
                required: setbacks.right.value,
                governedBy: setbacks.right.governedBy,
                actual: input.actualSetbacks?.right,
            },
        },
        parking: {
            formulaKey: parking.formulaKey,
            requiredECS: parking.requiredECS,
            visitorECS: parking.visitorECS,
            total: parking.total,
        },
        secondary: secondaryRequirements(input.siteAreaSqm, plinth, input.buildingHeightM, input.floorCount, catalog),
        basement: { compliant: basement.compliant, allowed: basement.allowed },
    };
    return {
        farAllowed,
        coverageAllowed,
        permissibleBuiltup,
        maxFootprint,
        actualFar,
        setbacks,
        parking,
        basementAllowed: basement.allowed,
        basementCompliant: basement.compliant,
        secondaryCompliance,
        governingRoadWidthM,
        notes,
        compliance,
        calculationTrace,
    };
}
