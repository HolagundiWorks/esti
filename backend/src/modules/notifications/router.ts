import { and, eq, isNotNull, lt, lte, notInArray } from "drizzle-orm";
import { approvals, clientLogs, permits, projectOffices } from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export type Severity = "high" | "medium";
export interface Alert {
  id: string;
  kind: "approval" | "followup" | "permit";
  severity: Severity;
  title: string;
  detail: string;
  projectId: string;
  projectRef: string;
  date: string | null;
}

const PERMIT_CLOSED = ["APPROVED", "REJECTED", "EXPIRED"];

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

    const alerts: Alert[] = [
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
