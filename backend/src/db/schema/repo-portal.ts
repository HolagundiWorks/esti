import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./org-auth.js";

/** External textbook / reference source awaiting EOMS processing. */
export const repoSources = pgTable("esti_repo_source", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  author: text("author"),
  category: text("category"),
  rawText: text("raw_text"),
  markdownText: text("markdown_text"),
  convertStatus: text("convert_status"),
  convertError: text("convert_error"),
  fileKey: text("file_key"),
  fileName: text("file_name"),
  executiveSummary: text("executive_summary"),
  status: text("status").notNull().default("DRAFT"),
  processError: text("process_error"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** EOMS-generated section — summary + rephrased body; ESTI reads published sources only. */
export const repoSections = pgTable("esti_repo_section", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => repoSources.id, { onDelete: "cascade" }),
  seq: integer("seq").notNull().default(0),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  rephrased: text("rephrased").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
