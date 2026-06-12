import { z } from "zod";

// ─── Rule version (knowledge bank) ─────────────────────────────────────────

export const RuleVersionStatus = z.enum(["DRAFT", "REVIEW", "PUBLISHED", "SUPERSEDED"]);
export type RuleVersionStatus = z.infer<typeof RuleVersionStatus>;

export const RULE_VERSION_STATUS_LABEL: Record<RuleVersionStatus, string> = {
  DRAFT: "Draft",
  REVIEW: "Under review",
  PUBLISHED: "Published",
  SUPERSEDED: "Superseded",
};
export const RULE_VERSION_STATUS_TAG: Record<RuleVersionStatus, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  REVIEW: "blue",
  PUBLISHED: "green",
  SUPERSEDED: "red",
};

// ─── Typed rule data stored in jsonb ───────────────────────────────────────

const FarRow = z.object({
  maxRoadWidthM: z.number(),
  far: z.number(),
  coveragePct: z.number(),
  clause: z.string().default(""),
});

const SetbackRow = z.object({
  maxHeightM: z.number(),
  frontM: z.number(),
  rearM: z.number(),
  sideM: z.number(),
  clause: z.string().default(""),
});

const ApprovalDoc = z.object({
  id: z.string(),
  label: z.string(),
  required: z.boolean(),
});

export const RuleVersionData = z.object({
  far: z.array(FarRow),
  setbacks: z.array(SetbackRow),
  heightLimits: z.object({
    absoluteMaxM: z.number(),
    floorHeightM: z.number(),
    clause: z.string().default(""),
  }),
  parking: z.object({
    car: z.object({ sqmPerECS: z.number(), basis: z.string(), clause: z.string().default("") }),
    twoWheeler: z.object({ ratioOfCar: z.number(), clause: z.string().default("") }),
    cycle: z.object({ sqmPerSlot: z.number(), clause: z.string().default("") }),
  }),
  basement: z.object({
    maxDepthM: z.number(),
    ventilationOpeningPct: z.number(),
    permittedUses: z.array(z.string()),
    clause: z.string().default(""),
  }),
  sustainability: z.object({
    rainwaterHarvesting: z.object({ minPitVolumeLtrPerSqm: z.number(), clause: z.string().default("") }),
    solarPanels: z.object({ minSqmPer100SqmBuiltUp: z.number(), clause: z.string().default("") }),
    evCharging: z.object({ minPctParking: z.number(), clause: z.string().default("") }),
    greenCover: z.object({ minPctSiteArea: z.number(), clause: z.string().default("") }),
  }),
  approvalDocs: z.array(ApprovalDoc),
});
export type RuleVersionData = z.infer<typeof RuleVersionData>;

export const RuleVersionCreate = z.object({
  state: z.string().min(1),
  district: z.string().min(1),
  authority: z.string().min(1),
  buildingUse: z.string().min(1),
  effectiveDate: z.string(), // ISO date
  sourceCitation: z.string().optional(),
  data: RuleVersionData,
  notes: z.string().optional(),
});
export type RuleVersionCreate = z.infer<typeof RuleVersionCreate>;

// ─── Site inputs ────────────────────────────────────────────────────────────

export const Topography = z.enum(["FLAT", "UNDULATING", "SLOPING", "HILLY"]);
export type Topography = z.infer<typeof Topography>;

const SideInput = z.object({
  abutsRoad: z.boolean().default(false),
  roadWidthM: z.number().nonnegative().default(0),
  rblFromCentreM: z.number().nonnegative().default(0),
});

export const SiteInputs = z.object({
  buildingUse: z.string().min(1),
  siteAreaSqm: z.number().positive(),
  proposedHeightM: z.number().positive(),
  proposedBuiltUpSqm: z.number().nonnegative().optional(),
  proposedGroundCoverPct: z.number().nonnegative().optional(),
  topography: Topography.default("FLAT"),
  approachRoadWidthM: z.number().nonnegative().default(0),
  front: SideInput,
  rear: SideInput,
  left: SideInput,
  right: SideInput,
  hasBasement: z.boolean().default(false),
  basementDepthM: z.number().nonnegative().default(0),
  basementUses: z.array(z.string()).default([]),
  solarPanelSqm: z.number().nonnegative().default(0),
  rainwaterPitVolumeLtr: z.number().nonnegative().default(0),
  evChargingPct: z.number().nonnegative().default(0),
  greenCoverPct: z.number().nonnegative().default(0),
  existingPermits: z.array(z.string()).default([]),
});
export type SiteInputs = z.infer<typeof SiteInputs>;

// ─── Engine outputs ──────────────────────────────────────────────────────────

