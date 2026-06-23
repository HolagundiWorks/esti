import { sql } from "drizzle-orm";
import type { DB } from "../../../db/index.js";

/** Action Center: billable phases, overdue invoices, pending approvals. */
export async function getActionCenter(db: DB) {
  const billingReadyRows = (await db.execute(sql`
    select
      ph.id, ph.label, ph.billing_pct,
      po.id   as project_id,
      po.ref  as project_ref,
      po.title as project_title,
      po.contract_value_paise
    from esti_phase ph
    join esti_projectoffice po on ph.project_id = po.id
    where po.status = 'ACTIVE'
      and po.archived_at is null
      and ph.sort_order <= coalesce(
        (select cp.sort_order from esti_phase cp where cp.id = po.current_phase_id), -1
      )
      and not exists (
        select 1 from esti_invoice i
        where i.phase_id = ph.id
        and i.status <> 'CANCELLED'
      )
    order by po.ref, ph.sort_order
    limit 20
  `)) as unknown as {
    id: string; label: string; billing_pct: number;
    project_id: string; project_ref: string; project_title: string;
    contract_value_paise: number;
  }[];

  const overdueRows = (await db.execute(sql`
    select
      i.id, i.ref, i.date_invoice, i.net_receivable_paise,
      po.id   as project_id,
      po.ref  as project_ref,
      po.title as project_title,
      (current_date - i.date_invoice)::int as days_overdue
    from esti_invoice i
    join esti_projectoffice po on i.project_id = po.id
    where i.status = 'ISSUED'
      and i.date_invoice < current_date - 30
    order by i.date_invoice asc
    limit 20
  `)) as unknown as {
    id: string; ref: string; date_invoice: string; net_receivable_paise: number;
    project_id: string; project_ref: string; project_title: string; days_overdue: number;
  }[];

  const pendingApprovalRows = (await db.execute(sql`
    select
      a.id, a.title, a.entity_type, a.sent_date,
      po.id   as project_id,
      po.ref  as project_ref,
      po.title as project_title,
      coalesce((current_date - a.sent_date)::int, 0) as days_waiting
    from esti_approval a
    join esti_projectoffice po on a.project_id = po.id
    where a.status = 'SENT'
    order by a.sent_date asc nulls last
    limit 20
  `)) as unknown as {
    id: string; title: string; entity_type: string; sent_date: string | null;
    project_id: string; project_ref: string; project_title: string; days_waiting: number;
  }[];

  const [revisionRiskRow] = (await db.execute(sql`
    select count(*)::int as n
    from esti_approval
    where status = 'REVISIONS'
  `)) as unknown as [{ n: number }];

  // Revision risk band from CRIF decisions
  const [decAgg] = (await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where revision_category = 'CRITICAL' and state not in ('LOCKED','REJECTED'))::int as open_critical,
      count(*) filter (where revision_category = 'MAJOR'    and state not in ('LOCKED','REJECTED'))::int as open_major
    from esti_decision
  `)) as unknown as [{ total: number; open_critical: number; open_major: number }];
  const decTotal = Number(decAgg?.total ?? 0);
  const openCrit = Number(decAgg?.open_critical ?? 0);
  const openMaj  = Number(decAgg?.open_major ?? 0);
  const revisionHealthScore = decTotal > 0
    ? Math.max(0, Math.round(100 - ((openCrit * 2 + openMaj) / decTotal) * 50))
    : 100;
  const revisionRiskBand: "LOW" | "MEDIUM" | "HIGH" =
    revisionHealthScore >= 80 ? "LOW" : revisionHealthScore >= 55 ? "MEDIUM" : "HIGH";

  const openConstructionRows = (await db.execute(sql`
    select cs.id, cs.kind, cs.subject, cs.created_at,
           po.id as project_id, po.ref as project_ref, po.title as project_title,
           c.name as contractor_name
    from esti_contractor_submission cs
    join esti_projectoffice po on po.id = cs.project_id
    join esti_contractor c on c.id = cs.contractor_id
    where cs.status = 'OPEN'
    order by cs.created_at asc
    limit 12
  `)) as unknown as {
    id: string;
    kind: string;
    subject: string;
    created_at: string;
    project_id: string;
    project_ref: string;
    project_title: string;
    contractor_name: string;
  }[];

  const openTenderRows = (await db.execute(sql`
    select t.id, t.title, t.due_date,
           po.id as project_id, po.ref as project_ref, po.title as project_title
    from esti_tender t
    join esti_projectoffice po on po.id = t.project_id
    where t.status = 'OPEN'
    order by t.due_date asc nulls last
    limit 12
  `)) as unknown as {
    id: string;
    title: string;
    due_date: string | null;
    project_id: string;
    project_ref: string;
    project_title: string;
  }[];

  const meetingRows = (await db.execute(sql`
    select
      t.id,
      t.title,
      t.priority,
      t.due_date,
      t.assignee,
      po.id as project_id,
      po.ref as project_ref,
      po.title as project_title,
      coalesce((t.due_date - current_date)::int, 999) as days_until
    from esti_task t
    left join esti_projectoffice po on po.id = t.project_id
    where t.status <> 'DONE'
      and t.due_date is not null
      and t.due_date <= current_date + 7
      and (
        lower(t.title) like '%meeting%'
        or lower(t.title) like '%review%'
        or lower(t.title) like '%coordination%'
        or t.work_type = 'DESIGN_COMMUNICATION'
      )
    order by t.due_date asc, case when t.priority = 'HIGH' then 0 else 1 end, t.title asc
    limit 8
  `)) as unknown as {
    id: string;
    title: string;
    priority: string;
    due_date: string;
    assignee: string | null;
    project_id: string | null;
    project_ref: string | null;
    project_title: string | null;
    days_until: number;
  }[];

  return {
    revisionRiskCount: Number(revisionRiskRow?.n ?? 0),
    revisionRiskBand,
    billingReadyPhases: billingReadyRows.map((r) => ({
      id: r.id,
      label: r.label,
      billingPct: r.billing_pct,
      projectId: r.project_id,
      projectRef: r.project_ref,
      projectTitle: r.project_title,
      contractValuePaise: Number(r.contract_value_paise),
    })),
    overdueInvoices: overdueRows.map((r) => ({
      id: r.id,
      ref: r.ref,
      dateInvoice: r.date_invoice,
      netReceivablePaise: Number(r.net_receivable_paise),
      projectId: r.project_id,
      projectRef: r.project_ref,
      projectTitle: r.project_title,
      daysOverdue: Number(r.days_overdue),
    })),
    pendingApprovals: pendingApprovalRows.map((r) => ({
      id: r.id,
      title: r.title,
      entityType: r.entity_type,
      sentDate: r.sent_date,
      projectId: r.project_id,
      projectRef: r.project_ref,
      projectTitle: r.project_title,
      daysWaiting: Number(r.days_waiting),
    })),
    openConstruction: openConstructionRows.map((r) => ({
      id: r.id,
      kind: r.kind,
      subject: r.subject,
      contractorName: r.contractor_name,
      projectId: r.project_id,
      projectRef: r.project_ref,
      projectTitle: r.project_title,
      createdAt: r.created_at,
    })),
    openTenders: openTenderRows.map((r) => ({
      id: r.id,
      title: r.title,
      dueDate: r.due_date,
      projectId: r.project_id,
      projectRef: r.project_ref,
      projectTitle: r.project_title,
    })),
    meetingFocus: meetingRows.map((r) => ({
      id: r.id,
      title: r.title,
      priority: r.priority,
      dueDate: r.due_date,
      assignee: r.assignee,
      projectId: r.project_id,
      projectRef: r.project_ref,
      projectTitle: r.project_title,
      daysUntil: Number(r.days_until),
    })),
  };
}
