/**
 * Estimate sheet (Estimation OS rebuild, phase 1) — the keyboard-first
 * measurement sheet. An estimate belongs to a project; lines are KB elements
 * (or their dependencies via parentLineId) with measurement columns stored as
 * JSONB [{nos, l?, b?, h?}]. Quantity is always computed from measurements
 * (contracts: lineQuantity) — never stored.
 */
import { kbItems } from "./knowledge-bank.js";
import { projectOffices } from "./project.js";
import { createdAt, id, integer, jsonb, pgTable, text, timestamp, uuid } from "./_helpers.js";

export const estimates = pgTable("esti_estimate", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("DRAFT"),
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
  sortOrder: integer("sort_order").notNull().default(0),
  code: text("code"),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  /** Measurement columns: [{nos, l?, b?, h?}] per contracts EstimateMeasurement. */
  measurements: jsonb("measurements").notNull().default([]),
  createdAt: createdAt(),
});
