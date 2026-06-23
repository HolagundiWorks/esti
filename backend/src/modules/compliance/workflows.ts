import {
  BylawCalcInput,
  PostConstructionActuals,
  computeBylawEnvelope,
  computePreConstructionPotential,
  computePostConstructionAudit,
  type BbmpRuleCatalog,
} from "@esti/contracts";
import { z } from "zod";

const CityCode = z.enum(["bangalore", "delhi", "mumbai", "hyderabad", "chennai"]);
const ProjectType = z.enum(["residential", "commercial", "mixed_use", "industrial", "institutional"]);

const PlotInput = z.object({
  areaSqm: z.number().positive(),
  roadWidthM: z.number().positive(),
  zone: z.string().min(1),
  plotWidthM: z.number().positive().optional(),
  plotDepthM: z.number().positive().optional(),
});

export const PreProjectApiInput = z.object({
  city: CityCode,
  authority: z.string().min(1),
  projectType: ProjectType,
  plot: PlotInput,
  proposalPreferences: z
    .object({
      wantsAdditionalFar: z.boolean().optional(),
      targetBuiltUpAreaSqm: z.number().positive().optional(),
      targetFloors: z.number().int().positive().optional(),
    })
    .optional(),
});

const ApprovedBuildingInput = z.object({
  builtUpAreaSqm: z.number().positive().optional(),
  far: z.number().positive().optional(),
  heightM: z.number().positive().optional(),
  frontSetbackM: z.number().nonnegative().optional(),
  rearSetbackM: z.number().nonnegative().optional(),
  sideLeftSetbackM: z.number().nonnegative().optional(),
  sideRightSetbackM: z.number().nonnegative().optional(),
  parkingSpaces: z.number().int().nonnegative().optional(),
});

const ActualBuildingInput = z.object({
  builtUpAreaSqm: z.number().positive().optional(),
  heightM: z.number().positive().optional(),
  frontSetbackM: z.number().nonnegative().optional(),
  rearSetbackM: z.number().nonnegative().optional(),
  sideLeftSetbackM: z.number().nonnegative().optional(),
  sideRightSetbackM: z.number().nonnegative().optional(),
  parkingSpaces: z.number().int().nonnegative().optional(),
});

export const PostProjectApiInput = z.object({
  city: CityCode,
  authority: z.string().min(1),
  projectType: ProjectType,
  plot: PlotInput,
  approved: ApprovedBuildingInput,
  actual: ActualBuildingInput,
});

export type PreProjectApiInput = z.infer<typeof PreProjectApiInput>;
export type PostProjectApiInput = z.infer<typeof PostProjectApiInput>;

export function unsupportedReason(input: { city: string; authority: string; projectType: string }): string | null {
  if (input.city !== "bangalore") return "MVP supports city='bangalore' only.";
  if (input.authority.toLowerCase() !== "bbmp") return "MVP supports authority='bbmp' only.";
  if (input.projectType !== "residential") return "MVP supports projectType='residential' only.";
  return null;
}

function inferredDimension(areaSqm: number, dimension?: number): number {
  return dimension ?? Number(Math.sqrt(areaSqm).toFixed(2));
}

export function toBbmpPreInput(input: PreProjectApiInput): BylawCalcInput {
  const plotWidthM = inferredDimension(input.plot.areaSqm, input.plot.plotWidthM);
  const plotDepthM = inferredDimension(input.plot.areaSqm, input.plot.plotDepthM);
  return BylawCalcInput.parse({
    buildingType: "RESIDENTIAL",
    developmentArea: "B",
    siteAreaSqm: input.plot.areaSqm,
    plotWidthM,
    plotDepthM,
    proposedHeightM: input.proposalPreferences?.targetFloors
      ? input.proposalPreferences.targetFloors * 3
      : 12,
    floorCount: input.proposalPreferences?.targetFloors ?? 4,
    dwellingUnits: 1,
    unitAreaSqm: input.plot.areaSqm,
    front: {
      abutsRoad: true,
      roadWidthM: input.plot.roadWidthM,
      roadClass: "LOCAL",
      distanceCentreToBoundaryM: input.plot.roadWidthM / 2,
    },
    rear: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
    left: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
    right: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
    hasBasement: false,
  });
}

function ruleVersion(catalog: BbmpRuleCatalog): string {
  return catalog.label ?? catalog.ruleSetId ?? "bbmp-2003-default";
}

