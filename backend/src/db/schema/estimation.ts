/**
 * Estimation OS (Phase 29) — component master, IFC mapping, related-item
 * templates, component instances on estimates, and frozen estimate versions.
 *
 * Extends the flat estimate engine in `knowledge-compliance.ts`. FK columns on
 * existing tables (`esti_estimate_item.component_id` etc.) are plain `uuid`
 * columns there to avoid a schema-module import cycle; their FK constraints are
 * added in the migration. Money is integer paise.
 */
import { users } from "./org-auth.js";
import { projectOffices } from "./project.js";
import { dsrItems, estimateItems, estimates, rateAnalyses } from "./knowledge-compliance.js";
import {
  bigint,
  createdAt,
  doublePrecision,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  updatedAt,
  uuid,
} from "./_helpers.js";

/** Component master — permanent AORMS-code identity for an estimable item. */
export const components = pgTable("esti_component", {
  id: id(),
  /** `[LEVEL]-[DISCIPLINE]-[COMPONENT]-[SEQ]`, e.g. SB-STR-FT-01. */
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  level: text("level").notNull(),
  discipline: text("discipline").notNull(),
  componentType: text("component_type").notNull(),
  uom: text("uom").notNull(),
  /** PHYSICAL (modeled object) | PROCESS (activity, e.g. curing). */
  kind: text("kind").notNull().default("PHYSICAL"),
  formulaKey: text("formula_key").notNull(),
  /** Free-form quantity expression (RuleSet engine). Null → use formulaKey preset. */
  quantityFormula: text("quantity_formula"),
  /** ComponentParamField[] — the input form schema (measurement fields). */
  paramSchema: jsonb("param_schema").notNull().default([]),
  /** BoqSplitter[] — `{ outputName, formula, uom }` BOQ measurable outputs. */
  boqSplitters: jsonb("boq_splitters").notNull().default([]),
  /** MaterialSplitter[] — `{ materialName, formula, uom }` material consumption. */
  materialSplitters: jsonb("material_splitters").notNull().default([]),
  /** RATE_BOOK | RATE_ANALYSIS | MANUAL. */
  rateSource: text("rate_source").notNull().default("RATE_BOOK"),
  dsrItemId: uuid("dsr_item_id").references(() => dsrItems.id),
  rateAnalysisId: uuid("rate_analysis_id").references(() => rateAnalyses.id),
  /** null = shared library component; set = project-specific. */
  projectId: uuid("project_id").references(() => projectOffices.id),
  status: text("status").notNull().default("ACTIVE"),
  /** RuleSet versioning. lifecycle: DRAFT | PUBLISHED | DEPRECATED | ARCHIVED. */
  version: text("version").notNull().default("1.0"),
  lifecycle: text("lifecycle").notNull().default("DRAFT"),
  /** Set when duplicated from a prior version (soft ref to esti_component.id). */
  parentVersionId: uuid("parent_version_id"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** IFC entity → AORMS component reference catalog. */
export const ifcMappings = pgTable("esti_ifc_mapping", {
  id: id(),
  ifcEntity: text("ifc_entity").notNull(),
  predefinedType: text("predefined_type"),
  componentId: uuid("component_id")
    .notNull()
    .references(() => components.id, { onDelete: "cascade" }),
  notes: text("notes"),
  createdAt: createdAt(),
});

/** Dependency template — a parent component pulls in child components. */
export const componentRelated = pgTable("esti_component_related", {
  id: id(),
  parentComponentId: uuid("parent_component_id")
    .notNull()
    .references(() => components.id, { onDelete: "cascade" }),
  childComponentId: uuid("child_component_id")
    .notNull()
    .references(() => components.id, { onDelete: "cascade" }),
  ratioFormulaKey: text("ratio_formula_key"),
  /** Free-form dependency-mapping expression over parent-exposed variables. */
  quantityFormula: text("quantity_formula"),
  qtyFactor: doublePrecision("qty_factor").notNull().default(1),
  sequence: integer("sequence").notNull().default(0),
  createdAt: createdAt(),
});

/** A component instance placed on an estimate (execution-detail layer). */
export const estimateComponents = pgTable("esti_estimate_component", {
  id: id(),
  estimateId: uuid("estimate_id")
    .notNull()
    .references(() => estimates.id, { onDelete: "cascade" }),
  componentId: uuid("component_id")
    .notNull()
    .references(() => components.id),
  /** Optional design-stage line this component expands. */
  designItemId: uuid("design_item_id").references(() => estimateItems.id),
  /** Param values keyed by ComponentParamField.key. */
  params: jsonb("params").notNull().default({}),
  qtyFormulaKey: text("qty_formula_key").notNull(),
  computedQty: doublePrecision("computed_qty").notNull().default(0),
  uom: text("uom").notNull(),
  costHead: text("cost_head"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Immutable snapshot of an estimate at a freeze point — never overwritten. */
export const estimateVersions = pgTable("esti_estimate_version", {
  id: id(),
  estimateId: uuid("estimate_id")
    .notNull()
    .references(() => estimates.id, { onDelete: "cascade" }),
  versionNo: integer("version_no").notNull(),
  stage: text("stage").notNull(),
  status: text("status").notNull(),
  subtotalPaise: bigint("subtotal_paise", { mode: "number" }).notNull().default(0),
  totalPaise: bigint("total_paise", { mode: "number" }).notNull().default(0),
  /** Full item + meta snapshot for audit-grade reconstruction. */
  snapshot: jsonb("snapshot").notNull().default({}),
  note: text("note"),
  frozenBy: uuid("frozen_by").references(() => users.id),
  // Distinct `frozen_at` column (the migration creates it under this name);
  // the `createdAt()` helper is hardcoded to `created_at`, which this table lacks.
  frozenAt: timestamp("frozen_at", { withTimezone: true }).notNull().defaultNow(),
});