export interface DevControlOutput {
  far: number;
  maxFar: number;
  farUtilisedPct: number;
  coveragePct: number;
  maxCoveragePct: number;
  maxBuiltUpSqm: number;
  maxFootprintSqm: number;
  setbacks: { front: number; rear: number; left: number; right: number };
  maxHeightM: number;
  governingRoadWidthM: number;
  parking: { carECS: number; twoWheelerSlots: number; cycleSlots: number };
  notes: string[];
  compliant: boolean;
}

export interface BasementOutput {
  maxDepthM: number;
  proposedDepthM: number;
  depthCompliant: boolean;
  permittedUses: string[];
  proposedUses: string[];
  usesCompliant: boolean;
  ventilationOpeningPct: number;
  notes: string[];
  compliant: boolean;
}

export interface SustainabilityOutput {
  rainwater: { required: number; provided: number; compliant: boolean; clause: string };
  solar: { required: number; provided: number; compliant: boolean; clause: string };
  evCharging: { requiredPct: number; providedPct: number; compliant: boolean; clause: string };
  greenCover: { requiredPct: number; providedPct: number; compliant: boolean; clause: string };
  score: number; // 0–100
  compliant: boolean;
}

export interface ApprovalReadinessItem {
  id: string;
  label: string;
  required: boolean;
  present: boolean;
}

export interface ApprovalReadinessOutput {
  items: ApprovalReadinessItem[];
  requiredTotal: number;
  requiredPresent: number;
  score: number; // 0–100
  readiness: "NOT_READY" | "PARTIAL" | "READY";
}

export interface AssessmentResult {
  devControl: DevControlOutput;
  basement: BasementOutput | null;
  sustainability: SustainabilityOutput;
  approvalReadiness: ApprovalReadinessOutput;
  overallScore: number;
}

// ─── Pure engine functions ───────────────────────────────────────────────────

export function runDevControl(inputs: SiteInputs, data: RuleVersionData): DevControlOutput {
  const sides = { front: inputs.front, rear: inputs.rear, left: inputs.left, right: inputs.right };
  const roadWidths = Object.values(sides)
    .filter((s) => s.abutsRoad && s.roadWidthM > 0)
    .map((s) => s.roadWidthM);
  const governingRoadWidthM = roadWidths.length ? Math.max(...roadWidths) : inputs.approachRoadWidthM;

  const farRow = data.far.find((r) => governingRoadWidthM < r.maxRoadWidthM) ?? data.far[data.far.length - 1]!;
  const maxBuiltUpSqm = Math.round(inputs.siteAreaSqm * farRow.far);
  const maxFootprintSqm = Math.round((inputs.siteAreaSqm * farRow.coveragePct) / 100);

  const setbackRow = data.setbacks.find((r) => inputs.proposedHeightM <= r.maxHeightM) ?? data.setbacks[0]!;

  const notes: string[] = [];
  const setbackForSide = (side: "front" | "rear" | "left" | "right") => {
    const s = sides[side];
    const table = side === "front" ? setbackRow.frontM : side === "rear" ? setbackRow.rearM : setbackRow.sideM;
    const roadSetback = s.abutsRoad ? Math.max(0, s.rblFromCentreM - s.roadWidthM / 2) : 0;
    const governing = Math.max(table, roadSetback);
    if (s.abutsRoad && roadSetback > table) {
      notes.push(`${side}: RBL governs (${roadSetback.toFixed(2)} m > table ${table} m) [${setbackRow.clause}]`);
    }
    return Number(governing.toFixed(2));
  };

  const carECS = Math.ceil(maxBuiltUpSqm / data.parking.car.sqmPerECS);
  const twoWheelerSlots = Math.ceil(carECS * data.parking.twoWheeler.ratioOfCar);
  const cycleSlots = Math.ceil(maxBuiltUpSqm / data.parking.cycle.sqmPerSlot);

  const proposedBuiltUp = inputs.proposedBuiltUpSqm ?? 0;
  const proposedGroundCover = inputs.proposedGroundCoverPct ?? 0;
  const farUsed = inputs.siteAreaSqm > 0 ? proposedBuiltUp / inputs.siteAreaSqm : 0;
  const farUtilisedPct = Math.round((farUsed / farRow.far) * 100);

  const compliant =
    inputs.proposedHeightM <= data.heightLimits.absoluteMaxM &&
    (proposedBuiltUp === 0 || proposedBuiltUp <= maxBuiltUpSqm) &&
    (proposedGroundCover === 0 || proposedGroundCover <= farRow.coveragePct);

  if (inputs.proposedHeightM > data.heightLimits.absoluteMaxM) {
    notes.push(`Height ${inputs.proposedHeightM} m exceeds absolute max ${data.heightLimits.absoluteMaxM} m [${data.heightLimits.clause}]`);
  }

  return {
    far: farUsed,
    maxFar: farRow.far,
    farUtilisedPct,
    coveragePct: proposedGroundCover,
    maxCoveragePct: farRow.coveragePct,
    maxBuiltUpSqm,
    maxFootprintSqm,
    setbacks: {
      front: setbackForSide("front"),
      rear: setbackForSide("rear"),
      left: setbackForSide("left"),
      right: setbackForSide("right"),
    },
    maxHeightM: data.heightLimits.absoluteMaxM,
    governingRoadWidthM,
    parking: { carECS, twoWheelerSlots, cycleSlots },
    notes,
    compliant,
  };
}

