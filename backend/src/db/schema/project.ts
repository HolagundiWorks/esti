import { clients, users } from "./org-auth.js";
import {
  bigint,
  boolean,
  createdAt,
  date,
  doublePrecision,
  id,
  integer,
  pgTable,
  text,
  timestamp,
  updatedAt,
  uuid,
} from "./_helpers.js";
import { specCatalogItems } from "./spec-catalog.js";

export const projectOffices = pgTable("esti_projectoffice", {
  id: id(),
  ref: text("ref").notNull().unique(),
  title: text("title").notNull(),
  projectType: text("project_type").notNull(),
  workType: text("work_type", {
    enum: ["ARCHITECTURE", "INTERIOR", "LANDSCAPE", "MISC"],
  })
    .notNull()
    .default("ARCHITECTURE"),
  jurisdiction: text("jurisdiction").notNull().default("OTHER"),
  status: text("status").notNull().default("ENQUIRY"),
  clientId: uuid("client_id").references(() => clients.id),
  state: text("state"),
  district: text("district"),
  city: text("city"),
  pin: text("pin"),
  siteAddress: text("site_address"),
  siteAreaSqm: doublePrecision("site_area_sqm"),
  contractValuePaise: bigint("contract_value_paise", { mode: "number" })
    .notNull()
    .default(0),
  dateStart: date("date_start"),
  createdById: uuid("created_by_id"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedById: uuid("archived_by_id").references(() => users.id),
  /** The phase currently in progress; previous phases are considered complete. */
  currentPhaseId: uuid("current_phase_id"),
  /** When true (and firm PMC on), project shows PMC tab and site-admin features. */
  pmcEnabled: boolean("pmc_enabled").notNull().default(false),
  // Project OS pipeline links (Slice G). Plain uuids — FKs added by migration to
  // avoid a circular table dependency with the project-os schema module.
  leadId: uuid("lead_id"),
  dnaId: uuid("dna_id"),
  assessmentId: uuid("assessment_id"),
  /** Retention deadline: project may be purged on or after this date. */
  purgeAfter: date("purge_after"),
  /** Set when the project data has been scheduled for deletion. */
  purgedAt: timestamp("purged_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const phases = pgTable("esti_phase", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  code: text("code").notNull(),
  label: text("label").notNull(),
  billingPct: integer("billing_pct").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  /** Number of revisions included in the contract fee for this phase. */
  revisionBudget: integer("revision_budget"),
  createdAt: createdAt(),
});

/** Office correspondence — a letter rendered to a branded PDF. */
export const letters = pgTable("esti_letter", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id").references(() => projectOffices.id),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  dateLetter: date("date_letter"),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Contract / agreement register (clients, consultants, vendors). */
export const contracts = pgTable("esti_contract", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id").references(() => projectOffices.id),
  title: text("title").notNull(),
  party: text("party").notNull(),
  contractType: text("contract_type").notNull().default("CLIENT"),
  valuePaise: bigint("value_paise", { mode: "number" }).notNull().default(0),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status").notNull().default("DRAFT"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});


/** Site inspection report — rendered to PDF. */
export const inspections = pgTable("esti_inspection", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  dateVisit: date("date_visit"),
  weather: text("weather"),
  attendees: text("attendees"),
  progress: text("progress"),
  observations: text("observations"),
  instructions: text("instructions"),
  nextVisit: date("next_visit"),
  inspectorName: text("inspector_name"),
  status: text("status").notNull().default("DRAFT"),
  versionNo: integer("version_no").notNull().default(1),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  // Approval workflow (Slice C / §9 site supervisor portal)
  // status lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED → ISSUED
  submittedById: uuid("submitted_by_id"),
  approvedById: uuid("approved_by_id"),
  rejectionNote: text("rejection_note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const inspectionPhotos = pgTable("esti_inspection_photo", {
  id: id(),
  inspectionId: uuid("inspection_id")
    .notNull()
    .references(() => inspections.id),
  storageKey: text("storage_key").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const inspectionActions = pgTable("esti_inspection_action", {
  id: id(),
  inspectionId: uuid("inspection_id")
    .notNull()
    .references(() => inspections.id),
  description: text("description").notNull(),
  status: text("status").notNull().default("OPEN"),
  assigneeName: text("assignee_name"),
  dueDate: date("due_date"),
  taskId: uuid("task_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/** Material specification sheet — structured rows, rendered to PDF. */
export const specSheets = pgTable("esti_specsheet", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
  versionNo: integer("version_no").notNull().default(1),
  status: text("status").notNull().default("DRAFT"),
  revisionNote: text("revision_note"),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const specItems = pgTable("esti_specitem", {
  id: id(),
  specSheetId: uuid("spec_sheet_id")
    .notNull()
    .references(() => specSheets.id),
  catalogItemId: uuid("catalog_item_id").references(() => specCatalogItems.id),
  category: text("category"),
  item: text("item").notNull(),
  make: text("make"),
  specification: text("specification"),
  finish: text("finish"),
  remarks: text("remarks"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Project decision register with CRIF state machine. */
export const decisions = pgTable("esti_decision", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
  rationale: text("rationale").notNull(),
  /** Legacy approval field — kept for backwards compat; use `state` going forward. */
  approval: text("approval").notNull().default("PENDING"),
  impact: text("impact").notNull().default("LOW"),
  linkedObjectType: text("linked_object_type"),
  linkedObjectId: text("linked_object_id"),
  /** Legacy status field — kept for backwards compat; use `state` going forward. */
  status: text("status").notNull().default("OPEN"),
  /** CRIF state: DRAFT | OPEN | CLIENT_REVIEW | ACCEPTED | REJECTED | LOCKED */
  state: text("state").notNull().default("OPEN"),
  /** Revision impact category: MINOR | MAJOR | CRITICAL */
  revisionCategory: text("revision_category"),
  /** Revision source: CLIENT_DRIVEN | INTERNAL_ERROR | TECHNICAL_QUERY | SCOPE_CHANGE */
  revisionSource: text("revision_source"),
  /** Program Formulation — the frozen program version this revision is measured against. */
  programVersionId: uuid("program_version_id"),
  ownerId: uuid("owner_id").references(() => users.id),
  ownerName: text("owner_name"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  reviewDeadline: date("review_deadline"),
  actorId: uuid("actor_id").references(() => users.id),
  actorName: text("actor_name"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Project-critical notes that drive follow-up and change control. */
export const criticalNotes = pgTable("esti_critical_note", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull().default("MEDIUM"),
  status: text("status").notNull().default("OPEN"),
  visibility: text("visibility").notNull().default("STAFF"),
  owner: text("owner"),
  dueDate: date("due_date"),
  body: text("body"),
  actorId: uuid("actor_id").references(() => users.id),
  actorName: text("actor_name"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Fee proposals — COA scale benchmark + below-minimum compliance snapshot. */
/**
 * Unified project Proposal (COA fee proposal + scope/agreement). Single model —
 * the former `esti_proposal` (thin scope doc) was merged in and dropped (migration
 * 0116); this table was renamed esti_feeproposal → esti_proposal. Rendered to PDF.
 */
export const proposals = pgTable("esti_proposal", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  status: text("status").notNull().default("DRAFT"),
  revisionNo: integer("revision_no").notNull().default(0),
  workCategory: text("work_category").notNull(),
  workType: text("work_type").notNull().default("ARCHITECTURE"),
  // How the fee was derived: COA_PERCENT | PER_SQM | LUMPSUM (see FeeBasis).
  feeBasis: text("fee_basis").notNull().default("COA_PERCENT"),
  costOfWorksPaise: bigint("cost_of_works_paise", { mode: "number" })
    .notNull()
    .default(0),
  feePaise: bigint("fee_paise", { mode: "number" }).notNull().default(0),
  // Per-sq.m fee inputs (used only when feeBasis = PER_SQM).
  builtUpAreaSqm: doublePrecision("built_up_area_sqm"),
  ratePerSqmPaise: bigint("rate_per_sqm_paise", { mode: "number" }),
  docCommPct: integer("doc_comm_pct").notNull().default(10),
  coaMinimumPaise: bigint("coa_minimum_paise", { mode: "number" })
    .notNull()
    .default(0),
  belowMinimum: boolean("below_minimum").notNull().default(false),
  overrideReason: text("override_reason"),
  scope: text("scope"),
  notes: text("notes"),
  // Project OS — Client Approval Gate (Slice I).
  clientApprovalStatus: text("client_approval_status").notNull().default("PENDING"),
  clientApprovedAt: timestamp("client_approved_at", { withTimezone: true }),
  approvalNotes: text("approval_notes"),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Statutory permits / approvals tracked per project, with due dates. */
export const permits = pgTable("esti_permit", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  permitType: text("permit_type").notNull(),
  authority: text("authority").notNull(),
  applicationNo: text("application_no"),
  status: text("status").notNull().default("NOT_STARTED"),
  dateSubmitted: date("date_submitted"),
  dateDue: date("date_due"),
  dateApproved: date("date_approved"),
  portalUrl: text("portal_url"),
  remarks: text("remarks"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Client communication timeline — dated interactions per project. */
export const clientLogs = pgTable("esti_clientlog", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  clientId: uuid("client_id").references(() => clients.id),
  kind: text("kind").notNull(),
  occurredAt: date("occurred_at").notNull(),
  subject: text("subject").notNull(),
  body: text("body"),
  followUpDate: date("follow_up_date"),
  // Project OS — Client Discussion Layer (Slice F). Post-feasibility outcome.
  outcome: text("outcome"),
  budgetObjections: text("budget_objections"),
  architectComments: text("architect_comments"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
});

/** Planned site visits — contractor + supervisor must confirm; auto-cancel if past deadline. */
export const siteVisits = pgTable("esti_site_visit", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => projectOffices.id),
  plannedDate: date("planned_date").notNull(),
  supervisorUserId: uuid("supervisor_user_id").references(() => users.id),
  contractorId: uuid("contractor_id"),
  supervisorConfirmedAt: timestamp("supervisor_confirmed_at", { withTimezone: true }),
  contractorConfirmedAt: timestamp("contractor_confirmed_at", { withTimezone: true }),
  status: text("status").notNull().default("PLANNED"),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  autoCancelAfter: date("auto_cancel_after"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type ProjectOfficeRow = typeof projectOffices.$inferSelect;
