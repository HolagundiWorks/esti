/**
 * Imported estimate snapshot (`.aormsest`). AORMS does not CREATE estimates — the
 * Estimate desktop app does — it imports an immutable snapshot per project and
 * re-costs it against a rate book. Quantities are authoritative (frozen inside
 * `pack`); costing is always computed live from `esti_rate_book`, never stored
 * as truth, so a rate-book change is a pure recompute. Re-importing = new row.
 */
import { createdAt, id, integer, jsonb, pgTable, text, updatedAt, uuid } from "./_helpers.js";

export const estimates = pgTable("esti_estimate", {
  id: id(),
  projectId: uuid("project_id"), // optional link to esti_project_office
  title: text("title").notNull(),
  /** Rate book the desktop app used, for provenance (AORMS re-costs against its own). */
  sourceRateBookCode: text("source_rate_book_code"),
  sourceRateBookName: text("source_rate_book_name"),
  /** Object-store key of the raw .aormsest file. */
  sourceFileKey: text("source_file_key"),
  checksum: text("checksum"),
  formatVersion: integer("format_version").notNull().default(1),
  /** The full parsed `.aormsest` payload (items · materials · steel). */
  pack: jsonb("pack").notNull(),
  uploadedById: uuid("uploaded_by_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
