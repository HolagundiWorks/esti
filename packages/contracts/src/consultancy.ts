import { z } from "zod";
import type { TagColor } from "./schemas.js";

/**
 * AORMS-Consultancy — Phase 0 "Living record" contracts (engagements + the
 * deliverable register). Grounded in docs/esti/AORMS-CONSULTANCY-CASE-STUDY.md;
 * system shape in docs/esti/AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md.
 *
 * Naming note: `engagements` / `esti_engagement` belong to AORMS-Studio's
 * architect↔consultant collaboration model — the engineering-consultancy spine
 * uses the `consultancy.*` tRPC namespace and `esti_cons_*` tables.
 */

/** How the engineering engagement is shaped (case study §4 / frameworks §4.2). */
export const EngagementModel = z.enum([
  "DESIGN_ASSIST",
  "PEER_REVIEW",
  "FULL_DESIGN",
  "SITE_SUPPORT",
]);
export type EngagementModel = z.infer<typeof EngagementModel>;

export const ENGAGEMENT_MODEL_LABEL: Record<EngagementModel, string> = {
  DESIGN_ASSIST: "Design assist",
  PEER_REVIEW: "Peer review",
  FULL_DESIGN: "Full design",
  SITE_SUPPORT: "Site support",
};

/** Engineering disciplines an engagement covers (case study §1). */
export const EngineeringDiscipline = z.enum([
  "STRUCTURAL",
  "MEP",
  "CIVIL",
  "GEOTECHNICAL",
  "FACADE",
  "OTHER",
]);
export type EngineeringDiscipline = z.infer<typeof EngineeringDiscipline>;

export const ENGINEERING_DISCIPLINE_LABEL: Record<EngineeringDiscipline, string> = {
  STRUCTURAL: "Structural",
  MEP: "MEP / building services",
  CIVIL: "Civil / infrastructure",
  GEOTECHNICAL: "Geotechnical",
  FACADE: "Façade / specialist",
  OTHER: "Other",
};

/** `EngagementStatus` is taken by the Studio consultant model — hence Cons*. */
export const ConsEngagementStatus = z.enum(["ACTIVE", "ON_HOLD", "CLOSED"]);
export type ConsEngagementStatus = z.infer<typeof ConsEngagementStatus>;

/** Purpose of issue on a deliverable (ISO 19650 plain-language classes; case study §3.4). */
export const IssueClass = z.enum([
  "FOR_INFORMATION",
  "FOR_APPROVAL",
  "FOR_CONSTRUCTION",
]);
export type IssueClass = z.infer<typeof IssueClass>;

export const ISSUE_CLASS_LABEL: Record<IssueClass, string> = {
  FOR_INFORMATION: "For information",
  FOR_APPROVAL: "For approval",
  FOR_CONSTRUCTION: "For construction",
};

/**
 * Required design-check rigour (BS 5975 / IStructE categories; case study §3.2).
 * Phase 0 records the requirement; Phase 1's sign-off chain enforces it.
 */
export const CheckCategory = z.enum(["CAT0", "CAT1", "CAT2", "CAT3"]);
export type CheckCategory = z.infer<typeof CheckCategory>;

export const CHECK_CATEGORY_LABEL: Record<CheckCategory, string> = {
  CAT0: "Cat 0 — standard solution",
  CAT1: "Cat 1 — same-team peer check",
  CAT2: "Cat 2 — independent check",
  CAT3: "Cat 3 — third-party proof check",
};

/**
 * Phase 0 register lifecycle. The originate→check→approve chain states arrive
 * with Phase 1 (reliance engine) — until then ISSUED is a recorded fact, not a
 * gated act.
 */
export const DeliverableStatus = z.enum(["DRAFT", "ISSUED", "SUPERSEDED", "WITHDRAWN"]);
export type DeliverableStatus = z.infer<typeof DeliverableStatus>;

