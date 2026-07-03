/**
 * Usage-earned AORMS identity (Phase 34) — active-app-time ledger per login.
 * The frontend heartbeats while the tab is visible; each ping credits the
 * clamped elapsed time (contracts: usageCreditMinutes). At 100 hours the user
 * is invited to generate their permanent AORMS-U handle.
 */
import { users } from "./org-auth.js";
import { createdAt, integer, pgTable, timestamp, uuid } from "./_helpers.js";

export const usageStats = pgTable("esti_usage_stat", {
  /** One row per login — keyed to the user, not a separate id. */
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Total credited active minutes. */
  minutes: integer("minutes").notNull().default(0),
  lastPingAt: timestamp("last_ping_at", { withTimezone: true }),
  /** Set when the user snoozed the generate-ID prompt (Profile keeps the button). */
  idPromptDismissedAt: timestamp("id_prompt_dismissed_at", { withTimezone: true }),
  createdAt: createdAt(),
});
