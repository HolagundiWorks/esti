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

// ─── Assessment phase ───────────────────────────────────────────────────────

/** PRE_DESIGN returns the permissible envelope only. POST_DESIGN compares actual designed values against it. */
export const AssessmentPhase = z.enum(["PRE_DESIGN", "POST_DESIGN"]);
export type AssessmentPhase = z.infer<typeof AssessmentPhase>;

export const ASSESSMENT_PHASE_LABEL: Record<AssessmentPhase, string> = {
  PRE_DESIGN: "Pre-design (envelope only)",
  POST_DESIGN: "Post-design (check actual against envelope)",
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
  assessmentPhase: AssessmentPhase.default("PRE_DESIGN"),
  siteAreaSqm: z.number().positive(),
  proposedHeightM: z.number().positive(),
  proposedBuiltUpSqm: z.number().nonnegative().optional(),
  /** FAR-excluded areas (parking, stairs, lifts, etc.); subtract from gross BUA to get net. */
  excludedAreaSqm: z.number().nonnegative().default(0),
  proposedGroundCoverPct: z.number().nonnegative().optional(),
  /** Plinth/footprint area — used for rainwater harvesting trigger (> 100 sqm). */
  plinthAreaSqm: z.number().nonnegative().optional(),
  topography: Topography.default("FLAT"),
  approachRoadWidthM: z.number().nonnegative().default(0),
  front: SideInput,
  rear: SideInput,
  left: SideInput,
  right: SideInput,
  hasBasement: z.boolean().default(false),
  basementDepthM: z.number().nonnegative().default(0),
  /** Clear height floor-to-ceiling of basement (for height validation). */
  basementHeightM: z.number().nonnegative().default(0),
  basementUses: z.array(z.string()).default([]),
  solarPanelSqm: z.number().nonnegative().default(0),
  rainwaterPitVolumeLtr: z.number().nonnegative().default(0),
  evChargingPct: z.number().nonnegative().default(0),
  greenCoverPct: z.number().nonnegative().default(0),
  treesPlanted: z.number().int().nonnegative().default(0),
  existingPermits: z.array(z.string()).default([]),
  // POST_DESIGN actual setbacks (filled in after design is done)
  actualFrontSetbackM: z.number().nonnegative().optional(),
  actualRearSetbackM: z.number().nonnegative().optional(),
  actualLeftSetbackM: z.number().nonnegative().optional(),
  actualRightSetbackM: z.number().nonnegative().optional(),
});
export type SiteInputs = z.infer<typeof SiteInputs>;

// ─── Relaxation inputs ───────────────────────────────────────────────────────

export const RelaxationInputs = z.object({
  far: z.number().nonnegative().default(0),
  groundCoverage: z.number().nonnegative().default(0),
  height: z.number().nonnegative().default(0),
  frontSetback: z.number().nonnegative().default(0),
  rearSetback: z.number().nonnegative().default(0),
  leftSetback: z.number().nonnegative().default(0),
  rightSetback: z.number().nonnegative().default(0),
  basementDepth: z.number().nonnegative().default(0),
});
export type RelaxationInputs = z.infer<typeof RelaxationInputs>;

// ─── Violation types ─────────────────────────────────────────────────────────

export type ViolationStatus = "COMPLIANT" | "WITHIN_RELAXATION" | "VIOLATION";

export interface ViolationItem {
  parameter: string;
  label: string;
  permissible: number;
  actual: number;
  /** actual − permissible; positive means over/under limit depending on limitType. */
  deviation: number;
  deviationPct: number;
  relaxation: number;
  effectiveLimit: number;
  status: ViolationStatus;
  unit: string;
  limitType: "MAX" | "MIN";
}

export interface ViolationOutput {
  items: ViolationItem[];
  hasViolations: boolean;
  hasRelaxations: boolean;
}

export const VIOLATION_STATUS_TAG: Record<ViolationStatus, "green" | "blue" | "red"> = {
  COMPLIANT: "green",
  WITHIN_RELAXATION: "blue",
  VIOLATION: "red",
};

// ─── Engine outputs ──────────────────────────────────────────────────────────