export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  SUPERSEDED: "Superseded",
  WITHDRAWN: "Withdrawn",
};

/** Status-dot colour maps (StatusTag convention — colours live in contracts). */
export const CONS_ENGAGEMENT_STATUS_TAG: Record<ConsEngagementStatus, TagColor> = {
  ACTIVE: "green",
  ON_HOLD: "warm-gray",
  CLOSED: "gray",
};

export const CONS_DELIVERABLE_STATUS_TAG: Record<DeliverableStatus, TagColor> = {
  DRAFT: "gray",
  ISSUED: "green",
  SUPERSEDED: "warm-gray",
  WITHDRAWN: "red",
};

/**
 * Consultancy types — the Indian consultancy market's actual patterns. Unlike
 * architecture (one COA stage ladder for every practice), consultancy work is
 * TYPED: each type has its own scope-of-work shape and its own phases. The
 * type chosen at engagement creation seeds the engagement's phases from
 * {@link CONSULTANCY_SCOPE_TEMPLATES} (fully editable afterwards).
 */
export const ConsultancyType = z.enum([
  "STRUCTURAL",
  "PEB",
  "ELECTRICAL",
  "PLUMBING",
  "HVAC",
  "WATERPROOFING",
  "LANDSCAPING",
]);
export type ConsultancyType = z.infer<typeof ConsultancyType>;

export const CONSULTANCY_TYPE_LABEL: Record<ConsultancyType, string> = {
  STRUCTURAL: "Structural",
  PEB: "PEB (pre-engineered buildings)",
  ELECTRICAL: "Electrical",
  PLUMBING: "Plumbing (PHE)",
  HVAC: "HVAC",
  WATERPROOFING: "Waterproofing",
  LANDSCAPING: "Landscaping",
};

export type ConsultancyPhaseTemplate = {
  name: string;
  /** The scope-of-work items this phase covers — the consultancy's time is bounded by these. */
  scope: readonly string[];
};

/**
 * Per-type scope-of-work patterns (Indian practice). These bound what the
 * consultancy's time covers — the engagement's phases are seeded from here and
 * edited per appointment; anything beyond the recorded scope is a variation.
 */
export const CONSULTANCY_SCOPE_TEMPLATES: Record<
  ConsultancyType,
  readonly ConsultancyPhaseTemplate[]
