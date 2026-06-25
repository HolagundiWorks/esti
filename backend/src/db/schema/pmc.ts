import { contractors } from "./delivery.js";
import { users } from "./org-auth.js";
import { phases, projectOffices } from "./project.js";
import {
  bigint,
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
