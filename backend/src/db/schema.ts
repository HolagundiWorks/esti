/**
 * ESTI AORMS schema (PostgreSQL). Single firm, single tenant — no tenant column.
 * Money columns are bigint paise. See docs/esti/ARCHITECTURE.md.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`);

/** Single-row org settings — feature toggles (e.g. the optional HR module). */
export const orgSettings = pgTable("esti_orgsettings", {
  id: id(),
  hrEnabled: boolean("hr_enabled").notNull().default(false),
  // Module-group switches (default on) controlling whole nav areas.
  financialEnabled: boolean("financial_enabled").notNull().default(true),
  projectEnabled: boolean("project_enabled").notNull().default(true),
  adminEnabled: boolean("admin_enabled").notNull().default(true),
  updatedAt: updatedAt(),
});

/** Single-row editable firm profile (ADR-12). Solo architect details inline. */
export const firm = pgTable("esti_firm", {
  id: id(),
  companyName: text("company_name").notNull().default("Holagundi Consulting Works"),
  firmType: text("firm_type").notNull().default("SOLO"),
  logoKey: text("logo_key"),
  gstType: text("gst_type").notNull().default("REGULAR"),
  gstin: text("gstin"),
  tdsApplicableDefault: boolean("tds_applicable_default").notNull().default(true),
  architectName: text("architect_name"),
  coaRegNo: text("coa_reg_no"),
  pan: text("pan"),
  email: text("email"),
  phone1Type: text("phone1_type"),
  phone1: text("phone1"),
  phone2Type: text("phone2_type"),
  phone2: text("phone2"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  pincode: text("pincode"),
  district: text("district"),
  state: text("state"),
  updatedAt: updatedAt(),
});

/** Partners in a partnership firm (includes DIN). */
export const partners = pgTable("esti_partner", {
  id: id(),
  name: text("name").notNull(),
  coaRegNo: text("coa_reg_no"),
  pan: text("pan"),
  din: text("din"),
  email: text("email"),
  phone1Type: text("phone1_type"),
  phone1: text("phone1"),
  phone2Type: text("phone2_type"),
  phone2: text("phone2"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  pincode: text("pincode"),
  district: text("district"),
  state: text("state"),
  createdAt: createdAt(),
});

export const users = pgTable("esti_user", {
  id: id(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role", {
    enum: ["OWNER", "PARTNER", "SENIOR", "ASSOCIATE", "VIEWER", "CONSULTANT", "CLIENT"],
  })
    .notNull()
    .default("ASSOCIATE"),
  passwordHash: text("password_hash"), // null for magic-link-only client users
  totpSecret: text("totp_secret"),
  disabled: boolean("disabled").notNull().default(false),
  // Portal users (role CLIENT) are scoped to a single client record.
  clientId: uuid("client_id"),
  // Collaborator users (role CONSULTANT + this set) are scoped to a consultant.
  consultantId: uuid("consultant_id"),
  // Per-user dashboard layout (react-grid-layout items); null = default layout.
  dashboardLayout: jsonb("dashboard_layout"),
  // Read-mostly demo accounts: blocked from uploads and credential changes.
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
});

export const sessions = pgTable("esti_session", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const clients = pgTable("esti_client", {
  id: id(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["INDIVIDUAL", "COMPANY"] }).notNull().default("INDIVIDUAL"),
  gstin: text("gstin"),
  pan: text("pan"),
  state: text("state"),
  city: text("city"),
  email: text("email"),
  phone: text("phone"),
  createdAt: createdAt(),
});

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
  contractValuePaise: bigint("contract_value_paise", { mode: "number" }).notNull().default(0),
  dateStart: date("date_start"),
  createdById: uuid("created_by_id"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedById: uuid("archived_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
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

/** Project proposal / agreement (COA scope template) — rendered to PDF. */
export const proposals = pgTable("esti_proposal", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  workType: text("work_type").notNull().default("ARCHITECTURE"),
  scope: text("scope"),
  feePaise: bigint("fee_paise", { mode: "number" }).notNull().default(0),
  notes: text("notes"),
  status: text("status").notNull().default("DRAFT"),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
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
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Material specification sheet — structured rows, rendered to PDF. */
export const specSheets = pgTable("esti_specsheet", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
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
  category: text("category"),
  item: text("item").notNull(),
  make: text("make"),
  specification: text("specification"),
  finish: text("finish"),
  remarks: text("remarks"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Mood board — a captioned collection of uploaded reference images. */
export const moodBoards = pgTable("esti_moodboard", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
  createdAt: createdAt(),
});

export const moodImages = pgTable("esti_moodimage", {
  id: id(),
  moodBoardId: uuid("mood_board_id")
    .notNull()
    .references(() => moodBoards.id),
  storageKey: text("storage_key").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/** Purchase orders (simple quantity × rate procurement, per project). */
export const purchaseOrders = pgTable("esti_purchaseorder", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  vendor: text("vendor"),
  title: text("title"),
  status: text("status").notNull().default("DRAFT"),
  datePo: date("date_po"),
  notes: text("notes"),
  totalPaise: bigint("total_paise", { mode: "number" }).notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Purchase-order line item — quantity × rate = amount. */
export const poItems = pgTable("esti_po_item", {
  id: id(),
  poId: uuid("po_id")
    .notNull()
    .references(() => purchaseOrders.id),
  description: text("description").notNull(),
  unit: text("unit"),
  qty: doublePrecision("qty").notNull().default(0),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Internal project activity / audit notes (distinct from the client log). */
export const projectLogs = pgTable("esti_projectlog", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  note: text("note").notNull(),
  authorId: uuid("author_id"),
  authorName: text("author_name"),
  createdAt: createdAt(),
});

/** Immutable activity stream for project timelines and the office Activity Center. */
export const activities = pgTable("esti_activity", {
  id: id(),
  projectId: uuid("project_id").references(() => projectOffices.id),
  objectType: text("object_type").notNull(),
  objectId: text("object_id"),
  eventType: text("event_type").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  actorName: text("actor_name"),
  visibility: text("visibility").notNull().default("STAFF"),
  summary: text("summary").notNull(),
  metadata: jsonb("metadata"),
  createdAt: createdAt(),
});

/** Reusable contextual comments attached to projects, tasks, and other work objects. */
export const comments = pgTable("esti_comment", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  objectType: text("object_type").notNull(),
  objectId: text("object_id").notNull(),
  body: text("body").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  actorName: text("actor_name"),
  visibility: text("visibility").notNull().default("STAFF"),
  createdAt: createdAt(),
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
  ownerId: uuid("owner_id").references(() => users.id),
  ownerName: text("owner_name"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  reviewDeadline: date("review_deadline"),
  actorId: uuid("actor_id").references(() => users.id),
  actorName: text("actor_name"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Per-project BBMP bylaw-calculator inputs + computed envelope (one per project). */
export const bylawCalcs = pgTable("esti_bylaw_calc", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projectOffices.id),
  input: jsonb("input").notNull(),
  result: jsonb("result").notNull(),
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
  status: text("status").notNull().default("NOT_STARTED"),
  datePlanned: date("date_planned"),
  dateActual: date("date_actual"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/** Fee proposals — COA scale benchmark + below-minimum compliance snapshot. */
export const feeProposals = pgTable("esti_feeproposal", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  status: text("status").notNull().default("DRAFT"),
  revisionNo: integer("revision_no").notNull().default(0),
  workCategory: text("work_category").notNull(),
  costOfWorksPaise: bigint("cost_of_works_paise", { mode: "number" }).notNull().default(0),
  feePaise: bigint("fee_paise", { mode: "number" }).notNull().default(0),
  docCommPct: integer("doc_comm_pct").notNull().default(10),
  coaMinimumPaise: bigint("coa_minimum_paise", { mode: "number" }).notNull().default(0),
  belowMinimum: boolean("below_minimum").notNull().default(false),
  overrideReason: text("override_reason"),
  scope: text("scope"),
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

/** Office staff register (optional HR module). */
export const teamMembers = pgTable("esti_teammember", {
  id: id(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  employmentType: text("employment_type").notNull(),
  email: text("email"),
  phone: text("phone"),
  monthlySalaryPaise: bigint("monthly_salary_paise", { mode: "number" }).notNull().default(0),
  dateJoined: date("date_joined"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/** Per-project staff assignment — includes the site in-charge. */
export const assignments = pgTable("esti_assignment", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  teamMemberId: uuid("team_member_id")
    .notNull()
    .references(() => teamMembers.id),
  role: text("role").notNull(),
  createdAt: createdAt(),
});

/** Staff leave records (optional HR module). */
export const leaves = pgTable("esti_leave", {
  id: id(),
  teamMemberId: uuid("team_member_id")
    .notNull()
    .references(() => teamMembers.id),
  type: text("type").notNull(),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  days: doublePrecision("days").notNull().default(0),
  reason: text("reason"),
  status: text("status").notNull().default("REQUESTED"),
  createdAt: createdAt(),
});

/** Monthly payslips (optional HR module). One per member per month. */
export const payslips = pgTable(
  "esti_payslip",
  {
    id: id(),
    teamMemberId: uuid("team_member_id")
      .notNull()
      .references(() => teamMembers.id),
    month: text("month").notNull(), // YYYY-MM
    grossPaise: bigint("gross_paise", { mode: "number" }).notNull().default(0),
    deductionsPaise: bigint("deductions_paise", { mode: "number" }).notNull().default(0),
    netPaise: bigint("net_paise", { mode: "number" }).notNull().default(0),
    paid: boolean("paid").notNull().default(false),
    paidDate: date("paid_date"),
    notes: text("notes"),
    pdfKey: text("pdf_key"),
    pdfStatus: text("pdf_status").notNull().default("NONE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({ uq: uniqueIndex("esti_payslip_member_month").on(t.teamMemberId, t.month) }),
);

/** Consultant directory — discipline specialists the office sub-engages. */
export const consultants = pgTable("esti_consultant", {
  id: id(),
  name: text("name").notNull(),
  discipline: text("discipline").notNull(),
  firm: text("firm"),
  email: text("email"),
  phone: text("phone"),
  createdAt: createdAt(),
});

/** Per-project consultant engagement — agreed fee, payments, balance, status. */
export const engagements = pgTable("esti_engagement", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  consultantId: uuid("consultant_id")
    .notNull()
    .references(() => consultants.id),
  scope: text("scope"),
  agreedFeePaise: bigint("agreed_fee_paise", { mode: "number" }).notNull().default(0),
  paidPaise: bigint("paid_paise", { mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("ENGAGED"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Drawing transmittals — a recorded issue of a drawing set, with a cover PDF. */
export const transmittals = pgTable("esti_transmittal", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  recipient: text("recipient").notNull(),
  purpose: text("purpose").notNull(),
  channel: text("channel").notNull(),
  dateIssued: date("date_issued"),
  notes: text("notes"),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdById: uuid("created_by_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const transmittalItems = pgTable("esti_transmittal_item", {
  id: id(),
  transmittalId: uuid("transmittal_id")
    .notNull()
    .references(() => transmittals.id),
  drawingId: uuid("drawing_id"),
  drawingRef: text("drawing_ref").notNull(),
  title: text("title").notNull(),
  rev: text("rev"),
  copies: integer("copies").notNull().default(1),
  createdAt: createdAt(),
});

/** Approval / issue log — what was sent for sign-off, status, supersede chain. */
export const approvals = pgTable("esti_approval", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  entityType: text("entity_type").notNull(),
  title: text("title").notNull(),
  recipient: text("recipient"),
  channel: text("channel").notNull(),
  status: text("status").notNull().default("DRAFT"),
  sentDate: date("sent_date"),
  responseDate: date("response_date"),
  remarks: text("remarks"),
  supersedesId: uuid("supersedes_id"),
  createdById: uuid("created_by_id").references(() => users.id),
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
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
});

/** Development-control (zoning/bylaw) compliance parameters per project. */
export const bylaws = pgTable("esti_bylaw", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  parameter: text("parameter").notNull(),
  unit: text("unit").notNull(),
  direction: text("direction").notNull(),
  permittedValue: doublePrecision("permitted_value"),
  proposedValue: doublePrecision("proposed_value"),
  clause: text("clause"),
  remarks: text("remarks"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Uploaded DXF drawings + automated worker takeoff (layers, bounds, counts). */
export const drawings = pgTable("esti_drawing", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  fileHash: text("file_hash").notNull(),
  storageKey: text("storage_key").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("PENDING"),
  svgKey: text("svg_key"),
  entityCount: integer("entity_count").notNull().default(0),
  layers: jsonb("layers"),
  bounds: jsonb("bounds"),
  // Viewer calibration: real units per SVG viewBox unit + the unit label.
  scaleUnitsPerVb: doublePrecision("scale_units_per_vb"),
  scaleUnit: text("scale_unit"),
  // Watermarked issue-set PDF (worker render target "drawing").
  issuePdfKey: text("issue_pdf_key"),
  issuePdfStatus: text("issue_pdf_status").notNull().default("NONE"),
  errorText: text("error_text"),
  // Version control: revisions of one drawing share rootId (the first
  // revision's id, or self when null); only the latest is isCurrent.
  revNo: integer("rev_no").notNull().default(1),
  rootId: uuid("root_id"),
  revisionNote: text("revision_note"),
  isCurrent: boolean("is_current").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Calibrated measurements taken on a drawing — the project's takeoff lines. */
export const measurements = pgTable("esti_measurement", {
  id: id(),
  drawingId: uuid("drawing_id")
    .notNull()
    .references(() => drawings.id),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  label: text("label").notNull(),
  kind: text("kind").notNull().default("LINEAR"),
  vbLength: doublePrecision("vb_length").notNull().default(0),
  realLength: doublePrecision("real_length").notNull().default(0),
  unit: text("unit").notNull(),
  createdAt: createdAt(),
});

/** Bank-statement reconciliation batches + matched/unmatched line results. */
export const reconciliations = pgTable("esti_reconcile", {
  id: id(),
  ref: text("ref").notNull().unique(),
  label: text("label").notNull(),
  fileName: text("file_name").notNull(),
  fileHash: text("file_hash").notNull(),
  storageKey: text("storage_key").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("PENDING"),
  rowCount: integer("row_count").notNull().default(0),
  matchedCount: integer("matched_count").notNull().default(0),
  unmatchedCount: integer("unmatched_count").notNull().default(0),
  totalCreditPaise: bigint("total_credit_paise", { mode: "number" }).notNull().default(0),
  matchedCreditPaise: bigint("matched_credit_paise", { mode: "number" }).notNull().default(0),
  lines: jsonb("lines"),
  errorText: text("error_text"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** India GST/TDS invoices — phase-linked; stores the computed tax snapshot. */
export const invoices = pgTable("esti_invoice", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  phaseId: uuid("phase_id").references(() => phases.id),
  clientId: uuid("client_id").references(() => clients.id),
  status: text("status").notNull().default("DRAFT"),
  gstSystem: text("gst_system").notNull(),
  documentKind: text("document_kind").notNull(),
  sac: text("sac"),
  interState: boolean("inter_state").notNull().default(false),
  tdsApplicable: boolean("tds_applicable").notNull().default(true),
  taxablePaise: bigint("taxable_paise", { mode: "number" }).notNull().default(0),
  cgstPaise: bigint("cgst_paise", { mode: "number" }).notNull().default(0),
  sgstPaise: bigint("sgst_paise", { mode: "number" }).notNull().default(0),
  igstPaise: bigint("igst_paise", { mode: "number" }).notNull().default(0),
  gstTotalPaise: bigint("gst_total_paise", { mode: "number" }).notNull().default(0),
  compositionLevyPaise: bigint("composition_levy_paise", { mode: "number" }).notNull().default(0),
  tdsPaise: bigint("tds_paise", { mode: "number" }).notNull().default(0),
  grandTotalPaise: bigint("grand_total_paise", { mode: "number" }).notNull().default(0),
  netReceivablePaise: bigint("net_receivable_paise", { mode: "number" }).notNull().default(0),
  dateInvoice: date("date_invoice"),
  notes: text("notes"),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Gap-free per-(scope, financial year) sequences. See ARCHITECTURE ADR-06. */
export const sequences = pgTable(
  "esti_sequence",
  {
    id: id(),
    scope: text("scope").notNull(),
    fy: text("fy").notNull(),
    lastValue: integer("last_value").notNull().default(0),
  },
  (t) => ({ uq: uniqueIndex("esti_sequence_scope_fy").on(t.scope, t.fy) }),
);

/** Versioned master DSR (Schedule of Rates) — Phase 10. */
export const dsrVersions = pgTable("esti_dsr_version", {
  id: id(),
  label: text("label").notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(false),
  createdAt: createdAt(),
});

export const dsrItems = pgTable("esti_dsr_item", {
  id: id(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => dsrVersions.id),
  code: text("code").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  createdAt: createdAt(),
});

/** Project estimate / BOQ — whole-estimate lead + per-item leads; approve -> BOQ. */
export const estimates = pgTable("esti_estimate", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
  dsrVersionId: uuid("dsr_version_id").references(() => dsrVersions.id),
  leadPct: doublePrecision("lead_pct").notNull().default(0),
  status: text("status").notNull().default("DRAFT"),
  subtotalPaise: bigint("subtotal_paise", { mode: "number" }).notNull().default(0),
  totalPaise: bigint("total_paise", { mode: "number" }).notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const estimateItems = pgTable("esti_estimate_item", {
  id: id(),
  estimateId: uuid("estimate_id")
    .notNull()
    .references(() => estimates.id),
  dsrItemId: uuid("dsr_item_id").references(() => dsrItems.id),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  qty: doublePrecision("qty").notNull().default(0),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  itemLeadPct: doublePrecision("item_lead_pct").notNull().default(0),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/** Bar Bending Schedule — Phase 10. */
export const bbsSchedules = pgTable("esti_bbs", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
  createdAt: createdAt(),
});

export const bbsItems = pgTable("esti_bbs_item", {
  id: id(),
  bbsId: uuid("bbs_id")
    .notNull()
    .references(() => bbsSchedules.id),
  barMark: text("bar_mark").notNull(),
  member: text("member"),
  diaMm: integer("dia_mm").notNull(),
  noOfMembers: integer("no_of_members").notNull().default(1),
  barsPerMember: integer("bars_per_member").notNull().default(1),
  cuttingLengthMm: doublePrecision("cutting_length_mm").notNull().default(0),
  weightKg: doublePrecision("weight_kg").notNull().default(0),
  createdAt: createdAt(),
});

/** Office / project tasks. */
export const tasks = pgTable("esti_task", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: uuid("project_id").references(() => projectOffices.id),
  assignee: text("assignee"),
  status: text("status").notNull().default("TODO"),
  priority: text("priority").notNull().default("MEDIUM"),
  dueDate: date("due_date"),
  createdById: uuid("created_by_id"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Append-only audit log. See ARCHITECTURE ADR-09. */
export const audit = pgTable("esti_audit", {
  id: id(),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id"),
  action: text("action").notNull(),
  actorId: uuid("actor_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: createdAt(),
});

export type ProjectOfficeRow = typeof projectOffices.$inferSelect;
