/**
 * Studio › Libraries › Standards Library — office design standards by discipline
 * (Interiors / Plumbing / Electrical / Lighting), each with technical notes, an
 * optional data table, and attached files (PDF / drawing / standard detail).
 */
import { createdAt, id, jsonb, pgTable, text, updatedAt, uuid } from "./_helpers.js";

export const standards = pgTable("esti_standard", {
  id: id(),
  discipline: text("discipline").notNull(), // INTERIORS | PLUMBING | ELECTRICAL | LIGHTING
  title: text("title").notNull(),
  notes: text("notes"),
  tableJson: jsonb("table_json"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const standardFiles = pgTable("esti_standard_file", {
  id: id(),
  standardId: uuid("standard_id")
    .notNull()
    .references(() => standards.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("PDF"), // PDF | DRAWING | DETAIL
  fileKey: text("file_key").notNull(),
  fileName: text("file_name").notNull(),
  createdAt: createdAt(),
});
