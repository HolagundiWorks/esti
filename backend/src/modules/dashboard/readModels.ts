import { ANNUAL_LEAVE_ALLOWANCE_DAYS, computeSiteDrawingIntelligence } from "@esti/contracts";
import { and, count, eq, gte, isNull, sql } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  feeProposals,
  invoices,
  attendance,
  leaves,
  payslips,
  permits,
  projectOffices,
  tasks,
  teamMembers,
  tenders,
  contractorSubmissions,
} from "../../db/schema.js";
import { getOrgSettings } from "../../lib/settings.js";

export type DashboardUser = {
  email: string;
  fullName: string;
  role: string;
};

/** Per-user header strip: server date + optional leave balance (HR module only). */
export async function getDashboardMe(db: DB, user: DashboardUser) {
  const today = new Date().toISOString().slice(0, 10);
  const settings = await getOrgSettings(db);
  if (!settings.hrEnabled) {
    return { today, fullName: user.fullName, role: user.role, leave: null };
  }
  // Match the login to a team member by email to read their leave balance.
  const [member] = user.email
    ? await db.select().from(teamMembers).where(eq(teamMembers.email, user.email))
    : [];
  let leave: { allowance: number; used: number; remaining: number } | null = null;
  if (member) {
    const yearStart = `${new Date().getUTCFullYear()}-01-01`;
    const [agg] = await db
      .select({ used: sql<string>`coalesce(sum(${leaves.days}), 0)` })
      .from(leaves)
      .where(
        and(
          eq(leaves.teamMemberId, member.id),
          eq(leaves.status, "APPROVED"),
          gte(leaves.fromDate, yearStart),
        ),
      );
    const used = Number(agg?.used ?? 0);
    leave = {
      allowance: ANNUAL_LEAVE_ALLOWANCE_DAYS,
      used,
      remaining: Math.max(0, ANNUAL_LEAVE_ALLOWANCE_DAYS - used),
    };
  }
  return { today, fullName: user.fullName, role: user.role, leave };
}

