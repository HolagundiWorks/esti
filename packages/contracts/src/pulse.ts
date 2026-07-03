import { z } from "zod";

/**
 * ESTI Pulse — Project Standup Engine (P-1: deterministic core).
 * Spec: docs/esti/ESTI-PULSE.md. Deterministic scoring only — no LLM in this
 * module. Available on every plan edition (task hygiene, same tier as the
 * existing `priorityScore`).
 */

/** Task dependency graph edge type. Generalises the single `dependsOnId` FK. */
export const DependencyType = z.enum(["BLOCKS", "INFORMS", "APPROVAL", "DOCUMENT"]);
export type DependencyType = z.infer<typeof DependencyType>;

export const DEPENDENCY_TYPE_LABEL: Record<DependencyType, string> = {
  BLOCKS: "Blocks",
  INFORMS: "Informs",
  APPROVAL: "Needs approval from",
  DOCUMENT: "Needs document from",
};

export const DependencyStatus = z.enum(["OPEN", "RESOLVED"]);
export type DependencyStatus = z.infer<typeof DependencyStatus>;

/**
 * Missing-parameter types. The first group (AUTO) is mechanically detectable
 * from stored task fields — `detectMissingParameters()` raises these
 * automatically. The second group (MANUAL) records business-context gaps a
 * team member observes (client approval, site measurement, consultant input,
 * …) — Module 4's "Team Question Loop" creates these by hand; there is no
 * task field AORMS can infer them from.
 */
export const MissingParameterType = z.enum([
  // AUTO — detected from esti_task columns + the dependency graph.
  "NO_DUE_DATE",
  "NO_ASSIGNEE",
  "STALE_UPDATE",
  "UNRESOLVED_DEPENDENCY",
  "BLOCKED_NO_REASON",
  // MANUAL — recorded by a team member.
  "CLIENT_APPROVAL",
  "CONSULTANT_INPUT",
  "SITE_MEASUREMENT",
  "DRAWING_REFERENCE",
  "BOQ_REFERENCE",
  "VENDOR_DECISION",
  "DOCUMENT_ATTACHMENT",
]);
export type MissingParameterType = z.infer<typeof MissingParameterType>;

/** The subset `detectMissingParameters()` can raise on its own. */
export const AUTO_MISSING_PARAMETER_TYPES = [
  "NO_DUE_DATE",
  "NO_ASSIGNEE",
  "STALE_UPDATE",
  "UNRESOLVED_DEPENDENCY",
  "BLOCKED_NO_REASON",
] as const satisfies readonly MissingParameterType[];

export const MISSING_PARAMETER_LABEL: Record<MissingParameterType, string> = {
  NO_DUE_DATE: "No due date",
  NO_ASSIGNEE: "No assignee",
  STALE_UPDATE: "No recent update",
  UNRESOLVED_DEPENDENCY: "Blocking dependency unresolved",
  BLOCKED_NO_REASON: "Blocked with no recorded reason",
  CLIENT_APPROVAL: "Client approval missing",
  CONSULTANT_INPUT: "Consultant input missing",
  SITE_MEASUREMENT: "Site measurement missing",
  DRAWING_REFERENCE: "Drawing reference missing",
  BOQ_REFERENCE: "BOQ / CMS reference missing",
  VENDOR_DECISION: "Vendor / material decision missing",
  DOCUMENT_ATTACHMENT: "Document not attached",
};

/** Where a missing-parameter type routes by default (Module 4: Team Question Loop). */
export const MISSING_PARAMETER_ROUTE: Record<MissingParameterType, string> = {
  NO_DUE_DATE: "Assignee",
  NO_ASSIGNEE: "Project lead",
  STALE_UPDATE: "Assignee",
  UNRESOLVED_DEPENDENCY: "Owner of the blocking task",
  BLOCKED_NO_REASON: "Assignee",
  CLIENT_APPROVAL: "Project architect",
  CONSULTANT_INPUT: "Project coordinator",
  SITE_MEASUREMENT: "Site engineer",
  DRAWING_REFERENCE: "Drafting lead",
  BOQ_REFERENCE: "Estimation / billing",
  VENDOR_DECISION: "Architect / client coordinator",
  DOCUMENT_ATTACHMENT: "Assignee",
};

