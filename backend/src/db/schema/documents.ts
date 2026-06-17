import {
  createdAt,
  date,
  id,
  integer,
  pgTable,
  text,
  timestamp,
  updatedAt,
  uuid,
} from "./_helpers.js";
import { projectOffices } from "./project.js";
import { users } from "./org-auth.js";

/** Immutable issue record for any issuable document type (Phase 8 gate). */
export const documentIssues = pgTable("esti_document_issue", {
  id: id(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  projectId: uuid("project_id").references(() => projectOffices.id),
  ref: text("ref").notNull(),
  versionNo: integer("version_no").notNull().default(1),
  revisionNote: text("revision_note"),
  impactNote: text("impact_note"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  issuedById: uuid("issued_by_id").references(() => users.id),
  pdfKey: text("pdf_key"),
  createdAt: createdAt(),
});

/** Reusable office document templates (letters, scope, COA, MOM). */
export const officeTemplates = pgTable("esti_office_template", {
  id: id(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tags: text("tags"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Meeting minutes with action items. */
export const moms = pgTable("esti_mom", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
  meetingDate: date("meeting_date"),
  venue: text("venue"),
  attendees: text("attendees"),
  minutes: text("minutes").notNull().default(""),
  versionNo: integer("version_no").notNull().default(1),
  status: text("status").notNull().default("DRAFT"),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const momActions = pgTable("esti_mom_action", {
  id: id(),
  momId: uuid("mom_id")
    .notNull()
    .references(() => moms.id),
  description: text("description").notNull(),
  assigneeName: text("assignee_name"),
  dueDate: date("due_date"),
  status: text("status").notNull().default("OPEN"),
  taskId: uuid("task_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});