> = {
  STRUCTURAL: [
    { name: "Concept & feasibility", scope: ["Structural scheme options on architect's concept", "Indicative member sizing + structural zones", "Design basis note (loads, codes, SBC assumptions)"] },
    { name: "Schematic design", scope: ["Framing plans on frozen grids", "Preliminary analysis & sizing", "Foundation scheme on geotech recommendations"] },
    { name: "Detailed design", scope: ["Final analysis & design (RC/steel)", "Reinforcement / connection details", "Slab, beam, column, footing schedules"] },
    { name: "GFC & coordination", scope: ["Good-for-construction drawing issue", "Coordination with architect & MEP penetrations", "Bar bending schedule readiness"] },
    { name: "Construction support", scope: ["Site clarifications & TQ responses", "Reinforcement checking at agreed stages", "Structural stability certificate on completion"] },
  ],
  PEB: [
    { name: "Design basis & geometry", scope: ["Building geometry, bay spacing, clear heights with client/vendor", "Load basis (wind, seismic, crane, collateral)", "Design basis report for the PEB vendor"] },
    { name: "Foundation interface", scope: ["Anchor bolt plans from vendor reaction reports", "Foundation design for column reactions", "Grouting & base plate interface details"] },
    { name: "Vendor drawing review", scope: ["Review of fabricator design calculations", "Approval of erection & shop drawings", "Compliance check against design basis"] },
    { name: "Erection support", scope: ["Site queries during erection", "Alignment / verticality check witness", "Completion review for handover"] },
  ],
  ELECTRICAL: [
    { name: "Load assessment & DBR", scope: ["Connected & demand load calculations", "Transformer / DG / UPS sizing", "Single-line diagram concept + design basis report"] },
    { name: "Schematic design", scope: ["Developed SLD & panel schedules", "Cable route & containment strategy", "Earthing & lightning protection concept"] },
    { name: "Detailed design", scope: ["Lighting, power & small-power layouts", "Cable schedules & voltage-drop calculations", "Panel GA drawings & earthing layouts"] },
    { name: "Liaison support", scope: ["CEIG / discom submission drawings", "Responses to authority scrutiny remarks"] },
    { name: "Construction support", scope: ["Shop drawing review", "Installation stage inspections", "Testing & commissioning witness"] },
  ],
  PLUMBING: [
    { name: "Demand assessment & DBR", scope: ["Water demand & storage calculations", "Source, treatment (WTP/STP) strategy", "Drainage & rainwater strategy + design basis report"] },
    { name: "Schematic design", scope: ["Water supply & drainage riser diagrams", "STP/WTP sizing & plant room layouts", "External drainage & storm concept"] },
    { name: "Detailed design", scope: ["Water supply & drainage layouts (floorwise)", "Rainwater harvesting details", "Fixture, pump & pipe schedules"] },
    { name: "Construction support", scope: ["Shop drawing review", "Pressure / flow test witness", "Commissioning support"] },
  ],
  HVAC: [
    { name: "Heat load & DBR", scope: ["Room-wise heat load calculations", "System selection (VRF/chilled water/split)", "Plant sizing + design basis report"] },
    { name: "Schematic design", scope: ["Duct & pipe routing concept", "Plant room & shaft sizing", "Ventilation & pressurisation strategy"] },
    { name: "Detailed design", scope: ["Duct & pipe layouts with sizing", "Equipment schedules & selections", "Stair pressurisation / basement ventilation calcs"] },
    { name: "Construction support", scope: ["Shop drawing review", "Installation inspections", "Testing, adjusting & balancing (TAB) witness"] },
  ],
  WATERPROOFING: [
    { name: "Risk assessment", scope: ["Wet-area, basement, terrace & joint risk mapping", "Substrate & movement assessment", "Failure-history review (retrofit jobs)"] },
    { name: "System specification", scope: ["System selection per area (membrane/coating/integral)", "Guarantee & applicator qualification criteria", "Specification sheets per system"] },
    { name: "Details & method statements", scope: ["Junction, drain, joint & termination details", "Method statements per application", "Interface details with structure & finishes"] },
    { name: "Application audit", scope: ["Surface preparation inspections", "Stage inspections during application", "Ponding test witness & guarantee protocol"] },
  ],
  LANDSCAPING: [
    { name: "Concept & theming", scope: ["Site analysis (sun, soil, drainage, views)", "Planting & hardscape concept + theming", "Zoning of soft/hard landscape areas"] },
    { name: "Schematic design", scope: ["Levels & grading strategy", "Softscape & hardscape palettes", "Irrigation & drainage strategy"] },
    { name: "Detailed design", scope: ["Planting plans with species schedules", "Irrigation & landscape drainage details", "Hardscape details & outdoor lighting coordination"] },
    { name: "Implementation support", scope: ["Nursery / material selection support", "Site supervision visits at agreed stages", "Maintenance schedule & handover"] },
  ],
};

export const ConsPhaseStatus = z.enum(["PENDING", "ACTIVE", "DONE"]);
export type ConsPhaseStatus = z.infer<typeof ConsPhaseStatus>;

export const CONS_PHASE_STATUS_TAG: Record<ConsPhaseStatus, TagColor> = {
  PENDING: "gray",
  ACTIVE: "red",
  DONE: "green",
};

/** How the engagement fee is structured (case study §5.1). Hybrids = stages + time-charge lines (later slice). */
export const FeeModel = z.enum(["PERCENT_OF_COST", "LUMP_SUM", "TIME_CHARGE", "RETAINER"]);
export type FeeModel = z.infer<typeof FeeModel>;