export function runBasement(inputs: SiteInputs, data: RuleVersionData): BasementOutput | null {
  if (!inputs.hasBasement) return null;
  const b = data.basement;
  const depthCompliant = inputs.basementDepthM <= b.maxDepthM;
  const disallowed = inputs.basementUses.filter((u) => !b.permittedUses.includes(u));
  const usesCompliant = disallowed.length === 0;
  const notes: string[] = [];
  if (!depthCompliant) notes.push(`Proposed depth ${inputs.basementDepthM} m exceeds max ${b.maxDepthM} m [${b.clause}]`);
  if (!usesCompliant) notes.push(`Disallowed basement uses: ${disallowed.join(", ")} [${b.clause}]`);
  return {
    maxDepthM: b.maxDepthM,
    proposedDepthM: inputs.basementDepthM,
    depthCompliant,
    permittedUses: b.permittedUses,
    proposedUses: inputs.basementUses,
    usesCompliant,
    ventilationOpeningPct: b.ventilationOpeningPct,
    notes,
    compliant: depthCompliant && usesCompliant,
  };
}

export function runSustainability(inputs: SiteInputs, builtUpSqm: number, data: RuleVersionData): SustainabilityOutput {
  const s = data.sustainability;
  const reqRW = Math.round(inputs.siteAreaSqm * s.rainwaterHarvesting.minPitVolumeLtrPerSqm);
  const rwCompliant = inputs.rainwaterPitVolumeLtr >= reqRW;

  const reqSolar = Math.round((builtUpSqm / 100) * s.solarPanels.minSqmPer100SqmBuiltUp);
  const solarCompliant = s.solarPanels.minSqmPer100SqmBuiltUp === 0 || inputs.solarPanelSqm >= reqSolar;

  const evCompliant = inputs.evChargingPct >= s.evCharging.minPctParking;
  const gcCompliant = inputs.greenCoverPct >= s.greenCover.minPctSiteArea;

  const checks = [rwCompliant, solarCompliant, evCompliant, gcCompliant];
  const passCount = checks.filter(Boolean).length;
  const score = Math.round((passCount / checks.length) * 100);

  return {
    rainwater: { required: reqRW, provided: inputs.rainwaterPitVolumeLtr, compliant: rwCompliant, clause: s.rainwaterHarvesting.clause },
    solar: { required: reqSolar, provided: inputs.solarPanelSqm, compliant: solarCompliant, clause: s.solarPanels.clause },
    evCharging: { requiredPct: s.evCharging.minPctParking, providedPct: inputs.evChargingPct, compliant: evCompliant, clause: s.evCharging.clause },
    greenCover: { requiredPct: s.greenCover.minPctSiteArea, providedPct: inputs.greenCoverPct, compliant: gcCompliant, clause: s.greenCover.clause },
    score,
    compliant: passCount === checks.length,
  };
}

export function runApprovalReadiness(
  inputs: SiteInputs,
  docChecklist: RuleVersionData["approvalDocs"],
  existingPermitIds: string[],
): ApprovalReadinessOutput {
  const items: ApprovalReadinessItem[] = docChecklist.map((doc) => ({
    id: doc.id,
    label: doc.label,
    required: doc.required,
    present: inputs.existingPermits.includes(doc.id) || existingPermitIds.includes(doc.id),
  }));
  const required = items.filter((i) => i.required);
  const requiredPresent = required.filter((i) => i.present).length;
  const score = required.length > 0 ? Math.round((requiredPresent / required.length) * 100) : 100;
  const readiness: ApprovalReadinessOutput["readiness"] =
    score >= 100 ? "READY" : score >= 60 ? "PARTIAL" : "NOT_READY";
  return { items, requiredTotal: required.length, requiredPresent, score, readiness };
}

export function runAllEngines(
  inputs: SiteInputs,
  data: RuleVersionData,
  existingPermitIds: string[] = [],
): AssessmentResult {
  const devControl = runDevControl(inputs, data);
  const basement = runBasement(inputs, data);
  const sustainability = runSustainability(inputs, devControl.maxBuiltUpSqm, data);
  const approvalReadiness = runApprovalReadiness(inputs, data.approvalDocs, existingPermitIds);

  const scores = [
    devControl.compliant ? 100 : 50,
    basement ? (basement.compliant ? 100 : 0) : 100,
    sustainability.score,
    approvalReadiness.score,
  ];
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return { devControl, basement, sustainability, approvalReadiness, overallScore };
}
