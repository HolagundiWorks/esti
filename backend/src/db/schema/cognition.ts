import { projectOffices } from "./project.js";
import { users } from "./org-auth.js";
import {
  bigint,
  createdAt,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  updatedAt,
  uuid,
} from "./_helpers.js";

/** Normalized office events consumed by the cognition, learning, and priority engines. */
export const cognitionEvents = pgTable(
  "esti_cognition_event",
  {
    id: id(),
    sourceKey: text("source_key").notNull(),
    domain: text("domain", { enum: ["CLIENT", "FINANCE", "PROJECT", "TEAM", "APPROVAL", "MEETING", "SYSTEM"] }).notNull(),
    eventType: text("event_type").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id"),
    subjectLabel: text("subject_label").notNull(),
    projectId: uuid("project_id").references(() => projectOffices.id),
    actorId: uuid("actor_id").references(() => users.id),
    severity: text("severity", { enum: ["stable", "watch", "friction", "critical"] }).notNull().default("watch"),
    status: text("status", { enum: ["ACTIVE", "HANDLED", "IGNORED", "SUPERSEDED"] }).notNull().default("ACTIVE"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    urgencyScore: integer("urgency_score").notNull().default(0),
    financialImpactPaise: bigint("financial_impact_paise", { mode: "number" }).notNull().default(0),
    dependencyRiskScore: integer("dependency_risk_score").notNull().default(0),
    teamBlockageScore: integer("team_blockage_score").notNull().default(0),
    meetingProximityScore: integer("meeting_proximity_score").notNull().default(0),
    deadlineRiskScore: integer("deadline_risk_score").notNull().default(0),
    safeDeferralScore: integer("safe_deferral_score").notNull().default(0),
    priorityScore: integer("priority_score").notNull().default(0),
    evidence: jsonb("evidence").notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    sourceKeyUnique: uniqueIndex("esti_cognition_event_source_key_uq").on(table.sourceKey),
  }),
);

/** Durable learned behavior patterns by client, assignee, owner action, or system source. */
export const cognitionBehaviorProfiles = pgTable(
  "esti_cognition_behavior_profile",
  {
    id: id(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    label: text("label").notNull(),
    signalType: text("signal_type").notNull(),
    sampleCount: integer("sample_count").notNull().default(0),
    confidencePct: integer("confidence_pct").notNull().default(0),
    metrics: jsonb("metrics").notNull().default({}),
    lastObservedAt: timestamp("last_observed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    behaviorUnique: uniqueIndex("esti_cognition_behavior_profile_uq").on(
      table.subjectType,
      table.subjectId,
      table.signalType,
    ),
  }),
);

/** Materialized priority queue item derived from cognition events. */
export const cognitionPriorityItems = pgTable(
  "esti_cognition_priority_item",
  {
    id: id(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => cognitionEvents.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    recommendedAction: text("recommended_action").notNull(),
    howTo: jsonb("how_to").notNull().default([]),
    expectedBenefit: text("expected_benefit").notNull(),
    priorityScore: integer("priority_score").notNull(),
    status: text("status", { enum: ["OPEN", "HANDLED", "DISMISSED"] }).notNull().default("OPEN"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    eventUnique: uniqueIndex("esti_cognition_priority_event_uq").on(table.eventId),
  }),
);
