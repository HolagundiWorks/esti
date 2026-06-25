import {
  boolean,
  createdAt,
  id,
  integer,
  pgTable,
  text,
  uuid,
} from "./_helpers.js";
import { dsrItems } from "./knowledge-compliance.js";

/** Knowledge Bank: versioned material specification catalogue for project spec sheets. */
export const specCatalogVersions = pgTable("esti_spec_catalog_version", {
  id: id(),
  label: text("label").notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(false),
  createdAt: createdAt(),
});

export const specCatalogItems = pgTable("esti_spec_catalog_item", {
  id: id(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => specCatalogVersions.id, { onDelete: "cascade" }),
  category: text("category"),
  item: text("item").notNull(),
  make: text("make"),
  specification: text("specification"),
  finish: text("finish"),
  remarks: text("remarks"),
  // Persisted spec → rate-book mapping: the analysed/DSR rate item this
  // specification is costed against. Cleared (set null) if the rate item is removed.
  rateItemId: uuid("rate_item_id").references(() => dsrItems.id, {
    onDelete: "set null",
  }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});
