/**
 * ESTI Pulse engine — deterministic functions shared by the `pulse` tRPC
 * router and the standup scheduler (backend/src/index.ts). No LLM anywhere
 * in this file. Spec: docs/esti/ESTI-PULSE.md.
 */
import {
  AUTO_MISSING_PARAMETER_TYPES,
  MISSING_PARAMETER_LABEL,
  STANDUP_CUTOFF_LABEL,
  composeStandupQuestion,
  computeConfidenceScore,
  computeTaskPriority,
  detectMissingParameters,
  dueStandupCycle,
  type MissingParameterType,
  type StandupSessionType,
} from "@esti/contracts";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { DB } from "../db/index.js";
import {
  projectOffices,
  standupQuestions,
  standupSessions,
  taskDependencies,
  taskMissingParameters,
  taskPriorityLogs,
  tasks,
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
 * Module 3/4 — run one standup cycle for a project: reconcile gaps, then ask
 * one targeted, grouped question per task that still has open gaps (never a
 * generic "please update your tasks" — Design Rule §13). Each question is
 * asked to the task's assignee (the person doing the work is who can answer
 * status questions about it) and lists every open missing-parameter label.
 */
export async function runStandupForProject(db: DB, opts: { projectId: string; sessionType: StandupSessionType }) {
  const [project] = await db.select().from(projectOffices).where(eq(projectOffices.id, opts.projectId));
  if (!project) throw new Error("Project not found");

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
