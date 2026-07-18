import {
  boolean,
  createdAt,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  updatedAt,
  uuid,
} from "./_helpers.js";
import { specCatalogItems } from "./spec-catalog.js";

/** Office standard items library — versioned BOQ/measurement templates. */
export const itemLibraryVersions = pgTable("esti_item_library_version", {
  id: id(),
  label: text("label").notNull().unique(),
  active: boolean("active").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const itemLibraryItems = pgTable("esti_item_library_item", {
  id: id(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => itemLibraryVersions.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  chapter: text("chapter").notNull(),
  particulars: text("particulars").notNull(),
  uom: text("uom").notNull(),
  measureKind: text("measure_kind").notNull(),
  markerKinds: jsonb("marker_kinds").notNull().default([]),
  defaultBreadthMm: integer("default_breadth_mm"),
  defaultHeightFrom: text("default_height_from").notNull().default("MANUAL"),
  specCatalogItemId: uuid("spec_catalog_item_id").references(() => specCatalogItems.id),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