export const MissingParameterStatus = z.enum(["OPEN", "CONFIRMED", "NOT_REQUIRED"]);
export type MissingParameterStatus = z.infer<typeof MissingParameterStatus>;

/** Consequence-based priority band — replaces raw priorityScore in every display surface. */
export const PriorityBand = z.enum(["CRITICAL", "ACTION_TODAY", "WATCH", "NORMAL", "BACKLOG"]);
export type PriorityBand = z.infer<typeof PriorityBand>;

export const PRIORITY_BAND_LABEL: Record<PriorityBand, string> = {
  CRITICAL: "Critical",
  ACTION_TODAY: "Action today",
  WATCH: "Watch",
  NORMAL: "Normal",
  BACKLOG: "Backlog",
};

/**
 * Map a 0–100 priorityScore (computeTaskPriority, task.ts) onto a consequence
 * band. Pure function of the stored score — reproducible, no hidden state.
 */
export function bandForScore(score: number): PriorityBand {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "ACTION_TODAY";
  if (score >= 40) return "WATCH";
  if (score >= 20) return "NORMAL";
  return "BACKLOG";
}

/**
 * Confidence score (0–100): a task with missing data must not look healthy.
 * Deterministic factors (Module 6, docs/esti/ESTI-PULSE.md §9):
 *   - Open missing parameters: -12 each, capped at 5 (-60 max)
 *   - Unresolved blocking dependency: -20
 *   - No assignee: -10
 *   - No due date: -5
 *   - Stale (no update ≥7 days): -15; (≥3 days): -5
 * DONE/CANCELLED tasks are always fully confident (100) — there is nothing
 * left to resolve. Clamped to 0–100.
 */
export function computeConfidenceScore(input: {
  status: string;
  openMissingParameterCount: number;
  hasUnresolvedBlockingDependency: boolean;
  hasAssignee: boolean;
  hasDueDate: boolean;
  daysSinceUpdate: number;
}): number {
  if (input.status === "DONE" || input.status === "CANCELLED") return 100;

  let score = 100;
  score -= Math.min(input.openMissingParameterCount, 5) * 12;
  if (input.hasUnresolvedBlockingDependency) score -= 20;
  if (!input.hasAssignee) score -= 10;
  if (!input.hasDueDate) score -= 5;
  if (input.daysSinceUpdate >= 7) score -= 15;
  else if (input.daysSinceUpdate >= 3) score -= 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Missing-parameter detector (Module 2). Pure, deterministic rules over task
 * fields + the dependency graph — never LLM-driven. Returns the AUTO types
 * that currently apply; the caller reconciles this against stored
 * esti_task_missing_param rows (raise new ones, leave MANUAL/resolved rows
 * untouched, close AUTO rows that no longer apply).
 */
export function detectMissingParameters(task: {
  status: string;
  dueDate?: string | null;
  assigneeId?: string | null;
  updatedAt: string | Date;
  hasUnresolvedBlockingDependency: boolean;
  hasAnyMissingParameter: boolean;
}): (typeof AUTO_MISSING_PARAMETER_TYPES)[number][] {
  if (task.status === "DONE" || task.status === "CANCELLED") return [];

  const found: (typeof AUTO_MISSING_PARAMETER_TYPES)[number][] = [];
  if (!task.dueDate) found.push("NO_DUE_DATE");
  if (!task.assigneeId) found.push("NO_ASSIGNEE");

  const updatedMs = new Date(task.updatedAt).getTime();
  const daysSinceUpdate = (Date.now() - updatedMs) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate >= 5) found.push("STALE_UPDATE");

  if (task.hasUnresolvedBlockingDependency) found.push("UNRESOLVED_DEPENDENCY");
  if (task.status === "BLOCKED" && !task.hasUnresolvedBlockingDependency && !task.hasAnyMissingParameter) {
    found.push("BLOCKED_NO_REASON");
  }
  return found;
}