/** Aggregations for the dashboard board widgets. */
export async function getDashboardBoards(db: DB) {
  const today = new Date().toISOString().slice(0, 10);
  const settings = await getOrgSettings(db);
  const hrEnabled = settings.hrEnabled;

  const byType = await db
    .select({ type: projectOffices.projectType, n: count() })
    .from(projectOffices)
    .where(isNull(projectOffices.archivedAt))
    .groupBy(projectOffices.projectType);

  // Distribution by current stage across all active projects.
  const phaseRows = (await db.execute(sql`
    select ph.code, ph.label, count(*)::int as n
    from esti_phase ph
    join esti_projectoffice po on ph.id = po.current_phase_id
    where po.status = 'ACTIVE' and po.archived_at is null
    group by ph.code, ph.label
    order by min(ph.sort_order)
  `)) as unknown as { code: string; label: string; n: number }[];

  const [leaveRow] = hrEnabled
    ? await db
        .select({ n: sql<string>`count(distinct ${leaves.teamMemberId})` })
        .from(leaves)
        .where(and(eq(leaves.status, "APPROVED"), sql`${today} between ${leaves.fromDate} and ${leaves.toDate}`))
    : [{ n: "0" }];

  const [taskTodayRow] = await db
    .select({ n: count() })
    .from(tasks)
    .where(and(sql`${tasks.status} <> 'DONE'`, sql`${tasks.dueDate} is not null and ${tasks.dueDate} <= ${today}`));

  const [openTendersRow] = await db
    .select({ n: count() })
    .from(tenders)
    .where(eq(tenders.status, "OPEN"));

  const [constructionOpenRow] = await db
    .select({ n: count() })
    .from(contractorSubmissions)
    .where(eq(contractorSubmissions.status, "OPEN"));

  const tenderDueSoon = (await db.execute(sql`
    select t.id, t.title, t.due_date, po.ref as project_ref, po.id as project_id
    from esti_tender t
    join esti_projectoffice po on po.id = t.project_id
    where t.status = 'OPEN'
      and t.due_date is not null
      and t.due_date <= current_date + 7
    order by t.due_date asc
    limit 8
  `)) as unknown as {
    id: string;
    title: string;
    due_date: string;
    project_ref: string;
    project_id: string;
  }[];

  const workload = hrEnabled
    ? await db
        .select({ assignee: tasks.assignee, n: count() })
        .from(tasks)
        .where(and(sql`${tasks.status} <> 'DONE'`, sql`${tasks.assignee} is not null and ${tasks.assignee} <> ''`))
        .groupBy(tasks.assignee)
        .orderBy(sql`count(*) desc`)
        .limit(8)
    : [];

  const wlWeekly = hrEnabled
    ? ((await db.execute(sql`
    select t.assignee,
           extract(dow from t.due_date)::int as dow,
           count(*)::int as n
    from esti_task t
    where t.status <> 'DONE'
      and t.assignee is not null and t.assignee <> ''
      and t.due_date is not null
    group by t.assignee, dow
    order by t.assignee, dow
  `)) as unknown as { assignee: string; dow: number; n: number }[])
    : [];

  const wlDaily = hrEnabled
    ? ((await db.execute(sql`
    select t.assignee,
           t.due_date::text as day,
           count(*)::int as n
    from esti_task t
    where t.status <> 'DONE'
      and t.assignee is not null and t.assignee <> ''
      and t.due_date is not null
      and t.due_date between current_date and current_date + 13
    group by t.assignee, t.due_date
    order by t.assignee, t.due_date
  `)) as unknown as { assignee: string; day: string; n: number }[])
    : [];

  const dailyLoad = hrEnabled
    ? ((await db.execute(sql`
    select t.assignee, count(*)::int as n
    from esti_task t
    where t.status <> 'DONE'
      and t.assignee is not null and t.assignee <> ''
      and t.due_date = current_date
    group by t.assignee
    order by n desc
  `)) as unknown as { assignee: string; n: number }[])
    : [];

  // Receivables aging: outstanding (ISSUED) net amount bucketed by invoice age.
  const [aging] = await db
    .select({
      d0_30: sql<string>`coalesce(sum(case when ${invoices.dateInvoice} >= current_date - 30 then ${invoices.netReceivablePaise} else 0 end), 0)`,
      d31_60: sql<string>`coalesce(sum(case when ${invoices.dateInvoice} < current_date - 30 and ${invoices.dateInvoice} >= current_date - 60 then ${invoices.netReceivablePaise} else 0 end), 0)`,
      d60p: sql<string>`coalesce(sum(case when ${invoices.dateInvoice} < current_date - 60 or ${invoices.dateInvoice} is null then ${invoices.netReceivablePaise} else 0 end), 0)`,
    })
    .from(invoices)
    .where(eq(invoices.status, "ISSUED"));

  return {
    byType: byType.map((r) => ({ type: r.type, count: Number(r.n) })),
    byPhase: phaseRows.map((r) => ({ code: r.code, label: r.label, count: Number(r.n) })),
    onLeaveToday: Number(leaveRow?.n ?? 0),
    tasksDueToday: Number(taskTodayRow?.n ?? 0),
    workload: workload.map((r) => ({ assignee: r.assignee ?? "—", count: Number(r.n) })),
    workloadWeekly: wlWeekly.map((r) => ({ assignee: r.assignee, dow: Number(r.dow), count: Number(r.n) })),
    workloadDaily: wlDaily.map((r) => ({ assignee: r.assignee, day: r.day, count: Number(r.n) })),
    dailyLoad: dailyLoad.map((r) => ({ assignee: r.assignee, count: Number(r.n) })),
    receivablesAging: {
      d0_30: Number(aging?.d0_30 ?? 0),
      d31_60: Number(aging?.d31_60 ?? 0),
      d60p: Number(aging?.d60p ?? 0),
    },
    openTenders: Number(openTendersRow?.n ?? 0),
    constructionOpen: Number(constructionOpenRow?.n ?? 0),
    tenderDueSoon: tenderDueSoon.map((r) => ({
      id: r.id,
      title: r.title,
      dueDate: r.due_date,
      projectRef: r.project_ref,
      projectId: r.project_id,
    })),
  };
}

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
  };
}

