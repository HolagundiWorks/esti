import { count, sql } from "drizzle-orm";
import { feeProposals, invoices, permits, projectOffices } from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

/** Office-health KPIs aggregated across projects, fees, invoices and permits. */
export const dashboardRouter = router({
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

    return {
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
