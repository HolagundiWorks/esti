/**
 * Client–Project Intelligence (CPI) — the residential project onboarding &
 * program-formulation questionnaire. One row per project: `sections` is a
 * JSONB map keyed by CpiSectionId (@esti/contracts), `report` holds the
 * synthesized Client Intelligence Report (Section 21 deliverable).
 */
import { projectOffices } from "./project.js";
import { createdAt, jsonb, pgTable, text, timestamp, uuid } from "./_helpers.js";

export const cpiResponses = pgTable("esti_cpi_response", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  /** Section payloads keyed by CpiSectionId — free-shaped, bounded per section. */
  sections: jsonb("sections").notNull().default({}),
  /** DRAFT while the questionnaire is being filled; COMPLETE once the report is saved. */
  status: text("status").notNull().default("DRAFT"),
  /** The Client Intelligence Report (CpiReport) — the CPI deliverable. */
  report: jsonb("report"),
  reportGeneratedAt: timestamp("report_generated_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});
