/**
 * ESTI Pulse — Project Standup Engine (P-1: deterministic core, P-2: standup
 * loop, P-3: approval-based action agent). Spec: docs/esti/ESTI-PULSE.md.
 * Generalises `esti_task.dependsOnId` into a dependency graph, records typed
 * missing-parameter gaps, logs every priority/confidence recalculation, runs
 * scheduled standup cycles, and proposes escalation/follow-up actions that
 * only execute after a recorded human approval.
 */
import { users } from "./org-auth.js";
import { teamMembers, tasks } from "./hr-work.js";
import { projectOffices } from "./project.js";
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

/** One standup run for a project (Module 3: Project Standup Agent). */
export const standupSessions = pgTable("esti_standup_session", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  /** MORNING_PULSE | MIDDAY_BLOCKER | DEPENDENCY_CHECK | CLOSURE_REVIEW | AD_HOC. */
  sessionType: text("session_type").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  /** PENDING | RUNNING | COMPLETED | CANCELLED. */
  status: text("status").notNull().default("PENDING"),
  createdAt: createdAt(),
});

/** One targeted, grouped question asked of a task's assignee (Module 4: Team Question Loop). */
export const standupQuestions = pgTable("esti_standup_question", {
  id: id(),
  standupSessionId: uuid("standup_session_id")
    .notNull()
    .references(() => standupSessions.id, { onDelete: "cascade" }),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  /** Template-composed — never LLM-generated. */
  questionText: text("question_text").notNull(),
  askedTo: uuid("asked_to").references(() => teamMembers.id, { onDelete: "set null" }),
  /** PENDING | CONFIRMED | BLOCKED | NOT_REQUIRED | NEEDS_REVIEW | ATTACHED_DOCUMENT | COMMENT_ONLY. */
  responseStatus: text("response_status").notNull().default("PENDING"),
  responseText: text("response_text"),
  /** Module 8 escalation ladder position: ASSIGNEE | REVIEWER | OWNER. */
  escalationRung: text("escalation_rung").notNull().default("ASSIGNEE"),
  createdAt: createdAt(),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
});

/**
 * A proposed agent action (Module 8 Stage 3) — never executes until a human
 * approves it. ESCALATE_QUESTION climbs the ladder on an overdue question;
 * CREATE_FOLLOWUP_TASK spawns a tracked task from a BLOCKED/NEEDS_REVIEW answer.
 */
export const pulseActions = pgTable("esti_pulse_action", {
  id: id(),
  /** ESCALATE_QUESTION | CREATE_FOLLOWUP_TASK. */
  actionType: text("action_type").notNull(),
  standupQuestionId: uuid("standup_question_id").references(() => standupQuestions.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  /** Who the executed action would notify/reassign to (escalation target, or the follow-up task's assignee). */
  targetTeamMemberId: uuid("target_team_member_id").references(() => teamMembers.id, { onDelete: "set null" }),
  /** Deterministic, human-readable proposal text — never LLM-generated. */
  description: text("description").notNull(),
  /** PROPOSED | APPROVED | REJECTED | EXECUTED. */
  status: text("status").notNull().default("PROPOSED"),
  decidedById: uuid("decided_by_id").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  createdAt: createdAt(),
});
