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
  title: text("title").notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projectOffices.id, { onDelete: "set null" }),
  model: text("model").notNull(), // EngagementModel
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

/** Phase 1 — technical query (TQ/RFI) register with closure evidence. */
export const consTqs = pgTable("esti_cons_tq", {
  id: id(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => consEngagements.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // e.g. TQ-001
  question: text("question").notNull(),
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