export interface DevControlOutput {
  far: number;
  maxFar: number;
  farUtilisedPct: number;
  netBuiltUpSqm: number;
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
  heightM: number;
  minHeightM: number;
  maxHeightM: number;
  heightCompliant: boolean;
  permittedUses: string[];
  proposedUses: string[];
  usesCompliant: boolean;
  ventilationOpeningPct: number;
  notes: string[];
  compliant: boolean;
}

export interface SustainabilityOutput {
  rainwater: { required: number; provided: number; compliant: boolean; clause: string; triggered: boolean };
  solar: { required: number; provided: number; compliant: boolean; clause: string };
  evCharging: { requiredPct: number; providedPct: number; compliant: boolean; clause: string };
  greenCover: { requiredPct: number; providedPct: number; compliant: boolean; clause: string };
  trees: { required: number; provided: number; compliant: boolean };
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
  violations: ViolationOutput | null;
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

  // For ≤ 9.5 m buildings, setbacks are typically site-dimension-based; the table may not have a matching row.
  const setbackRow = data.setbacks.find((r) => inputs.proposedHeightM <= r.maxHeightM) ?? data.setbacks[0]!;

  const notes: string[] = [];

  // Note when low-rise setback mode applies.
  if (inputs.proposedHeightM <= 9.5) {
    notes.push(`Building ≤ 9.5 m: setbacks may be site-dimension-based; verify with authority [${setbackRow.clause}]`);
  }

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

  // Net BUA = gross proposed minus FAR-excluded areas
  const grossBuiltUp = inputs.proposedBuiltUpSqm ?? 0;
  const netBuiltUpSqm = Math.max(0, grossBuiltUp - (inputs.excludedAreaSqm ?? 0));

  const proposedGroundCover = inputs.proposedGroundCoverPct ?? 0;
  const farUsed = inputs.siteAreaSqm > 0 ? netBuiltUpSqm / inputs.siteAreaSqm : 0;
  const farUtilisedPct = farRow.far > 0 ? Math.round((farUsed / farRow.far) * 100) : 0;

  const compliant =
    inputs.proposedHeightM <= data.heightLimits.absoluteMaxM &&
    (netBuiltUpSqm === 0 || netBuiltUpSqm <= maxBuiltUpSqm) &&
    (proposedGroundCover === 0 || proposedGroundCover <= farRow.coveragePct);

  if (inputs.proposedHeightM > data.heightLimits.absoluteMaxM) {
    notes.push(`Height ${inputs.proposedHeightM} m exceeds absolute max ${data.heightLimits.absoluteMaxM} m [${data.heightLimits.clause}]`);
  }
  if (grossBuiltUp > 0 && inputs.excludedAreaSqm > 0) {
    notes.push(`Gross BUA ${grossBuiltUp} sqm − excluded ${inputs.excludedAreaSqm} sqm = net ${netBuiltUpSqm} sqm compared against FAR limit`);
  }

