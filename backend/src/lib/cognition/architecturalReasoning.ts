/**
 * AORMS Architectural Reasoning Engine.
 *
 * Predicts a task's likely impact and priority *even when dependency data is
 * missing*. Rather than stopping when predecessors/successors/links are absent,
 * it reasons like an experienced principal architect: architecture workflow
 * templates, project-stage logic, assignee role, task age, meeting proximity,
 * billing linkage, and historical office behaviour.
 *
 * Pure and deterministic — no DB/IO. The cognition layer populates the input
 * from live records; this module turns partial data into useful guidance.
 *
 * Confidence is tracked internally (high/medium/low) and never surfaced as a
 * number or as "low confidence / prediction uncertain" — the dashboard only
 * sees calm guidance.
 */

export type WorkflowStage = "concept" | "design_development" | "execution_drawing" | "site";

export type AssigneeRole =
  | "principal_architect"
  | "senior_architect"
  | "junior_architect"
  | "project_lead"
  | "accounts"
  | "site_coordinator"
  | "other";

export type ImpactArea = "client" | "project" | "team" | "billing" | "site" | "compliance";

export type ReasoningSource =
  | "dependency_graph"
  | "workflow_template"
  | "role_assumption"
  | "task_age"
  | "meeting_proximity"
  | "billing_assumption"
  | "historical_pattern"
  | "principal_architect_simulation";

/** Everything the engine *might* know about a task. All context is optional — that is the point. */
export interface ArchitecturalReasoningInput {
  taskId: string;
  title: string;
  status?: string; // "TODO" | "IN_PROGRESS" | "DONE" | ...
  // Dependency edges (the data that is often missing).
  hasPredecessor?: boolean; // e.g. tasks.dependsOnId is set
  hasSuccessor?: boolean;
  // Context links.
  hasAssignee?: boolean;
  assigneeRole?: AssigneeRole;
  projectStage?: WorkflowStage;
  hasDueDate?: boolean;
  daysToDue?: number; // negative = overdue
  hasClientLink?: boolean;
  hasBillingLink?: boolean;
  hasDrawingLink?: boolean;
  hasMeetingLink?: boolean;
  daysToNearestMeeting?: number; // days until the nearest relevant meeting
  ageDays?: number; // days since the task was last touched
  // Historical office behaviour hints.
  clientDelaysApprovals?: boolean;
  assigneeOftenOverloaded?: boolean;
}

export interface ArchitecturalReasoningOutput {
  taskId: string;
  dependencyStatus: "complete" | "partial" | "missing";
  inferredPredecessors: string[];
  inferredSuccessors: string[];
  likelyImpactAreas: ImpactArea[];
  reasoningSource: ReasoningSource;
  confidence: "high" | "medium" | "low";
  dashboardState: "running_smoothly" | "attention_required" | "urgent_action";
  suggestedAction: string;
  userFacingSummary: string;
}

// ── 1. Dependency completeness ────────────────────────────────────────────────

function dependencyCompleteness(i: ArchitecturalReasoningInput): {
  status: "complete" | "partial" | "missing";
  signalCount: number;
} {
  const signals = [
    i.hasPredecessor,
    i.hasSuccessor,
    i.hasAssignee,
    i.projectStage != null,
    i.hasDueDate,
    i.hasClientLink,
    i.hasBillingLink,
    i.hasDrawingLink,
    i.hasMeetingLink,
  ];
  const signalCount = signals.filter(Boolean).length;
  const hasBothEdges = Boolean(i.hasPredecessor) && Boolean(i.hasSuccessor);
  const hasOneEdge = Boolean(i.hasPredecessor) || Boolean(i.hasSuccessor);

  if (hasBothEdges) return { status: "complete", signalCount };
  if (hasOneEdge || signalCount >= 3) return { status: "partial", signalCount };
  return { status: "missing", signalCount };
}

// ── 2. Workflow-template + keyword sequence inference ─────────────────────────

interface Sequence {
  predecessors: string[];
  successors: string[];
  impact: ImpactArea[];
  stage: WorkflowStage | null;
  matchedKeyword: boolean;
}

