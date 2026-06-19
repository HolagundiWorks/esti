import { can } from "@esti/contracts";
import type { AiSourceRef } from "@esti/contracts";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  clients,
  decisions,
  projectOffices,
  tasks,
  teamMembers,
} from "../../db/schema.js";
import { getActionCenter } from "../../modules/dashboard/readModels/index.js";

type UserCtx = { id: string; role: string; email?: string; fullName?: string };

export type OperatorSnapshot = {
  userRole: string;
  office?: {
    activeProjects: { ref: string; title: string; stage: string | null; clientName: string | null }[];
    billingReady: { projectRef: string; label: string; billingPct: number }[];
    overdueInvoices: { ref: string; projectRef: string; daysOverdue: number }[];
    pendingApprovals: { projectRef: string; title: string; daysWaiting: number }[];
    openTenders: { projectRef: string; title: string; dueDate: string | null }[];
    openConstruction: { projectRef: string; kind: string; subject: string }[];
    myOpenTasks: { title: string; projectRef: string | null; dueDate: string | null; priority: string }[];
    revisionRiskBand: string;
  };
  project?: {
    ref: string;
    title: string;
    clientName: string | null;
    stage: string | null;
    openTasks: number;
    openDecisions: { title: string; state: string; category: string | null }[];
  };
};

export async function loadOperatorSnapshot(
  db: DB,
  user: UserCtx,
  projectId?: string,
): Promise<{ snapshot: OperatorSnapshot; sources: AiSourceRef[] }> {
  const sources: AiSourceRef[] = [];
  const snapshot: OperatorSnapshot = { userRole: user.role };

  const projectRows = await db
    .select({
      id: projectOffices.id,
      ref: projectOffices.ref,
      title: projectOffices.title,
      status: projectOffices.status,
      clientId: projectOffices.clientId,
    })
    .from(projectOffices)
    .where(isNull(projectOffices.archivedAt))
    .orderBy(desc(projectOffices.updatedAt))
    .limit(20);

  const clientNames = new Map<string, string>();
  const clientIds = [...new Set(projectRows.map((p) => p.clientId).filter(Boolean))] as string[];
  if (clientIds.length) {
    const clientRows = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(inArray(clients.id, clientIds));
    for (const c of clientRows) clientNames.set(c.id, c.name);
  }

  const ac = await getActionCenter(db);
  const canFees = can(user.role as never, "fees:manage");

  let myTasks: {
    title: string;
    dueDate: string | null;
    priority: string;
    projectRef: string | null;
  }[] = [];

  if (user.email) {
    const [member] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(eq(teamMembers.email, user.email))
      .limit(1);
    if (member) {
      myTasks = await db
        .select({
          title: tasks.title,
          dueDate: tasks.dueDate,
          priority: tasks.priority,
          projectRef: projectOffices.ref,
        })
        .from(tasks)
        .leftJoin(projectOffices, eq(projectOffices.id, tasks.projectId))
        .where(and(eq(tasks.assigneeId, member.id), sql`${tasks.status} <> 'DONE'`))
        .orderBy(tasks.dueDate)
        .limit(8);
    }
  }

  snapshot.office = {
    activeProjects: projectRows.map((p) => ({
      ref: p.ref,
      title: p.title,
      stage: p.status,
      clientName: p.clientId ? (clientNames.get(p.clientId) ?? null) : null,
    })),
    billingReady: canFees
      ? ac.billingReadyPhases.slice(0, 8).map((p) => ({
          projectRef: p.projectRef,
          label: p.label,
          billingPct: p.billingPct,
        }))
      : [],
    overdueInvoices: canFees
      ? ac.overdueInvoices.slice(0, 8).map((i) => ({
          ref: i.ref,
          projectRef: i.projectRef,
          daysOverdue: i.daysOverdue,
        }))
      : [],
    pendingApprovals: ac.pendingApprovals.slice(0, 6).map((a) => ({
      projectRef: a.projectRef,
      title: a.title,
      daysWaiting: a.daysWaiting,
    })),
    openTenders: ac.openTenders.slice(0, 6).map((t) => ({
      projectRef: t.projectRef,
      title: t.title,
      dueDate: t.dueDate,
    })),
    openConstruction: ac.openConstruction.slice(0, 6).map((c) => ({
      projectRef: c.projectRef,
      kind: c.kind,
      subject: c.subject,
    })),
    myOpenTasks: myTasks.map((t) => ({
      title: t.title,
      projectRef: t.projectRef,
      dueDate: t.dueDate,
      priority: t.priority,
    })),
    revisionRiskBand: ac.revisionRiskBand,
  };

  for (const row of projectRows.slice(0, 5)) {
    sources.push({
      entityType: "PROJECT",
      entityId: row.id,
      label: `${row.ref} — ${row.title}`,
    });
  }

  if (projectId) {
    const proj = projectRows.find((p) => p.id === projectId);
    if (proj) {
      const [taskCount] = await db
        .select({ n: count() })
        .from(tasks)
        .where(and(eq(tasks.projectId, projectId), sql`${tasks.status} <> 'DONE'`));

      const decRows = await db
        .select({
          id: decisions.id,
          title: decisions.title,
          state: decisions.state,
          category: decisions.revisionCategory,
        })
        .from(decisions)
        .where(
          and(
            eq(decisions.projectId, projectId),
            sql`${decisions.state} not in ('LOCKED', 'REJECTED')`,
          ),
        )
        .orderBy(desc(decisions.createdAt))
        .limit(8);

      snapshot.project = {
        ref: proj.ref,
        title: proj.title,
        clientName: proj.clientId ? (clientNames.get(proj.clientId) ?? null) : null,
        stage: proj.status,
        openTasks: Number(taskCount?.n ?? 0),
        openDecisions: decRows.map((d) => ({
          title: d.title,
          state: d.state,
          category: d.category,
        })),
      };

      for (const d of decRows.slice(0, 4)) {
        sources.push({
          entityType: "DECISION",
          entityId: d.id,
          label: d.title,
        });
      }
    }
  }

  return { snapshot, sources };
}

