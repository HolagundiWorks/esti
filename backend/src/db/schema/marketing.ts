import { integer, jsonb, pgTable, text, timestamp, updatedAt, uuid } from "./_helpers.js";

/** Key–value counters for public marketing surfaces (e.g. landing page visits). */
export const siteMetrics = pgTable("esti_site_metrics", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
  updatedAt: updatedAt(),
});

export const LANDING_VISITS_KEY = "landing_visits";

/** Inbound trial workspace requests from the public landing form. */
export const trialRequests = pgTable("esti_trial_request", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  workEmail: text("work_email").notNull(),
  mobile: text("mobile").notNull(),
  companyName: text("company_name").notNull(),
  role: text("role").notNull(),
  practiceType: text("practice_type"),
  teamSize: text("team_size"),
  locations: text("locations"),
  interestedModules: jsonb("interested_modules").notNull().$type<string[]>().default([]),
  currentTools: jsonb("current_tools").notNull().$type<string[]>().default([]),
  painPoints: jsonb("pain_points").notNull().$type<string[]>().default([]),
  improvementNotes: text("improvement_notes"),
  trialPreference: text("trial_preference").notNull(),
  timeline: text("timeline"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
