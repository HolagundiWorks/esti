import { z } from "zod";
import type { BbmpRuleCatalog } from "./catalog.js";
import { DEFAULT_BBMP_RULE_CATALOG } from "./catalog.js";
import { computeBbmpCompliance } from "./engine.js";
import type { BbmpCalculationTrace, BbmpComplianceResult } from "./types.js";
import type { BylawCalcInput, BylawEnvelope } from "../bylawcalc.js";
import { computeBylawEnvelope } from "../bylawcalc.js";

/** Actual constructed / drawing values for post-construction audit. */
export const PostConstructionActuals = z.object({
  totalFloorAreaSqm: z.number().nonnegative(),
  exemptAreaSqm: z.number().nonnegative().default(0),
  groundFootprintSqm: z.number().nonnegative().optional(),
  groundCoverPct: z.number().nonnegative().optional(),
  actualFrontSetbackM: z.number().nonnegative().optional(),
  actualRearSetbackM: z.number().nonnegative().optional(),
  actualLeftSetbackM: z.number().nonnegative().optional(),
  actualRightSetbackM: z.number().nonnegative().optional(),
  providedParkingEcs: z.number().nonnegative().optional(),
  buildingHeightM: z.number().positive().optional(),
  floorCount: z.number().int().positive().optional(),
  treesPlanted: z.number().int().nonnegative().default(0),
  hasBasement: z.boolean().default(false),
  basementHeightM: z.number().nonnegative().default(0),
  basementMechanicalParking: z.boolean().default(false),
  basementProjectionAboveGroundM: z.number().nonnegative().default(0),
});
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

function estimatePlotDims(siteAreaSqm: number, width?: number, depth?: number) {
  if (width && depth) return { plotWidthM: width, plotDepthM: depth };
  const side = Math.sqrt(siteAreaSqm);
  return { plotWidthM: side, plotDepthM: side };
}

function toBbmpInput(
  preInput: BylawCalcInput,
  actuals?: PostConstructionActuals,
): Parameters<typeof computeBbmpCompliance>[0] {
  const { plotWidthM, plotDepthM } = estimatePlotDims(
    preInput.siteAreaSqm,
    preInput.plotWidthM,
    preInput.plotDepthM,
  );
  const height = actuals?.buildingHeightM ?? preInput.proposedHeightM;
  const floorCount = actuals?.floorCount ?? preInput.floorCount ?? 2;
  const netBuiltUp = actuals
    ? Math.max(0, actuals.totalFloorAreaSqm - (actuals.exemptAreaSqm ?? 0))
    : undefined;
  const coverPct =
    actuals?.groundCoverPct ??
    (actuals?.groundFootprintSqm != null && preInput.siteAreaSqm > 0
      ? (actuals.groundFootprintSqm / preInput.siteAreaSqm) * 100
      : undefined);

  return {
    projectType: preInput.buildingType,
    developmentArea: preInput.developmentArea,
    siteAreaSqm: preInput.siteAreaSqm,
    plotWidthM,
    plotDepthM,
    buildingHeightM: height,
    floorCount,
    plinthAreaSqm: preInput.plinthAreaSqm,
    totalFloorAreaSqm: netBuiltUp,
    exemptAreaSqm: actuals?.exemptAreaSqm ?? 0,
    dwellingUnits: preInput.dwellingUnits,
    unitAreaSqm: preInput.unitAreaSqm,
    front: preInput.front,
    rear: preInput.rear,
    left: preInput.left,
    right: preInput.right,
    hasBasement: actuals?.hasBasement ?? preInput.hasBasement,
    basementHeightM: actuals?.basementHeightM ?? preInput.basementHeightM,
    basementMechanicalParking:
      actuals?.basementMechanicalParking ?? preInput.basementMechanicalParking,
    basementProjectionAboveGroundM: actuals?.basementProjectionAboveGroundM ?? 0,
    treesPlanted: actuals?.treesPlanted ?? 0,
    proposedGroundCoverPct: coverPct,
    actualSetbacks:
      actuals?.actualFrontSetbackM != null ||
      actuals?.actualRearSetbackM != null ||
      actuals?.actualLeftSetbackM != null ||
      actuals?.actualRightSetbackM != null
        ? {
            front: actuals.actualFrontSetbackM,
            rear: actuals.actualRearSetbackM,
            left: actuals.actualLeftSetbackM,
            right: actuals.actualRightSetbackM,
          }
        : undefined,
    providedParkingEcs: actuals?.providedParkingEcs,
  };
}

