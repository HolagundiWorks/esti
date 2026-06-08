import { ANNUAL_LEAVE_ALLOWANCE_DAYS, DashboardLayout } from "@esti/contracts";
import { and, count, eq, gte, sql } from "drizzle-orm";
import {
  feeProposals,
  invoices,
  leaves,
  payslips,
  permits,
  projectOffices,
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

  summary: protectedProcedure.query(async ({ ctx }) => {
    const projectRows = await ctx.db
      .select({
        status: projectOffices.status,
        n: count(),
        value: sql<string>`coalesce(sum(${projectOffices.contractValuePaise}), 0)`,
      })
      .from(projectOffices)
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
