/**
 * AORMS-Consultancy — Phase 0 "Living record": engineering engagements + the
 * deliverable register (docs/esti/AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md §3).
 *
 * `esti_engagement` belongs to AORMS-Studio's architect↔consultant collaboration
 * model (collaboration.ts) — the engineering-consultancy spine uses `esti_cons_*`.
 */
import { createdAt, id, jsonb, pgTable, text, timestamp, updatedAt, uuid } from "./_helpers.js";
import { clients } from "./org-auth.js";
import { projectOffices } from "./project.js";

export const consEngagements = pgTable("esti_cons_engagement", {
  id: id(),
  title: text("title").notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projectOffices.id, { onDelete: "set null" }),
  model: text("model").notNull(), // EngagementModel
  leadDiscipline: text("lead_discipline").notNull(), // EngineeringDiscipline
  disciplines: jsonb("disciplines"), // EngineeringDiscipline[]
  relianceScope: text("reliance_scope"),
  stage: text("stage"),
  status: text("status").notNull().default("ACTIVE"), // EngagementStatus
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const consDeliverables = pgTable("esti_cons_deliverable", {
  id: id(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => consEngagements.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // register document number, e.g. STR-CAL-001
  title: text("title").notNull(),
  discipline: text("discipline").notNull(), // EngineeringDiscipline
  revision: text("revision").notNull().default("A"),
  issueClass: text("issue_class").notNull().default("FOR_INFORMATION"), // IssueClass
  checkCategory: text("check_category").notNull().default("CAT1"), // CheckCategory
  status: text("status").notNull().default("DRAFT"), // DeliverableStatus
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
