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
