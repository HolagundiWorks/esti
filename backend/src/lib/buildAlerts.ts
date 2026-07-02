import type { EscalationSettings } from "@esti/contracts";
import { and, eq, gte, isNotNull, lt, lte, notInArray } from "drizzle-orm";
import type { DB } from "../db/index.js";
import {
  approvals,
  assignments,
  clientLogs,
  consultantSubmissions,
  leaves,
  permits,
  portalSubmissions,
  contractorSubmissions,
  projectOffices,
  tasks,
  teamMembers,
} from "../db/schema.js";

export type Severity = "high" | "medium" | "low";
export type AlertKind =
  | "approval"
  | "followup"
  | "permit"
  | "submission"
  | "task"
  | "leave"
  | "construction";

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: Severity;
  title: string;
  detail: string;
  projectId: string | null;
  projectRef: string | null;
  date: string | null;
  /** When true, shown on the immediate alerts list; otherwise digest-only. */
  immediate: boolean;
}

const PERMIT_CLOSED = ["APPROVED", "REJECTED", "EXPIRED"];

const PORTAL_KIND_LABEL: Record<string, string> = {
  CHANGE_REQUEST: "Client change request",
  FEEDBACK: "Client feedback",
  ACKNOWLEDGEMENT: "Client acknowledgement",
  DELIVERABLE: "Consultant deliverable",
  RFI: "Consultant RFI",
  NOTE: "Consultant note",
};

/** All alert kinds emitted by {@link buildAlerts}. */
export const ALERT_KINDS: readonly AlertKind[] = [
  "approval",
  "followup",
  "permit",
  "submission",
  "task",
  "leave",
  "construction",
];

export function isAlertKind(value: string): value is AlertKind {
  return (ALERT_KINDS as readonly string[]).includes(value);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function daysAheadIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toDateIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    const rank = (s: Severity) => (s === "high" ? 0 : s === "medium" ? 1 : 2);
    if (rank(a.severity) !== rank(b.severity)) return rank(a.severity) - rank(b.severity);
    return (a.date ?? "").localeCompare(b.date ?? "");
  });
}

export function mapConstructionAlert(c: {
  id: string;
  kind: string;
  subject: string;
  createdAt: Date | string;
  projectId: string;
  projectRef: string;
}): Alert {
  return {
    id: `construction:${c.id}`,
    kind: "construction",
    severity: c.kind === "NCR" || c.kind === "RFI" ? "high" : "medium",
    title: `${c.kind}: ${c.subject}`,
    detail: "Awaiting firm response",
    projectId: c.projectId,
    projectRef: c.projectRef,
    date: toDateIso(c.createdAt),
    immediate: c.kind === "NCR" || c.kind === "RFI",
  };
}

/** Validate alert shape returned from {@link buildAlerts}. */
export function assertValidAlert(alert: Alert): void {
  if (!alert.id || typeof alert.id !== "string") throw new Error("alert.id required");
  if (!isAlertKind(alert.kind)) throw new Error(`invalid alert kind: ${alert.kind}`);
  if (alert.severity !== "high" && alert.severity !== "medium" && alert.severity !== "low") {
    throw new Error(`invalid severity: ${alert.severity}`);
  }
  if (!alert.title || !alert.detail) throw new Error("alert title and detail required");
  if (typeof alert.immediate !== "boolean") throw new Error("alert.immediate must be boolean");
}

