import type { MilestoneStatus } from "@esti/contracts";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { accessibleProjectIds } from "../../lib/projectAccess.js";
import { todayIso } from "../../lib/dates.js";
import {
  phases,
  projectMilestones,
  projectOffices,
  tasks,
} from "../../db/schema.js";

function computeProgressPct(input: {
  phaseIndex: number;
  phaseCount: number;
  milestonesDone: number;
  milestonesTotal: number;
  tasksDone: number;
  tasksTotal: number;
}): number {
  const phasePct =
    input.phaseCount > 0 ?
      Math.round(((input.phaseIndex + 1) / input.phaseCount) * 100)
    : 0;
  const milestonePct =
    input.milestonesTotal > 0 ?
      Math.round((input.milestonesDone / input.milestonesTotal) * 100)
    : null;
  const taskPct =
    input.tasksTotal > 0 ? Math.round((input.tasksDone / input.tasksTotal) * 100) : null;

  const parts = [phasePct];
  if (milestonePct !== null) parts.push(milestonePct);
  if (taskPct !== null) parts.push(taskPct);
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export async function buildProjectProgrammeSummary(db: DB, projectId: string) {
  const [project] = await db
    .select({
      id: projectOffices.id,
      ref: projectOffices.ref,
      title: projectOffices.title,
      status: projectOffices.status,
      currentPhaseId: projectOffices.currentPhaseId,
      dateStart: projectOffices.dateStart,
    })
    .from(projectOffices)
    .where(eq(projectOffices.id, projectId))
    .limit(1);
  if (!project) return null;

  const phaseRows = await db
    .select()
    .from(phases)
    .where(eq(phases.projectId, projectId))
    .orderBy(asc(phases.sortOrder));

  const currentPhaseIndex = Math.max(
    0,
    phaseRows.findIndex((p) => p.id === project.currentPhaseId),
  );

  const milestoneRows = await db
    .select()
    .from(projectMilestones)
    .where(eq(projectMilestones.projectId, projectId))
    .orderBy(asc(projectMilestones.sortOrder), asc(projectMilestones.targetDate));

  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.dueDate));

  const milestonesDone = milestoneRows.filter((m) => m.status === "DONE").length;
  const tasksDone = taskRows.filter((t) => t.status === "DONE").length;
  const today = todayIso();

  const overdueMilestones = milestoneRows.filter(
    (m) => m.targetDate && m.targetDate < today && m.status !== "DONE",
  );
  const overdueTasks = taskRows.filter(
    (t) => t.dueDate && t.dueDate < today && t.status !== "DONE",
  );

  const upcomingSchedule = [
    ...milestoneRows
      .filter((m) => m.targetDate && m.status !== "DONE")
      .map((m) => ({
        kind: "milestone" as const,
        id: m.id,
        title: m.title,
        date: m.targetDate!,
        status: m.status as MilestoneStatus,
      })),
    ...taskRows
      .filter((t) => t.dueDate && t.status !== "DONE")
      .map((t) => ({
        kind: "task" as const,
        id: t.id,
        title: t.title,
        date: t.dueDate!,
        status: t.status,
        priority: t.priority,
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 20);

  return {
    project,
    phases: phaseRows.map((ph, index) => ({
      ...ph,
      isCurrent: ph.id === project.currentPhaseId,
      isComplete: index < currentPhaseIndex,
    })),
    milestones: milestoneRows,
    taskStats: {
      total: taskRows.length,
      done: tasksDone,
      open: taskRows.length - tasksDone,
      overdue: overdueTasks.length,
    },
    milestoneStats: {
      total: milestoneRows.length,
      done: milestonesDone,
      overdue: overdueMilestones.length,
    },
    scheduleProgressPct: computeProgressPct({
      phaseIndex: currentPhaseIndex,
      phaseCount: phaseRows.length,
      milestonesDone,
      milestonesTotal: milestoneRows.length,
      tasksDone,
      tasksTotal: taskRows.length,
    }),
    upcomingSchedule,
    overdueMilestones,
    overdueTasks: overdueTasks.slice(0, 10),
  };
}

export async function buildProgrammePortfolio(db: DB, user?: { id: string; role: string }) {
  const accessIds = user ? await accessibleProjectIds(db, user) : null;
  const projects = await db
    .select({
      id: projectOffices.id,
      ref: projectOffices.ref,
      title: projectOffices.title,
      status: projectOffices.status,
      currentPhaseId: projectOffices.currentPhaseId,
    })
    .from(projectOffices)
    .where(
      and(
        isNull(projectOffices.archivedAt),
        inArray(projectOffices.status, ["ENQUIRY", "PROPOSAL", "ACTIVE", "ON_HOLD"]),
      ),
    )
    .orderBy(asc(projectOffices.ref));

  const summaries = await Promise.all(
    projects.map(async (p) => {
      if (accessIds && !accessIds.includes(p.id)) return null;
      const summary = await buildProjectProgrammeSummary(db, p.id);
      return summary ?
          {
            id: p.id,
            ref: p.ref,
            title: p.title,
            status: p.status,
            scheduleProgressPct: summary.scheduleProgressPct,
            overdueCount:
              summary.milestoneStats.overdue + summary.taskStats.overdue,
            currentPhaseLabel:
              summary.phases.find((ph) => ph.isCurrent)?.label ?? "—",
          }
        : null;
    }),
  );

  return summaries.filter((s): s is NonNullable<typeof s> => s !== null);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function buildProgrammeGantt(db: DB, projectId: string) {
  const summary = await buildProjectProgrammeSummary(db, projectId);
  if (!summary) return null;

  const projectStart = summary.project.dateStart ?? new Date().toISOString().slice(0, 10);
  const rows: {
    id: string;
    kind: "phase" | "milestone" | "task";
    label: string;
    start: string;
    end: string;
    status: string;
    phaseId?: string;
    assignee?: string;
  }[] = [];

  const phaseCount = summary.phases.length;
  summary.phases.forEach((ph, index) => {
    const span = Math.max(14, Math.floor(180 / Math.max(phaseCount, 1)));
    const start = addDays(projectStart, index * span);
    const end = addDays(start, span - 1);
    rows.push({
      id: ph.id,
      kind: "phase",
      label: ph.label,
      start,
      end,
      status: ph.isComplete ? "COMPLETE" : ph.isCurrent ? "IN_PROGRESS" : "NOT_STARTED",
      phaseId: ph.id,
    });
  });

  for (const m of summary.milestones) {
    if (!m.targetDate) continue;
    rows.push({
      id: m.id,
      kind: "milestone",
      label: m.title,
      start: m.targetDate,
      end: m.targetDate,
      status: m.status,
      phaseId: m.phaseId ?? undefined,
    });
  }

  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      dueDate: tasks.dueDate,
      startDate: tasks.startDate,
      assignee: tasks.assignee,
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  for (const t of taskRows) {
    if (!t.dueDate) continue;
    const end = t.dueDate;
    const start = t.startDate ?? addDays(end, -7);
    rows.push({
      id: t.id,
      kind: "task",
      label: t.title,
      start,
      end,
      status: t.status,
      assignee: t.assignee ?? undefined,
    });
  }

  const dates = rows.flatMap((r) => [r.start, r.end]).sort();
  return {
    rangeStart: dates[0] ?? projectStart,
    rangeEnd: dates[dates.length - 1] ?? addDays(projectStart, 90),
    rows,
  };
}