/** Financial health: revenue pipeline, ready-to-bill estimate, collections. */
export async function getFinancialHealth(db: DB) {
  // Indian FY starts April 1.
  const now = new Date();
  const fyYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  const fyStart = `${fyYear}-04-01`;

  const [pipeline] = (await db.execute(sql`
    select
      coalesce(sum(contract_value_paise), 0)::bigint             as total_paise,
      coalesce(sum(case when status = 'ACTIVE'   then contract_value_paise else 0 end), 0)::bigint as active_paise,
      coalesce(sum(case when status = 'PROPOSAL' then contract_value_paise else 0 end), 0)::bigint as proposal_paise
    from esti_projectoffice
    where archived_at is null
      and status in ('ACTIVE', 'PROPOSAL')
  `)) as unknown as [{
    total_paise: number; active_paise: number; proposal_paise: number;
  }];

  const [readyToBill] = (await db.execute(sql`
    select coalesce(sum(ph.billing_pct * po.contract_value_paise / 100), 0)::bigint as ready_paise
    from esti_phase ph
    join esti_projectoffice po on ph.project_id = po.id
    where po.status = 'ACTIVE'
      and po.archived_at is null
      and ph.sort_order <= coalesce(
        (select cp.sort_order from esti_phase cp where cp.id = po.current_phase_id), -1
      )
      and not exists (
        select 1 from esti_invoice i
        where i.phase_id = ph.id and i.status <> 'CANCELLED'
      )
  `)) as unknown as [{ ready_paise: number }];

  const [inv] = (await db.execute(sql`
    select
      coalesce(sum(case when status = 'ISSUED' then net_receivable_paise else 0 end), 0)::bigint                                                      as outstanding_paise,
      coalesce(sum(case when status = 'ISSUED' and date_invoice < current_date - 30 then net_receivable_paise else 0 end), 0)::bigint                  as overdue30_paise,
      coalesce(sum(case when status = 'PAID' and date_invoice >= ${fyStart} then net_receivable_paise else 0 end), 0)::bigint                          as collected_fy_paise,
      coalesce(sum(case when status not in ('DRAFT','CANCELLED') then grand_total_paise else 0 end), 0)::bigint                                        as invoiced_total_paise
    from esti_invoice
  `)) as unknown as [{
    outstanding_paise: number; overdue30_paise: number;
    collected_fy_paise: number; invoiced_total_paise: number;
  }];

  return {
    pipelinePaise: Number(pipeline?.total_paise ?? 0),
    activePipelinePaise: Number(pipeline?.active_paise ?? 0),
    proposalPipelinePaise: Number(pipeline?.proposal_paise ?? 0),
    readyToBillPaise: Number(readyToBill?.ready_paise ?? 0),
    outstandingPaise: Number(inv?.outstanding_paise ?? 0),
    overdue30dPaise: Number(inv?.overdue30_paise ?? 0),
    collectedFyPaise: Number(inv?.collected_fy_paise ?? 0),
    invoicedTotalPaise: Number(inv?.invoiced_total_paise ?? 0),
    fyStart,
  };
}

