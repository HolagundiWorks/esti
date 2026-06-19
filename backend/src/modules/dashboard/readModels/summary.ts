import { and, count, eq, isNull, sql } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  feeProposals,
  invoices,
  leaves,
  payslips,
  permits,
  projectOffices,
  teamMembers,
} from "../../db/schema.js";
import { getOrgSettings } from "../../lib/settings.js";

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
