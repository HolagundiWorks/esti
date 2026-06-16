import { integer, pgTable, text, updatedAt } from "./_helpers.js";

/** Key–value counters for public marketing surfaces (e.g. landing page visits). */
export const siteMetrics = pgTable("esti_site_metrics", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
  updatedAt: updatedAt(),
});

export const LANDING_VISITS_KEY = "landing_visits";