export async function getDashboardSummary(db: DB) {
  const projectRows = await db
    .select({
      status: projectOffices.status,
      n: count(),
      value: sql<string>`coalesce(sum(${projectOffices.contractValuePaise}), 0)`,
    })
    .from(projectOffices)
    .where(isNull(projectOffices.archivedAt))
    .groupBy(projectOffices.status);

  const invoiceRows = await db
    .select({
      status: invoices.status,
      grand: sql<string>`coalesce(sum(${invoices.grandTotalPaise}), 0)`,
      net: sql<string>`coalesce(sum(${invoices.netReceivablePaise}), 0)`,
    })
    .from(invoices)
    .groupBy(invoices.status);

  const today = new Date().toISOString().slice(0, 10);
  const [permitAgg] = await db
    .select({
      total: count(),
      overdue: sql<string>`coalesce(sum(case when ${permits.dateDue} < ${today} and ${permits.status} not in ('APPROVED', 'REJECTED', 'EXPIRED') then 1 else 0 end), 0)`,
      open: sql<string>`coalesce(sum(case when ${permits.status} not in ('APPROVED', 'REJECTED', 'EXPIRED') then 1 else 0 end), 0)`,
    })
    .from(permits);

  const [feeAgg] = await db
    .select({
      total: count(),
      belowMin: sql<string>`coalesce(sum(case when ${feeProposals.belowMinimum} then 1 else 0 end), 0)`,
    })
    .from(feeProposals);

  const byStatus: Record<string, number> = {};
  let projectTotal = 0;
  let contractValuePaise = 0;
  for (const r of projectRows) {
    byStatus[r.status] = Number(r.n);
    projectTotal += Number(r.n);
    contractValuePaise += Number(r.value);
  }

  let invoicedPaise = 0;
  let outstandingPaise = 0;
  let collectedPaise = 0;
  for (const r of invoiceRows) {
    if (r.status === "ISSUED") outstandingPaise += Number(r.net);
    if (r.status === "PAID") collectedPaise += Number(r.net);
    if (r.status !== "DRAFT" && r.status !== "CANCELLED") invoicedPaise += Number(r.grand);
  }

  // HR stats only when the optional module is enabled (otherwise null).
  const settings = await getOrgSettings(db);
  let hr: {
    headcount: number;
    pendingLeaves: number;
    unpaidPayslips: number;
    unpaidNetPaise: number;
  } | null = null;
  if (settings.hrEnabled) {
    const [headRow] = await db
      .select({ n: count() })
      .from(teamMembers)
      .where(eq(teamMembers.active, true));
    const [leaveRow] = await db
      .select({ n: count() })
      .from(leaves)
      .where(eq(leaves.status, "REQUESTED"));
    const [payRow] = await db
      .select({
        n: count(),
        net: sql<string>`coalesce(sum(${payslips.netPaise}), 0)`,
      })
      .from(payslips)
      .where(eq(payslips.paid, false));
    hr = {
      headcount: Number(headRow?.n ?? 0),
      pendingLeaves: Number(leaveRow?.n ?? 0),
      unpaidPayslips: Number(payRow?.n ?? 0),
      unpaidNetPaise: Number(payRow?.net ?? 0),
    };
  }

  return {
    hr,
    projects: { total: projectTotal, byStatus, contractValuePaise },
    invoices: { invoicedPaise, outstandingPaise, collectedPaise },
    permits: {
      total: Number(permitAgg?.total ?? 0),
      open: Number(permitAgg?.open ?? 0),
      overdue: Number(permitAgg?.overdue ?? 0),
    },
    feeProposals: {
      total: Number(feeAgg?.total ?? 0),
      belowMinimum: Number(feeAgg?.belowMin ?? 0),
    },
  };
}