function severityFor(deviation: number | null, allowed: number, limitType: "MAX" | "MIN"): ViolationSeverity {
  if (deviation == null || deviation <= 0) return "none";
  const pct = allowed !== 0 ? Math.abs(deviation) / Math.abs(allowed) : Math.abs(deviation);
  if (limitType === "MAX" && pct >= 0.15) return "critical";
  if (limitType === "MIN" && pct >= 0.25) return "critical";
  if (pct >= 0.05) return "major";
  return "minor";
}

function auditParam(
  key: string,
  label: string,
  unit: string,
  allowed: number,
  actual: number | undefined | null,
  limitType: "MAX" | "MIN",
  extra?: { reason?: string; governedBy?: string },
): AuditParameterResult {
  if (actual == null || Number.isNaN(actual)) {
    return {
      label,
      unit,
      allowed,
      actual: null,
      status: "not_evaluated",
      violation: null,
      severity: "none",
      ...extra,
    };
  }
  const violation =
    limitType === "MAX"
      ? Math.max(0, Number((actual - allowed).toFixed(3)))
      : Math.max(0, Number((allowed - actual).toFixed(3)));
  const status: AuditCheckStatus = violation > 0 ? "failed" : "passed";
  return {
    label,
    unit,
    allowed,
    actual,
    status,
    violation: violation > 0 ? violation : null,
    severity: severityFor(violation > 0 ? violation : null, allowed, limitType),
    reason:
      status === "failed"
        ? limitType === "MAX"
          ? `${violation}${unit} over limit`
          : `${violation}${unit} short of minimum`
        : undefined,
    ...extra,
  };
}

/**
 * System 1 — Pre-Construction Development Potential.
 * Answers: how much can we legally build? Does not detect violations.
 */
export function computePreConstructionPotential(
  preInput: BylawCalcInput,
  catalog: BbmpRuleCatalog = DEFAULT_BBMP_RULE_CATALOG,
): PreConstructionPotential {
  const envelope = computeBylawEnvelope(preInput, catalog);
  const bbmp = computeBbmpCompliance(toBbmpInput(preInput), catalog);
  return {
    farAllowed: envelope.farAllowed,
    permissibleBuiltup: envelope.permissibleBuiltup,
    coverageAllowed: envelope.coverageAllowed,
    maxFootprint: envelope.maxFootprint,
    setbacks: envelope.setbacks,
    parking: envelope.parking,
    basementAllowed: envelope.basementAllowed,
    secondaryRequirements: envelope.secondaryCompliance,
    governingRoadWidthM: envelope.governingRoadWidthM,
    notes: envelope.notes,
    calculationTrace: bbmp.calculationTrace,
  };
}

/**
 * System 2 — Post-Construction Compliance Checker.
 * Compares actual values against the shared rule engine. Answers: what has been violated?
 */
