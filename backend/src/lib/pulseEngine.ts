/**
 * ESTI Pulse engine — deterministic functions shared by the `pulse` tRPC
 * router and the standup scheduler (backend/src/index.ts). No LLM anywhere
 * in this file. Spec: docs/esti/ESTI-PULSE.md.
 */
import {
  AUTO_MISSING_PARAMETER_TYPES,
  MISSING_PARAMETER_LABEL,
  PULSE_ACTION_LABEL,
  STANDUP_CUTOFF_LABEL,
  bandForScore,
  composeStandupQuestion,
  computeConfidenceScore,
  computeTaskPriority,
  detectMissingParameters,
  dueStandupCycle,
  isOverdueForEscalation,
  nextEscalationRung,
  type EscalationRung,
  type MissingParameterType,
  type PulseActionType,
  type StandupSessionType,
} from "@esti/contracts";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { writeActivity } from "./activity.js";
import {
  projectOffices,
  pulseActions,
  snags,
  siteVisits,
  standupQuestions,
  standupSessions,
  taskDependencies,
  taskMissingParameters,
  taskPriorityLogs,
  tasks,
  teamMembers,
  users,
} from "../db/schema.js";

export const ACTIVE_STATUS = and(ne(tasks.status, "DONE"), ne(tasks.status, "CANCELLED"));

/** True when a task has at least one OPEN, BLOCKS-type dependency on a task that isn't DONE. */
export async function unresolvedBlockingTaskIds(db: DB, taskIds: string[]) {
  if (taskIds.length === 0) return new Set<string>();
  const rows = await db
    .select({ taskId: taskDependencies.taskId, dependsOnStatus: tasks.status })
    .from(taskDependencies)
    .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnTaskId))
    .where(
      and(
        inArray(taskDependencies.taskId, taskIds),
        eq(taskDependencies.dependencyType, "BLOCKS"),
        eq(taskDependencies.status, "OPEN"),
      ),
    );
  const blocked = new Set<string>();
  for (const r of rows) {
    if (r.dependsOnStatus !== "DONE") blocked.add(r.taskId);
  }
  return blocked;
}

/**
 * Module 2 — reconcile AUTO missing-parameter rows against current task
 * state: raise newly-detected gaps, auto-close AUTO rows whose condition no
 * longer holds. MANUAL rows are never touched — only a human resolves those.
 */