const STAGE_IMPACT: Record<WorkflowStage, ImpactArea[]> = {
  concept: ["client", "project"],
  design_development: ["project", "team", "client"],
  execution_drawing: ["project", "team", "billing"],
  site: ["site", "project", "billing"],
};

/** Infer likely previous/next steps from the task title and (if known) the project stage. */
function inferSequence(i: ArchitecturalReasoningInput): Sequence {
  const t = i.title.toLowerCase();
  const rules: { re: RegExp; seq: Omit<Sequence, "matchedKeyword"> }[] = [
    {
      re: /concept|brief|schematic/,
      seq: { predecessors: ["Project brief"], successors: ["Client concept review"], impact: ["client", "project"], stage: "concept" },
    },
    {
      re: /design freeze|material selection|design development/,
      seq: { predecessors: ["Design freeze"], successors: ["Consultant coordination"], impact: ["project", "team", "client"], stage: "design_development" },
    },
    {
      re: /consultant|coordination|structural|mep|services/,
      seq: { predecessors: ["Consultant inputs"], successors: ["Coordinated drawing set"], impact: ["project", "team", "compliance"], stage: "design_development" },
    },
    {
      re: /gfc|good for construction|working drawing|detail|facade|execution drawing|drawing/,
      seq: { predecessors: ["Client design approval"], successors: ["Drawing package release"], impact: ["project", "team", "client"], stage: "execution_drawing" },
    },
    {
      re: /site|rfi|inspection|clarification|query|snag/,
      seq: { predecessors: ["Site query / clarification"], successors: ["Execution & inspection"], impact: ["site", "project"], stage: "site" },
    },
    {
      re: /invoice|bill|payment|milestone/,
      seq: { predecessors: ["Approved billing milestone"], successors: ["Payment follow-up"], impact: ["billing"], stage: null },
    },
    {
      re: /approval|review|sign[- ]?off|submission/,
      seq: { predecessors: ["Submission package"], successors: ["Client approval"], impact: ["client", "project"], stage: null },
    },
    {
      re: /permit|noc|sanction|compliance/,
      seq: { predecessors: ["Compliance submission"], successors: ["Authority approval"], impact: ["compliance", "project"], stage: null },
    },
  ];

  for (const rule of rules) {
    if (rule.re.test(t)) return { ...rule.seq, matchedKeyword: true };
  }

  // No keyword match — fall back to the project stage if known.
  if (i.projectStage) {
    return {
      predecessors: ["Previous stage step"],
      successors: ["Next stage step"],
      impact: STAGE_IMPACT[i.projectStage],
      stage: i.projectStage,
      matchedKeyword: false,
    };
  }
  return { predecessors: ["Previous step"], successors: ["Next step"], impact: ["project"], matchedKeyword: false, stage: null };
}

// ── 3. Role-based impact assumption ───────────────────────────────────────────

const ROLE_IMPACT: Record<AssigneeRole, ImpactArea[]> = {
  principal_architect: ["client", "project", "team", "compliance"],
  senior_architect: ["client", "project", "team"],
  junior_architect: ["project", "team"],
  project_lead: ["project", "client", "team"],
  accounts: ["billing"],
  site_coordinator: ["site", "project"],
  other: ["project"],
};

// ── 6. Billing linkage assumption ─────────────────────────────────────────────

function impliesBilling(i: ArchitecturalReasoningInput): boolean {
  if (i.hasBillingLink) return true;
  return /approval|milestone|drawing release|handover|completion|invoice|bill/.test(i.title.toLowerCase());
}

// ── Engine ────────────────────────────────────────────────────────────────────

function dedupe<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

function shortTitle(title: string): string {
  return title.length > 48 ? `${title.slice(0, 45)}…` : title;
}

