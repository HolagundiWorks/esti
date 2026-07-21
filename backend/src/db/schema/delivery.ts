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
  /** Human-readable portable ID, e.g. AORMS-X-7T2M (EX_USER / contractor). */
  publicId: text("public_id").unique(),
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
  /** Receiver acknowledgment (SOP §3) — one-way; stamped by staff or client portal. */
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgmentNote: text("acknowledgment_note"),
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
  // QC / peer-review checkpoint (SOP-07/08) — advisory: does not block issuePdf,
  // but every drawing shows whether it has been reviewed before it goes out.
  reviewStatus: text("review_status").notNull().default("PENDING_REVIEW"),
  reviewedById: uuid("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

