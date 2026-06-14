import { and, eq, isNotNull, lt, lte, notInArray } from "drizzle-orm";
import {
  approvals,
  clientLogs,
  consultantSubmissions,
  permits,
  portalSubmissions,
  projectOffices,
} from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export type Severity = "high" | "medium";
export interface Alert {
  id: string;
  kind: "approval" | "followup" | "permit" | "submission";
  severity: Severity;
  title: string;
  detail: string;
  projectId: string;
  projectRef: string;
  date: string | null;
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

/**
 * Actionable alerts for staff — stale client approvals, due follow-ups and
 * overdue statutory permits. Read-only aggregation across all projects.
 */
export const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    // Approvals sent to the client but unanswered for over a week.
    const staleApprovals = await ctx.db
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
      .where(and(eq(approvals.status, "SENT"), lte(approvals.sentDate, weekAgo)));

    // Client-log follow-ups that are due or overdue.
    const dueFollowUps = await ctx.db
      .select({
        id: clientLogs.id,
        subject: clientLogs.subject,
        date: clientLogs.followUpDate,
        projectId: clientLogs.projectId,
        projectRef: projectOffices.ref,
      })
      .from(clientLogs)
      .innerJoin(projectOffices, eq(projectOffices.id, clientLogs.projectId))
      .where(and(isNotNull(clientLogs.followUpDate), lte(clientLogs.followUpDate, today)));

    // Permits past their due date and not yet closed.
    const overduePermits = await ctx.db
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

    // Open client-portal submissions awaiting firm triage.
    const openClientSubmissions = await ctx.db
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

    // Open consultant collaborator-portal submissions awaiting firm triage.
    const openConsultantSubmissions = await ctx.db
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

    const submissionAlert = (s: {
      id: string; kind: string; subject: string; date: Date; projectId: string; projectRef: string;
    }, prefix: string): Alert => ({
      id: `submission:${prefix}:${s.id}`,
      kind: "submission",
      // RFIs block design decisions — treat as high; everything else medium.
      severity: s.kind === "RFI" ? "high" : "medium",
      title: `${PORTAL_KIND_LABEL[s.kind] ?? "Portal submission"}: ${s.subject}`,
      detail: "Awaiting firm response",
      projectId: s.projectId,
      projectRef: s.projectRef,
      date: s.date.toISOString().slice(0, 10),
    });

    const alerts: Alert[] = [
      ...openClientSubmissions.map((s) => submissionAlert(s, "client")),
      ...openConsultantSubmissions.map((s) => submissionAlert(s, "consultant")),
      ...staleApprovals.map((a) => ({
        id: `approval:${a.id}`,
        kind: "approval" as const,
        severity: "medium" as Severity,
        title: `Awaiting client response: ${a.title}`,
        detail: `${a.entityType} sent ${a.date} — no decision yet`,
        projectId: a.projectId,
        projectRef: a.projectRef,
        date: a.date,
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
      })),
    ];

    // Most urgent first (oldest date), high severity ahead of medium.
    alerts.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
      return (a.date ?? "").localeCompare(b.date ?? "");
    });
    return alerts;
  }),
});
