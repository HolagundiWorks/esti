import { clients, users } from "./org-auth.js";
import { projectOffices } from "./project.js";
import {
  bigint,
  boolean,
  createdAt,
  doublePrecision,
  id,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  updatedAt,
  uuid,
} from "./_helpers.js";

/**
 * Project OS — the lead → active-project acquisition pipeline.
 * See docs/esti/UNIFIED-ARCHITECTURE-V4.md. Money is integer paise.
 */

/** Slice A — inbound enquiry recorded before a client/project exists. */
export const leads = pgTable("esti_lead", {
  id: id(),
  ref: text("ref").notNull().unique(),
  clientName: text("client_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  leadSource: text("lead_source").notNull(),
  projectType: text("project_type"),
  siteLocation: text("site_location"),
  city: text("city"),
  assignedToId: uuid("assigned_to_id").references(() => users.id),
  status: text("status").notNull().default("NEW"),
  /** Set on conversion — the client + draft project the lead became. */
  convertedClientId: uuid("converted_client_id").references(() => clients.id),
  convertedProjectId: uuid("converted_project_id").references(() => projectOffices.id),
  // COA Regulations 1989 conflict-of-interest check, confirmed at conversion (SOP-01/02).
  conflictCheckDone: boolean("conflict_check_done").notNull().default(false),
  conflictCheckNotes: text("conflict_check_notes"),
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Slice B — pre-sales commercial constraints, 1:1 with a project. */
export const projectDnas = pgTable("esti_project_dna", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  budgetMode: text("budget_mode").notNull(),
  vastuRequirement: text("vastu_requirement").notNull(),
  designLanguage: text("design_language").notNull(),
  designFlexibility: text("design_flexibility").notNull(),
  decisionMakers: text("decision_makers").notNull(),
  timelineCriticality: text("timeline_criticality").notNull(),
  materialExpectation: text("material_expectation").notNull(),
  revisionTolerance: text("revision_tolerance").notNull(),
  customNotes: text("custom_notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Slice C — deterministic build-feasibility maths, 1:1 with a project. */
export const preProjectAssessments = pgTable("esti_pre_project_assessment", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  siteLength: doublePrecision("site_length"),
  siteWidth: doublePrecision("site_width"),
  manualArea: doublePrecision("manual_area"),
  siteAreaSqm: doublePrecision("site_area_sqm").notNull().default(0),
  farFactor: doublePrecision("far_factor").notNull().default(0),
  permissibleFarArea: doublePrecision("permissible_far_area").notNull().default(0),
  frontSetback: doublePrecision("front_setback").notNull().default(0),
  rearSetback: doublePrecision("rear_setback").notNull().default(0),
  leftSetback: doublePrecision("left_setback").notNull().default(0),
  rightSetback: doublePrecision("right_setback").notNull().default(0),
  setbackBuildableArea: doublePrecision("setback_buildable_area").notNull().default(0),
  groundCoveragePct: doublePrecision("ground_coverage_pct").notNull().default(0),
  coverageArea: doublePrecision("coverage_area").notNull().default(0),
  actualGroundCoverage: doublePrecision("actual_ground_coverage").notNull().default(0),
  possibleFloors: doublePrecision("possible_floors").notNull().default(0),
  superBuiltupFactor: doublePrecision("super_builtup_factor").notNull().default(1.25),
  superBuiltupArea: doublePrecision("super_builtup_area").notNull().default(0),
  constructionRatePaise: bigint("construction_rate_paise", { mode: "number" }).notNull().default(0),
  estimatedProjectCostPaise: bigint("estimated_project_cost_paise", { mode: "number" })
    .notNull()
    .default(0),
  breakdown: jsonb("breakdown"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Slice D — frozen feasibility report + async PDF status. */
export const feasibilityReports = pgTable("esti_feasibility_report", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  assessmentId: uuid("assessment_id").references(() => preProjectAssessments.id, {
    onDelete: "set null",
  }),
  snapshot: jsonb("snapshot").notNull().default({}),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  shareToken: text("share_token").notNull().unique(),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Slice H — commercial negotiation rounds against a draft project. */
export const projectNegotiations = pgTable("esti_project_negotiation", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  feeProposalId: uuid("fee_proposal_id"),
  roundNo: integer("round_no").notNull().default(1),
  feeChangePaise: bigint("fee_change_paise", { mode: "number" }).notNull().default(0),
  scopeChanges: text("scope_changes"),
  timelineChanges: text("timeline_changes"),
  discountRequestedPct: numeric("discount_requested_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  architectResponse: text("architect_response"),
  clientResponse: text("client_response"),
  outcome: text("outcome").notNull().default("ONGOING"),
  conversionProbability: integer("conversion_probability").notNull().default(0),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
});

/**
 * Program Formulation — the architectural space schedule, formulated within the
 * feasibility envelope (assessment.superBuiltupArea, the source of truth).
 * Versioned: DRAFT → FROZEN; a frozen version is the revision baseline.
 */
export const programs = pgTable("esti_program", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("DRAFT"),
  /** Feasibility snapshot — the max built extent this program is bounded by. */
  assessmentId: uuid("assessment_id").references(() => preProjectAssessments.id, {
    onDelete: "set null",
  }),
  maxBuiltAreaSqm: doublePrecision("max_built_area_sqm").notNull().default(0),
  notes: text("notes"),
  frozenAt: timestamp("frozen_at", { withTimezone: true }),
  frozenById: uuid("frozen_by_id").references(() => users.id),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const programSpaces = pgTable("esti_program_space", {
  id: id(),
  programId: uuid("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  floorLevel: integer("floor_level").notNull().default(0),
  unitAreaSqm: doublePrecision("unit_area_sqm").notNull().default(0),
  count: integer("count").notNull().default(1),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

/** Slice J — formal client onboarding, 1:1 with a project. */
export const clientOnboardings = pgTable("esti_client_onboarding", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  billingAddress: text("billing_address"),
  gstin: text("gstin"),
  pan: text("pan"),
  authorizedReps: jsonb("authorized_reps").notNull().default([]),
  communicationPreference: text("communication_preference"),
  agreementDocKey: text("agreement_doc_key"),
  idDocKey: text("id_doc_key"),
  status: text("status").notNull().default("PENDING"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completedById: uuid("completed_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