  return {
    far: farUsed,
    maxFar: farRow.far,
    farUtilisedPct,
    netBuiltUpSqm,
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

  // Height validation: min 2.4 m, max 2.75 m (exception: 3.6 m for mechanical parking)
  const BASEMENT_MIN_HEIGHT = 2.4;
  const BASEMENT_MAX_HEIGHT = 2.75;
  const MECH_PARKING_HEIGHT = 3.6;
  const hasMechParking = inputs.basementUses.includes("MECHANICAL_PARKING");
  const effectiveMaxHeight = hasMechParking ? MECH_PARKING_HEIGHT : BASEMENT_MAX_HEIGHT;
  const heightM = inputs.basementHeightM;
  const heightCompliant =
    heightM === 0 // not entered → don't fail
    || (heightM >= BASEMENT_MIN_HEIGHT && heightM <= effectiveMaxHeight);

  const notes: string[] = [];
  if (!depthCompliant)
    notes.push(`Proposed depth ${inputs.basementDepthM} m exceeds max ${b.maxDepthM} m [${b.clause}]`);
  if (!usesCompliant)
    notes.push(`Disallowed basement uses: ${disallowed.join(", ")} [${b.clause}]`);
  if (heightM > 0 && heightM < BASEMENT_MIN_HEIGHT)
    notes.push(`Basement clear height ${heightM} m is below minimum ${BASEMENT_MIN_HEIGHT} m`);
  if (heightM > 0 && heightM > effectiveMaxHeight)
    notes.push(
      hasMechParking
        ? `Basement height ${heightM} m exceeds max ${MECH_PARKING_HEIGHT} m for mechanical parking`
        : `Basement height ${heightM} m exceeds max ${BASEMENT_MAX_HEIGHT} m (use ${MECH_PARKING_HEIGHT} m only for mechanical parking)`
    );

  return {
    maxDepthM: b.maxDepthM,
    proposedDepthM: inputs.basementDepthM,
    depthCompliant,
    heightM,
    minHeightM: BASEMENT_MIN_HEIGHT,
    maxHeightM: effectiveMaxHeight,
    heightCompliant,
    permittedUses: b.permittedUses,
    proposedUses: inputs.basementUses,
    usesCompliant,
    ventilationOpeningPct: b.ventilationOpeningPct,
    notes,
    compliant: depthCompliant && usesCompliant && heightCompliant,
  };
}

export function runSustainability(inputs: SiteInputs, builtUpSqm: number, data: RuleVersionData): SustainabilityOutput {
  const s = data.sustainability;

  // Rainwater harvesting: only required when plinth > 100 sqm AND site ≥ 200 sqm.
  const plinth = inputs.plinthAreaSqm ?? builtUpSqm;
  const rwTriggered = plinth > 100 && inputs.siteAreaSqm >= 200;
  const reqRW = rwTriggered ? Math.round(inputs.siteAreaSqm * s.rainwaterHarvesting.minPitVolumeLtrPerSqm) : 0;
  const rwCompliant = !rwTriggered || inputs.rainwaterPitVolumeLtr >= reqRW;

  const reqSolar = Math.round((builtUpSqm / 100) * s.solarPanels.minSqmPer100SqmBuiltUp);
  const solarCompliant = s.solarPanels.minSqmPer100SqmBuiltUp === 0 || inputs.solarPanelSqm >= reqSolar;

  const evCompliant = inputs.evChargingPct >= s.evCharging.minPctParking;
  const gcCompliant = inputs.greenCoverPct >= s.greenCover.minPctSiteArea;

  // Tree planting: 2 trees required when site ≥ 200 sqm.
  const treesRequired = inputs.siteAreaSqm >= 200 ? 2 : 0;
  const treesCompliant = inputs.treesPlanted >= treesRequired;

  const checks = [rwCompliant, solarCompliant, evCompliant, gcCompliant, treesCompliant];
  const passCount = checks.filter(Boolean).length;
  const score = Math.round((passCount / checks.length) * 100);

  return {
    rainwater: {
      required: reqRW,
      provided: inputs.rainwaterPitVolumeLtr,
      compliant: rwCompliant,
      clause: s.rainwaterHarvesting.clause,
      triggered: rwTriggered,
    },
    solar: { required: reqSolar, provided: inputs.solarPanelSqm, compliant: solarCompliant, clause: s.solarPanels.clause },
    evCharging: { requiredPct: s.evCharging.minPctParking, providedPct: inputs.evChargingPct, compliant: evCompliant, clause: s.evCharging.clause },
    greenCover: { requiredPct: s.greenCover.minPctSiteArea, providedPct: inputs.greenCoverPct, compliant: gcCompliant, clause: s.greenCover.clause },
    trees: { required: treesRequired, provided: inputs.treesPlanted, compliant: treesCompliant },
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

// ─── Violation / deviation engine ───────────────────────────────────────────

function violationItem(
  parameter: string,
  label: string,
  unit: string,
  limitType: "MAX" | "MIN",
  permissible: number,
  actual: number | undefined,
  relaxation: number,
): ViolationItem | null {
  if (actual == null) return null; // not entered → skip

  const deviation = limitType === "MAX"
    ? actual - permissible          // positive = over limit
    : permissible - actual;          // positive = below minimum

  const deviationPct = permissible !== 0 ? Math.round((Math.abs(deviation) / permissible) * 100) : 0;
  const effectiveLimit = limitType === "MAX" ? permissible + relaxation : permissible - relaxation;

  let status: ViolationStatus;
  if (limitType === "MAX") {
    status = actual <= permissible ? "COMPLIANT"
      : actual <= effectiveLimit ? "WITHIN_RELAXATION"
      : "VIOLATION";
  } else {
    status = actual >= permissible ? "COMPLIANT"
      : actual >= effectiveLimit ? "WITHIN_RELAXATION"
      : "VIOLATION";
  }

  return { parameter, label, permissible, actual, deviation, deviationPct, relaxation, effectiveLimit, status, unit, limitType };
}

export function runViolations(
  devControl: DevControlOutput,
  basement: BasementOutput | null,
  inputs: SiteInputs,
  relaxations: RelaxationInputs = {
    far: 0, groundCoverage: 0, height: 0,
    frontSetback: 0, rearSetback: 0, leftSetback: 0, rightSetback: 0,
    basementDepth: 0,
  },
): ViolationOutput {
  const isPostDesign = inputs.assessmentPhase === "POST_DESIGN";
  if (!isPostDesign) return { items: [], hasViolations: false, hasRelaxations: false };

  const items: ViolationItem[] = [];

  // FAR
  const farItem = violationItem(
    "FAR", "FAR / Built-up area", "FAR",
    "MAX", devControl.maxFar,
    devControl.far > 0 ? devControl.far : undefined,
    relaxations.far ?? 0,
  );
  if (farItem) items.push(farItem);

  // Ground coverage
  const gcItem = violationItem(
    "GROUND_COVERAGE", "Ground coverage", "%",
    "MAX", devControl.maxCoveragePct,
    inputs.proposedGroundCoverPct,
    relaxations.groundCoverage ?? 0,
  );
  if (gcItem) items.push(gcItem);

  // Height
  const htItem = violationItem(
    "HEIGHT", "Building height", "m",
    "MAX", devControl.maxHeightM,
    inputs.proposedHeightM,
    relaxations.height ?? 0,
  );
  if (htItem) items.push(htItem);

  // Setbacks (MIN limits)
  const sbItems: [string, string, number, number | undefined, number][] = [
    ["FRONT_SETBACK", "Front setback", devControl.setbacks.front, inputs.actualFrontSetbackM, relaxations.frontSetback ?? 0],
    ["REAR_SETBACK", "Rear setback", devControl.setbacks.rear, inputs.actualRearSetbackM, relaxations.rearSetback ?? 0],
    ["LEFT_SETBACK", "Left setback", devControl.setbacks.left, inputs.actualLeftSetbackM, relaxations.leftSetback ?? 0],
    ["RIGHT_SETBACK", "Right setback", devControl.setbacks.right, inputs.actualRightSetbackM, relaxations.rightSetback ?? 0],
  ];
  for (const [param, label, permissible, actual, relax] of sbItems) {
    const item = violationItem(param, label, "m", "MIN", permissible, actual, relax);
    if (item) items.push(item);
  }

  // Basement depth
  if (basement && inputs.hasBasement) {
    const bsItem = violationItem(
      "BASEMENT_DEPTH", "Basement depth", "m",
      "MAX", basement.maxDepthM,
      inputs.basementDepthM > 0 ? inputs.basementDepthM : undefined,
      relaxations.basementDepth ?? 0,
    );
    if (bsItem) items.push(bsItem);
  }

  const hasViolations = items.some((i) => i.status === "VIOLATION");
  const hasRelaxations = items.some((i) => i.status === "WITHIN_RELAXATION");

  return { items, hasViolations, hasRelaxations };
}

export function runAllEngines(
  inputs: SiteInputs,
  data: RuleVersionData,
  existingPermitIds: string[] = [],
  relaxations?: RelaxationInputs,
): AssessmentResult {
  const devControl = runDevControl(inputs, data);
  const basement = runBasement(inputs, data);
  const sustainability = runSustainability(inputs, devControl.maxBuiltUpSqm, data);
  const approvalReadiness = runApprovalReadiness(inputs, data.approvalDocs, existingPermitIds);
  const violations = runViolations(devControl, basement, inputs, relaxations);

  const scores = [
    devControl.compliant ? 100 : 50,
    basement ? (basement.compliant ? 100 : 0) : 100,
    sustainability.score,
    approvalReadiness.score,
  ];
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return { devControl, basement, sustainability, approvalReadiness, violations, overallScore };
}
