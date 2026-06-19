import {
  CONSTRUCTION_SCHEDULE_TEMPLATES,
  PROJECT_TYPE_TO_CONSTRUCTION_TEMPLATE,
  type ConstructionScheduleTemplateKey,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  constructionActivities,
  constructionDependencies,
  constructionSchedules,
  projectOffices,
} from "../../db/schema.js";
import { CpmCycleError, dayOffsetToIso, runCpm } from "./cpm.js";
import { todayIso } from "../../lib/dates.js";

export async function getOrCreateSchedule(db: DB, projectId: string, projectStart?: string) {
  const [existing] = await db
    .select()
    .from(constructionSchedules)
    .where(eq(constructionSchedules.projectId, projectId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(constructionSchedules)
    .values({
      projectId,
      projectStart: projectStart ?? todayIso(),
      status: "DRAFT",
    })
    .returning();
  return created!;
}

export async function loadActivities(db: DB, projectId: string) {
  return db
    .select()
    .from(constructionActivities)
    .where(eq(constructionActivities.projectId, projectId))
    .orderBy(asc(constructionActivities.sortOrder), asc(constructionActivities.wbsCode));
}

export async function loadDependencies(db: DB, projectId: string) {
  return db
    .select()
    .from(constructionDependencies)
    .where(eq(constructionDependencies.projectId, projectId));
}

export async function recalculateAndPersist(db: DB, projectId: string) {
  const schedule = await getOrCreateSchedule(db, projectId);
  const activities = await loadActivities(db, projectId);
  const deps = await loadDependencies(db, projectId);

  if (activities.length === 0) return { schedule, activities: [], criticalCount: 0 };

  try {
    const results = runCpm(
      activities.map((a) => ({ id: a.id, durationDays: a.durationDays })),
      deps.map((d) => ({
        predecessorId: d.predecessorId,
        successorId: d.successorId,
        type: d.type as "FS" | "SS" | "FF" | "SF",
        lagDays: d.lagDays,
      })),
    );

    for (const r of results) {
      const plannedStart = dayOffsetToIso(schedule.projectStart, r.earlyStart);
      const plannedEnd = dayOffsetToIso(schedule.projectStart, r.earlyFinish);
      await db
        .update(constructionActivities)
        .set({
          earlyStart: r.earlyStart,
          earlyFinish: r.earlyFinish,
          lateStart: r.lateStart,
          lateFinish: r.lateFinish,
          totalFloat: r.totalFloat,
          isCritical: r.isCritical,
          plannedStart,
          plannedEnd,
          updatedAt: new Date(),
        })
        .where(eq(constructionActivities.id, r.id));
    }

    const updated = await loadActivities(db, projectId);
    return {
      schedule,
      activities: updated,
      criticalCount: results.filter((r) => r.isCritical).length,
    };
  } catch (e) {
    if (e instanceof CpmCycleError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
    }
    throw e;
  }
}

export async function applyConstructionTemplate(
  db: DB,
  projectId: string,
  templateKey: ConstructionScheduleTemplateKey,
  projectStart?: string,
  force = false,
) {
  const existing = await loadActivities(db, projectId);
  if (existing.length > 0 && !force) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Construction activities already exist. Pass force to replace.",
    });
  }

  if (force && existing.length > 0) {
    await db.delete(constructionDependencies).where(eq(constructionDependencies.projectId, projectId));
    await db.delete(constructionActivities).where(eq(constructionActivities.projectId, projectId));
  }

  const template = CONSTRUCTION_SCHEDULE_TEMPLATES[templateKey];
  const schedule = await getOrCreateSchedule(db, projectId, projectStart);
  if (projectStart) {
    await db
      .update(constructionSchedules)
      .set({ projectStart, templateKey, updatedAt: new Date() })
      .where(eq(constructionSchedules.id, schedule.id));
  } else {
    await db
      .update(constructionSchedules)
      .set({ templateKey, updatedAt: new Date() })
      .where(eq(constructionSchedules.id, schedule.id));
  }

  const wbsToId = new Map<string, string>();
  let sortOrder = 0;
  for (const row of template.activities) {
    const parentId = row.parentWbsCode ? wbsToId.get(row.parentWbsCode) ?? null : null;
    const [inserted] = await db
      .insert(constructionActivities)
      .values({
        projectId,
        scheduleId: schedule.id,
        parentId,
        wbsCode: row.wbsCode,
        title: row.title,
        trade: row.trade,
        location: row.location ?? null,
        durationDays: row.durationDays,
        sortOrder: sortOrder++,
      })
      .returning();
    wbsToId.set(row.wbsCode, inserted!.id);
  }

  for (const dep of template.dependencies) {
    const predecessorId = wbsToId.get(dep.predecessorWbs);
    const successorId = wbsToId.get(dep.successorWbs);
    if (!predecessorId || !successorId) continue;
    await db.insert(constructionDependencies).values({
      projectId,
      predecessorId,
      successorId,
      type: dep.type,
      lagDays: dep.lagDays ?? 0,
    });
  }

  return recalculateAndPersist(db, projectId);
}

export async function resolveTemplateKeyForProject(
  db: DB,
  projectId: string,
  override?: ConstructionScheduleTemplateKey,
): Promise<ConstructionScheduleTemplateKey> {
  if (override) return override;
  const [project] = await db
    .select({ projectType: projectOffices.projectType })
    .from(projectOffices)
    .where(eq(projectOffices.id, projectId))
    .limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });
  return PROJECT_TYPE_TO_CONSTRUCTION_TEMPLATE[project.projectType] ?? "residential_villa";
}

