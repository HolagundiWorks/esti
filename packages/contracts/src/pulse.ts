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
