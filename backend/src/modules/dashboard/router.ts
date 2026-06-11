import { ANNUAL_LEAVE_ALLOWANCE_DAYS, DashboardLayout } from "@esti/contracts";
import { and, count, eq, gte, isNull, sql } from "drizzle-orm";
import {
  feeProposals,
  invoices,
  leaves,
  payslips,
  permits,
  projectOffices,
  tasks,
  teamMembers,
  users,
} from "../../db/schema.js";
import { getOrgSettings } from "../../lib/settings.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

/** Office-health KPIs aggregated across projects, fees, invoices and permits. */
export const dashboardRouter = router({
  /** Per-user header strip: server date + this user's leave balance. */
  me: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().slice(0, 10);
    // Match the login to a team member by email to read their leave balance.
    const [member] = ctx.user.email
      ? await ctx.db.select().from(teamMembers).where(eq(teamMembers.email, ctx.user.email))
      : [];
    let leave: { allowance: number; used: number; remaining: number } | null = null;
    if (member) {
      const yearStart = `${new Date().getUTCFullYear()}-01-01`;
      const [agg] = await ctx.db
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
    return { today, fullName: ctx.user.fullName, role: ctx.user.role, leave };
  }),

  /** This user's saved dashboard layout (null = use the default). */
  layout: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ layout: users.dashboardLayout })
      .from(users)
      .where(eq(users.id, ctx.user.id));
    return (row?.layout as unknown) ?? null;
  }),

  /** Persist this user's dashboard layout (self-service). */
  saveLayout: protectedProcedure.input(DashboardLayout).mutation(async ({ ctx, input }) => {
    await ctx.db.update(users).set({ dashboardLayout: input }).where(eq(users.id, ctx.user.id));
    return { ok: true };
  }),

  /** Aggregations for the dashboard board widgets. */
  boards: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().slice(0, 10);

    const byType = await ctx.db
      .select({ type: projectOffices.projectType, n: count() })
      .from(projectOffices)
      .where(isNull(projectOffices.archivedAt))
      .groupBy(projectOffices.projectType);

    // A project's current phase = its lowest-ordered phase that isn't complete.
    const phaseRows = (await ctx.db.execute(sql`
      select cur.code as code, cur.label as label, count(*)::int as n
      from (
        select distinct on (project_id) project_id, code, label, sort_order
        from esti_phase
        where status <> 'COMPLETE'
        order by project_id, sort_order asc
      ) cur
      group by cur.code, cur.label
      order by min(cur.sort_order)
    `)) as unknown as { code: string; label: string; n: number }[];

    const [leaveRow] = await ctx.db
      .select({ n: sql<string>`count(distinct ${leaves.teamMemberId})` })
      .from(leaves)
      .where(and(eq(leaves.status, "APPROVED"), sql`${today} between ${leaves.fromDate} and ${leaves.toDate}`));

    const [taskTodayRow] = await ctx.db
      .select({ n: count() })
      .from(tasks)
      .where(and(sql`${tasks.status} <> 'DONE'`, sql`${tasks.dueDate} is not null and ${tasks.dueDate} <= ${today}`));

    const workload = await ctx.db
      .select({ assignee: tasks.assignee, n: count() })
      .from(tasks)
      .where(and(sql`${tasks.status} <> 'DONE'`, sql`${tasks.assignee} is not null and ${tasks.assignee} <> ''`))
      .groupBy(tasks.assignee)
      .orderBy(sql`count(*) desc`)
      .limit(8);

    // Receivables aging: outstanding (ISSUED) net amount bucketed by invoice age.
    const [aging] = await ctx.db
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
      receivablesAging: {
        d0_30: Number(aging?.d0_30 ?? 0),
        d31_60: Number(aging?.d31_60 ?? 0),
        d60p: Number(aging?.d60p ?? 0),
      },
    };
  }),

  /** Action Center: billable phases, overdue invoices, pending approvals. */
  actionCenter: protectedProcedure.query(async ({ ctx }) => {
    const billingReadyRows = (await ctx.db.execute(sql`
      select
        ph.id, ph.label, ph.billing_pct, ph.status,
        po.id   as project_id,
        po.ref  as project_ref,
        po.title as project_title,
        po.contract_value_paise
      from esti_phase ph
      join esti_project_office po on ph.project_id = po.id
      where ph.status in ('APPROVED', 'COMPLETE')
        and po.status = 'ACTIVE'
        and po.archived_at is null
        and not exists (
          select 1 from esti_invoice i
          where i.phase_id = ph.id
          and i.status <> 'CANCELLED'
        )
      order by po.ref, ph.sort_order
      limit 20
    `)) as unknown as {
      id: string; label: string; billing_pct: number; status: string;
      project_id: string; project_ref: string; project_title: string;
      contract_value_paise: number;
    }[];

    const overdueRows = (await ctx.db.execute(sql`
      select
        i.id, i.ref, i.date_invoice, i.net_receivable_paise,
        po.id   as project_id,
        po.ref  as project_ref,
        po.title as project_title,
        (current_date - i.date_invoice)::int as days_overdue
      from esti_invoice i
      join esti_project_office po on i.project_id = po.id
      where i.status = 'ISSUED'
        and i.date_invoice < current_date - 30
      order by i.date_invoice asc
      limit 20
    `)) as unknown as {
      id: string; ref: string; date_invoice: string; net_receivable_paise: number;
      project_id: string; project_ref: string; project_title: string; days_overdue: number;
    }[];

    const pendingApprovalRows = (await ctx.db.execute(sql`
      select
        a.id, a.title, a.entity_type, a.sent_date,
        po.id   as project_id,
        po.ref  as project_ref,
        po.title as project_title,
        coalesce((current_date - a.sent_date)::int, 0) as days_waiting
      from esti_approval a
      join esti_project_office po on a.project_id = po.id
      where a.status = 'SENT'
      order by a.sent_date asc nulls last
      limit 20
    `)) as unknown as {
      id: string; title: string; entity_type: string; sent_date: string | null;
      project_id: string; project_ref: string; project_title: string; days_waiting: number;
    }[];

    return {
      billingReadyPhases: billingReadyRows.map((r) => ({
        id: r.id,
        label: r.label,
        billingPct: r.billing_pct,
        status: r.status,
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
    };
  }),

  summary: protectedProcedure.query(async ({ ctx }) => {
    const projectRows = await ctx.db
      .select({
        status: projectOffices.status,
        n: count(),
        value: sql<string>`coalesce(sum(${projectOffices.contractValuePaise}), 0)`,
      })
      .from(projectOffices)
      .where(isNull(projectOffices.archivedAt))
      .groupBy(projectOffices.status);

    const invoiceRows = await ctx.db
      .select({
        status: invoices.status,
        grand: sql<string>`coalesce(sum(${invoices.grandTotalPaise}), 0)`,
        net: sql<string>`coalesce(sum(${invoices.netReceivablePaise}), 0)`,
      })
      .from(invoices)
      .groupBy(invoices.status);

    const today = new Date().toISOString().slice(0, 10);
    const [permitAgg] = await ctx.db
      .select({
        total: count(),
        overdue: sql<string>`coalesce(sum(case when ${permits.dateDue} < ${today} and ${permits.status} not in ('APPROVED', 'REJECTED', 'EXPIRED') then 1 else 0 end), 0)`,
        open: sql<string>`coalesce(sum(case when ${permits.status} not in ('APPROVED', 'REJECTED', 'EXPIRED') then 1 else 0 end), 0)`,
      })
      .from(permits);

    const [feeAgg] = await ctx.db
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
    const settings = await getOrgSettings(ctx.db);
    let hr: {
      headcount: number;
      pendingLeaves: number;
      unpaidPayslips: number;
      unpaidNetPaise: number;
    } | null = null;
    if (settings.hrEnabled) {
      const [headRow] = await ctx.db
        .select({ n: count() })
        .from(teamMembers)
        .where(eq(teamMembers.active, true));
      const [leaveRow] = await ctx.db
        .select({ n: count() })
        .from(leaves)
        .where(eq(leaves.status, "REQUESTED"));
      const [payRow] = await ctx.db
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
  }),
});