export async function buildConstructionScheduleSummary(db: DB, projectId: string) {
  const [schedule] = await db
    .select()
    .from(constructionSchedules)
    .where(eq(constructionSchedules.projectId, projectId))
    .limit(1);
  if (!schedule) return null;

  const activities = await loadActivities(db, projectId);
  if (activities.length === 0) {
    return {
      schedule,
      activityCount: 0,
      percentComplete: 0,
      criticalCount: 0,
      criticalOverdue: 0,
      baselineEnd: schedule.projectStart,
      varianceDays: 0,
    };
  }

  const today = todayIso();
  const totalPct = Math.round(
    activities.reduce((sum, a) => sum + a.percentComplete, 0) / activities.length,
  );
  const critical = activities.filter((a) => a.isCritical);
  const criticalOverdue = critical.filter(
    (a) => a.plannedEnd && a.plannedEnd < today && a.percentComplete < 100,
  ).length;

  const ends = activities.map((a) => a.plannedEnd).filter(Boolean) as string[];
  const baselineEnd = ends.sort().at(-1) ?? schedule.projectStart;
  const varianceDays =
    baselineEnd < today && totalPct < 100 ?
      Math.ceil(
        (new Date(`${today}T12:00:00Z`).getTime() -
          new Date(`${baselineEnd}T12:00:00Z`).getTime()) /
          86_400_000,
      )
    : 0;

  return {
    schedule,
    activityCount: activities.length,
    percentComplete: totalPct,
    criticalCount: critical.length,
    criticalOverdue,
    baselineEnd,
    varianceDays,
  };
}

export async function buildConstructionSchedulePortfolio(db: DB) {
  const projects = await db
    .select({
      id: projectOffices.id,
      ref: projectOffices.ref,
      title: projectOffices.title,
      pmcEnabled: projectOffices.pmcEnabled,
    })
    .from(projectOffices)
    .where(and(eq(projectOffices.pmcEnabled, true), inArray(projectOffices.status, ["ACTIVE", "ON_HOLD"])))
    .orderBy(asc(projectOffices.ref));

  const summaries = await Promise.all(
    projects.map(async (p) => {
      const summary = await buildConstructionScheduleSummary(db, p.id);
      return summary ?
          {
            id: p.id,
            ref: p.ref,
            title: p.title,
            percentComplete: summary.percentComplete,
            criticalOverdue: summary.criticalOverdue,
            baselineEnd: summary.baselineEnd,
            activityCount: summary.activityCount,
          }
        : {
            id: p.id,
            ref: p.ref,
            title: p.title,
            percentComplete: 0,
            criticalOverdue: 0,
            baselineEnd: null as string | null,
            activityCount: 0,
          };
    }),
  );
  return summaries;
}

export async function buildConstructionGantt(db: DB, projectId: string) {
  const summary = await buildConstructionScheduleSummary(db, projectId);
  if (!summary || summary.activityCount === 0) return null;

  const activities = await loadActivities(db, projectId);
  const rows = activities
    .filter((a) => a.plannedStart && a.plannedEnd)
    .map((a) => ({
      id: a.id,
      wbsCode: a.wbsCode,
      label: a.title,
      trade: a.trade,
      start: a.plannedStart!,
      end: a.plannedEnd!,
      actualStart: a.actualStart,
      actualEnd: a.actualEnd,
      percentComplete: a.percentComplete,
      isCritical: a.isCritical,
      status: a.percentComplete >= 100 ? "COMPLETE" : a.percentComplete > 0 ? "IN_PROGRESS" : "NOT_STARTED",
    }));

  const dates = rows.flatMap((r) => [r.start, r.end, r.actualStart, r.actualEnd].filter(Boolean) as string[]);
  dates.sort();
  return {
    rangeStart: dates[0] ?? summary.schedule.projectStart,
    rangeEnd: dates[dates.length - 1] ?? summary.schedule.projectStart,
    rows,
  };
}

export async function buildCriticalPath(db: DB, projectId: string) {
  const activities = await loadActivities(db, projectId);
  return activities
    .filter((a) => a.isCritical)
    .sort((a, b) => (a.earlyStart ?? 0) - (b.earlyStart ?? 0))
    .map((a) => ({
      id: a.id,
      wbsCode: a.wbsCode,
      title: a.title,
      trade: a.trade,
      plannedStart: a.plannedStart,
      plannedEnd: a.plannedEnd,
      percentComplete: a.percentComplete,
      totalFloat: a.totalFloat,
    }));
}

export async function buildLookahead(db: DB, projectId: string, weeks: number) {
  const today = todayIso();
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + weeks * 7);
  const windowEnd = end.toISOString().slice(0, 10);

  const activities = await loadActivities(db, projectId);
  return activities
    .filter(
      (a) =>
        a.plannedStart &&
        a.plannedStart >= today &&
        a.plannedStart <= windowEnd &&
        a.percentComplete < 100,
    )
    .sort((a, b) => (a.plannedStart ?? "").localeCompare(b.plannedStart ?? ""))
    .map((a) => ({
      id: a.id,
      wbsCode: a.wbsCode,
      title: a.title,
      trade: a.trade,
      plannedStart: a.plannedStart,
      plannedEnd: a.plannedEnd,
      isCritical: a.isCritical,
      constraint: a.isCritical ? "critical" : "upcoming",
    }));
}

export function scheduleProgressPct(summary: Awaited<ReturnType<typeof buildConstructionScheduleSummary>>) {
  if (!summary || summary.activityCount === 0) return 0;
  return summary.percentComplete;
}