export function computePostConstructionAudit(
  preInput: BylawCalcInput,
  actuals: PostConstructionActuals,
  catalog: BbmpRuleCatalog = DEFAULT_BBMP_RULE_CATALOG,
): PostConstructionAudit {
  const envelope = computeBylawEnvelope(preInput, catalog);
  const bbmp = computeBbmpCompliance(toBbmpInput(preInput, actuals), catalog);
  const netBuiltUp = Math.max(0, actuals.totalFloorAreaSqm - (actuals.exemptAreaSqm ?? 0));
  const actualFar =
    bbmp.actualFar ??
    (preInput.siteAreaSqm > 0 ? Number((netBuiltUp / preInput.siteAreaSqm).toFixed(3)) : null);
  const coverPct =
    actuals.groundCoverPct ??
    (actuals.groundFootprintSqm != null && preInput.siteAreaSqm > 0
      ? Number(((actuals.groundFootprintSqm / preInput.siteAreaSqm) * 100).toFixed(2))
      : undefined);

  const trace = bbmp.calculationTrace;
  const parameters: Record<string, AuditParameterResult> = {
    far: auditParam("far", "FAR", "ratio", envelope.farAllowed, actualFar, "MAX"),
    builtupArea: auditParam(
      "builtupArea",
      "Built-up area",
      "sq m",
      envelope.permissibleBuiltup,
      netBuiltUp,
      "MAX",
    ),
    groundCoverage: auditParam(
      "groundCoverage",
      "Ground coverage",
      "%",
      envelope.coverageAllowed,
      coverPct,
      "MAX",
    ),
    frontSetback: auditParam(
      "frontSetback",
      "Front setback",
      "m",
      envelope.setbacks.front.value,
      actuals.actualFrontSetbackM,
      "MIN",
      { governedBy: trace.setbacks.front.governedBy },
    ),
    rearSetback: auditParam(
      "rearSetback",
      "Rear setback",
      "m",
      envelope.setbacks.rear.value,
      actuals.actualRearSetbackM,
      "MIN",
      { governedBy: trace.setbacks.rear.governedBy },
    ),
    leftSetback: auditParam(
      "leftSetback",
      "Left setback",
      "m",
      envelope.setbacks.left.value,
      actuals.actualLeftSetbackM,
      "MIN",
      { governedBy: trace.setbacks.left.governedBy },
    ),
    rightSetback: auditParam(
      "rightSetback",
      "Right setback",
      "m",
      envelope.setbacks.right.value,
      actuals.actualRightSetbackM,
      "MIN",
      { governedBy: trace.setbacks.right.governedBy },
    ),
    parking: auditParam(
      "parking",
      "Parking (ECS)",
      "ECS",
      envelope.parking.total,
      actuals.providedParkingEcs,
      "MIN",
    ),
  };

  if (actuals.hasBasement) {
    parameters.basement = {
      label: "Basement compliance",
      unit: "",
      allowed: 1,
      actual: bbmp.basementCompliant === false ? 0 : 1,
      status: bbmp.basementCompliant === false ? "failed" : "passed",
      violation: bbmp.basementCompliant === false ? 1 : null,
      severity: bbmp.basementCompliant === false ? "major" : "none",
      reason:
        bbmp.basementCompliant === false
          ? "Basement height or projection exceeds bye-law limits"
          : undefined,
    };
  }

  const evaluated = Object.values(parameters).filter((p) => p.status !== "not_evaluated");
  const failed = evaluated.filter((p) => p.status === "failed");
  const hasViolations = failed.length > 0;
  const overallStatus: PostConstructionAudit["overallStatus"] =
    evaluated.length === 0
      ? "incomplete"
      : hasViolations
        ? "non_compliant"
        : "compliant";

  return {
    parameters,
    overallStatus,
    hasViolations,
    calculationTrace: trace,
  };
}

/** Map a full BBMP compliance run to pre-construction display (internal helper). */
export function preConstructionFromResult(
  envelope: BylawEnvelope,
  bbmp: BbmpComplianceResult,
): PreConstructionPotential {
  return {
    farAllowed: envelope.farAllowed,
    permissibleBuiltup: envelope.permissibleBuiltup,
    coverageAllowed: envelope.coverageAllowed,
    maxFootprint: envelope.maxFootprint,
    setbacks: envelope.setbacks,
    parking: envelope.parking,
    basementAllowed: envelope.basementAllowed,
    secondaryRequirements: envelope.secondaryCompliance,
    governingRoadWidthM: envelope.governingRoadWidthM,
    notes: envelope.notes,
    calculationTrace: bbmp.calculationTrace,
  };
}
