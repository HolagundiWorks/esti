/**
 * AORMS-Consultancy — Phase 0 "Living record": engineering engagements + the
 * deliverable register (docs/esti/AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md §3).
 *
 * `esti_engagement` belongs to AORMS-Studio's architect↔consultant collaboration
 * model (collaboration.ts) — the engineering-consultancy spine uses `esti_cons_*`.
 */
import { bigint, boolean, createdAt, date, doublePrecision, id, jsonb, pgTable, text, timestamp, uniqueIndex, updatedAt, uuid } from "./_helpers.js";
import { clients, users } from "./org-auth.js";
import { projectOffices } from "./project.js";

export const consEngagements = pgTable("esti_cons_engagement", {
  id: id(),
  /** Job number (SOP: allocated at creation; the root every record hangs off). */
  code: text("code"),
  title: text("title").notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projectOffices.id, { onDelete: "set null" }),
  model: text("model").notNull(), // EngagementModel
  /** The consultancy pattern (STRUCTURAL/PEB/ELECTRICAL/…) — seeds phases + scope. */
  consultancyType: text("consultancy_type"), // ConsultancyType
  /** Typed project brief — the design-basis parameter set (keys per CONSULTANCY_BRIEF_TEMPLATES). */
  brief: jsonb("brief"),
  leadDiscipline: text("lead_discipline").notNull(), // EngineeringDiscipline
  disciplines: jsonb("disciplines"), // EngineeringDiscipline[]
  relianceScope: text("reliance_scope"),
  stage: text("stage"),
  status: text("status").notNull().default("ACTIVE"), // EngagementStatus
  // Phase 2 — fee structure (money is integer paise, house convention).
  feeModel: text("fee_model"), // FeeModel
  feeTotalPaise: bigint("fee_total_paise", { mode: "number" }),
  // Built-in PDF export (worker render_pdf → WeasyPrint → S3).
  pdfStatus: text("pdf_status"), // PENDING | PROCESSING | READY | FAILED
  pdfKey: text("pdf_key"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const consDeliverables = pgTable("esti_cons_deliverable", {
  id: id(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => consEngagements.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // register document number, e.g. STR-CAL-001
  title: text("title").notNull(),
  discipline: text("discipline").notNull(), // EngineeringDiscipline
  revision: text("revision").notNull().default("A"),
  issueClass: text("issue_class").notNull().default("FOR_INFORMATION"), // IssueClass
  checkCategory: text("check_category").notNull().default("CAT1"), // CheckCategory
  status: text("status").notNull().default("DRAFT"), // DeliverableStatus
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  /** Studio issue transmittal (SOP §3 MDR back-reference). */
  transmittalId: uuid("transmittal_id"),
  /** The author — the sign-off chain's implicit ORIGINATE step (checker ≠ author). */
  originatedBy: uuid("originated_by").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Phase 1 — serial sign-off chain (CHECK → APPROVE → VERIFY per check category).
 * Name is snapshotted at signing so the EoR record survives user changes.
 */
export const consReviewSteps = pgTable("esti_cons_review_step", {
  id: id(),
  deliverableId: uuid("deliverable_id")
    .notNull()
    .references(() => consDeliverables.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // ReviewStepKind
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: text("user_name").notNull(),
  note: text("note"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Phase 2 — fee stages: the engagement fee drawn down against deliverable
 * issue. A stage linked to a deliverable turns BILLABLE automatically when
 * that deliverable is ISSUED (stage billing tied to issue, case study §5.4).
 */
export const consFeeStages = pgTable("esti_cons_fee_stage", {
  id: id(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => consEngagements.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  deliverableId: uuid("deliverable_id").references(() => consDeliverables.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("PENDING"), // FeeStageStatus
  billableAt: timestamp("billable_at", { withTimezone: true }),
  invoicedAt: timestamp("invoiced_at", { withTimezone: true }),
  /** Payment terms — the dunning ladder (SOP §8) runs off this. */
  invoiceDue: date("invoice_due"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Phase 2 slice 2 — firm rate card: chargeout per grade (integer paise/hour). */
export const consRateCards = pgTable(
  "esti_cons_rate_card",
  {
    id: id(),
    grade: text("grade").notNull(), // ConsGrade
    ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
    /** Firm capacity at this grade, hours/week — the utilisation denominator. */
    capacityHoursWeek: doublePrecision("capacity_hours_week").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => ({ gradeIdx: uniqueIndex("esti_cons_rate_card_grade_idx").on(t.grade) }),
);

/**
 * Phase 2 slice 2 — timesheets: hours booked to engagement (× deliverable) at
 * a grade. The substrate for time value, WIP, and later utilisation/realisation.
 */
export const consTimesheets = pgTable("esti_cons_timesheet", {
  id: id(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => consEngagements.id, { onDelete: "cascade" }),
  deliverableId: uuid("deliverable_id").references(() => consDeliverables.id, {
    onDelete: "set null",
  }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: text("user_name").notNull(),
  date: date("date").notNull(),
  grade: text("grade").notNull(), // ConsGrade
  hours: doublePrecision("hours").notNull(),
  /** Value at booking time — hours × the grade rate then in force (paise). */
  valuePaise: bigint("value_paise", { mode: "number" }).notNull().default(0),
  /** SOP §8 — entries are approved weekly by the PM (named, audited act). */
  status: text("status").notNull().default("SUBMITTED"), // SUBMITTED | APPROVED
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedByName: text("approved_by_name"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  note: text("note"),
  createdAt: createdAt(),
});

/**
 * Phase 2 slice 3 — variations: out-of-scope work with approval → billing.
 * Approving a variation appends a BILLABLE fee stage (feeStageId records it).
 */
export const consVariations = pgTable("esti_cons_variation", {
  id: id(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => consEngagements.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // e.g. VO-001
  title: text("title").notNull(),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  sourceTqId: uuid("source_tq_id").references(() => consTqs.id, { onDelete: "set null" }),
  status: text("status").notNull().default("PROPOSED"), // VariationStatus
  feeStageId: uuid("fee_stage_id").references(() => consFeeStages.id, { onDelete: "set null" }),
  notes: text("notes"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Engagement phases — the typed scope of work. Seeded from the consultancy
 * type's template (CONSULTANCY_SCOPE_TEMPLATES) at engagement creation and
 * edited per appointment; the consultancy's time is bounded by these items.
 */
export const consPhases = pgTable("esti_cons_engagement_phase", {
  id: id(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => consEngagements.id, { onDelete: "cascade" }),
  seq: bigint("seq", { mode: "number" }).notNull().default(0),
  name: text("name").notNull(),
  scope: jsonb("scope"), // string[]
  status: text("status").notNull().default("PENDING"), // ConsPhaseStatus
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Phase 3 — risk register: inherent vs residual, per engagement or practice-level. */
export const consRisks = pgTable("esti_cons_risk", {
  id: id(),
  engagementId: uuid("engagement_id").references(() => consEngagements.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  likelihood: bigint("likelihood", { mode: "number" }).notNull().default(3),
  impact: bigint("impact", { mode: "number" }).notNull().default(3),
  owner: text("owner"),
  response: text("response").notNull().default("REDUCE"), // RiskResponse
  mitigation: text("mitigation"),
  residualLikelihood: bigint("residual_likelihood", { mode: "number" }),
  residualImpact: bigint("residual_impact", { mode: "number" }),
  status: text("status").notNull().default("OPEN"), // RiskStatus
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Phase 3 — the firm's PI policy (single row; claims-made basis). */
export const consInsurance = pgTable("esti_cons_insurance", {
  id: id(),
  insurer: text("insurer").notNull(),
  policyNo: text("policy_no").notNull(),
  limitPaise: bigint("limit_paise", { mode: "number" }).notNull().default(0),
  periodFrom: date("period_from").notNull(),
  periodTo: date("period_to").notNull(),
  runOffUntil: date("run_off_until"),
  notes: text("notes"),
  updatedAt: updatedAt(),
});

/** Phase 3 — reliance letters: controlled third-party reliance instruments. */
export const consRelianceLetters = pgTable("esti_cons_reliance_letter", {
  id: id(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => consEngagements.id, { onDelete: "cascade" }),
  beneficiary: text("beneficiary").notNull(),
  purpose: text("purpose").notNull(),
  issuedOn: date("issued_on").notNull(),
  /** Every letter is time-boxed (required at issue via the contract). */
  expiresOn: date("expires_on"),
  notes: text("notes"),
  /** Active withdrawal — the row is never deleted, only stamped REVOKED. */
  revokedAt: timestamp("revoked_at"),
  revokedBy: uuid("revoked_by").references(() => users.id, { onDelete: "set null" }),
  revokedByName: text("revoked_by_name"),
  revokeReason: text("revoke_reason"),
  createdAt: createdAt(),
});

/**
 * Phase 3 — EOMS input gate: external inputs recorded and validated before
 * they become working assumptions. RECEIVED packs are a hold point — the
 * engagement's deliverables cannot be issued past them.
 */
export const consInputPacks = pgTable("esti_cons_input_pack", {
  id: id(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => consEngagements.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("ARCHITECT_PACK"), // InputPackKind
  source: text("source"),
  status: text("status").notNull().default("RECEIVED"), // InputPackStatus
  validatedBy: uuid("validated_by").references(() => users.id, { onDelete: "set null" }),
  validatedByName: text("validated_by_name"),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  note: text("note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Phase 4 / P9.4 — CalculationPackage lineage (architecture D4).
 * The firm's tools compute; AORMS records inputs, assumptions, code refs and
 * outputs so issue/reliance can cite a reproducible trail. No in-app engine.
 */
export const consCalcPackages = pgTable("esti_cons_calc_package", {
  id: id(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => consEngagements.id, { onDelete: "cascade" }),
  deliverableId: uuid("deliverable_id").references(() => consDeliverables.id, {
    onDelete: "set null",
  }),
  inputPackId: uuid("input_pack_id").references(() => consInputPacks.id, {
    onDelete: "set null",
  }),
  code: text("code").notNull(),
  title: text("title").notNull(),
  revision: text("revision").notNull().default("P01"),
  status: text("status").notNull().default("DRAFT"), // CalcPackageStatus
  softwareTool: text("software_tool"),
  codeRefs: text("code_refs"),
  assumptions: text("assumptions"),
  inputsSummary: text("inputs_summary"),
  outputsSummary: text("outputs_summary"),
  preparedBy: uuid("prepared_by").references(() => users.id, { onDelete: "set null" }),
  preparedByName: text("prepared_by_name"),
  note: text("note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * SOP §4 — comment resolution sheet (CRS): review comments per deliverable
 * submission. No revision issues while a line is OPEN; the closed sheet with
 * responses is the review record.
 */
export const consReviewComments = pgTable("esti_cons_review_comment", {
  id: id(),
  deliverableId: uuid("deliverable_id")
    .notNull()
    .references(() => consDeliverables.id, { onDelete: "cascade" }),
  /** The revision under review when the comment was raised. */
  revision: text("revision").notNull(),
  /** Who commented — e.g. "Architect / Studio Arcline", "Checker", "Client". */
  reviewer: text("reviewer").notNull(),
  comment: text("comment").notNull(),
  response: text("response"),
  status: text("status").notNull().default("OPEN"), // OPEN | CLOSED
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * SOP §7 — site field reports (G711 anatomy). Language discipline: the report
 * records *general conformance observations* — observe, never inspect/supervise.
 */
export const consFieldReports = pgTable("esti_cons_field_report", {
  id: id(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => consEngagements.id, { onDelete: "cascade" }),
  reportNo: bigint("report_no", { mode: "number" }).notNull().default(1),
  visitDate: date("visit_date").notNull(),
  weather: text("weather"),
  personnel: text("personnel"), // trades/contacts present
  workObserved: text("work_observed"),
  observations: text("observations"), // each with location + responsible party
  nonconformances: text("nonconformances"),
  instructions: text("instructions"),
  nextVisit: date("next_visit"),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  createdAt: createdAt(),
});

/** Phase 1 — technical query (TQ/RFI) register with closure evidence. */
export const consTqs = pgTable("esti_cons_tq", {
  id: id(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => consEngagements.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // e.g. TQ-001
  question: text("question").notNull(),
  /** SLA — contractual turnaround is typically 5–14 working days (SOP §6). */
  dueDate: date("due_date"),
  scopeImpact: boolean("scope_impact").notNull().default(false),
  status: text("status").notNull().default("OPEN"), // TqStatus
  answer: text("answer"),
  closureNote: text("closure_note"),
  raisedBy: uuid("raised_by").references(() => users.id, { onDelete: "set null" }),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
