import { users } from "./org-auth.js";
import {
  boolean,
  createdAt,
  id,
  jsonb,
  pgTable,
  text,
  timestamp,
  updatedAt,
  uuid,
} from "./_helpers.js";

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
  /** Optional code linking to a rate-book item (stored as plain text; no FK). */
  dsrItemCode: text("dsr_item_code"),
  sourceCitation: text("source_citation"),
  createdById: uuid("created_by_id").references(() => users.id),
  reviewedById: uuid("reviewed_by_id").references(() => users.id),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  supersededById: uuid("superseded_by_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
