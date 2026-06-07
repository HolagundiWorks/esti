/**
 * ESTI AORMS schema (PostgreSQL). Single firm, single tenant — no tenant column.
 * Money columns are bigint paise. See docs/esti/ARCHITECTURE.md.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
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

export const users = pgTable("esti_user", {
  id: id(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["OWNER", "CONSULTANT", "CLIENT"] }).notNull().default("CONSULTANT"),
  passwordHash: text("password_hash"), // null for magic-link-only client users
  totpSecret: text("totp_secret"),
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
  jurisdiction: text("jurisdiction").notNull().default("OTHER"),
  status: text("status").notNull().default("ENQUIRY"),
  clientId: uuid("client_id").references(() => clients.id),
  state: text("state"),
  district: text("district"),
  city: text("city"),
  pin: text("pin"),
  contractValuePaise: bigint("contract_value_paise", { mode: "number" }).notNull().default(0),
  dateStart: date("date_start"),
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
  errorText: text("error_text"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
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
