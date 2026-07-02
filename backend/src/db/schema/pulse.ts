/**
 * ESTI Pulse — Project Standup Engine (P-1: deterministic core).
 * Spec: docs/esti/ESTI-PULSE.md. Generalises `esti_task.dependsOnId` into a
 * dependency graph, records typed missing-parameter gaps, and logs every
 * priority/confidence recalculation for auditability.
 */
import { teamMembers, tasks } from "./hr-work.js";
import { createdAt, id, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "./_helpers.js";

/** Dependency graph edge — supersedes the single `esti_task.dependsOnId` FK. */
export const taskDependencies = pgTable(
  "esti_task_dependency",
  {
    id: id(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    /** BLOCKS | INFORMS | APPROVAL | DOCUMENT (contracts: DependencyType). */
    dependencyType: text("dependency_type").notNull().default("BLOCKS"),
    /** OPEN | RESOLVED. */
    status: text("status").notNull().default("OPEN"),
    createdAt: createdAt(),
  },
  (t) => ({
    edgeIdx: uniqueIndex("esti_task_dependency_edge_idx").on(t.taskId, t.dependsOnTaskId),
  }),
);

/** A typed, assignable information gap on a task (Module 2: Missing Parameter Detector). */
export const taskMissingParameters = pgTable("esti_task_missing_param", {
  id: id(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  /** See contracts MissingParameterType. */
  parameterType: text("parameter_type").notNull(),
  description: text("description"),
  assignedTo: uuid("assigned_to").references(() => teamMembers.id, { onDelete: "set null" }),
  /** OPEN | CONFIRMED | NOT_REQUIRED. */
  status: text("status").notNull().default("OPEN"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** Audit trail for every priority/confidence recalculation — scores must be explainable. */
export const taskPriorityLogs = pgTable("esti_task_priority_log", {
  id: id(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  oldPriorityScore: integer("old_priority_score"),
  newPriorityScore: integer("new_priority_score").notNull(),
  oldConfidenceScore: integer("old_confidence_score"),
  newConfidenceScore: integer("new_confidence_score").notNull(),
  reason: text("reason"),
  createdAt: createdAt(),
});