export function reasonAboutTask(input: ArchitecturalReasoningInput): ArchitecturalReasoningOutput {
  const dependencyStatus = dependencyCompleteness(input).status;
  const seq = inferSequence(input);
  const billingRisk = impliesBilling(input);

  // ── Impact areas: union of stage/keyword + role + billing + meeting(client) ──
  const impact: ImpactArea[] = [...seq.impact];
  if (input.assigneeRole) impact.push(...ROLE_IMPACT[input.assigneeRole]);
  if (billingRisk) impact.push("billing");
  if (input.hasClientLink || (input.daysToNearestMeeting != null && input.daysToNearestMeeting <= 2)) impact.push("client");
  const likelyImpactAreas = dedupe(impact);

  // ── Pressure signals ──
  const overdue = input.daysToDue != null && input.daysToDue < 0;
  const dueSoon = input.daysToDue != null && input.daysToDue >= 0 && input.daysToDue <= 2;
  const meetingNow = input.daysToNearestMeeting != null && input.daysToNearestMeeting <= 0;
  const meetingSoon = input.daysToNearestMeeting != null && input.daysToNearestMeeting <= 1;
  const isDone = input.status === "DONE";
  const stale = input.ageDays != null && input.ageDays >= 14 && !isDone;
  const historicalMatch =
    (Boolean(input.clientDelaysApprovals) && /approval|review|sign[- ]?off|submission/.test(input.title.toLowerCase())) ||
    Boolean(input.assigneeOftenOverloaded);

  // ── Dominant reasoning source (concrete data wins over assumption) ──
  let reasoningSource: ReasoningSource;
  if (dependencyStatus === "complete") reasoningSource = "dependency_graph";
  else if (historicalMatch) reasoningSource = "historical_pattern";
  else if (meetingSoon) reasoningSource = "meeting_proximity";
  else if (seq.matchedKeyword || input.projectStage) reasoningSource = "workflow_template";
  else if (billingRisk) reasoningSource = "billing_assumption";
  else if (input.assigneeRole) reasoningSource = "role_assumption";
  else if (stale) reasoningSource = "task_age";
  else reasoningSource = "principal_architect_simulation";

  // ── Confidence (internal only) ──
  let confidence: ArchitecturalReasoningOutput["confidence"];
  if (dependencyStatus === "complete" || historicalMatch) confidence = "high";
  else if (reasoningSource === "principal_architect_simulation" || (reasoningSource === "task_age" && !seq.matchedKeyword)) confidence = "low";
  else confidence = "medium";

  // ── Dashboard state ──
  let dashboardState: ArchitecturalReasoningOutput["dashboardState"] = "running_smoothly";
  if (overdue || meetingNow) dashboardState = "urgent_action";
  else if (dueSoon || meetingSoon || stale || billingRisk || dependencyStatus === "missing") dashboardState = "attention_required";

  // Low-confidence assumptions must not become urgent unless deadline/meeting pressure is real.
  const hardPressure = overdue || dueSoon || meetingNow || meetingSoon;
  if (dashboardState === "urgent_action" && confidence === "low" && !hardPressure) {
    dashboardState = "attention_required";
  }
  // A completed task is never an action.
  if (isDone) dashboardState = "running_smoothly";

  // ── Calm guidance ──
  let suggestedAction: string;
  let userFacingSummary: string;
  const short = shortTitle(input.title);

  // Pressure context wins over the generic missing-link nudge (a missing task with a
  // meeting tomorrow should still surface the client-review guidance).
  if (meetingSoon && likelyImpactAreas.includes("client")) {
    suggestedAction = "Prepare ahead of the upcoming client review.";
    userFacingSummary = `${short} may affect the upcoming client review.`;
  } else if (overdue || stale) {
    suggestedAction = "Move this forward or reassign to keep delivery flowing.";
    userFacingSummary = "This has been waiting and may be slowing delivery.";
  } else if (billingRisk) {
    suggestedAction = "Confirm the linked billing milestone.";
    userFacingSummary = "This may affect an upcoming billing milestone.";
  } else if (dependencyStatus === "missing") {
    // §"Missing Data Creates A Task" — a calm hygiene nudge, never blame.
    suggestedAction = "Link the previous or next step to sharpen guidance.";
    userFacingSummary = "Previous or next step missing — task sequence may need review.";
  } else {
    suggestedAction = "Review the task sequence and proceed.";
    userFacingSummary = "Task sequence may need review to improve guidance.";
  }

  return {
    taskId: input.taskId,
    dependencyStatus,
    inferredPredecessors: input.hasPredecessor ? [] : seq.predecessors,
    inferredSuccessors: input.hasSuccessor ? [] : seq.successors,
    likelyImpactAreas,
    reasoningSource,
    confidence,
    dashboardState,
    suggestedAction,
    userFacingSummary,
  };
}
