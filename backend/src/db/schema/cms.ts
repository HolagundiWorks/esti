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
  timestamp,
  uuid,
} from "./_helpers.js";
import { projectOffices } from "./project.js";
import { kbItems, kbSpecifications } from "./knowledge-bank.js";
import { users } from "./org-auth.js";
import { contractors } from "./delivery.js";

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
  structureClass: text("structure_class"), // SUBSTRUCTURE | SUPERSTRUCTURE | FINISHES | SERVICES
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
  dependsOnElementId: uuid("depends_on_element_id"),
  locationId: uuid("location_id").references(() => cmsLocations.id, {
    onDelete: "set null",
  }),
  gridRef: text("grid_ref"),
  itemId: uuid("item_id").references(() => kbItems.id, { onDelete: "set null" }),
  specificationId: uuid("specification_id").references(() => kbSpecifications.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(),
  structureClass: text("structure_class"), // SUBSTRUCTURE | SUPERSTRUCTURE | FINISHES | SERVICES
  bbsElement: text("bbs_element"), // SLAB | BEAM | COLUMN | FOOTING
  bbsParams: jsonb("bbs_params").notNull().default({}),
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

/** Work Order — contractor agreement for a project scope; line items carry agreed rates.
 *  Bills reference items here; rate is locked at WO level. */
export const cmsWorkOrders = pgTable("esti_cms_work_order", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  contractorId: uuid("contractor_id")
    .notNull()
    .references(() => contractors.id, { onDelete: "restrict" }),
  ref: text("ref").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  scope: text("scope"),
  status: text("status").notNull().default("DRAFT"), // DRAFT | ISSUED | CLOSED
  createdAt: createdAt(),
});

/** Work Order Line Item — category-keyed (description+unit+rate).
 *  Optional link to a KB specification for auto-populating description/unit. */
export const cmsWoItems = pgTable("esti_cms_wo_item", {
  id: id(),
  workOrderId: uuid("work_order_id")
    .notNull()
    .references(() => cmsWorkOrders.id, { onDelete: "cascade" }),
  specificationId: uuid("specification_id").references(() => kbSpecifications.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  agreedRatePaise: integer("agreed_rate_paise").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/** Contractor Bill — invoice from a contractor against a work order.
 *  DRAFT → SUBMITTED (by contractor) → CERTIFIED / HELD / REJECTED (by architect). */
export const cmsBills = pgTable("esti_cms_bill", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  workOrderId: uuid("work_order_id")
    .notNull()
    .references(() => cmsWorkOrders.id, { onDelete: "restrict" }),
  contractorId: uuid("contractor_id")
    .notNull()
    .references(() => contractors.id, { onDelete: "restrict" }),
  billNo: text("bill_no").notNull(),
  periodFrom: text("period_from").notNull(), // YYYY-MM-DD
  periodTo: text("period_to").notNull(), // YYYY-MM-DD
  status: text("status").notNull().default("DRAFT"), // DRAFT|SUBMITTED|CERTIFIED|HELD|REJECTED
  claimedAmountPaise: integer("claimed_amount_paise").notNull().default(0),
  certifiedAmountPaise: integer("certified_amount_paise").notNull().default(0),
  remarks: text("remarks"),
  certifiedById: uuid("certified_by_id").references(() => users.id, { onDelete: "set null" }),
  certifiedAt: timestamp("certified_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** Bill Line — element + WO item (rate source) + claimed/certified qty.
 *  Rate is locked to the WO item's agreedRatePaise; no rate override. */
export const cmsBillLines = pgTable("esti_cms_bill_line", {
  id: id(),
  billId: uuid("bill_id")
    .notNull()
    .references(() => cmsBills.id, { onDelete: "cascade" }),
  elementId: uuid("element_id")
    .notNull()
    .references(() => cmsElements.id, { onDelete: "restrict" }),
  woItemId: uuid("wo_item_id")
    .notNull()
    .references(() => cmsWoItems.id, { onDelete: "restrict" }),
  claimedQty: doublePrecision("claimed_qty").notNull().default(0),
  ratePaise: integer("rate_paise").notNull().default(0), // snapshot from WO item
  claimedAmountPaise: integer("claimed_amount_paise").notNull().default(0), // qty × rate
  certifiedQty: doublePrecision("certified_qty"),
  certifiedAmountPaise: integer("certified_amount_paise"),
  holdReason: text("hold_reason"),
  createdAt: createdAt(),
});

/** Site Measurement Book — records of executed work at site, per element.
 *  DRAFT until verified by a cost:approve user; cumulative VERIFIED qty feeds bill certification. */
export const cmsMeasurements = pgTable("esti_cms_measurement", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  elementId: uuid("element_id")
    .notNull()
    .references(() => cmsElements.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  description: text("description"),
  executedQty: doublePrecision("executed_qty").notNull().default(0),
  measuredById: uuid("measured_by_id").references(() => users.id, { onDelete: "set null" }),
  verifiedById: uuid("verified_by_id").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  remarks: text("remarks"),
  status: text("status").notNull().default("DRAFT"), // DRAFT | VERIFIED
  createdAt: createdAt(),
});

/** Per-project estimation workflow gate — modelling must complete before measure tabs unlock. */
export const cmsEstimationWorkflow = pgTable("esti_cms_estimation_workflow", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  modelComplete: boolean("model_complete").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