function traceArray(catalog: BbmpRuleCatalog, trace: ReturnType<typeof computeBylawEnvelope>["calculationTrace"]) {
  const version = ruleVersion(catalog);
  return [
    {
      check: "FAR",
      ruleId: "BBMP_FAR_RULE_CATALOG",
      ruleVersion: version,
      formula: "maxBuiltUpAreaSqm = plotAreaSqm * permissibleFar",
      inputs: {
        developmentArea: trace.far.developmentArea,
        governingRoadWidthM: trace.far.governingRoadWidthM,
      },
      result: {
        farAllowed: trace.far.farAllowed,
        coverageAllowed: trace.far.coverageAllowed,
      },
      message: trace.far.basis,
    },
    ...(["front", "rear", "left", "right"] as const).map((side) => ({
      check: `SETBACK_${side.toUpperCase()}`,
      ruleId: "BBMP_SETBACK_RULE_CATALOG",
      ruleVersion: version,
      inputs: {
        required: trace.setbacks[side].required,
        actual: trace.setbacks[side].actual ?? "",
      },
      result: {
        required: trace.setbacks[side].required,
        governedBy: trace.setbacks[side].governedBy,
      },
      message: `${side} setback governed by ${trace.setbacks[side].governedBy}.`,
    })),
    {
      check: "PARKING",
      ruleId: "BBMP_PARKING_RULE_CATALOG",
      ruleVersion: version,
      formula: trace.parking.formulaKey,
      result: {
        requiredECS: trace.parking.requiredECS,
        visitorECS: trace.parking.visitorECS,
        total: trace.parking.total,
      },
      message: `Parking evaluated using ${trace.parking.formulaKey}.`,
    },
  ];
}

export function calculatePreProjectResponse(input: PreProjectApiInput, catalog: BbmpRuleCatalog) {
  const preInput = toBbmpPreInput(input);
  const envelope = computeBylawEnvelope(preInput, catalog);
  const pre = computePreConstructionPotential(preInput, catalog);
  const warnings: string[] = [];
  if (!input.plot.plotWidthM || !input.plot.plotDepthM) {
    warnings.push("Plot width/depth were not fully provided; missing dimension was inferred from plot area.");
  }
  if (input.proposalPreferences?.wantsAdditionalFar) {
    warnings.push("Additional FAR is not enabled in the Bengaluru BBMP MVP adapter; verify premium FAR manually.");
  }
  return {
    mode: "PRE_PROJECT_PLANNING",
    city: input.city,
    authority: input.authority,
    ruleVersion: ruleVersion(catalog),
    status: warnings.length ? "FEASIBLE_WITH_CONSTRAINTS" : "FEASIBLE",
    results: {
      far: {
        baseFar: pre.farAllowed,
        additionalFarAvailable: false,
        additionalFar: 0,
        totalPermissibleFar: pre.farAllowed,
        maxBuiltUpAreaSqm: pre.permissibleBuiltup,
      },
      setbacks: {
        frontM: pre.setbacks.front.value,
        rearM: pre.setbacks.rear.value,
        sideLeftM: pre.setbacks.left.value,
        sideRightM: pre.setbacks.right.value,
      },
      height: {
        maxHeightM: null,
        proposedHeightM: preInput.proposedHeightM,
      },
      parking: {
        requiredCarSpaces: Math.ceil(pre.parking.total),
      },
      coverage: {
        coverageAllowed: pre.coverageAllowed,
        maxFootprintSqm: pre.maxFootprint,
      },
    },
    warnings,
    trace: traceArray(catalog, envelope.calculationTrace),
  };
}

function pct(delta: number, basis: number): number {
  if (basis <= 0) return 0;
  return Number(((delta / basis) * 100).toFixed(2));
}

function failedStatus(value: number): "PASSED" | "FAILED" {
  return value > 0 ? "FAILED" : "PASSED";
}

function max0(value: number): number {
  return Math.max(0, Number(value.toFixed(2)));
}

