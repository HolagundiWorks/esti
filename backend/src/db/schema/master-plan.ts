/**
 * Studio › Libraries › Master Plan Library — office-wide reference files
 * (PDF / DWG / zoning / development plans). Stored content-addressed in S3.
 */
import { createdAt, id, integer, pgTable, text, updatedAt, uuid } from "./_helpers.js";

export const masterPlans = pgTable("esti_master_plan", {
  id: id(),
  name: text("name").notNull(),
  category: text("category").notNull().default("PDF"), // PDF | DWG | ZONING | DEVELOPMENT
  fileKey: text("file_key").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type"),
  version: integer("version").notNull().default(1),
  notes: text("notes"),
  uploadedById: uuid("uploaded_by_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