export const DependencyCreate = z.object({
  taskId: z.string().uuid(),
  dependsOnTaskId: z.string().uuid(),
  dependencyType: DependencyType.default("BLOCKS"),
});
export type DependencyCreate = z.infer<typeof DependencyCreate>;

export const MissingParameterCreate = z.object({
  taskId: z.string().uuid(),
  parameterType: MissingParameterType,
  description: z.string().max(500).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
});
export type MissingParameterCreate = z.infer<typeof MissingParameterCreate>;

export const MissingParameterResolve = z.object({
  id: z.string().uuid(),
  status: z.enum(["CONFIRMED", "NOT_REQUIRED"]),
  responseText: z.string().max(1000).optional(),
});
export type MissingParameterResolve = z.infer<typeof MissingParameterResolve>;

/**
 * ESTI Pulse — Project Standup Engine (P-2: standup loop).
 * Module 3 (Project Standup Agent) + Module 4 (Team Question Loop). Zero LLM
 * in this module — question text is template-composed, never generated.
 */

/** The four default daily cycles, plus an operator-triggered one-off run. */
export const StandupSessionType = z.enum([
  "MORNING_PULSE",
  "MIDDAY_BLOCKER",
  "DEPENDENCY_CHECK",
  "CLOSURE_REVIEW",
  "AD_HOC",
]);
export type StandupSessionType = z.infer<typeof StandupSessionType>;

export const STANDUP_SESSION_LABEL: Record<StandupSessionType, string> = {
  MORNING_PULSE: "Morning Project Pulse",
  MIDDAY_BLOCKER: "Midday Blocker Check",
  DEPENDENCY_CHECK: "Dependency Resolution Check",
  CLOSURE_REVIEW: "Closure Review",
  AD_HOC: "Standup",
};

/** Default cycle hour (24h, server-local) — see docs/esti/ESTI-PULSE.md §6. */
export const STANDUP_CYCLE_HOUR: Record<Exclude<StandupSessionType, "AD_HOC">, number> = {
  MORNING_PULSE: 9,
  MIDDAY_BLOCKER: 12,
  DEPENDENCY_CHECK: 15,
  CLOSURE_REVIEW: 18,
};

/** "Please update these before <cutoff>" wording per cycle (Module 3 example). */
export const STANDUP_CUTOFF_LABEL: Record<StandupSessionType, string> = {
  MORNING_PULSE: "midday",
  MIDDAY_BLOCKER: "3 PM",
  DEPENDENCY_CHECK: "6 PM",
  CLOSURE_REVIEW: "tomorrow morning",
  AD_HOC: "end of day",
};

/** Which default cycle (if any) is due at this server-local hour. Pure — no clock reads. */
export function dueStandupCycle(hour: number): Exclude<StandupSessionType, "AD_HOC"> | null {
  for (const type of Object.keys(STANDUP_CYCLE_HOUR) as Exclude<StandupSessionType, "AD_HOC">[]) {
    if (STANDUP_CYCLE_HOUR[type] === hour) return type;
  }
  return null;
}

export const StandupSessionStatus = z.enum(["PENDING", "RUNNING", "COMPLETED", "CANCELLED"]);
export type StandupSessionStatus = z.infer<typeof StandupSessionStatus>;

/** Module 4: response types a team member can give to a standup question. */
export const StandupResponseStatus = z.enum([
  "PENDING",
  "CONFIRMED",
  "BLOCKED",
  "NOT_REQUIRED",
  "NEEDS_REVIEW",
  "ATTACHED_DOCUMENT",
  "COMMENT_ONLY",
]);
export type StandupResponseStatus = z.infer<typeof StandupResponseStatus>;

export const STANDUP_RESPONSE_LABEL: Record<StandupResponseStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  BLOCKED: "Blocked",
  NOT_REQUIRED: "Not required",
  NEEDS_REVIEW: "Needs review",
  ATTACHED_DOCUMENT: "Document attached",
  COMMENT_ONLY: "Comment only",
};

/**
 * A CONFIRMED/NOT_REQUIRED answer resolves the underlying missing-parameter
 * gap; every other response (BLOCKED, NEEDS_REVIEW, ATTACHED_DOCUMENT,
 * COMMENT_ONLY, PENDING) leaves it OPEN but records the update.
 */
