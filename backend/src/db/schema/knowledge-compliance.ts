import { users } from "./org-auth.js";
import { projectOffices } from "./project.js";
import {
  bigint,
  boolean,
  createdAt,
  date,
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

/** Versioned rate book (Schedule of Rates) — Phase 10. */
export const dsrVersions = pgTable("esti_dsr_version", {
  id: id(),
  label: text("label").notNull().unique(),
  description: text("description"),
  /** CPWD central catalog or state SSR pack. */
  source: text("source").notNull().default("STATE"),
  /** ISO 3166-2 state code when source === STATE (e.g. KA). */
  stateCode: text("state_code"),
  /** HCW_OFFICIAL = kit repo (read-only); CUSTOM = firm-owned. */
  origin: text("origin").notNull().default("CUSTOM"),
  /** Official kit pack id when origin === HCW_OFFICIAL. */
  packId: text("pack_id"),
  readOnly: boolean("read_only").notNull().default(false),
  /** City key when pack is city-scoped (e.g. bengaluru). */
  cityKey: text("city_key"),
  /** DRAFT versions are editable but cannot be set active or linked to estimates. */
  status: text("status").notNull().default("PUBLISHED"),
  active: boolean("active").notNull().default(false),
  createdAt: createdAt(),
});

export const dsrItems = pgTable("esti_dsr_item", {
  id: id(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => dsrVersions.id),
  code: text("code").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  createdAt: createdAt(),
});

/** Project estimate / BOQ — whole-estimate lead + per-item leads; approve -> BOQ. */
export const estimates = pgTable("esti_estimate", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
  dsrVersionId: uuid("dsr_version_id").references(() => dsrVersions.id),
  leadPct: doublePrecision("lead_pct").notNull().default(0),
  status: text("status").notNull().default("DRAFT"),
  /** Estimation OS: DESIGN (ballpark) or EXECUTION (detailed). */
  stage: text("stage").notNull().default("DESIGN"),
  /** Overall confidence band (LOW/MEDIUM/HIGH) for a design-stage estimate. */
  confidence: text("confidence"),
  basisNote: text("basis_note"),
  subtotalPaise: bigint("subtotal_paise", { mode: "number" })
    .notNull()
    .default(0),
  totalPaise: bigint("total_paise", { mode: "number" }).notNull().default(0),
  versionNo: integer("version_no").notNull().default(1),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  revisionNote: text("revision_note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const estimateItems = pgTable("esti_estimate_item", {
  id: id(),
  estimateId: uuid("estimate_id")
    .notNull()
    .references(() => estimates.id),
  dsrItemId: uuid("dsr_item_id").references(() => dsrItems.id),
  /** MANUAL, DSR_PICK, BULK_IMPORT, TAKEOFF_IMPORT. */
  sourceKind: text("source_kind").notNull().default("MANUAL"),
  /** Snapshot fields keep issued BOQs intelligible after rate-book/catalog changes. */
  dsrItemCode: text("dsr_item_code"),
  dsrItemDescription: text("dsr_item_description"),
  dsrVersionLabel: text("dsr_version_label"),
  /** Measurement IDs and compact source details used to create the line. */
  sourceMeasurementIds: jsonb("source_measurement_ids").notNull().default([]),
  sourcePayload: jsonb("source_payload").notNull().default({}),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  qty: doublePrecision("qty").notNull().default(0),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  itemLeadPct: doublePrecision("item_lead_pct").notNull().default(0),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  /** Estimation OS classification + calculation. */
  costHead: text("cost_head"),
  /** RATE_BOOK | AREA_RATE | PERCENTAGE | LUMPSUM | COMPONENT | NON_MODELED. */
  calculationType: text("calculation_type").notNull().default("RATE_BOOK"),
  confidence: text("confidence"),
  /** PERCENTAGE clauses: percent + the basis it is computed against. */
  pct: doublePrecision("pct"),
  basisSelector: jsonb("basis_selector").notNull().default({}),
  /** FK constraints added in migration to avoid a schema-module cycle. */
  componentId: uuid("component_id"),
  estimateComponentId: uuid("estimate_component_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/**
 * Rate Analysis — composite rate build-up (Phase 6).
 * A rate is built from component lines (MATERIAL / LABOUR / MACHINERY / SUNDRY)
 * plus an overhead %. The resulting analysedRatePaise can be pushed as a
 * rate item into any writable rate-book version.
 */
export const rateAnalyses = pgTable("esti_rate_analysis", {
  id: id(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  /** Optional: which rate-book version this analysis belongs to. */
  dsrVersionId: uuid("dsr_version_id").references(() => dsrVersions.id),
  /** DRAFT while being built; PUBLISHED once committed to a rate book. */
  status: text("status").notNull().default("DRAFT"),
  overheadPct: doublePrecision("overhead_pct").notNull().default(0),
  /** Sum of component amountPaise before overhead. */
  directCostPaise: bigint("direct_cost_paise", { mode: "number" }).notNull().default(0),
  /** directCostPaise × (1 + overheadPct / 100). */
  analysedRatePaise: bigint("analysed_rate_paise", { mode: "number" }).notNull().default(0),
  /** Estimation OS: the component this analysis prices (FK added in migration). */
  componentId: uuid("component_id"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Individual line within a rate analysis (material, labour, machinery, sundry). */
export const rateComponents = pgTable("esti_rate_component", {
  id: id(),
  rateAnalysisId: uuid("rate_analysis_id")
    .notNull()
    .references(() => rateAnalyses.id, { onDelete: "cascade" }),
  /** MATERIAL | LABOUR | MACHINERY | SUNDRY */
  category: text("category").notNull().default("MATERIAL"),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  qty: doublePrecision("qty").notNull().default(1),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  /** Stored: qty × ratePaise rounded to integer paise. */
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/** Bar Bending Schedule — Phase 10. */
export const bbsSchedules = pgTable("esti_bbs", {
  id: id(),
  ref: text("ref").unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
  versionNo: integer("version_no").notNull().default(1),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdAt: createdAt(),
});

export const bbsItems = pgTable("esti_bbs_item", {
  id: id(),
  bbsId: uuid("bbs_id")
    .notNull()
    .references(() => bbsSchedules.id),
  barMark: text("bar_mark").notNull(),
  member: text("member"),
  diaMm: integer("dia_mm").notNull(),
  noOfMembers: integer("no_of_members").notNull().default(1),
  barsPerMember: integer("bars_per_member").notNull().default(1),
  cuttingLengthMm: doublePrecision("cutting_length_mm").notNull().default(0),
  weightKg: doublePrecision("weight_kg").notNull().default(0),
  createdAt: createdAt(),
});

/** Knowledge Bank: versioned specification and procurement standards. */
export const specificationStandards = pgTable("esti_specification_standard", {
  id: id(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull().default("DRAFT"),
  projectTags: jsonb("project_tags").notNull().default([]),
  approvedAlternatives: jsonb("approved_alternatives").notNull().default([]),
  issueChecks: jsonb("issue_checks").notNull().default([]),
  specificationText: text("specification_text").notNull(),
  purchaseOrderDescription: text("purchase_order_description").notNull(),
  unit: text("unit").notNull(),
  dsrItemCode: text("dsr_item_code"),
  sourceCitation: text("source_citation"),
  createdById: uuid("created_by_id").references(() => users.id),
  reviewedById: uuid("reviewed_by_id").references(() => users.id),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  supersededById: uuid("superseded_by_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

