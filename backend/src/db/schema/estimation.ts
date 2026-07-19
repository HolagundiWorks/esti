/**
 * Estimation (Rate Books + BOQ Estimates) — consultancy-scoped costing, ported
 * from Construction-Billing-System's domain model (see
 * packages/contracts/src/estimation.ts for the calculation logic ported from
 * its EstimateCalculator/core/Units). Rate books are firm-level and versioned;
 * an estimate is a project's priced BOQ against one rate book, with an
 * optional measurement book per line. No Contracts/Running-Bills here —
 * AORMS is consultancy-only (2026-06-29 pivot).
 */
import { projectOffices } from "./project.js";
import {
  bigint,
  boolean,
  createdAt,
  date,
  doublePrecision,
  id,
  integer,
  pgTable,
  text,
  updatedAt,
  uuid,
} from "./_helpers.js";

export const rateBooks = pgTable("esti_rate_book", {
  id: id(),
  name: text("name").notNull(),
  versionLabel: text("version_label"),
  effectiveDate: date("effective_date"),
  description: text("description"),
  locked: boolean("locked").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const rateBookItems = pgTable("esti_rate_book_item", {
  id: id(),
  rateBookId: uuid("rate_book_id")
    .notNull()
    .references(() => rateBooks.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  itemCode: text("item_code"),
  description: text("description").notNull(),
  specification: text("specification"),
  unit: text("unit").notNull(),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const estimates = pgTable("esti_estimate", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  rateBookId: uuid("rate_book_id")
    .notNull()
    .references(() => rateBooks.id),
  title: text("title").notNull(),
  date: date("date"),
  status: text("status").notNull().default("DRAFT"),
  contingencyPct: doublePrecision("contingency_pct").notNull().default(0),
  gstPct: doublePrecision("gst_pct").notNull().default(0),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const estimateItems = pgTable("esti_estimate_item", {
  id: id(),
  estimateId: uuid("estimate_id")
    .notNull()
    .references(() => estimates.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  rateBookItemId: uuid("rate_book_item_id").references(() => rateBookItems.id),
  itemCode: text("item_code"),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  quantity: doublePrecision("quantity").notNull().default(0),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  // Related parent item, e.g. plastering -> brickwork (provenance only, no cascade).
  linkedItemId: uuid("linked_item_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Measurement-book line under one estimate item (nos x length x breadth x depth, by shape). */
export const estimateMeasurements = pgTable("esti_estimate_measurement", {
  id: id(),
  estimateItemId: uuid("estimate_item_id")
    .notNull()
    .references(() => estimateItems.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  description: text("description"),
  nos: doublePrecision("nos").notNull().default(1),
  length: doublePrecision("length").notNull().default(0),
  breadth: doublePrecision("breadth").notNull().default(0),
  depth: doublePrecision("depth").notNull().default(0),
  /** directQuantity for Weight/Lumpsum shapes; computed contribution otherwise. */
  quantity: doublePrecision("quantity").notNull().default(0),
  /**
   * Set when this line was imported from browser takeoff — the measurement-book
   * row it came from. Gives the abstract sheet provenance back to the marked-up
   * plan, and makes re-import update in place instead of duplicating.
   */
  sourceMeasurementRowId: uuid("source_measurement_row_id"),
  createdAt: createdAt(),
});
