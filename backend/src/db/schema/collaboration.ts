import { clients, users } from "./org-auth.js";
import { projectOffices } from "./project.js";
import { drawings } from "./delivery.js";
import {
  bigint,
  boolean,
  createdAt,
  id,
  integer,
  pgTable,
  text,
  updatedAt,
  uuid,
} from "./_helpers.js";

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
  agreedFeePaise: bigint("agreed_fee_paise", { mode: "number" })
    .notNull()
    .default(0),
  paidPaise: bigint("paid_paise", { mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("ENGAGED"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Client-originated portal submissions — acknowledgements, change requests and
 * feedback raised from the read-only client portal. Object-scoped and audited;
 * the firm triages via `status`.
 */
export const portalSubmissions = pgTable("esti_portal_submission", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  clientId: uuid("client_id").references(() => clients.id),
  kind: text("kind").notNull(), // ACKNOWLEDGEMENT | CHANGE_REQUEST | FEEDBACK
  objectType: text("object_type"),
  objectId: uuid("object_id"),
  subject: text("subject").notNull(),
  body: text("body"),
  rating: integer("rating"), // 1–5, feedback only
  status: text("status").notNull().default("OPEN"), // OPEN | ACKNOWLEDGED | IMPACT_SENT | CLIENT_APPROVED | CLIENT_REJECTED | RESOLVED | DECLINED
  responseNote: text("response_note"),
  revisionCategory: text("revision_category"), // MINOR | MAJOR | CRITICAL
  submittedById: uuid("submitted_by_id").references(() => users.id),
  // Change-request impact assessment fields (populated by staff)
  attentionToId: uuid("attention_to_id").references(() => users.id),
  refDrawingId: uuid("ref_drawing_id").references(() => drawings.id),
  affectsCosting: boolean("affects_costing").notNull().default(false),
  affectsTimeline: boolean("affects_timeline").notNull().default(false),
  isBillable: boolean("is_billable").notNull().default(false),
  architectComment: text("architect_comment"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Consultant-originated collaborator-portal submissions — deliverables, RFIs and
 * notes raised by an engaged external consultant. Scoped to a project the
 * consultant is engaged on; audited; the firm triages via `status`.
 */
export const consultantSubmissions = pgTable("esti_consultant_submission", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  consultantId: uuid("consultant_id").references(() => consultants.id),
  kind: text("kind").notNull(), // DELIVERABLE | RFI | NOTE
  objectType: text("object_type"),
  objectId: uuid("object_id"),
  subject: text("subject").notNull(),
  body: text("body"),
  status: text("status").notNull().default("OPEN"), // OPEN | ACKNOWLEDGED | RESOLVED | DECLINED
  responseNote: text("response_note"),
  submittedById: uuid("submitted_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Threaded contextual responses on a portal or consultant submission. Exactly
 * one of the two submission FKs is set. Both firm staff and the originating
 * client/consultant post here, forming a back-and-forth conversation.
 */
export const submissionMessages = pgTable("esti_submission_message", {
  id: id(),
  portalSubmissionId: uuid("portal_submission_id").references(() => portalSubmissions.id),
  consultantSubmissionId: uuid("consultant_submission_id").references(() => consultantSubmissions.id),
  contractorSubmissionId: uuid("contractor_submission_id"),
  authorId: uuid("author_id").references(() => users.id),
  authorName: text("author_name"),
  authorSide: text("author_side").notNull(), // FIRM | CLIENT | CONSULTANT | CONTRACTOR
  body: text("body").notNull(),
  createdAt: createdAt(),
});