export const FEE_MODEL_LABEL: Record<FeeModel, string> = {
  PERCENT_OF_COST: "% of construction cost",
  LUMP_SUM: "Lump sum",
  TIME_CHARGE: "Time charge",
  RETAINER: "Retainer",
};

export const ConsEngagementCreate = z.object({
  title: z.string().min(1).max(300),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  model: EngagementModel,
  /** The consultancy pattern — seeds the engagement's phases + scope of work. */
  consultancyType: ConsultancyType.optional(),
  leadDiscipline: EngineeringDiscipline,
  disciplines: z.array(EngineeringDiscipline).max(12).optional(),
  /** What downstream parties may rely on — explicit, per the case study §6.4. */
  relianceScope: z.string().max(4000).optional(),
  /** Current work stage — free text in Phase 0 (COA/RIBA vocab differs per firm). */
  stage: z.string().max(120).optional(),
  /** Fee structure (Phase 2) — optional until the commercial terms are agreed. */
  feeModel: FeeModel.optional(),
  /** Agreed total fee in integer paise. */
  feeTotalPaise: z.number().int().nonnegative().optional(),
  notes: z.string().max(8000).optional(),
});
export type ConsEngagementCreate = z.infer<typeof ConsEngagementCreate>;

export const ConsEngagementUpdate = ConsEngagementCreate.partial().extend({
  id: z.string().uuid(),
  status: ConsEngagementStatus.optional(),
});
export type ConsEngagementUpdate = z.infer<typeof ConsEngagementUpdate>;

/** Add a custom phase to an engagement's scope (beyond the seeded template). */
export const ConsPhaseCreate = z.object({
  engagementId: z.string().uuid(),
  name: z.string().min(1).max(200),
  scope: z.array(z.string().min(1).max(300)).max(20).default([]),
});
export type ConsPhaseCreate = z.infer<typeof ConsPhaseCreate>;

export const ConsDeliverableCreate = z.object({
  engagementId: z.string().uuid(),
  /** Document number on the register, e.g. STR-CAL-001. */
  code: z.string().min(1).max(80),
  title: z.string().min(1).max(300),
  discipline: EngineeringDiscipline,
  revision: z.string().min(1).max(12).default("A"),
  issueClass: IssueClass.default("FOR_INFORMATION"),
  checkCategory: CheckCategory.default("CAT1"),
  notes: z.string().max(8000).optional(),
});
export type ConsDeliverableCreate = z.infer<typeof ConsDeliverableCreate>;

export const ConsDeliverableUpdate = ConsDeliverableCreate.omit({ engagementId: true })
  .partial()
  .extend({
    id: z.string().uuid(),
    status: DeliverableStatus.optional(),
  });
export type ConsDeliverableUpdate = z.infer<typeof ConsDeliverableUpdate>;

// ── Phase 1 — the reliance engine ────────────────────────────────────────────

/**
 * Sign-off chain steps (case study §3.1). ORIGINATE is implicit — the
 * deliverable's `originatedBy` — so the recordable steps are:
 * CHECK (independent check, never the author) → APPROVE (sign; the Engineer of
 * Record accepts professional responsibility) → VERIFY (external/proof check,
 * highest category only).
 */
export const ReviewStepKind = z.enum(["CHECK", "APPROVE", "VERIFY"]);
export type ReviewStepKind = z.infer<typeof ReviewStepKind>;

export const REVIEW_STEP_LABEL: Record<ReviewStepKind, string> = {
  CHECK: "Independent check",
  APPROVE: "Approve & sign (EoR)",
  VERIFY: "Proof check",
};

/**
 * The chain a deliverable must complete before it may be ISSUED, by check
 * category (BS 5975 / IStructE; case study §3.2). Cat 1 vs Cat 2 differ in the
 * *independence* of the checker (same team vs independent), which grades will
 * encode later — the recorded chain shape is the same.
 */