/** Team attendance summary for today (HR module only). */
export async function getTeamAttendanceToday(db: DB) {
  const settings = await getOrgSettings(db);
  if (!settings.hrEnabled) {
    return { headcount: 0, marked: 0, present: 0, absent: 0, wfh: 0, onLeave: 0 };
  }
  const today = new Date().toISOString().slice(0, 10);
  const [head] = await db
    .select({ n: count() })
    .from(teamMembers)
    .where(eq(teamMembers.active, true));
  const headcount = Number(head?.n ?? 0);

  const rows = await db
    .select({ status: attendance.status })
    .from(attendance)
    .where(eq(attendance.attendanceDate, today));

  let present = 0;
  let absent = 0;
  let wfh = 0;
  let onLeave = 0;
  for (const r of rows) {
    if (r.status === "PRESENT" || r.status === "HALF_DAY") present += 1;
    else if (r.status === "ABSENT") absent += 1;
    else if (r.status === "WFH") wfh += 1;
    else if (r.status === "ON_LEAVE") onLeave += 1;
  }

  return {
    headcount,
    marked: rows.length,
    present,
    absent,
    wfh,
    onLeave,
  };
}

/** Per-project health scores for all active projects. */
export async function getProjectHealth(db: DB) {
  const rows = (await db.execute(sql`
    select
      po.id, po.ref, po.title, po.contract_value_paise,
      (select ph2.label from esti_phase ph2 where ph2.id = po.current_phase_id) as current_phase,
      (select count(*)::int from esti_phase pa where pa.project_id = po.id) as total_phases,
      (select count(*)::int from esti_phase pp
        where pp.project_id = po.id
        and pp.sort_order <= coalesce(
          (select cp.sort_order from esti_phase cp where cp.id = po.current_phase_id), -1
        )) as phases_reached,
      (select count(*)::int from esti_phase ph
        where ph.project_id = po.id
        and ph.sort_order <= coalesce(
          (select cp.sort_order from esti_phase cp where cp.id = po.current_phase_id), -1
        )
        and not exists (
          select 1 from esti_invoice i where i.phase_id = ph.id and i.status <> 'CANCELLED'
        )) as unbilled_phases,
      (select count(*)::int from esti_task t
        where t.project_id = po.id
        and t.status <> 'DONE'
        and t.due_date < current_date) as overdue_tasks,
      (select count(*)::int from esti_invoice i
        where i.project_id = po.id
        and i.status = 'ISSUED'
        and i.date_invoice < current_date - 30) as overdue_invoices,
      (select count(*)::int from esti_approval a
        where a.project_id = po.id
        and a.status = 'SENT'
        and a.sent_date < current_date - 14) as stale_approvals,
      (select count(*)::int from esti_approval a
        where a.project_id = po.id
        and a.status = 'REVISIONS') as revisions_open,
      (select count(*)::int from esti_critical_note cn
        where cn.project_id = po.id
        and cn.status = 'OPEN'
        and cn.priority = 'HIGH') as critical_notes_open
    from esti_projectoffice po
    where po.status = 'ACTIVE'
      and po.archived_at is null
    order by po.ref
  `)) as unknown as {
    id: string; ref: string; title: string; contract_value_paise: number;
    current_phase: string | null; total_phases: number; phases_reached: number;
    unbilled_phases: number; overdue_tasks: number; overdue_invoices: number;
    stale_approvals: number; revisions_open: number; critical_notes_open: number;
  }[];

  return rows.map((r) => {
    let health: "GREEN" | "YELLOW" | "RED" = "GREEN";
    const issues = Number(r.overdue_invoices) + Number(r.stale_approvals) + Number(r.critical_notes_open);
    if (Number(r.overdue_invoices) > 0 || Number(r.overdue_tasks) >= 3 || issues >= 3) {
      health = "RED";
    } else if (Number(r.unbilled_phases) > 0 || Number(r.overdue_tasks) > 0 || Number(r.stale_approvals) > 0 || Number(r.revisions_open) > 0 || Number(r.critical_notes_open) > 0) {
      health = "YELLOW";
    }
    const totalPhases = Number(r.total_phases);
    const reached = Number(r.phases_reached);
    return {
      id: r.id,
      ref: r.ref,
      title: r.title,
      contractValuePaise: Number(r.contract_value_paise),
      currentPhase: r.current_phase,
      progressPct: totalPhases > 0 ? Math.round((reached / totalPhases) * 100) : 0,
      health,
      unbilledPhases: Number(r.unbilled_phases),
      overdueTasks: Number(r.overdue_tasks),
      overdueInvoices: Number(r.overdue_invoices),
      staleApprovals: Number(r.stale_approvals),
      revisionsOpen: Number(r.revisions_open),
      criticalNotesOpen: Number(r.critical_notes_open),
    };
  });
}

