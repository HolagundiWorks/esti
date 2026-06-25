import { contractors } from "./delivery.js";
import { users } from "./org-auth.js";
import { phases, projectOffices } from "./project.js";
import {
  bigint,
  boolean,
  createdAt,
  date,
  doublePrecision,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  updatedAt,
  uuid,
} from "./_helpers.js";

export const snags = pgTable("esti_snag", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  ref: text("ref").notNull(),
  location: text("location"),
  trade: text("trade"),
  description: text("description").notNull(),
  status: text("status", {
    enum: ["OPEN", "IN_PROGRESS", "VERIFIED", "CLOSED"],
  })
    .notNull()
    .default("OPEN"),
  photoKey: text("photo_key"),
  contractorSubmissionId: uuid("contractor_submission_id"),
  dueDate: date("due_date"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const siteInstructions = pgTable("esti_site_instruction", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  contractorId: uuid("contractor_id").references(() => contractors.id, {
    onDelete: "set null",
  }),
  subject: text("subject").notNull(),
  body: text("body"),
  issuedAt: date("issued_at"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const progressReports = pgTable("esti_progress_report", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  narrative: text("narrative"),
  physicalProgressPct: integer("physical_progress_pct"),
  scheduleProgressPct: integer("schedule_progress_pct"),
  openSnagCount: integer("open_snag_count").notNull().default(0),
  openRfiCount: integer("open_rfi_count").notNull().default(0),
  status: text("status", { enum: ["DRAFT", "ISSUED"] })
    .notNull()
    .default("DRAFT"),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** APBF Layer 2 live progress stages within a delivery phase. */
export const phaseProgress = pgTable("esti_phase_progress", {
  id: id(),
  phaseId: uuid("phase_id")
    .notNull()
    .references(() => phases.id, { onDelete: "cascade" }),
  liveStageCode: text("live_stage_code").notNull(),
  label: text("label").notNull(),
  status: text("status", {
    enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETE"],
  })
    .notNull()
    .default("NOT_STARTED"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const runningBills = pgTable("esti_running_bill", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  contractorId: uuid("contractor_id").references(() => contractors.id, { onDelete: "set null" }),
  /** Work package this bill measures against (Estimation OS Phase 4). */
  workPackageId: uuid("work_package_id").references(() => workPackages.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  /** Bill type (Construction Cost OS Phase C): RA / FINAL / EXTRA_ITEM /
   * VARIATION / ADVANCE_RECOVERY / RETENTION_RELEASE. */
  billType: text("bill_type").notNull().default("RA"),
  status: text("status").notNull().default("MEASURED"),
  measurementDate: date("measurement_date"),
  notes: text("notes"),
  /** Gross = Σ(qty × rate) across the bill's items. */
  totalPaise: bigint("total_paise", { mode: "number" }).notNull().default(0),
  // Deduction block (Phase C) → net payable = gross − Σ(deductions).
  retentionPaise: bigint("retention_paise", { mode: "number" }).notNull().default(0),
  advanceRecoveryPaise: bigint("advance_recovery_paise", { mode: "number" }).notNull().default(0),
  taxTdsPaise: bigint("tax_tds_paise", { mode: "number" }).notNull().default(0),
  otherRecoveryPaise: bigint("other_recovery_paise", { mode: "number" }).notNull().default(0),
  netPayablePaise: bigint("net_payable_paise", { mode: "number" }).notNull().default(0),
  statusHistory: jsonb("status_history").notNull().default([]),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const runningBillItems = pgTable("esti_running_bill_item", {
  id: id(),
  runningBillId: uuid("running_bill_id")
    .notNull()
    .references(() => runningBills.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  qty: doublePrecision("qty").notNull().default(0),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  // Estimation OS Phase 4 — measurement-record links + cumulative tracking.
  // Nullable: free-text lines leave these unset. FKs to the cross-module
  // estimate/component tables are added in the migration (avoids a cycle).
  workPackageItemId: uuid("work_package_item_id").references(() => workPackageItems.id, {
    onDelete: "set null",
  }),
  boqItemId: uuid("boq_item_id"),
  componentId: uuid("component_id"),
  /** Approved measurement record this line was billed from (Phase C, plain uuid;
   * FK added in the migration). Free-text lines leave it unset. */
  measurementRecordId: uuid("measurement_record_id"),
  previousBilledQty: doublePrecision("previous_billed_qty").notNull().default(0),
  cumulativeBilledQty: doublePrecision("cumulative_billed_qty").notNull().default(0),
  balanceQty: doublePrecision("balance_qty").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/**
 * Estimation OS Phase 4 — work packages group approved (frozen) BOQ items into
 * contractor packages; running bills then measure against package items with
 * double-billing prevention. `estimate_id` / `estimate_version_id` /
 * `boq_item_id` / `component_id` are plain uuids here (FK constraints added in
 * the migration) to avoid a schema-module import cycle.
 */
export const workPackages = pgTable("esti_work_package", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  estimateId: uuid("estimate_id").notNull(),
  estimateVersionId: uuid("estimate_version_id"),
  // Tender this package was awarded from (Construction Cost OS Phase B). Plain
  // uuid — FK added in the migration to avoid a schema-module import cycle.
  tenderId: uuid("tender_id"),
  contractorId: uuid("contractor_id").references(() => contractors.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  packageType: text("package_type").notNull().default("CIVIL"),
  status: text("status").notNull().default("DRAFT"),
  contractValuePaise: bigint("contract_value_paise", { mode: "number" }).notNull().default(0),
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const workPackageItems = pgTable("esti_work_package_item", {
  id: id(),
  workPackageId: uuid("work_package_id")
    .notNull()
    .references(() => workPackages.id, { onDelete: "cascade" }),
  boqItemId: uuid("boq_item_id"),
  componentId: uuid("component_id"),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  approvedQty: doublePrecision("approved_qty").notNull().default(0),
  variationQty: doublePrecision("variation_qty").notNull().default(0),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/**
 * Construction Cost OS Phase C — site Measurement Book. A measurement is taken
 * against a work-package BOQ line (location/floor/zone + photo evidence +
 * measured-by/checked-by), approved, then billed. The double-billing guard runs
 * at approval time, so approved measurement records — not raw bill lines — are
 * the unit of billable balance. `boq_item_id` / `component_id` / `running_bill_id`
 * are plain uuids (ledger keys / cross-state stamp; FKs added in the migration).
 */
export const measurementRecords = pgTable("esti_measurement_record", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  workPackageId: uuid("work_package_id")
    .notNull()
    .references(() => workPackages.id, { onDelete: "cascade" }),
  workPackageItemId: uuid("work_package_item_id").references(() => workPackageItems.id, {
    onDelete: "set null",
  }),
  boqItemId: uuid("boq_item_id"),
  componentId: uuid("component_id"),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  qty: doublePrecision("qty").notNull().default(0),
  location: text("location"),
  floor: text("floor"),
  zone: text("zone"),
  /** Object-storage key for photo evidence (capture/upload UI is a later pass). */
  photoKey: text("photo_key"),
  measuredById: uuid("measured_by_id").references(() => users.id, { onDelete: "set null" }),
  measuredByName: text("measured_by_name"),
  checkedById: uuid("checked_by_id").references(() => users.id, { onDelete: "set null" }),
  checkedByName: text("checked_by_name"),
  status: text("status").notNull().default("MEASURED"),
  approvedById: uuid("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  /** Running bill this record was billed into (stamped on APPROVED→BILLED). */
  runningBillId: uuid("running_bill_id"),
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Construction Cost OS Phase D — controls layer.
 *
 * A deviation makes scope/rate drift against the contract visible and governed
 * (QTY: executed vs BOQ; RATE: a proposed revised rate vs the awarded rate). It
 * is a document-and-approve record only — approving a RATE deviation never
 * overwrites the work-package rate (Rule 5). `boq_item_id` / `variation_id` are
 * plain uuids (ledger key / cross-table stamp).
 */
export const deviations = pgTable("esti_deviation", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  workPackageId: uuid("work_package_id")
    .notNull()
    .references(() => workPackages.id, { onDelete: "cascade" }),
  workPackageItemId: uuid("work_package_item_id").references(() => workPackageItems.id, {
    onDelete: "set null",
  }),
  boqItemId: uuid("boq_item_id"),
  deviationType: text("deviation_type").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  // QTY deviation fields.
  boqQty: doublePrecision("boq_qty").notNull().default(0),
  executedQty: doublePrecision("executed_qty").notNull().default(0),
  deviationQty: doublePrecision("deviation_qty").notNull().default(0),
  deviationPct: doublePrecision("deviation_pct").notNull().default(0),
  // RATE deviation fields (paise). The contract rate is never overwritten.
  estimatedRatePaise: bigint("estimated_rate_paise", { mode: "number" }).notNull().default(0),
  tenderedRatePaise: bigint("tendered_rate_paise", { mode: "number" }).notNull().default(0),
  awardedRatePaise: bigint("awarded_rate_paise", { mode: "number" }).notNull().default(0),
  revisedRatePaise: bigint("revised_rate_paise", { mode: "number" }).notNull().default(0),
  /** Signed cost impact of the deviation. */
  costImpactPaise: bigint("cost_impact_paise", { mode: "number" }).notNull().default(0),
  reason: text("reason"),
  reasonSource: text("reason_source").notNull().default("OTHER"),
  status: text("status").notNull().default("OPEN"),
  /** Set when this deviation has been rolled into a variation order. */
  variationId: uuid("variation_id"),
  approvedById: uuid("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * A variation order (the "addition") — the only thing that legitimately changes
 * the billable ledger, and only after a two-step internal + client sign-off. On
 * APPLY, each line either adds qty to an existing package line
 * (`workPackageItems.variationQty`) or inserts a new ledger-keyed extra item, so
 * the existing bill guard immediately makes the extra scope billable.
 */
export const variations = pgTable("esti_variation", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  workPackageId: uuid("work_package_id").references(() => workPackages.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  reason: text("reason"),
  originator: text("originator").notNull().default("CLIENT"),
  /** Optional links to a drawing + revision that prompted the variation. */
  linkedDrawingId: uuid("linked_drawing_id"),
  linkedDrawingRevisionId: uuid("linked_drawing_revision_id"),
  /** Signed Σ of the variation's line amounts, stamped on apply. */
  costImpactPaise: bigint("cost_impact_paise", { mode: "number" }).notNull().default(0),
  timeImpactDays: integer("time_impact_days").notNull().default(0),
  billable: boolean("billable").notNull().default(true),
  status: text("status").notNull().default("DRAFT"),
  internalApprovedById: uuid("internal_approved_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  internalApprovedAt: timestamp("internal_approved_at", { withTimezone: true }),
  clientApprovedByName: text("client_approved_by_name"),
  clientApprovedById: uuid("client_approved_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  clientApprovedAt: timestamp("client_approved_at", { withTimezone: true }),
  appliedById: uuid("applied_by_id").references(() => users.id, { onDelete: "set null" }),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const variationItems = pgTable("esti_variation_item", {
  id: id(),
  variationId: uuid("variation_id")
    .notNull()
    .references(() => variations.id, { onDelete: "cascade" }),
  /** Existing package line this addition adjusts; set on apply for extra items. */
  workPackageItemId: uuid("work_package_item_id").references(() => workPackageItems.id, {
    onDelete: "set null",
  }),
  /** Ledger key — existing line's BOQ item, or this row's own id for extra items. */
  boqItemId: uuid("boq_item_id"),
  isExtraItem: boolean("is_extra_item").notNull().default(false),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  /** Signed — negative for an omission. */
  qty: doublePrecision("qty").notNull().default(0),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/**
 * Construction Cost OS Phase E — steel reconciliation. Per diameter, it compares
 * the steel SCHEDULED (auto-seeded from the linked BBS) against the steel ISSUED
 * (store → site) and CONSUMED (measured / placed); the gap is wastage. A two-state
 * record (DRAFT → FINALIZED); FINALIZED locks editing and is gated by
 * `cost:approve`. `work_package_id` / `bbs_id` are plain uuids (FKs added in the
 * migration to avoid a schema-module import cycle). Quantities are kilograms.
 */
export const steelReconciliations = pgTable("esti_steel_reconciliation", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  workPackageId: uuid("work_package_id"),
  bbsId: uuid("bbs_id"),
  title: text("title").notNull(),
  status: text("status").notNull().default("DRAFT"),
  notes: text("notes"),
  /** Stamped totals (Σ of line columns) refreshed on every line change. */
  scheduledKg: doublePrecision("scheduled_kg").notNull().default(0),
  issuedKg: doublePrecision("issued_kg").notNull().default(0),
  consumedKg: doublePrecision("consumed_kg").notNull().default(0),
  wastageKg: doublePrecision("wastage_kg").notNull().default(0),
  finalizedById: uuid("finalized_by_id").references(() => users.id, { onDelete: "set null" }),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const steelReconciliationItems = pgTable("esti_steel_reconciliation_item", {
  id: id(),
  reconciliationId: uuid("reconciliation_id")
    .notNull()
    .references(() => steelReconciliations.id, { onDelete: "cascade" }),
  diaMm: integer("dia_mm").notNull(),
  scheduledKg: doublePrecision("scheduled_kg").notNull().default(0),
  issuedKg: doublePrecision("issued_kg").notNull().default(0),
  consumedKg: doublePrecision("consumed_kg").notNull().default(0),
  /** Stored: issued − consumed. */
  wastageKg: doublePrecision("wastage_kg").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/**
 * Construction Cost OS Phase F — final account + closure. The closing statement
 * for one work package: its financial position is rolled up from the spine (WP
 * items → original + variation value; the package's running bills → gross billed,
 * deduction block, net paid) and the office enters the closing adjustments (final
 * certified, retention released) + attests closure (no-claim cert, client final
 * approval). Two-state DRAFT → CLOSED; closing is gated by `cost:approve`, sets
 * the parent work package to CLOSED, and is refused while any deviation/variation
 * is still open (Rule 6). A summary statement — line detail lives in the running
 * bills + work-package items, so there is no item table. Money is integer paise.
 */
export const finalAccounts = pgTable("esti_final_account", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  workPackageId: uuid("work_package_id").references(() => workPackages.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("DRAFT"),
  notes: text("notes"),
  // Snapshot financials (paise), re-stamped on update + close.
  originalContractPaise: bigint("original_contract_paise", { mode: "number" }).notNull().default(0),
  variationPaise: bigint("variation_paise", { mode: "number" }).notNull().default(0),
  grossBilledPaise: bigint("gross_billed_paise", { mode: "number" }).notNull().default(0),
  retentionHeldPaise: bigint("retention_held_paise", { mode: "number" }).notNull().default(0),
  retentionReleasedPaise: bigint("retention_released_paise", { mode: "number" }).notNull().default(0),
  advanceRecoveredPaise: bigint("advance_recovered_paise", { mode: "number" }).notNull().default(0),
  taxTdsPaise: bigint("tax_tds_paise", { mode: "number" }).notNull().default(0),
  otherRecoveryPaise: bigint("other_recovery_paise", { mode: "number" }).notNull().default(0),
  netPaidPaise: bigint("net_paid_paise", { mode: "number" }).notNull().default(0),
  finalCertifiedPaise: bigint("final_certified_paise", { mode: "number" }).notNull().default(0),
  balanceDuePaise: bigint("balance_due_paise", { mode: "number" }).notNull().default(0),
  // Manual closure attestations.
  noClaimReceived: boolean("no_claim_received").notNull().default(false),
  clientFinalApproval: boolean("client_final_approval").notNull().default(false),
  /** Closure-time snapshot of the evaluated checklist items. */
  checklist: jsonb("checklist").notNull().default([]),
  closedById: uuid("closed_by_id").references(() => users.id, { onDelete: "set null" }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Construction Cost OS — project-level cost-report PDF. One row per project
 * (unique project_id), upserted on each "Generate PDF". The backend computes the
 * cost-health dashboard once and stores the whole result in `snapshot`, so the
 * worker renders the PDF straight from the snapshot — an exact, reproducible
 * print of what was on screen at `generatedAt`, with no read-model SQL duplicated
 * in Python. Carries the async pdf_status / pdf_key slot the render pipeline
 * patches (PENDING → PROCESSING → READY/FAILED).
 */
export const costReports = pgTable("esti_cost_report", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  snapshot: jsonb("snapshot").notNull().default({}),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