export const CHECK_CATEGORY_REQUIRED_STEPS: Record<CheckCategory, readonly ReviewStepKind[]> = {
  CAT0: ["APPROVE"],
  CAT1: ["CHECK", "APPROVE"],
  CAT2: ["CHECK", "APPROVE"],
  CAT3: ["CHECK", "APPROVE", "VERIFY"],
};

export const ConsReviewStepCreate = z.object({
  deliverableId: z.string().uuid(),
  kind: ReviewStepKind,
  note: z.string().max(2000).optional(),
});
export type ConsReviewStepCreate = z.infer<typeof ConsReviewStepCreate>;

/** Technical query (TQ/RFI) register — questions with closure evidence (case study §4.2). */
export const TqStatus = z.enum(["OPEN", "ANSWERED", "CLOSED"]);
export type TqStatus = z.infer<typeof TqStatus>;

export const TQ_STATUS_LABEL: Record<TqStatus, string> = {
  OPEN: "Open",
  ANSWERED: "Answered",
  CLOSED: "Closed",
};

export const CONS_TQ_STATUS_TAG: Record<TqStatus, TagColor> = {
  OPEN: "red",
  ANSWERED: "teal",
  CLOSED: "green",
};

export const ConsTqCreate = z.object({
  engagementId: z.string().uuid(),
  /** Register code, e.g. TQ-001. */
  code: z.string().min(1).max(40),
  question: z.string().min(1).max(4000),
  /** A TQ that expands the brief becomes a variation (billable) — flag it. */
  scopeImpact: z.boolean().default(false),
});
export type ConsTqCreate = z.infer<typeof ConsTqCreate>;

export const ConsTqAnswer = z.object({
  id: z.string().uuid(),
  answer: z.string().min(1).max(8000),
});
export type ConsTqAnswer = z.infer<typeof ConsTqAnswer>;

export const ConsTqClose = z.object({
  id: z.string().uuid(),
  /** Closure evidence is mandatory — the dated trail is the dispute record. */
  closureNote: z.string().min(1).max(4000),
});
export type ConsTqClose = z.infer<typeof ConsTqClose>;

// ── Phase 2 — the commercial engine (slice 1: fee stages) ───────────────────

/**
 * Stage lifecycle: PENDING → BILLABLE (fires automatically when the linked
 * deliverable is ISSUED — stage billing is tied to deliverable issue, case
 * study §5.4) → INVOICED (recorded when the invoice is raised).
 */
export const FeeStageStatus = z.enum(["PENDING", "BILLABLE", "INVOICED"]);
export type FeeStageStatus = z.infer<typeof FeeStageStatus>;

export const FEE_STAGE_STATUS_LABEL: Record<FeeStageStatus, string> = {
  PENDING: "Pending",
  BILLABLE: "Billable",
  INVOICED: "Invoiced",
};

export const CONS_FEE_STAGE_STATUS_TAG: Record<FeeStageStatus, TagColor> = {
  PENDING: "gray",
  BILLABLE: "red",
  INVOICED: "green",
};

export const ConsFeeStageCreate = z.object({
  engagementId: z.string().uuid(),
  label: z.string().min(1).max(200),
  /** Integer paise (house convention — format with formatINR). */
  amountPaise: z.number().int().nonnegative(),
  /** Billing trigger — the stage turns BILLABLE when this deliverable is ISSUED. */
  deliverableId: z.string().uuid().optional(),
});
export type ConsFeeStageCreate = z.infer<typeof ConsFeeStageCreate>;

export const ConsFeeStageUpdate = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200).optional(),
  amountPaise: z.number().int().nonnegative().optional(),
  deliverableId: z.string().uuid().nullable().optional(),
});
export type ConsFeeStageUpdate = z.infer<typeof ConsFeeStageUpdate>;