/** Per-client intelligence signals: approval lag, revision frequency, payment age. */
export async function getClientIntelligence(db: DB) {
  const rows = (await db.execute(sql`
    select
      c.id, c.name,
      count(distinct po.id)::int as active_projects,
      -- Outstanding invoice age (oldest ISSUED invoice in days)
      coalesce(max(case when inv.status = 'ISSUED' then (current_date - inv.date_invoice)::int else 0 end), 0) as oldest_invoice_days,
      coalesce(sum(case when inv.status = 'ISSUED' then inv.net_receivable_paise else 0 end), 0)::bigint as outstanding_paise,
      -- Average approval response time (SENT→APPROVED/REJECTED)
      coalesce(avg(case when a.status in ('APPROVED', 'REJECTED') and a.sent_date is not null and a.response_date is not null
        then (a.response_date::date - a.sent_date::date)::int else null end)::numeric, 0)::int as avg_approval_days,
      -- Revision requests count (REVISIONS status)
      count(case when a.status = 'REVISIONS' then 1 end)::int as revision_requests
    from esti_client c
    join esti_projectoffice po on po.client_id = c.id and po.status = 'ACTIVE' and po.archived_at is null
    left join esti_invoice inv on inv.project_id = po.id
    left join esti_approval a on a.project_id = po.id
    group by c.id, c.name
    having count(distinct po.id) > 0
    order by oldest_invoice_days desc, c.name
    limit 20
  `)) as unknown as {
    id: string; name: string; active_projects: number;
    oldest_invoice_days: number; outstanding_paise: number;
    avg_approval_days: number; revision_requests: number;
  }[];

  return rows.map((r) => {
    let risk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    const oldestDays = Number(r.oldest_invoice_days);
    const revisions = Number(r.revision_requests);
    const approvalDays = Number(r.avg_approval_days);
    if (oldestDays > 60 || revisions >= 4 || approvalDays > 21) risk = "HIGH";
    else if (oldestDays > 30 || revisions >= 2 || approvalDays > 10) risk = "MEDIUM";
    return {
      id: r.id,
      name: r.name,
      activeProjects: Number(r.active_projects),
      oldestInvoiceDays: oldestDays,
      outstandingPaise: Number(r.outstanding_paise),
      avgApprovalDays: approvalDays,
      revisionRequests: revisions,
      risk,
    };
  });
}

/** Team capacity signals: per-assignee task load (HR module only). */
export async function getTeamIntelligence(db: DB) {
  const settings = await getOrgSettings(db);
  if (!settings.hrEnabled) return [];

  const rows = (await db.execute(sql`
    select
      t.assignee,
      count(*)::int                                                                                                as total_open,
      count(case when t.due_date < current_date then 1 end)::int                                                  as overdue_count,
      count(case when t.priority = 'HIGH' then 1 end)::int                                                        as high_priority_count
    from esti_task t
    where t.status <> 'DONE'
      and t.assignee is not null
      and t.assignee <> ''
    group by t.assignee
    order by overdue_count desc, total_open desc
    limit 20
  `)) as unknown as {
    assignee: string; total_open: number; overdue_count: number; high_priority_count: number;
  }[];

  return rows.map((r) => {
    const totalOpen = Number(r.total_open);
    const overdue = Number(r.overdue_count);
    let capacity: "HEALTHY" | "BUSY" | "OVERLOADED" = "HEALTHY";
    if (overdue >= 3 || totalOpen >= 10) capacity = "OVERLOADED";
    else if (overdue >= 1 || totalOpen >= 5) capacity = "BUSY";
    return {
      assignee: r.assignee,
      totalOpen,
      overdueCount: overdue,
      highPriorityCount: Number(r.high_priority_count),
      capacity,
    };
  });
}