export function formatOperatorSnapshot(snapshot: OperatorSnapshot): string {
  const lines: string[] = [`Staff role: ${snapshot.userRole}`];

  if (snapshot.project) {
    const p = snapshot.project;
    lines.push(
      "",
      `## Current project (${p.ref})`,
      `Title: ${p.title}`,
      p.clientName ? `Client: ${p.clientName}` : "",
      p.stage ? `Stage: ${p.stage}` : "",
      `Open tasks: ${p.openTasks}`,
      p.openDecisions.length
        ? `Open CRIF decisions:\n${p.openDecisions.map((d) => `- ${d.title} (${d.state}${d.category ? `, ${d.category}` : ""})`).join("\n")}`
        : "Open CRIF decisions: none",
    );
  }

  if (snapshot.office) {
    const o = snapshot.office;
    lines.push(
      "",
      "## Office snapshot",
      `Revision risk band: ${o.revisionRiskBand}`,
      o.activeProjects.length
        ? `Active projects (${o.activeProjects.length} shown):\n${o.activeProjects.map((p) => `- ${p.ref} — ${p.title}${p.stage ? ` [${p.stage}]` : ""}`).join("\n")}`
        : "Active projects: none",
    );

    if (o.billingReady.length) {
      lines.push(
        `Billing-ready phases:\n${o.billingReady.map((b) => `- ${b.projectRef}: ${b.label} (${b.billingPct}%)`).join("\n")}`,
      );
    }
    if (o.overdueInvoices.length) {
      lines.push(
        `Overdue invoices:\n${o.overdueInvoices.map((i) => `- ${i.ref} on ${i.projectRef} — ${i.daysOverdue} days`).join("\n")}`,
      );
    }
    if (o.pendingApprovals.length) {
      lines.push(
        `Pending client approvals:\n${o.pendingApprovals.map((a) => `- ${a.projectRef}: ${a.title} (${a.daysWaiting}d waiting)`).join("\n")}`,
      );
    }
    if (o.openTenders.length) {
      lines.push(
        `Open tenders:\n${o.openTenders.map((t) => `- ${t.projectRef}: ${t.title}${t.dueDate ? ` due ${t.dueDate}` : ""}`).join("\n")}`,
      );
    }
    if (o.openConstruction.length) {
      lines.push(
        `Site coordination (open):\n${o.openConstruction.map((c) => `- ${c.projectRef} ${c.kind}: ${c.subject}`).join("\n")}`,
      );
    }
    if (o.myOpenTasks.length) {
      lines.push(
        `Your open tasks:\n${o.myOpenTasks.map((t) => `- ${t.title}${t.projectRef ? ` (${t.projectRef})` : ""}${t.dueDate ? ` due ${t.dueDate}` : ""}`).join("\n")}`,
      );
    }
  }

  return lines.filter(Boolean).join("\n");
}
