import { PeriodFilterInput, formatINR } from "@esti/contracts";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { invoices, projectOffices } from "../../db/schema.js";
import { invoicePeriodDate, invoicePeriodWhere, periodRangeFromInput } from "../../lib/periodFilter.js";
import { capabilityProcedure, router } from "../../trpc/trpc.js";

const reportProcedure = capabilityProcedure("reports:view");

const PeriodInput = z.object({ period: PeriodFilterInput.optional() }).optional();

const filedStatuses = sql`${invoices.status} in ('ISSUED', 'PAID')`;
const period = sql<string>`to_char(${invoicePeriodDate}, 'YYYY-MM')`;

export const reportsRouter = router({
  gstAbstract: reportProcedure.input(PeriodInput).query(async ({ ctx, input }) => {
    const { from, to, label } = periodRangeFromInput(input?.period);
    const where = and(filedStatuses, sql`${invoicePeriodDate} between ${from} and ${to}`);

    const rows = await ctx.db
      .select({
        period,
        count: sql<string>`count(*)`,
        taxablePaise: sql<string>`coalesce(sum(${invoices.taxablePaise}), 0)`,
        cgstPaise: sql<string>`coalesce(sum(${invoices.cgstPaise}), 0)`,
        sgstPaise: sql<string>`coalesce(sum(${invoices.sgstPaise}), 0)`,
        igstPaise: sql<string>`coalesce(sum(${invoices.igstPaise}), 0)`,
        gstTotalPaise: sql<string>`coalesce(sum(${invoices.gstTotalPaise}), 0)`,
        compositionLevyPaise: sql<string>`coalesce(sum(${invoices.compositionLevyPaise}), 0)`,
        invoiceTotalPaise: sql<string>`coalesce(sum(${invoices.grandTotalPaise}), 0)`,
      })
      .from(invoices)
      .where(where)
      .groupBy(period)
      .orderBy(period);

    const periods = rows.map((r) => ({
      period: r.period,
      count: Number(r.count),
      taxablePaise: Number(r.taxablePaise),
      cgstPaise: Number(r.cgstPaise),
      sgstPaise: Number(r.sgstPaise),
      igstPaise: Number(r.igstPaise),
      gstTotalPaise: Number(r.gstTotalPaise),
      compositionLevyPaise: Number(r.compositionLevyPaise),
      invoiceTotalPaise: Number(r.invoiceTotalPaise),
    }));

    const totals = periods.reduce(
      (a, p) => ({
        count: a.count + p.count,
        taxablePaise: a.taxablePaise + p.taxablePaise,
        cgstPaise: a.cgstPaise + p.cgstPaise,
        sgstPaise: a.sgstPaise + p.sgstPaise,
        igstPaise: a.igstPaise + p.igstPaise,
        gstTotalPaise: a.gstTotalPaise + p.gstTotalPaise,
        compositionLevyPaise: a.compositionLevyPaise + p.compositionLevyPaise,
        invoiceTotalPaise: a.invoiceTotalPaise + p.invoiceTotalPaise,
      }),
      {
        count: 0,
        taxablePaise: 0,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 0,
        gstTotalPaise: 0,
        compositionLevyPaise: 0,
        invoiceTotalPaise: 0,
      },
    );

    return { from, to, label, periods, totals };
  }),

  tdsAbstract: reportProcedure.input(PeriodInput).query(async ({ ctx, input }) => {
    const { from, to, label } = periodRangeFromInput(input?.period);
    const where = and(
      filedStatuses,
      sql`${invoices.tdsApplicable}`,
      sql`${invoices.tdsPaise} > 0`,
      sql`${invoicePeriodDate} between ${from} and ${to}`,
    );

    const rows = await ctx.db
      .select({
        period,
        count: sql<string>`count(*)`,
        grossPaise: sql<string>`coalesce(sum(${invoices.taxablePaise}), 0)`,
        tdsPaise: sql<string>`coalesce(sum(${invoices.tdsPaise}), 0)`,
        netReceivablePaise: sql<string>`coalesce(sum(${invoices.netReceivablePaise}), 0)`,
      })
      .from(invoices)
      .where(where)
      .groupBy(period)
      .orderBy(period);

    const periods = rows.map((r) => ({
      period: r.period,
      count: Number(r.count),
      grossPaise: Number(r.grossPaise),
      tdsPaise: Number(r.tdsPaise),
      netReceivablePaise: Number(r.netReceivablePaise),
    }));

    const totals = periods.reduce(
      (a, p) => ({
        count: a.count + p.count,
        grossPaise: a.grossPaise + p.grossPaise,
        tdsPaise: a.tdsPaise + p.tdsPaise,
        netReceivablePaise: a.netReceivablePaise + p.netReceivablePaise,
      }),
      { count: 0, grossPaise: 0, tdsPaise: 0, netReceivablePaise: 0 },
    );

    return { from, to, label, periods, totals };
  }),

  /** Accountant workbook rows — issued/paid invoice register for the period. */
  invoiceRegisterExport: reportProcedure.input(PeriodInput).query(async ({ ctx, input }) => {
    const { from, to, label } = periodRangeFromInput(input?.period);
    const rows = await ctx.db
      .select({
        ref: invoices.ref,
        projectRef: projectOffices.ref,
        projectTitle: projectOffices.title,
        status: invoices.status,
        documentKind: invoices.documentKind,
        dateInvoice: invoices.dateInvoice,
        taxablePaise: invoices.taxablePaise,
        cgstPaise: invoices.cgstPaise,
        sgstPaise: invoices.sgstPaise,
        igstPaise: invoices.igstPaise,
        gstTotalPaise: invoices.gstTotalPaise,
        tdsPaise: invoices.tdsPaise,
        netReceivablePaise: invoices.netReceivablePaise,
        grandTotalPaise: invoices.grandTotalPaise,
      })
      .from(invoices)
      .innerJoin(projectOffices, eq(invoices.projectId, projectOffices.id))
      .where(and(filedStatuses, sql`${invoicePeriodDate} between ${from} and ${to}`))
      .orderBy(desc(invoices.dateInvoice), desc(invoices.createdAt));

    return {
      label,
      from,
      to,
      rows: rows.map((r) => ({
        Ref: r.ref,
        Project: `${r.projectRef} · ${r.projectTitle}`,
        Status: r.status,
        Kind: r.documentKind,
        Date: r.dateInvoice ?? "",
        Taxable: formatINR(r.taxablePaise, { paise: false }),
        CGST: formatINR(r.cgstPaise, { paise: false }),
        SGST: formatINR(r.sgstPaise, { paise: false }),
        IGST: formatINR(r.igstPaise, { paise: false }),
        "GST total": formatINR(r.gstTotalPaise, { paise: false }),
        TDS: formatINR(r.tdsPaise, { paise: false }),
        Net: formatINR(r.netReceivablePaise, { paise: false }),
        Grand: formatINR(r.grandTotalPaise, { paise: false }),
      })),
    };
  }),
});
