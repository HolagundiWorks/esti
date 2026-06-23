import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  contractorSubmissions,
  inspections,
  permits,
  phaseProgress,
  phases,
  progressReports,
  projectOffices,
  runningBills,
  snags,
  siteInstructions,
} from "../../db/schema.js";
import { accessibleProjectIds } from "../../lib/projectAccess.js";
import { todayIso } from "../../lib/dates.js";
import { getOrgSettings } from "../../lib/settings.js";
import { buildProjectProgrammeSummary } from "../programme/readModels.js";
import {
  buildConstructionScheduleSummary,
  scheduleProgressPct,
} from "../construction-schedule/readModels.js";

export async function buildPmcSummary(db: DB, projectId: string) {
  const settings = await getOrgSettings(db);
  const [project] = await db
    .select({
      id: projectOffices.id,
      ref: projectOffices.ref,
      title: projectOffices.title,
      pmcEnabled: projectOffices.pmcEnabled,
      currentPhaseId: projectOffices.currentPhaseId,
    })
    .from(projectOffices)
    .where(eq(projectOffices.id, projectId))
    .limit(1);
  if (!project) return null;

  const programme = await buildProjectProgrammeSummary(db, projectId);
  const constructionSchedule = await buildConstructionScheduleSummary(db, projectId);

  const constructionRows = await db
    .select({
      id: contractorSubmissions.id,
      kind: contractorSubmissions.kind,
      subject: contractorSubmissions.subject,
      status: contractorSubmissions.status,
      createdAt: contractorSubmissions.createdAt,
    })
    .from(contractorSubmissions)
    .where(
      and(
        eq(contractorSubmissions.projectId, projectId),
        inArray(contractorSubmissions.status, ["OPEN", "ACKNOWLEDGED"]),
      ),
    )
    .orderBy(desc(contractorSubmissions.createdAt));

  const openByKind = constructionRows.reduce(
    (acc, r) => {
      acc[r.kind] = (acc[r.kind] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const snagRows = await db
    .select()
    .from(snags)
    .where(and(eq(snags.projectId, projectId), ne(snags.status, "CLOSED")))
    .orderBy(asc(snags.dueDate));

  const runningBillRows = await db
    .select({
      id: runningBills.id,
      ref: runningBills.ref,
      title: runningBills.title,
      status: runningBills.status,
      measurementDate: runningBills.measurementDate,
      createdAt: runningBills.createdAt,
    })
    .from(runningBills)
    .where(and(eq(runningBills.projectId, projectId), ne(runningBills.status, "SENT_TO_CLIENT")))
    .orderBy(desc(runningBills.createdAt));

  const [latestInspection] = await db
    .select({
      id: inspections.id,
      ref: inspections.ref,
      dateVisit: inspections.dateVisit,
      progress: inspections.progress,
    })
    .from(inspections)
    .where(eq(inspections.projectId, projectId))
    .orderBy(desc(inspections.dateVisit))
    .limit(1);

  const today = todayIso();
  const permitRows = await db
    .select({
      id: permits.id,
      permitType: permits.permitType,
      status: permits.status,
      dueDate: permits.dateDue,
    })
    .from(permits)
    .where(eq(permits.projectId, projectId));

  const permitsDueSoon = permitRows.filter(
    (p) => p.dueDate && p.dueDate >= today && p.status !== "APPROVED",
  );
  const permitsOverdue = permitRows.filter(
    (p) => p.dueDate && p.dueDate < today && p.status !== "APPROVED",
  );

  const openItems = [
    ...constructionRows.map((c) => ({
      kind: "construction" as const,
      id: c.id,
      title: c.subject,
      subtype: c.kind,
      status: c.status,
      date: c.createdAt.toISOString().slice(0, 10),
    })),
    ...snagRows
      .filter((s) => s.dueDate)
      .map((s) => ({
        kind: "snag" as const,
        id: s.id,
        title: s.description.slice(0, 120),
        subtype: s.trade ?? "Snag",
        status: s.status,
        date: s.dueDate!,
      })),
    ...runningBillRows.map((rb) => ({
      kind: "running_bill" as const,
      id: rb.id,
      title: `${rb.ref} · ${rb.title}`,
      subtype: rb.status,
      status: rb.status,
      date: rb.measurementDate ?? rb.createdAt.toISOString().slice(0, 10),
    })),
    ...(programme?.upcomingSchedule ?? []).map((u) => ({
      kind: u.kind,
      id: u.id,
      title: u.title,
      subtype: u.kind,
      status: u.status,
      date: u.date,
    })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 25);

  const phaseRows = programme?.phases ?? [];
  const currentPhase = phaseRows.find((p) => p.isCurrent);
  const liveStages =
    currentPhase ?
      await db
        .select()
        .from(phaseProgress)
        .where(eq(phaseProgress.phaseId, currentPhase.id))
        .orderBy(asc(phaseProgress.sortOrder))
    : [];

  return {
    enabled: settings.pmcEnabled && project.pmcEnabled,
    firmPmcEnabled: settings.pmcEnabled,
    projectPmcEnabled: project.pmcEnabled,
    project,
    programme: programme ?
      {
        scheduleProgressPct: programme.scheduleProgressPct,
        milestoneStats: programme.milestoneStats,
        taskStats: programme.taskStats,
        phases: programme.phases,
        upcomingSchedule: programme.upcomingSchedule,
      }
    : null,
    constructionSchedule: constructionSchedule ?
      {
        percentComplete: constructionSchedule.percentComplete,
        activityCount: constructionSchedule.activityCount,
        criticalCount: constructionSchedule.criticalCount,
        criticalOverdue: constructionSchedule.criticalOverdue,
        baselineEnd: constructionSchedule.baselineEnd,
        varianceDays: constructionSchedule.varianceDays,
        status: constructionSchedule.schedule.status,
      }
    : null,
    construction: {
      openTotal: constructionRows.length,
      openByKind,
      recent: constructionRows.slice(0, 8),
    },
    snags: {
      open: snagRows.length,
      overdue: snagRows.filter((s) => s.dueDate && s.dueDate < today).length,
      items: snagRows.slice(0, 10),
    },
    runningBills: {
      open: runningBillRows.length,
      items: runningBillRows.slice(0, 8),
    },
    inspections: {
      latest: latestInspection ?? null,
    },
    permits: {
      dueSoon: permitsDueSoon.length,
      overdue: permitsOverdue.length,
      items: [...permitsOverdue, ...permitsDueSoon].slice(0, 6),
    },
    liveStages,
    openItems,
    healthScore: Math.max(
      0,
      100 -
        (constructionSchedule?.criticalOverdue ?? 0) * 6 -
        (constructionSchedule?.varianceDays ?? 0) * 2 -
        (programme?.milestoneStats.overdue ?? 0) * 2 -
        snagRows.filter((s) => s.dueDate && s.dueDate < today).length * 4 -
        permitsOverdue.length * 5 -
        constructionRows.filter((c) => c.kind === "NCR").length * 8,
    ),
  };
}

export async function buildPmcPortfolio(db: DB, user?: { id: string; role: string }) {
  const settings = await getOrgSettings(db);
  if (!settings.pmcEnabled) return [];
  const accessIds = user ? await accessibleProjectIds(db, user) : null;

  const projects = await db
    .select({
      id: projectOffices.id,
      ref: projectOffices.ref,
      title: projectOffices.title,
      status: projectOffices.status,
    })
    .from(projectOffices)
    .where(
      and(
        eq(projectOffices.pmcEnabled, true),
        isNull(projectOffices.archivedAt),
        inArray(projectOffices.status, ["ENQUIRY", "PROPOSAL", "ACTIVE", "ON_HOLD"]),
      ),
    )
    .orderBy(asc(projectOffices.ref));

  const summaries = await Promise.all(
    projects.map(async (p) => {
      if (accessIds && !accessIds.includes(p.id)) return null;
      const s = await buildPmcSummary(db, p.id);
      const cs = await buildConstructionScheduleSummary(db, p.id);
      if (!s?.enabled) return null;
      return {
        id: p.id,
        ref: p.ref,
        title: p.title,
        status: p.status,
        scheduleProgressPct: scheduleProgressPct(cs),
        constructionBaselineEnd: cs?.baselineEnd ?? null,
        criticalOverdue: cs?.criticalOverdue ?? 0,
        healthScore: s.healthScore,
        openConstruction: s.construction.openTotal,
        openSnags: s.snags.open,
        overdueCount:
          (cs?.criticalOverdue ?? 0) +
          s.snags.overdue +
          s.permits.overdue,
      };
    }),
  );

  return summaries.filter((s): s is NonNullable<typeof s> => s !== null);
}
