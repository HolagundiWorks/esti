import { letters, projectOffices, proposals } from "./project.js";
import {
  createdAt,
  date,
  id,
  pgTable,
  text,
  timestamp,
  updatedAt,
  uuid,
} from "./_helpers.js";

/** APBF Phase 0 — pre-engagement appointment record per project. */
export const appointments = pgTable("esti_appointment", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  siteVisitDate: date("site_visit_date"),
  scopeSummary: text("scope_summary"),
  letterId: uuid("letter_id").references(() => letters.id),
  feeProposalId: uuid("fee_proposal_id").references(() => proposals.id),
  status: text("status").notNull().default("DRAFT"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
