import {
  bigint,
  createdAt,
  doublePrecision,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  updatedAt,
  uuid,
} from "./_helpers.js";
import { drawings } from "./delivery.js";
import { itemLibraryItems, itemLibraryVersions } from "./item-library.js";
import { projectOffices } from "./project.js";
import { specCatalogItems } from "./spec-catalog.js";

/** Per-project building storeys — LVL 0…10 mapped to floor names + FFL heights. */
export const buildingLevels = pgTable("esti_building_level", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  /** Canonical stack index: 0 = LVL 0 … 10 = LVL 10. */
  levelIndex: integer("level_index").notNull().default(0),
  /** Canonical code — always `LVL n`. */
  code: text("code").notNull(),
  /** User floor name — Basement, Ground, Stilt, First floor, … */
  name: text("name").notNull(),
  /** Absolute FFL elevation from LVL 0 datum (mm). */
  elevationMm: integer("elevation_mm").notNull().default(0),
  /**
   * Storey owned by this level (mm): FFL of LVL n → FFL of LVL n+1
   * (or roof/parapet on the top level). Between 0→1 = LVL 0; 1→2 = LVL 1; …
   */
  storeyHeightMm: integer("storey_height_mm").notNull().default(3000),
  /** Optional beam depth for this level (mm); null = project default. */
  beamDepthMm: integer("beam_depth_mm"),
  /** Optional lintel depth for this level (mm); null = project default. */
  lintelHeightMm: integer("lintel_height_mm"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Project measurement abstract — one active draft per project by default. */
export const measurementBooks = pgTable("esti_measurement_book", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Measurement sheet"),
  status: text("status").notNull().default("DRAFT"),
  libraryVersionId: uuid("library_version_id").references(() => itemLibraryVersions.id),
  revisionNo: integer("revision_no").notNull().default(1),
  /** Printable abstract — rendered by the worker (ADR-10), same shape as other docs. */
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const measurementRows = pgTable("esti_measurement_row", {
  id: id(),
  bookId: uuid("book_id")
    .notNull()
    .references(() => measurementBooks.id, { onDelete: "cascade" }),
  levelId: uuid("level_id").references(() => buildingLevels.id),
  libraryItemId: uuid("library_item_id").references(() => itemLibraryItems.id),
  libraryItemCode: text("library_item_code"),
  particulars: text("particulars").notNull(),
  lengthMm: integer("length_mm"),
  breadthMm: integer("breadth_mm"),
  heightMm: integer("height_mm"),
  /** Optional beam depth for this row (mm); null = level then project. */
  beamDepthMm: integer("beam_depth_mm"),
  /** Optional lintel depth for this row (mm); null = level then project. */
  lintelHeightMm: integer("lintel_height_mm"),
  quantity: doublePrecision("quantity").notNull().default(0),
  uom: text("uom").notNull(),
  ratePaise: bigint("rate_paise", { mode: "number" }),
  derivation: text("derivation").notNull().default("MANUAL"),
  specCatalogItemId: uuid("spec_catalog_item_id").references(() => specCatalogItems.id),
  sourceMarkupIds: jsonb("source_markup_ids").notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Phase 2 — calibrated plan sheet scale. */
export const sheetCalibrations = pgTable("esti_sheet_calibration", {
  id: id(),
  drawingId: uuid("drawing_id")
    .notNull()
    .references(() => drawings.id, { onDelete: "cascade" }),
  pageNo: integer("page_no").notNull().default(0),
  unitsPerPoint: doublePrecision("units_per_point").notNull(),
  unitLabel: text("unit_label").notNull().default("mm"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const planMarkupSets = pgTable("esti_plan_markup_set", {
  id: id(),
  drawingId: uuid("drawing_id")
    .notNull()
    .references(() => drawings.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Markup"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const planMarkupItems = pgTable("esti_plan_markup_item", {
  id: id(),
  setId: uuid("set_id")
    .notNull()
    .references(() => planMarkupSets.id, { onDelete: "cascade" }),
  markerKind: text("marker_kind").notNull(),
  libraryItemId: uuid("library_item_id").references(() => itemLibraryItems.id),
  label: text("label").notNull(),
  geometry: jsonb("geometry").notNull(),
  lengthMm: integer("length_mm"),
  breadthMm: integer("breadth_mm"),
  heightMm: integer("height_mm"),
  /** Enclosed plan area in mm² for AREA markers (double — a 30x20 m slab exceeds int4). */
  areaMm2: doublePrecision("area_mm2"),
  count: integer("count").notNull().default(1),
  measurementRowId: uuid("measurement_row_id").references(() => measurementRows.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
