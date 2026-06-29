/**
 * Cost Management System (CMS) — the Element-centric project cost spine.
 * See docs/esti/COST-MANAGEMENT-SYSTEM.md. One permanent Element identity (EL-001)
 * flows Estimate → BOQ → Site Measurement → Bills → Reconciliation. Money is paise.
 */
import {
  boolean,
  createdAt,
  doublePrecision,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "./_helpers.js";
import { projectOffices } from "./project.js";
import { kbItems, kbSpecifications } from "./knowledge-bank.js";

/** Spatial hierarchy — a flexible self-referencing tree per project
 *  (Zone → Building → Floor → Room → Section). Grid is a field on the element. */
export const cmsLocations = pgTable("esti_cms_location", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  kind: text("kind").notNull(), // ZONE | BUILDING | FLOOR | ROOM | SECTION
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/** Final Estimation Set — the frozen cost record that moves to Documents.
 *  One immutable snapshot per revision. Once FINAL it is never modified. */
export const cmsFinalSets = pgTable("esti_cms_final_set", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  revisionNo: integer("revision_no").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("DRAFT"), // DRAFT | FINAL
  snapshotJson: jsonb("snapshot_json").notNull().default({}),
  totalPaise: integer("total_paise").notNull().default(0),
  pdfStatus: text("pdf_status").notNull().default("NONE"), // NONE | PENDING | READY | ERROR
  pdfKey: text("pdf_key"),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

/** Element — the spine. A unique physical construction object with one permanent
 *  identity (`EL-001`); Components are child elements (`EL-001A`). The Element is the
 *  estimate unit: it carries dimensions → quantity, and a snapshot of the spec rate. */
export const cmsElements = pgTable("esti_cms_element", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // EL-001, EL-001A (permanent, per project)
  seq: integer("seq").notNull().default(0), // numeric ordering / code generation
  parentElementId: uuid("parent_element_id"),
  isComponent: boolean("is_component").notNull().default(false),
  dependencyType: text("dependency_type"), // MANDATORY | OPTIONAL | SEQUENCE (components)
  locationId: uuid("location_id").references(() => cmsLocations.id, {
    onDelete: "set null",
  }),
  gridRef: text("grid_ref"),
  itemId: uuid("item_id").references(() => kbItems.id, { onDelete: "set null" }),
  specificationId: uuid("specification_id").references(() => kbSpecifications.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(),
  measurementType: text("measurement_type").notNull().default("VOLUME"), // VOLUME|AREA|LENGTH|COUNT
  dimensions: jsonb("dimensions").notNull().default({}), // { length, height, thickness, nos } in mm
  quantity: doublePrecision("quantity").notNull().default(0), // derived, in the spec unit
  unit: text("unit"), // snapshot from spec
  ratePaise: integer("rate_paise").notNull().default(0), // snapshot from spec
  amountPaise: integer("amount_paise").notNull().default(0), // quantity × rate
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});