export function missingParameterStatusForResponse(
  response: StandupResponseStatus,
): "OPEN" | "CONFIRMED" | "NOT_REQUIRED" {
  if (response === "CONFIRMED") return "CONFIRMED";
  if (response === "NOT_REQUIRED") return "NOT_REQUIRED";
  return "OPEN";
}

/**
 * Module 3 — compose one targeted, grouped standup question. Pure template,
 * never LLM-generated (Design Rule §13: never a generic "please update your
 * tasks"). Mirrors the spec's worked example format exactly.
 */
export function composeStandupQuestion(input: {
  projectTitle: string;
  taskTitle: string;
  missingParameterLabels: string[];
  cutoffLabel: string;
}): string {
  const lines = [
    `Project: ${input.projectTitle}`,
    `Task: ${input.taskTitle}`,
    `Missing:`,
    ...input.missingParameterLabels.map((l, i) => `${i + 1}. ${l}`),
    `Please update ${input.missingParameterLabels.length > 1 ? "these" : "this"} before ${input.cutoffLabel}.`,
  ];
  return lines.join("\n");
}

export const StandupAnswer = z.object({
  questionId: z.string().uuid(),
  responseStatus: z.enum([
    "CONFIRMED",
    "BLOCKED",
    "NOT_REQUIRED",
    "NEEDS_REVIEW",
    "ATTACHED_DOCUMENT",
    "COMMENT_ONLY",
  ]),
  responseText: z.string().max(1000).optional(),
});
export type StandupAnswer = z.infer<typeof StandupAnswer>;

export const StandupRun = z.object({
  projectId: z.string().uuid(),
  sessionType: StandupSessionType.default("AD_HOC"),
});
export type StandupRun = z.infer<typeof StandupRun>;

/**
 * ESTI Pulse — Project Standup Engine (P-3: approval-based action agent).
 * Module 8 Stage 3: the agent PROPOSES; it never writes without a recorded
 * human approval. Two proposal kinds, both mechanically resolvable from
 * existing task/team data — no invented directories, no LLM:
 *   - ESCALATE_QUESTION: an unanswered standup question climbs the ladder.
 *   - CREATE_FOLLOWUP_TASK: a BLOCKED/NEEDS_REVIEW answer spawns a tracked task.
 */

export const PulseActionType = z.enum(["ESCALATE_QUESTION", "CREATE_FOLLOWUP_TASK"]);
export type PulseActionType = z.infer<typeof PulseActionType>;

export const PULSE_ACTION_LABEL: Record<PulseActionType, string> = {
  ESCALATE_QUESTION: "Escalate unanswered question",
  CREATE_FOLLOWUP_TASK: "Create follow-up task",
};

export const PulseActionStatus = z.enum(["PROPOSED", "APPROVED", "REJECTED", "EXECUTED"]);
export type PulseActionStatus = z.infer<typeof PulseActionStatus>;

/** Module 8: escalation ladder rungs — assignee → reviewer → owner. */
export const EscalationRung = z.enum(["ASSIGNEE", "REVIEWER", "OWNER"]);
export type EscalationRung = z.infer<typeof EscalationRung>;

/** Pure ladder step. Returns null once already at OWNER — nowhere further to escalate. */
export function nextEscalationRung(rung: EscalationRung): EscalationRung | null {
  if (rung === "ASSIGNEE") return "REVIEWER";
  if (rung === "REVIEWER") return "OWNER";
  return null;
}

/** A PENDING standup question becomes escalation-eligible once it's sat unanswered this long. */
export function isOverdueForEscalation(
  question: { responseStatus: string; createdAt: string | Date },
  now: Date,
  hoursThreshold = 24,
): boolean {
  if (question.responseStatus !== "PENDING") return false;
  const ageHours = (now.getTime() - new Date(question.createdAt).getTime()) / (1000 * 60 * 60);
  return ageHours >= hoursThreshold;
}

export const PulseActionDecide = z.object({
  id: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
});
export type PulseActionDecide = z.infer<typeof PulseActionDecide>;
