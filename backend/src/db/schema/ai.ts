import { createdAt, id, jsonb, pgTable, text, uuid } from "./_helpers.js";
import { projectOffices } from "./project.js";
import { users } from "./org-auth.js";

/** AI generation run — provenance, sources, approval gate (Phase 11). */
export const aiRuns = pgTable("esti_ai_run", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  projectId: uuid("project_id").references(() => projectOffices.id),
  kind: text("kind").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptSummary: text("prompt_summary"),
  sources: jsonb("sources").notNull().default([]),
  outputText: text("output_text").notNull(),
  approvalState: text("approval_state").notNull().default("DRAFT"),
  issuedEntityType: text("issued_entity_type"),
  issuedEntityId: uuid("issued_entity_id"),
  usedExternalApi: text("used_external_api").notNull().default("false"),
  tokenEstimate: text("token_estimate"),
  createdAt: createdAt(),
});
