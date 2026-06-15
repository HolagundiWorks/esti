import { bbmpRuleSets } from "./bbmp-rules.js";
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

/** Versioned master DSR (Schedule of Rates) — Phase 10. */
export const dsrVersions = pgTable("esti_dsr_version", {
  id: id(),
  label: text("label").notNull().unique(),
  description: text("description"),
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
  subtotalPaise: bigint("subtotal_paise", { mode: "number" })
    .notNull()
    .default(0),
  totalPaise: bigint("total_paise", { mode: "number" }).notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const estimateItems = pgTable("esti_estimate_item", {
  id: id(),
  estimateId: uuid("estimate_id")
    .notNull()
    .references(() => estimates.id),
  dsrItemId: uuid("dsr_item_id").references(() => dsrItems.id),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  qty: doublePrecision("qty").notNull().default(0),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  itemLeadPct: doublePrecision("item_lead_pct").notNull().default(0),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/** Bar Bending Schedule — Phase 10. */
export const bbsSchedules = pgTable("esti_bbs", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
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

/** RIE: Versioned jurisdiction rule sets (knowledge bank). */
export const ruleVersions = pgTable("esti_rule_version", {
  id: id(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  authority: text("authority").notNull(),
  buildingUse: text("building_use").notNull(),
  effectiveDate: date("effective_date").notNull(),
  status: text("status").notNull().default("DRAFT"),
  sourceCitation: text("source_citation"),
  data: jsonb("data").notNull().default({}),
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => users.id),
  reviewedById: uuid("reviewed_by_id").references(() => users.id),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  supersededById: uuid("superseded_by_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
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

/** Knowledge Bank: versioned structural geometry and reinforcement templates. */
export const structuralElementTemplates = pgTable(
  "esti_structural_element_template",
  {
    id: id(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    family: text("family").notNull(),
    type: text("type").notNull(),
    version: text("version").notNull(),
    status: text("status").notNull().default("DRAFT"),
    description: text("description"),
    geometry: jsonb("geometry").notNull().default({}),
    reinforcement: jsonb("reinforcement").notNull().default([]),
    sourceCitation: text("source_citation"),
    createdById: uuid("created_by_id").references(() => users.id),
    reviewedById: uuid("reviewed_by_id").references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    supersededById: uuid("superseded_by_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
);

/** RIE: Per-project site assessment (all five engine outputs). */
export const siteAssessments = pgTable("esti_site_assessment", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  ruleVersionId: uuid("rule_version_id").references(() => ruleVersions.id),
  bbmpRuleSetId: uuid("bbmp_rule_set_id").references(() => bbmpRuleSets.id),
  status: text("status").notNull().default("DRAFT"),
  assessmentPhase: text("assessment_phase").notNull().default("PRE_DESIGN"),
  siteInputs: jsonb("site_inputs").notNull().default({}),
  devControl: jsonb("dev_control"),
  basement: jsonb("basement"),
  sustainability: jsonb("sustainability"),
  approvalReadiness: jsonb("approval_readiness"),
  violations: jsonb("violations"),
  relaxations: jsonb("relaxations"),
  overallScore: integer("overall_score"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