/**
 * Revision Intelligence — firm-wide breakdown of design decisions by source.
 * Drives the Revision Intelligence dashboard tile and revision risk band.
 */
export async function getRevisionIntelligence(db: DB) {
  const [agg] = (await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where revision_source = 'CLIENT_DRIVEN')::int   as client_driven,
      count(*) filter (where revision_source = 'INTERNAL_ERROR')::int  as internal_error,
      count(*) filter (where revision_source = 'TECHNICAL_QUERY')::int as technical_query,
      count(*) filter (where revision_source = 'SCOPE_CHANGE')::int    as scope_change,
      count(*) filter (where revision_category = 'CRITICAL' and state not in ('LOCKED','REJECTED'))::int as open_critical,
      count(*) filter (where revision_category = 'MAJOR'    and state not in ('LOCKED','REJECTED'))::int as open_major
    from esti_decision
  `)) as unknown as [{
    total: number; client_driven: number; internal_error: number;
    technical_query: number; scope_change: number;
    open_critical: number; open_major: number;
  }];

  const total         = Number(agg?.total ?? 0);
  const clientDriven  = Number(agg?.client_driven ?? 0);
  const internalError = Number(agg?.internal_error ?? 0);
  const technicalQuery= Number(agg?.technical_query ?? 0);
  const scopeChange   = Number(agg?.scope_change ?? 0);
  const openCritical  = Number(agg?.open_critical ?? 0);
  const openMajor     = Number(agg?.open_major ?? 0);

  const scopeDriftPct = total > 0 ? Math.round((scopeChange / total) * 100) : 0;
  const healthScore   = total > 0
    ? Math.max(0, Math.round(100 - ((openCritical * 2 + openMajor) / total) * 50))
    : 100;
  const revisionRiskBand: "LOW" | "MEDIUM" | "HIGH" =
    healthScore >= 80 ? "LOW" : healthScore >= 55 ? "MEDIUM" : "HIGH";

  return {
    totalDecisions: total,
    clientDriven,
    internalError,
    technicalQuery,
    scopeChange,
    scopeDriftPct,
    healthScore,
    revisionRiskBand,
  };
}

/**
 * Technical Intelligence — site query rate vs issued drawings, repeat queries,
 * and drawing clarity score (Phase 5 Site & Drawing Intelligence).
 */
export async function getTechnicalIntelligence(db: DB) {
  const [agg] = (await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where revision_source = 'INTERNAL_ERROR')::int  as internal_errors,
      count(*) filter (where revision_source = 'TECHNICAL_QUERY')::int as technical_queries
    from esti_decision
  `)) as unknown as [{ total: number; internal_errors: number; technical_queries: number }];

  const [drawRow] = (await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where issue_pdf_status = 'READY' and is_current = true)::int as issued
    from esti_drawing
  `)) as unknown as [{ total: number; issued: number }];

  const queryRows = (await db.execute(sql`
    select linked_object_id, count(*)::int as qcount
    from esti_decision
    where revision_source = 'TECHNICAL_QUERY'
      and linked_object_type = 'drawing'
      and linked_object_id is not null
    group by linked_object_id
  `)) as unknown as { linked_object_id: string; qcount: number }[];

  const queriedDrawings = queryRows.length;
  const repeatQueryDrawings = queryRows.filter((r) => Number(r.qcount) >= 2).length;

  return computeSiteDrawingIntelligence({
    totalDrawings: Number(drawRow?.total ?? 0),
    issuedDrawings: Number(drawRow?.issued ?? 0),
    internalErrors: Number(agg?.internal_errors ?? 0),
    techQueries: Number(agg?.technical_queries ?? 0),
    queriedDrawings,
    repeatQueryDrawings,
    totalDecisions: Number(agg?.total ?? 0),
  });
}