/** Aggregate actionable alerts using owner-configured escalation thresholds. */
export async function buildAlerts(db: DB, rules: EscalationSettings): Promise<Alert[]> {
  const today = new Date().toISOString().slice(0, 10);
  const staleCutoff = daysAgoIso(rules.staleApprovalDays);
  const followUpFrom = daysAheadIso(rules.followUpLeadDays);
  const leaveHorizon = daysAheadIso(rules.leaveHorizonDays);

  const staleApprovals = await db
    .select({
      id: approvals.id,
      title: approvals.title,
      entityType: approvals.entityType,
      date: approvals.sentDate,
      projectId: approvals.projectId,
      projectRef: projectOffices.ref,
    })
    .from(approvals)
    .innerJoin(projectOffices, eq(projectOffices.id, approvals.projectId))
    .where(and(eq(approvals.status, "SENT"), lte(approvals.sentDate, staleCutoff)));

  const dueFollowUps = await db
    .select({
      id: clientLogs.id,
      subject: clientLogs.subject,
      date: clientLogs.followUpDate,
      projectId: clientLogs.projectId,
      projectRef: projectOffices.ref,
    })
    .from(clientLogs)
    .innerJoin(projectOffices, eq(projectOffices.id, clientLogs.projectId))
    .where(
      and(
        isNotNull(clientLogs.followUpDate),
        lte(clientLogs.followUpDate, followUpFrom),
        gte(clientLogs.followUpDate, today),
      ),
    );

  const overduePermits = await db
    .select({
      id: permits.id,
      permitType: permits.permitType,
      authority: permits.authority,
      date: permits.dateDue,
      projectId: permits.projectId,
      projectRef: projectOffices.ref,
    })
    .from(permits)
    .innerJoin(projectOffices, eq(projectOffices.id, permits.projectId))
    .where(and(lt(permits.dateDue, today), notInArray(permits.status, PERMIT_CLOSED)));

  const openClientSubmissions = await db
    .select({
      id: portalSubmissions.id,
      kind: portalSubmissions.kind,
      subject: portalSubmissions.subject,
      date: portalSubmissions.createdAt,
      projectId: portalSubmissions.projectId,
      projectRef: projectOffices.ref,
    })
    .from(portalSubmissions)
    .innerJoin(projectOffices, eq(projectOffices.id, portalSubmissions.projectId))
    .where(eq(portalSubmissions.status, "OPEN"));

  const openConsultantSubmissions = await db
    .select({
      id: consultantSubmissions.id,
      kind: consultantSubmissions.kind,
      subject: consultantSubmissions.subject,
      date: consultantSubmissions.createdAt,
      projectId: consultantSubmissions.projectId,
      projectRef: projectOffices.ref,
    })
    .from(consultantSubmissions)
    .innerJoin(projectOffices, eq(projectOffices.id, consultantSubmissions.projectId))
    .where(eq(consultantSubmissions.status, "OPEN"));

  const overdueTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      projectRef: projectOffices.ref,
    })
    .from(tasks)
    .innerJoin(projectOffices, eq(projectOffices.id, tasks.projectId))
    .where(
      and(
        isNotNull(tasks.dueDate),
        lt(tasks.dueDate, daysAgoIso(rules.taskOverdueDays)),
        notInArray(tasks.status, ["DONE", "CANCELLED"]),
      ),
    );

  const openConstruction = await db
    .select({
      id: contractorSubmissions.id,
      kind: contractorSubmissions.kind,
      subject: contractorSubmissions.subject,
      createdAt: contractorSubmissions.createdAt,
      projectId: contractorSubmissions.projectId,
      projectRef: projectOffices.ref,
    })
    .from(contractorSubmissions)
    .innerJoin(projectOffices, eq(projectOffices.id, contractorSubmissions.projectId))
    .where(eq(contractorSubmissions.status, "OPEN"));

  const upcomingLeave = await db
    .select({
      id: leaves.id,
      fromDate: leaves.fromDate,
      toDate: leaves.toDate,
      memberName: teamMembers.name,
      backupContactName: teamMembers.backupContactName,
      backupContactPhone: teamMembers.backupContactPhone,
      teamMemberId: leaves.teamMemberId,
    })
    .from(leaves)
    .innerJoin(teamMembers, eq(teamMembers.id, leaves.teamMemberId))
    .where(
      and(
        eq(leaves.status, "APPROVED"),
        lte(leaves.fromDate, leaveHorizon),
        gte(leaves.toDate, today),
      ),
    );

  const submissionAlert = (
    s: {
      id: string;
      kind: string;
      subject: string;
      date: Date;
      projectId: string;
      projectRef: string;
    },
    prefix: string,
  ): Alert => ({
    id: `submission:${prefix}:${s.id}`,
    kind: "submission",
    severity: s.kind === "RFI" ? "high" : "medium",
    title: `${PORTAL_KIND_LABEL[s.kind] ?? "Portal submission"}: ${s.subject}`,
    detail: "Awaiting firm response",
    projectId: s.projectId,
    projectRef: s.projectRef,
    date: toDateIso(s.date),
    immediate: s.kind === "RFI",
  });

  const alerts: Alert[] = [
    ...openClientSubmissions.map((s) => submissionAlert(s, "client")),
    ...openConsultantSubmissions.map((s) => submissionAlert(s, "consultant")),
    ...staleApprovals.map((a) => ({
      id: `approval:${a.id}`,
      kind: "approval" as const,
      severity: "medium" as Severity,
      title: `Awaiting client response: ${a.title}`,
      detail: `${a.entityType} sent ${a.date} — no decision in ${rules.staleApprovalDays}+ days`,
      projectId: a.projectId,
      projectRef: a.projectRef,
      date: a.date,
      immediate: true,
    })),
    ...dueFollowUps.map((f) => ({
      id: `followup:${f.id}`,
      kind: "followup" as const,
      severity: "medium" as Severity,
      title: `Follow-up due: ${f.subject}`,
      detail: `Scheduled for ${f.date}`,
      projectId: f.projectId,
      projectRef: f.projectRef,
      date: f.date,
      immediate: rules.followUpLeadDays === 0,
    })),
    ...overduePermits.map((p) => ({
      id: `permit:${p.id}`,
      kind: "permit" as const,
      severity: "high" as Severity,
      title: `Permit overdue: ${p.permitType}`,
      detail: `${p.authority} — was due ${p.date}`,
      projectId: p.projectId,
      projectRef: p.projectRef,
      date: p.date,
      immediate: true,
    })),
    ...overdueTasks.map((t) => ({
      id: `task:${t.id}`,
      kind: "task" as const,
      severity: "high" as Severity,
      title: `Overdue task: ${t.title}`,
      detail: `Due ${t.dueDate} — open past ${rules.taskOverdueDays} day threshold`,
      projectId: t.projectId,
      projectRef: t.projectRef,
      date: t.dueDate,
      immediate: true,
    })),
    ...openConstruction.map((c) => mapConstructionAlert(c)),
  ];

  for (const lv of upcomingLeave) {
    const projectRows = await db
      .select({ projectId: assignments.projectId, projectRef: projectOffices.ref })
      .from(assignments)
      .innerJoin(projectOffices, eq(projectOffices.id, assignments.projectId))
      .where(eq(assignments.teamMemberId, lv.teamMemberId));

    const projectList =
      projectRows.length > 0
        ? projectRows.map((p) => p.projectRef).join(", ")
        : "No active assignments";

    const backup =
      lv.backupContactName && lv.backupContactPhone
        ? `Backup: ${lv.backupContactName} (${lv.backupContactPhone})`
        : lv.backupContactPhone
          ? `Backup contact: ${lv.backupContactPhone}`
          : "No backup contact on file";

    alerts.push({
      id: `leave:${lv.id}`,
      kind: "leave",
      severity: lv.fromDate <= today ? "high" : "medium",
      title: `Leave: ${lv.memberName}`,
      detail: `${lv.fromDate} → ${lv.toDate} · Projects: ${projectList}. ${backup}`,
      projectId: projectRows[0]?.projectId ?? null,
      projectRef: projectRows[0]?.projectRef ?? null,
      date: lv.fromDate,
      immediate: lv.fromDate <= today,
    });
  }

  return sortAlerts(alerts);
}

/** Medium/low items for the daily digest — excludes immediate high-priority alerts. */
export function buildDigest(alerts: Alert[], digestEnabled: boolean): Alert[] {
  if (!digestEnabled) return [];
  return alerts.filter((a) => !a.immediate || a.severity === "low");
}
