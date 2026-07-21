import { contractors } from "./delivery.js";
import { users } from "./org-auth.js";
import { phases, projectOffices } from "./project.js";
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
