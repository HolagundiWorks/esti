/**
 * Estimation OS — project estimates built on the Construction Knowledge Bank.
 * See docs/esti/ESTIMATION-OS.md. A fresh `esti_est_*` namespace (the old
 * `esti_estimate*` tables were torn down 2026-06-28). Money is integer paise.
 */
import {
  createdAt,
  doublePrecision,
  id,
  integer,
  pgTable,
  text,
  uuid,
} from "./_helpers.js";
import { projectOffices } from "./project.js";
import { kbItems, kbSpecifications } from "./knowledge-bank.js";

/** One estimate per project (or stage). DRAFT recomputes live; FINALIZED locks. */
export const estEstimates = pgTable("esti_est_estimate", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("DRAFT"), // DRAFT | FINALIZED
  createdAt: createdAt(),
});

/** A measured estimate line. Item + specification are Knowledge Bank references;
 *  the description / unit / rate are snapshotted off the spec at add time so the
 *  line stays explainable even if the bank changes. amount = round(quantity × rate). */
export const estLines = pgTable("esti_est_line", {
  id: id(),
  estimateId: uuid("estimate_id")
    .notNull()
    .references(() => estEstimates.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").references(() => kbItems.id, { onDelete: "set null" }),
  specificationId: uuid("specification_id").references(() => kbSpecifications.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(),
  unit: text("unit"),
  quantity: doublePrecision("quantity").notNull().default(0),
  ratePaise: integer("rate_paise").notNull().default(0),
  amountPaise: integer("amount_paise").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});