export async function reconcileMissingParameters(db: DB, opts: { projectId?: string } = {}) {
  const filters = [ACTIVE_STATUS];
  if (opts.projectId) filters.push(eq(tasks.projectId, opts.projectId));
  const active = await db
    .select({
      id: tasks.id,
      status: tasks.status,
      dueDate: tasks.dueDate,
      assigneeId: tasks.assigneeId,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(and(...filters));

  const taskIds = active.map((t) => t.id);
  const blockedIds = await unresolvedBlockingTaskIds(db, taskIds);

  const existing = taskIds.length
    ? await db
        .select()
        .from(taskMissingParameters)
        .where(and(inArray(taskMissingParameters.taskId, taskIds), eq(taskMissingParameters.status, "OPEN")))
    : [];
  const existingByTask = new Map<string, typeof existing>();
  for (const row of existing) {
    const list = existingByTask.get(row.taskId) ?? [];
    list.push(row);
    existingByTask.set(row.taskId, list);
  }

  let raised = 0;
  let closed = 0;
  for (const t of active) {
    const openForTask = existingByTask.get(t.id) ?? [];
    const openAutoTypes = new Set(
      openForTask
        .filter((r) => (AUTO_MISSING_PARAMETER_TYPES as readonly string[]).includes(r.parameterType))
        .map((r) => r.parameterType),
    );
    const hasAnyMissingParameter = openForTask.length > 0;

    const detected = detectMissingParameters({
      status: t.status,
      dueDate: t.dueDate,
      assigneeId: t.assigneeId,
      updatedAt: t.updatedAt,
      hasUnresolvedBlockingDependency: blockedIds.has(t.id),
      hasAnyMissingParameter,
    });
    const detectedSet = new Set<string>(detected);

    const toRaise = detected.filter((type) => !openAutoTypes.has(type));
    if (toRaise.length) {
      await db.insert(taskMissingParameters).values(toRaise.map((parameterType) => ({ taskId: t.id, parameterType })));
      raised += toRaise.length;
    }

    const toClose = openForTask.filter(
      (r) => (AUTO_MISSING_PARAMETER_TYPES as readonly string[]).includes(r.parameterType) && !detectedSet.has(r.parameterType),
    );
    if (toClose.length) {
      await db
        .update(taskMissingParameters)
        .set({ status: "NOT_REQUIRED", resolvedAt: new Date() })
        .where(inArray(taskMissingParameters.id, toClose.map((r) => r.id)));
      closed += toClose.length;
    }
  }

  return { scanned: active.length, raised, closed };
}

/**
 * Module 5/6 — recompute priorityScore + confidenceScore for active tasks
 * and log every change. Run `reconcileMissingParameters` first so
 * open-parameter counts are current.
 */
export async function recomputeScores(db: DB, opts: { projectId?: string } = {}) {
  const filters = [ACTIVE_STATUS];
  if (opts.projectId) filters.push(eq(tasks.projectId, opts.projectId));
  const active = await db
    .select({
      id: tasks.id,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      assigneeId: tasks.assigneeId,
      workType: tasks.workType,
      interventionRequired: tasks.interventionRequired,
      priorityScore: tasks.priorityScore,
      confidenceScore: tasks.confidenceScore,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(and(...filters));

  const taskIds = active.map((t) => t.id);
  const blockedIds = await unresolvedBlockingTaskIds(db, taskIds);

  const openParams = taskIds.length
    ? await db
        .select({ taskId: taskMissingParameters.taskId })
        .from(taskMissingParameters)
        .where(and(inArray(taskMissingParameters.taskId, taskIds), eq(taskMissingParameters.status, "OPEN")))
    : [];
  const openCountByTask = new Map<string, number>();
  for (const r of openParams) {
    openCountByTask.set(r.taskId, (openCountByTask.get(r.taskId) ?? 0) + 1);
  }

  let updated = 0;
  for (const t of active) {
    const newPriorityScore = computeTaskPriority(t);
    const daysSinceUpdate = (Date.now() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const newConfidenceScore = computeConfidenceScore({
      status: t.status,
      openMissingParameterCount: openCountByTask.get(t.id) ?? 0,
      hasUnresolvedBlockingDependency: blockedIds.has(t.id),
      hasAssignee: !!t.assigneeId,
      hasDueDate: !!t.dueDate,
      daysSinceUpdate,
    });

    if (newPriorityScore === t.priorityScore && newConfidenceScore === t.confidenceScore) continue;

    await db.update(tasks).set({ priorityScore: newPriorityScore, confidenceScore: newConfidenceScore }).where(eq(tasks.id, t.id));
    await db.insert(taskPriorityLogs).values({
      taskId: t.id,
      oldPriorityScore: t.priorityScore,
      newPriorityScore,
      oldConfidenceScore: t.confidenceScore,
      newConfidenceScore,
      reason: "pulse.recompute",
    });
    updated++;
  }

  return { scanned: active.length, updated };
}

/**
 * Site-delivery signals → MANUAL `SITE_MEASUREMENT` gaps on construction-support
 * tasks. Fires when a project has a visit today or open snags.
 */
export async function reconcileSiteSignals(db: DB, opts: { projectId?: string } = {}) {
  const visitRows = await db
    .selectDistinct({ projectId: siteVisits.projectId })
    .from(siteVisits)
    .where(and(sql`${siteVisits.plannedDate} = CURRENT_DATE`, ne(siteVisits.status, "CANCELLED")));

  const snagRows = await db
    .selectDistinct({ projectId: snags.projectId })
    .from(snags)
    .where(inArray(snags.status, ["OPEN", "IN_PROGRESS"]));

  let projectIds = new Set([...visitRows, ...snagRows].map((r) => r.projectId));
  if (opts.projectId) {
    if (!projectIds.has(opts.projectId)) return { projects: 0, raised: 0 };
    projectIds = new Set([opts.projectId]);
  }
  if (projectIds.size === 0) return { projects: 0, raised: 0 };

  const pidList = [...projectIds];
  const siteTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(inArray(tasks.projectId, pidList), ACTIVE_STATUS, eq(tasks.workType, "CONSTRUCTION_SUPPORT")));

  const taskIds = siteTasks.map((t) => t.id);
  if (taskIds.length === 0) return { projects: projectIds.size, raised: 0 };

  const openSiteGaps = await db
    .select({ taskId: taskMissingParameters.taskId })
    .from(taskMissingParameters)
    .where(
      and(
        inArray(taskMissingParameters.taskId, taskIds),
        eq(taskMissingParameters.parameterType, "SITE_MEASUREMENT"),
        eq(taskMissingParameters.status, "OPEN"),
      ),
    );
  const hasGap = new Set(openSiteGaps.map((r) => r.taskId));
  const toRaise = taskIds.filter((id) => !hasGap.has(id));
  if (toRaise.length) {
    await db
      .insert(taskMissingParameters)
      .values(toRaise.map((taskId) => ({ taskId, parameterType: "SITE_MEASUREMENT" as const })));
  }
  return { projects: projectIds.size, raised: toRaise.length };
}

/** Reconcile site signals + AUTO gaps, then recompute Pulse scores. */
export async function refreshPulseScores(db: DB, opts: { projectId?: string } = {}) {
  await reconcileSiteSignals(db, opts);
  await reconcileMissingParameters(db, opts);
  return recomputeScores(db, opts);
}

/** Top-N ESTI-prioritised active tasks from stored scores (no recompute). */
export async function queryPrioritizedTasks(db: DB, limit = 3, opts: { projectId?: string } = {}) {
  const filters = [ACTIVE_STATUS];
  if (opts.projectId) filters.push(eq(tasks.projectId, opts.projectId));

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      projectId: tasks.projectId,
      projectRef: projectOffices.ref,
      projectTitle: projectOffices.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      priorityScore: tasks.priorityScore,
      confidenceScore: tasks.confidenceScore,
      workType: tasks.workType,
    })
    .from(tasks)
    .leftJoin(projectOffices, eq(projectOffices.id, tasks.projectId))
    .where(and(...filters))
    .orderBy(desc(tasks.priorityScore))
    .limit(limit);

  const taskIds = rows.map((r) => r.id);
  const gapRows = taskIds.length
    ? await db
        .select({
          taskId: taskMissingParameters.taskId,
          parameterType: taskMissingParameters.parameterType,
        })
        .from(taskMissingParameters)
        .where(and(inArray(taskMissingParameters.taskId, taskIds), eq(taskMissingParameters.status, "OPEN")))
    : [];

  const gapsByTask = new Map<string, MissingParameterType[]>();
  for (const g of gapRows) {
    const list = gapsByTask.get(g.taskId) ?? [];
    list.push(g.parameterType as MissingParameterType);
    gapsByTask.set(g.taskId, list);
  }

  return rows.map((r) => {
    const openGaps = gapsByTask.get(r.id) ?? [];
    return {
      ...r,
      band: bandForScore(r.priorityScore),
      openGaps,
      gapSummary: openGaps.map((t) => MISSING_PARAMETER_LABEL[t]).join(" · ") || null,
    };
  });
}

/** Top-N ESTI-prioritised active tasks after a fresh Pulse refresh. */
export async function loadPrioritizedTasks(db: DB, limit = 3, opts: { projectId?: string } = {}) {
  await refreshPulseScores(db, opts);
  return queryPrioritizedTasks(db, limit, opts);
}

/**
 * Module 3/4 — run one standup cycle for a project: reconcile gaps, then ask
 * one targeted, grouped question per task that still has open gaps (never a
 * generic "please update your tasks" — Design Rule §13). Each question is
 * asked to the task's assignee (the person doing the work is who can answer
 * status questions about it) and lists every open missing-parameter label.
 */
export async function runStandupForProject(db: DB, opts: { projectId: string; sessionType: StandupSessionType }) {
  const [project] = await db.select().from(projectOffices).where(eq(projectOffices.id, opts.projectId));
  if (!project) throw new Error("Project not found");

  await reconcileSiteSignals(db, { projectId: opts.projectId });
  await reconcileMissingParameters(db, { projectId: opts.projectId });

  const activeTasks = await db
    .select({ id: tasks.id, title: tasks.title, assigneeId: tasks.assigneeId })
    .from(tasks)
    .where(and(ACTIVE_STATUS, eq(tasks.projectId, opts.projectId)));

  const taskIds = activeTasks.map((t) => t.id);
  const openParams = taskIds.length
    ? await db
        .select()
        .from(taskMissingParameters)
        .where(and(inArray(taskMissingParameters.taskId, taskIds), eq(taskMissingParameters.status, "OPEN")))
    : [];
  const openByTask = new Map<string, typeof openParams>();
  for (const p of openParams) {
    const list = openByTask.get(p.taskId) ?? [];
    list.push(p);
    openByTask.set(p.taskId, list);
  }

  const [session] = await db
    .insert(standupSessions)
    .values({
      projectId: opts.projectId,
      sessionType: opts.sessionType,
      scheduledAt: new Date(),
      startedAt: new Date(),
      status: "RUNNING",
    })
    .returning();
  if (!session) throw new Error("Failed to create standup session");

  const cutoff = STANDUP_CUTOFF_LABEL[opts.sessionType];
  let questionCount = 0;
  for (const t of activeTasks) {
    const gaps = openByTask.get(t.id);
    if (!gaps || gaps.length === 0) continue;

    const questionText = composeStandupQuestion({
      projectTitle: project.title,
      taskTitle: t.title,
      missingParameterLabels: gaps.map((g) => MISSING_PARAMETER_LABEL[g.parameterType as MissingParameterType] ?? g.parameterType),
      cutoffLabel: cutoff,
    });

    await db.insert(standupQuestions).values({
      standupSessionId: session.id,
      taskId: t.id,
      questionText,
      askedTo: t.assigneeId,
      responseStatus: "PENDING",
    });
    questionCount++;
  }

  if (questionCount === 0) {
    await db
      .update(standupSessions)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(standupSessions.id, session.id));
  }

  return { session, questionCount };
}

/**
 * Best-effort scheduler entry point — call every few minutes from the server
 * bootstrap (backend/src/index.ts). Fires the standup cycle whose default
 * hour matches the current server-local hour, once per project per day
 * (idempotent — checks for an existing session of that type/date first).
 * Server-local time, not per-firm timezone-aware; a documented v1 limit.
 */
export async function runDueStandups(db: DB, now: Date = new Date()) {
  const cycleType = dueStandupCycle(now.getHours());
  if (!cycleType) return { triggered: 0 };

  const activeProjectRows = await db
    .selectDistinct({ id: projectOffices.id })
    .from(projectOffices)
    .innerJoin(tasks, and(eq(tasks.projectId, projectOffices.id), ACTIVE_STATUS));

  let triggered = 0;
  for (const p of activeProjectRows) {
    const already = await db
      .select({ id: standupSessions.id })
      .from(standupSessions)
      .where(
        and(
          eq(standupSessions.projectId, p.id),
          eq(standupSessions.sessionType, cycleType),
          sql`${standupSessions.scheduledAt}::date = ${now.toISOString().slice(0, 10)}::date`,
        ),
      )
      .limit(1);
    if (already.length) continue;

    await runStandupForProject(db, { projectId: p.id, sessionType: cycleType });
    triggered++;
  }
  return { triggered };
}

/** The team member linked to the firm's single OWNER-role user, if any. */
async function resolveOwnerTeamMemberId(db: DB): Promise<string | null> {
  const [row] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(and(eq(users.role, "OWNER"), eq(teamMembers.active, true)))
    .limit(1);
  return row?.id ?? null;
}

/** The team member id at a given escalation rung for a question's task, or null if unresolvable. */
async function resolveRungTarget(
  db: DB,
  rung: EscalationRung,
  task: { assigneeId: string | null; reviewerId: string | null },
): Promise<string | null> {
  if (rung === "ASSIGNEE") return task.assigneeId;
  if (rung === "REVIEWER") return task.reviewerId;
  return resolveOwnerTeamMemberId(db);
}

/**
 * Module 8 Stage 3 — propose escalating standup questions that have sat
 * PENDING past the threshold. Never escalates twice for the same question
 * while a proposal is still outstanding, and never proposes escalating to a
 * rung with no resolvable target (e.g. no reviewer set) or the same person
 * already holding the question.
 */
export async function proposeEscalations(db: DB, opts: { hoursThreshold?: number; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const hoursThreshold = opts.hoursThreshold ?? 24;

  const pending = await db
    .select({
      id: standupQuestions.id,
      taskId: standupQuestions.taskId,
      askedTo: standupQuestions.askedTo,
      escalationRung: standupQuestions.escalationRung,
      responseStatus: standupQuestions.responseStatus,
      createdAt: standupQuestions.createdAt,
    })
    .from(standupQuestions)
    .where(eq(standupQuestions.responseStatus, "PENDING"));

  const overdue = pending.filter((q) => isOverdueForEscalation(q, now, hoursThreshold));
  if (overdue.length === 0) return { proposed: 0 };

  const taskIds = [...new Set(overdue.map((q) => q.taskId))];
  const taskRows = taskIds.length
    ? await db.select({ id: tasks.id, title: tasks.title, assigneeId: tasks.assigneeId, reviewerId: tasks.reviewerId }).from(tasks).where(inArray(tasks.id, taskIds))
    : [];
  const taskById = new Map(taskRows.map((t) => [t.id, t]));

  const existingProposals = overdue.length
    ? await db
        .select({ standupQuestionId: pulseActions.standupQuestionId })
        .from(pulseActions)
        .where(
          and(
            eq(pulseActions.actionType, "ESCALATE_QUESTION" satisfies PulseActionType),
            eq(pulseActions.status, "PROPOSED"),
            inArray(pulseActions.standupQuestionId, overdue.map((q) => q.id)),
          ),
        )
    : [];
  const alreadyProposed = new Set(existingProposals.map((r) => r.standupQuestionId));

  let proposed = 0;
  for (const q of overdue) {
    if (alreadyProposed.has(q.id)) continue;
    const rung = (q.escalationRung as EscalationRung) ?? "ASSIGNEE";
    const nextRung = nextEscalationRung(rung);
    if (!nextRung) continue; // already at OWNER — nowhere further to go

    const task = taskById.get(q.taskId);
    if (!task) continue;
    const target = await resolveRungTarget(db, nextRung, task);
    if (!target || target === q.askedTo) continue;

    await db.insert(pulseActions).values({
      actionType: "ESCALATE_QUESTION" satisfies PulseActionType,
      standupQuestionId: q.id,
      taskId: q.taskId,
      targetTeamMemberId: target,
      description: `${PULSE_ACTION_LABEL.ESCALATE_QUESTION}: "${task.title}" has been unanswered for ${hoursThreshold}h+ — escalate to ${nextRung.toLowerCase()}.`,
    });
    proposed++;
  }
  return { proposed };
}

/**
 * Module 8 Stage 3 — propose a follow-up task for every standup question
 * answered BLOCKED or NEEDS_REVIEW that doesn't already have one proposed.
 */
export async function proposeFollowupTasks(db: DB, opts: { projectId?: string } = {}) {
  const filters = [or(eq(standupQuestions.responseStatus, "BLOCKED"), eq(standupQuestions.responseStatus, "NEEDS_REVIEW"))];
  const flagged = await db
    .select({ id: standupQuestions.id, taskId: standupQuestions.taskId, responseText: standupQuestions.responseText })
    .from(standupQuestions)
    .where(and(...filters));
  if (flagged.length === 0) return { proposed: 0 };

  const taskIds = [...new Set(flagged.map((q) => q.taskId))];
  const taskRows = await db
    .select({ id: tasks.id, title: tasks.title, projectId: tasks.projectId, assigneeId: tasks.assigneeId })
    .from(tasks)
    .where(
      opts.projectId
        ? and(inArray(tasks.id, taskIds), eq(tasks.projectId, opts.projectId))
        : inArray(tasks.id, taskIds),
    );
  const taskById = new Map(taskRows.map((t) => [t.id, t]));

  const existingProposals = await db
    .select({ standupQuestionId: pulseActions.standupQuestionId })
    .from(pulseActions)
    .where(
      and(
        eq(pulseActions.actionType, "CREATE_FOLLOWUP_TASK" satisfies PulseActionType),
        inArray(
          pulseActions.standupQuestionId,
          flagged.map((q) => q.id),
        ),
      ),
    );
  const alreadyProposed = new Set(existingProposals.map((r) => r.standupQuestionId));

  let proposed = 0;
  for (const q of flagged) {
    if (alreadyProposed.has(q.id)) continue;
    const task = taskById.get(q.taskId);
    if (!task) continue;

    await db.insert(pulseActions).values({
      actionType: "CREATE_FOLLOWUP_TASK" satisfies PulseActionType,
      standupQuestionId: q.id,
      taskId: task.id,
      targetTeamMemberId: task.assigneeId,
      description: `${PULSE_ACTION_LABEL.CREATE_FOLLOWUP_TASK}: "${task.title}" was reported blocked${q.responseText ? ` — "${q.responseText}"` : ""}.`,
    });
    proposed++;
  }
  return { proposed };
}

/** Run both P-3 proposal sweeps together — used by the scheduler tick. */
export async function proposePulseActions(db: DB, opts: { hoursThreshold?: number; now?: Date } = {}) {
  const [escalations, followups] = await Promise.all([proposeEscalations(db, opts), proposeFollowupTasks(db)]);
  return { escalationsProposed: escalations.proposed, followupsProposed: followups.proposed };
}

/**
 * Module 8 Stage 3 gate: no agent write without a recorded human approval.
 * REJECTED just records the decision. APPROVED executes immediately —
 * ESCALATE_QUESTION reassigns the question and advances its rung;
 * CREATE_FOLLOWUP_TASK inserts a new task in the same project — then marks
 * the action EXECUTED.
 */
export async function decidePulseAction(
  db: DB,
  opts: { id: string; decision: "APPROVED" | "REJECTED"; decidedById: string },
) {
  const [action] = await db.select().from(pulseActions).where(eq(pulseActions.id, opts.id));
  if (!action) throw new Error("Pulse action not found");
  if (action.status !== "PROPOSED") throw new Error("Pulse action already decided");

  await db
    .update(pulseActions)
    .set({ status: opts.decision, decidedById: opts.decidedById, decidedAt: new Date() })
    .where(eq(pulseActions.id, opts.id));

  if (opts.decision === "REJECTED") return { ...action, status: "REJECTED" as const };

  if (action.actionType === ("ESCALATE_QUESTION" satisfies PulseActionType) && action.standupQuestionId) {
    const [question] = await db.select().from(standupQuestions).where(eq(standupQuestions.id, action.standupQuestionId));
    if (question) {
      const nextRung = nextEscalationRung((question.escalationRung as EscalationRung) ?? "ASSIGNEE");
      await db
        .update(standupQuestions)
        .set({ askedTo: action.targetTeamMemberId, escalationRung: nextRung ?? question.escalationRung })
        .where(eq(standupQuestions.id, question.id));
      const [task] = await db.select().from(tasks).where(eq(tasks.id, question.taskId));
      if (task?.projectId) {
        await writeActivity(db, {
          projectId: task.projectId,
          objectType: "task",
          objectId: task.id,
          eventType: "pulse.question_escalated",
          summary: `Standup question on "${task.title}" escalated to ${nextRung?.toLowerCase() ?? "owner"}`,
          metadata: { standupQuestionId: question.id, rung: nextRung },
        });
      }
    }
  } else if (action.actionType === ("CREATE_FOLLOWUP_TASK" satisfies PulseActionType) && action.taskId) {
    const [sourceTask] = await db.select().from(tasks).where(eq(tasks.id, action.taskId));
    if (sourceTask) {
      const [created] = await db
        .insert(tasks)
        .values({
          title: `Resolve blocker: ${sourceTask.title}`,
          projectId: sourceTask.projectId,
          assigneeId: action.targetTeamMemberId ?? sourceTask.assigneeId,
          priority: "HIGH",
          status: "TODO",
        })
        .returning();
      if (created && sourceTask.projectId) {
        await writeActivity(db, {
          projectId: sourceTask.projectId,
          objectType: "task",
          objectId: created.id,
          eventType: "pulse.followup_task_created",
          summary: `Follow-up task created from "${sourceTask.title}"`,
          metadata: { sourceTaskId: sourceTask.id, pulseActionId: action.id },
        });
      }
    }
  }

  await db.update(pulseActions).set({ status: "EXECUTED", executedAt: new Date() }).where(eq(pulseActions.id, opts.id));
  return { ...action, status: "EXECUTED" as const };
}
