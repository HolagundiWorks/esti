/**
 * Per-project rate overrides — the project-level rate book. A project keeps the
 * office `esti_rate_book` as its default and overrides individual rates here
 * (keyed by the same item `code` the estimate uses). Re-costing prefers a project
 * override → office rate → as-estimated. Costing stays computed, never stored.
 */
import { bigint, createdAt, id, pgTable, text, uniqueIndex, updatedAt, uuid } from "./_helpers.js";

export const projectRates = pgTable(
  "esti_project_rate",
  {
    id: id(),
    projectId: uuid("project_id").notNull(),
    code: text("code").notNull(),
    description: text("description").notNull().default(""),
    unit: text("unit").notNull().default(""),
    /** Override rate in integer paise. */
    ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    projectCodeUq: uniqueIndex("esti_project_rate_project_code_uq").on(t.projectId, t.code),
  }),
);