export function calculatePostProjectResponse(input: PostProjectApiInput, catalog: BbmpRuleCatalog) {
  const preInput = toBbmpPreInput({ ...input, proposalPreferences: { targetFloors: input.actual.heightM ? Math.ceil(input.actual.heightM / 3) : undefined } });
  const actuals = PostConstructionActuals.parse({
    totalFloorAreaSqm: input.actual.builtUpAreaSqm ?? input.approved.builtUpAreaSqm ?? input.plot.areaSqm,
    exemptAreaSqm: 0,
    buildingHeightM: input.actual.heightM,
    actualFrontSetbackM: input.actual.frontSetbackM,
    actualRearSetbackM: input.actual.rearSetbackM,
    actualLeftSetbackM: input.actual.sideLeftSetbackM,
    actualRightSetbackM: input.actual.sideRightSetbackM,
    providedParkingEcs: input.actual.parkingSpaces,
  });
  const audit = computePostConstructionAudit(preInput, actuals, catalog);

  const approvedBuiltUp = input.approved.builtUpAreaSqm ?? (input.approved.far ? input.approved.far * input.plot.areaSqm : undefined);
  const actualBuiltUp = input.actual.builtUpAreaSqm;
  const farExcess = approvedBuiltUp != null && actualBuiltUp != null ? max0(actualBuiltUp - approvedBuiltUp) : 0;
  const heightLimit = input.approved.heightM;
  const heightExcess = heightLimit != null && input.actual.heightM != null ? max0(input.actual.heightM - heightLimit) : 0;
  const frontShortfall = input.approved.frontSetbackM != null && input.actual.frontSetbackM != null ? max0(input.approved.frontSetbackM - input.actual.frontSetbackM) : 0;
  const rearShortfall = input.approved.rearSetbackM != null && input.actual.rearSetbackM != null ? max0(input.approved.rearSetbackM - input.actual.rearSetbackM) : 0;
  const leftShortfall = input.approved.sideLeftSetbackM != null && input.actual.sideLeftSetbackM != null ? max0(input.approved.sideLeftSetbackM - input.actual.sideLeftSetbackM) : 0;
  const rightShortfall = input.approved.sideRightSetbackM != null && input.actual.sideRightSetbackM != null ? max0(input.approved.sideRightSetbackM - input.actual.sideRightSetbackM) : 0;
  const parkingShortfall = input.approved.parkingSpaces != null && input.actual.parkingSpaces != null ? Math.max(0, input.approved.parkingSpaces - input.actual.parkingSpaces) : 0;

  const violations = {
    far: {
      approvedSqm: approvedBuiltUp ?? null,
      actualSqm: actualBuiltUp ?? null,
      excessSqm: farExcess,
      violationPercent: approvedBuiltUp ? pct(farExcess, approvedBuiltUp) : 0,
      status: failedStatus(farExcess),
    },
    height: {
      approvedM: heightLimit ?? null,
      actualM: input.actual.heightM ?? null,
      excessM: heightExcess,
      violationPercent: heightLimit ? pct(heightExcess, heightLimit) : 0,
      status: failedStatus(heightExcess),
    },
    frontSetback: {
      requiredM: input.approved.frontSetbackM ?? null,
      actualM: input.actual.frontSetbackM ?? null,
      shortfallM: frontShortfall,
      violationPercent: input.approved.frontSetbackM ? pct(frontShortfall, input.approved.frontSetbackM) : 0,
      status: failedStatus(frontShortfall),
    },
    rearSetback: {
      requiredM: input.approved.rearSetbackM ?? null,
      actualM: input.actual.rearSetbackM ?? null,
      shortfallM: rearShortfall,
      violationPercent: input.approved.rearSetbackM ? pct(rearShortfall, input.approved.rearSetbackM) : 0,
      status: failedStatus(rearShortfall),
    },
    sideLeftSetback: {
      requiredM: input.approved.sideLeftSetbackM ?? null,
      actualM: input.actual.sideLeftSetbackM ?? null,
      shortfallM: leftShortfall,
      violationPercent: input.approved.sideLeftSetbackM ? pct(leftShortfall, input.approved.sideLeftSetbackM) : 0,
      status: failedStatus(leftShortfall),
    },
    sideRightSetback: {
      requiredM: input.approved.sideRightSetbackM ?? null,
      actualM: input.actual.sideRightSetbackM ?? null,
      shortfallM: rightShortfall,
      violationPercent: input.approved.sideRightSetbackM ? pct(rightShortfall, input.approved.sideRightSetbackM) : 0,
      status: failedStatus(rightShortfall),
    },
    parking: {
      requiredSpaces: input.approved.parkingSpaces ?? null,
      actualSpaces: input.actual.parkingSpaces ?? null,
      shortfallSpaces: parkingShortfall,
      violationPercent: input.approved.parkingSpaces ? pct(parkingShortfall, input.approved.parkingSpaces) : 0,
      status: failedStatus(parkingShortfall),
    },
  };
  const hasViolation = Object.values(violations).some((v) => v.status === "FAILED");
  return {
    mode: "POST_PROJECT_AUDIT",
    city: input.city,
    authority: input.authority,
    ruleVersion: ruleVersion(catalog),
    overallStatus: hasViolation ? "VIOLATION_FOUND" : "COMPLIANT",
    violations,
    regularization: {
      mayBeRegularizable: null,
      reason: "Regularization thresholds are not encoded in the active BBMP rule catalog. Authority validation required.",
    },
    trace: [
      ...traceArray(catalog, audit.calculationTrace),
      {
        check: "APPROVAL_BASED_VIOLATION",
        ruleId: "GENERIC_APPROVED_VS_ACTUAL_PERCENT",
        ruleVersion: ruleVersion(catalog),
        formula: "((actual - approved) / approved) * 100",
        message: "Post-project API compares actual construction against approved/projected values supplied in the request.",
      },
    ],
  };
}
