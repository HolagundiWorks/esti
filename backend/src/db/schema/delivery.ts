import { users } from "./org-auth.js";
import { projectOffices } from "./project.js";
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

/**
 * Contractor register (Phase 7) — construction contractors invited to tenders
 * and tracked on site. Trade category, statutory ids, and a simple performance
 * record (quality / timeliness / safety, 1–5).
 */
export const contractors = pgTable("esti_contractor", {
  id: id(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  companyName: text("company_name"),
  contactPerson: text("contact_person"),
  gstin: text("gstin"),
  pan: text("pan"),
  email: text("email"),
  phone: text("phone"),
  city: text("city"),
  state: text("state"),
  active: boolean("active").notNull().default(true),
  qualityRating: integer("quality_rating"),
  timelinessRating: integer("timeliness_rating"),
  safetyRating: integer("safety_rating"),
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Tender package raised on a project for a trade scope (Phase 7). */
export const tenders = pgTable("esti_tender", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
  category: text("category"),
  scope: text("scope"),
  status: text("status").notNull().default("DRAFT"), // DRAFT | OPEN | CLOSED | AWARDED | CANCELLED
  dueDate: date("due_date"),
  instructions: text("instructions"),
  awardedContractorId: uuid("awarded_contractor_id").references(() => contractors.id),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** A contractor invited to a tender; accessToken isolates the contractor portal. */
export const tenderInvitations = pgTable("esti_tender_invitation", {
  id: id(),
  tenderId: uuid("tender_id")
    .notNull()
    .references(() => tenders.id),
  contractorId: uuid("contractor_id")
    .notNull()
    .references(() => contractors.id),
  status: text("status").notNull().default("INVITED"), // INVITED | VIEWED | SUBMITTED | DECLINED | WITHDRAWN
  accessToken: text("access_token").notNull(),
  invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow().notNull(),
});

/** A contractor's sealed bid against a tender invitation (one per invitation). */
export const tenderBids = pgTable("esti_tender_bid", {
  id: id(),
  invitationId: uuid("invitation_id")
    .notNull()
    .references(() => tenderInvitations.id),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  completionWeeks: integer("completion_weeks"),
  technicalScore: integer("technical_score"), // 0–100, optional
  notes: text("notes"),
  submittedById: uuid("submitted_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Controlled tender document or addendum (Phase 7). */
export const tenderDocuments = pgTable("esti_tender_document", {
  id: id(),
  tenderId: uuid("tender_id")
    .notNull()
    .references(() => tenders.id),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("OTHER"),
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key").notNull(),
  addendumNo: integer("addendum_no"),
  issuedAt: date("issued_at"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
});

/** Contractor acknowledgement of an addendum before bidding. */
export const tenderDocumentAcks = pgTable("esti_tender_document_ack", {
  id: id(),
  invitationId: uuid("invitation_id")
    .notNull()
    .references(() => tenderInvitations.id),
  documentId: uuid("document_id")
    .notNull()
    .references(() => tenderDocuments.id),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Contractor construction coordination item (RFI, submittal, NCR, etc.). */
export const contractorSubmissions = pgTable("esti_contractor_submission", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  contractorId: uuid("contractor_id")
    .notNull()
    .references(() => contractors.id),
  kind: text("kind").notNull(),
  subject: text("subject").notNull(),
  body: text("body"),
  status: text("status").notNull().default("OPEN"),
  responseNote: text("response_note"),
  storageKey: text("storage_key"),
  fileName: text("file_name"),
  submittedById: uuid("submitted_by_id").references(() => users.id),
  reviewCode: text("review_code"),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
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
  elementTypeId: text("element_type_id"),
  elementCategory: text("element_category"),
  heightMm: integer("height_mm"),
  itemCount: integer("item_count").notNull().default(1),
  boqQty: doublePrecision("boq_qty"),
  boqUnit: text("boq_unit"),
  boqDescription: text("boq_description"),
  /** Origin client — legacy web rows use WEB; ESTICAD rows use ESTICAD. */
  source: text("source").notNull().default("WEB"),
  /** Points, polylines, polygons in drawing world units (ESTICAD). */
  worldGeometry: jsonb("world_geometry"),
  /** Stable ESTICAD entity IDs tied to the measurement. */
  entityRefs: jsonb("entity_refs"),
  scaleWorldUnits: text("scale_world_units"),
  createdByClient: text("created_by_client"),
  createdAt: createdAt(),
});
