/**
 * Rate Book — the office schedule of rates (code · description · unit · rate).
 * A simple, standalone reference table surfaced in the Knowledge Bank; not tied
 * to the removed estimation engine.
 */
import { bigint, boolean, createdAt, id, pgTable, text, updatedAt } from "./_helpers.js";

export const rateBook = pgTable("esti_rate_book", {
  id: id(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  /** Rate in integer paise. */
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
