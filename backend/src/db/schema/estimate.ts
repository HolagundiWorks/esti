/**
 * Estimate sheet (Estimation OS rebuild, phase 1) — the keyboard-first
 * measurement sheet. An estimate belongs to a project; lines are KB elements
 * (or their dependencies via parentLineId); measurements are first-class rows
 * in their own table. Quantity is always computed (contracts: lineQuantity) —
 * never stored.
 */
import { kbItems, kbSpecifications } from "./knowledge-bank.js";
import { projectOffices } from "./project.js";
import {
  boolean,
  createdAt,
  doublePrecision,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "./_helpers.js";

export const estimates = pgTable("esti_estimate", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** IN_PROGRESS | FOR_REVIEW | APPROVED (EstimateStatus). Editable only in-progress. */
  status: text("status").notNull().default("IN_PROGRESS"),
  /** 0 for the original; a clone of an approved estimate increments it (Rev N). */
  revisionNo: integer("revision_no").notNull().default(0),
  /** The original estimate this is a revision of (null for the original). */
  revisionOf: uuid("revision_of"),
  /** Frozen priced BOQ + material abstract at PDF-generation time (see costing). */
  boqSnapshot: jsonb("boq_snapshot"),
  boqPdfKey: text("boq_pdf_key"),
  boqPdfStatus: text("boq_pdf_status").notNull().default("NONE"),
  /** Client copy — the priced BOQ only, no internal material/labour abstracts. */
  boqClientPdfKey: text("boq_client_pdf_key"),
  boqClientPdfStatus: text("boq_client_pdf_status").notNull().default("NONE"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});

export const estimateLines = pgTable("esti_estimate_line", {
  id: id(),
  estimateId: uuid("estimate_id")
    .notNull()
    .references(() => estimates.id, { onDelete: "cascade" }),
  /** Null for main items; the main line's id for dependency lines. */
  parentLineId: uuid("parent_line_id"),
  kbItemId: uuid("kb_item_id").references(() => kbItems.id, { onDelete: "set null" }),
  /** Chosen KB specification (mix/method) for costing — mapped post-approval. */
  specificationId: uuid("specification_id").references(() => kbSpecifications.id, {
    onDelete: "set null",
  }),
  sortOrder: integer("sort_order").notNull().default(0),
  code: text("code"),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  /** True when this dependency line was auto-created from its parent's
   *  measurements (a derivation). Manual/overridden lines are false. */
  derived: boolean("derived").notNull().default(false),
  createdAt: createdAt(),
});

/**
 * Measurement rows — one row per recorded column of a line's sheet. Punched
 * top-to-bottom (nos, then the dimensions the unit calls for); quantity is
 * computed (contracts measurementQty), never stored.
 */
export const estimateMeasurements = pgTable("esti_estimate_measurement", {
  id: id(),
  lineId: uuid("line_id")
    .notNull()
    .references(() => estimateLines.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  /** Optional location note ("GF west wall"). */
  label: text("label"),
  nos: doublePrecision("nos").notNull().default(0),
  l: doublePrecision("l"),
  b: doublePrecision("b"),
  h: doublePrecision("h"),
  createdAt: createdAt(),
});