// ── Phase 2 slice 2 — time & health (timesheets, rate cards, WIP) ───────────

/** Delivery grades (case study §2.1) — the chargeout dimension of the rate card. */
export const ConsGrade = z.enum([
  "PRINCIPAL",
  "DIRECTOR",
  "ASSOCIATE",
  "SENIOR_ENGINEER",
  "ENGINEER",
  "GRADUATE",
]);
export type ConsGrade = z.infer<typeof ConsGrade>;

export const CONS_GRADE_LABEL: Record<ConsGrade, string> = {
  PRINCIPAL: "Principal / Partner",
  DIRECTOR: "Technical Director",
  ASSOCIATE: "Associate",
  SENIOR_ENGINEER: "Senior Engineer",
  ENGINEER: "Engineer",
  GRADUATE: "Graduate Engineer",
};

/** Firm rate card — chargeout per grade (paise/hour) + weekly capacity (hours). */
export const ConsRateCardSet = z.object({
  rates: z
    .array(
      z.object({
        grade: ConsGrade,
        ratePaise: z.number().int().nonnegative(),
        /** Firm capacity at this grade, hours/week — the utilisation denominator. */
        capacityHoursWeek: z.number().nonnegative().max(10000).optional(),
      }),
    )
    .min(1)
    .max(12),
});
export type ConsRateCardSet = z.infer<typeof ConsRateCardSet>;

/** Period input for firm analytics (ISO dates, inclusive). */
export const ConsAnalyticsPeriod = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type ConsAnalyticsPeriod = z.infer<typeof ConsAnalyticsPeriod>;

// ── Phase 3 — the defensibility layer (risk, PI, input gate) ────────────────

/** Risk register (case study §6.5) — score inherent and residual separately. */
export const RiskStatus = z.enum(["OPEN", "MITIGATED", "CLOSED"]);
export type RiskStatus = z.infer<typeof RiskStatus>;

export const CONS_RISK_STATUS_TAG: Record<RiskStatus, TagColor> = {
  OPEN: "red",
  MITIGATED: "teal",
  CLOSED: "gray",
};

export const RiskResponse = z.enum(["AVOID", "REDUCE", "TRANSFER", "ACCEPT"]);
export type RiskResponse = z.infer<typeof RiskResponse>;

export const RISK_RESPONSE_LABEL: Record<RiskResponse, string> = {
  AVOID: "Avoid",
  REDUCE: "Reduce",
  TRANSFER: "Transfer",
  ACCEPT: "Accept",
};

const riskScore = z.number().int().min(1).max(5);

export const ConsRiskCreate = z.object({
  /** Omit for a practice-level risk. */
  engagementId: z.string().uuid().optional(),
  title: z.string().min(1).max(300),
  /** Inherent — before controls. */
  likelihood: riskScore,
  impact: riskScore,
  owner: z.string().max(200).optional(),
  response: RiskResponse.default("REDUCE"),
  mitigation: z.string().max(2000).optional(),
  /** Residual — after controls (defaults to inherent until reassessed). */
  residualLikelihood: riskScore.optional(),
  residualImpact: riskScore.optional(),
});
export type ConsRiskCreate = z.infer<typeof ConsRiskCreate>;

export const ConsRiskUpdate = ConsRiskCreate.omit({ engagementId: true })
  .partial()
  .extend({ id: z.string().uuid(), status: RiskStatus.optional() });
export type ConsRiskUpdate = z.infer<typeof ConsRiskUpdate>;

/** Firm PI policy (case study §6.1) — claims-made; track limit, period, run-off. */
export const ConsInsuranceSet = z.object({
  insurer: z.string().min(1).max(200),
  policyNo: z.string().min(1).max(120),
  /** Limit of indemnity, integer paise. */
  limitPaise: z.number().int().nonnegative(),
  periodFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Run-off cover end (post-cessation claims window). */
  runOffUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
});
export type ConsInsuranceSet = z.infer<typeof ConsInsuranceSet>;

/** Reliance letter — a named third party allowed to rely (case study §6.4). */
export const ConsRelianceLetterCreate = z.object({
  engagementId: z.string().uuid(),
  beneficiary: z.string().min(1).max(300),
  purpose: z.string().min(1).max(1000),
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
});
export type ConsRelianceLetterCreate = z.infer<typeof ConsRelianceLetterCreate>;

/**
 * EmOI input gate (architecture §1.3): external inputs are recorded and
 * validated before they become working assumptions. An unvalidated pack is a
 * HOLD POINT — deliverables on the engagement cannot be issued past it.
 * (Named manual validation now; EmOI-assisted validation rides with Phase 4.)
 */
export const InputPackKind = z.enum(["ARCHITECT_PACK", "GEOTECH", "CODE", "BRIEF", "OTHER"]);
export type InputPackKind = z.infer<typeof InputPackKind>;

export const INPUT_PACK_KIND_LABEL: Record<InputPackKind, string> = {
  ARCHITECT_PACK: "Architect pack",
  GEOTECH: "Geotech report",
  CODE: "Code / standard",
  BRIEF: "Client brief",
  OTHER: "Other",
};

export const InputPackStatus = z.enum(["RECEIVED", "VALIDATED", "REJECTED"]);
export type InputPackStatus = z.infer<typeof InputPackStatus>;

export const CONS_INPUT_PACK_STATUS_TAG: Record<InputPackStatus, TagColor> = {
  RECEIVED: "red",
  VALIDATED: "green",
  REJECTED: "gray",
};

export const ConsInputPackCreate = z.object({
  engagementId: z.string().uuid(),
  title: z.string().min(1).max(300),
  kind: InputPackKind.default("ARCHITECT_PACK"),
  /** Where it came from, e.g. "Architect issue rev C, 2026-07-10". */
  source: z.string().max(500).optional(),
});
export type ConsInputPackCreate = z.infer<typeof ConsInputPackCreate>;

/** A timesheet entry — hours booked to engagement (× deliverable) at a grade. */
export const ConsTimesheetCreate = z.object({
  engagementId: z.string().uuid(),
  deliverableId: z.string().uuid().optional(),
  /** ISO date (YYYY-MM-DD). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  grade: ConsGrade,
  hours: z.number().positive().max(24),
  note: z.string().max(500).optional(),
});
export type ConsTimesheetCreate = z.infer<typeof ConsTimesheetCreate>;

// ── Phase 2 slice 3 — variations (additional services) ──────────────────────

/**
 * Out-of-scope work captured as a named variation with approval (case study
 * §5.4) — client scope changes and code updates are chargeable; design-team
 * errors are not. Approval appends a BILLABLE fee stage automatically.
 */
export const VariationStatus = z.enum(["PROPOSED", "APPROVED", "REJECTED"]);
export type VariationStatus = z.infer<typeof VariationStatus>;

export const VARIATION_STATUS_LABEL: Record<VariationStatus, string> = {
  PROPOSED: "Proposed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const CONS_VARIATION_STATUS_TAG: Record<VariationStatus, TagColor> = {
  PROPOSED: "teal",
  APPROVED: "green",
  REJECTED: "gray",
};

export const ConsVariationCreate = z.object({
  engagementId: z.string().uuid(),
  /** Register code, e.g. VO-001. */
  code: z.string().min(1).max(40),
  title: z.string().min(1).max(300),
  /** Proposed additional fee — integer paise. */
  amountPaise: z.number().int().nonnegative(),
  /** The scope-impact TQ this variation grew out of, when applicable. */
  sourceTqId: z.string().uuid().optional(),
  notes: z.string().max(4000).optional(),
});
export type ConsVariationCreate = z.infer<typeof ConsVariationCreate>;
