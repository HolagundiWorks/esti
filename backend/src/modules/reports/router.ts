import { sql } from "drizzle-orm";
import { z } from "zod";
import { invoices } from "../../db/schema.js";
import { capabilityProcedure, router } from "../../trpc/trpc.js";

const reportProcedure = capabilityProcedure("reports:view");

/**
 * Statutory filing abstracts (GST output tax, TDS deducted) aggregated by
 * month from issued/paid invoices. These feed GSTR-1/GSTR-3B and the 26AS /
 * TDS-credit reconciliation. Owner-only — they expose firm-wide tax totals.
 */

/** Indian financial year runs 1 Apr → 31 Mar. Returns [start, end] ISO dates. */
function defaultFinancialYear(today = new Date()): { from: string; to: string } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth(); // 0 = Jan
  const startYear = m >= 3 ? y : y - 1; // Apr (3) onwards is the current FY
  return { from: `${startYear}-04-01`, to: `${startYear + 1}-03-31` };
}

const RangeInput = z
  .object({
    fromDate: z.string().date().optional(),
    toDate: z.string().date().optional(),
  })
  .optional();

// Use the stamped invoice date; fall back to the creation date for safety.
const periodDate = sql`coalesce(${invoices.dateInvoice}, ${invoices.createdAt}::date)`;
const period = sql<string>`to_char(${periodDate}, 'YYYY-MM')`;
// Filing liability arises once a document leaves DRAFT and is not cancelled.
const filedStatuses = sql`${invoices.status} in ('ISSUED', 'PAID')`;

export const reportsRouter = router({
  gstAbstract: reportProcedure.input(RangeInput).query(async ({ ctx, input }) => {
    const fy = defaultFinancialYear();
    const from = input?.fromDate ?? fy.from;
    const to = input?.toDate ?? fy.to;
    const where = sql`${filedStatuses} and ${periodDate} between ${from} and ${to}`;

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

    return { from, to, periods, totals };
  }),

  tdsAbstract: reportProcedure.input(RangeInput).query(async ({ ctx, input }) => {
    const fy = defaultFinancialYear();
    const from = input?.fromDate ?? fy.from;
    const to = input?.toDate ?? fy.to;
    const where = sql`${filedStatuses} and ${invoices.tdsApplicable} and ${invoices.tdsPaise} > 0 and ${periodDate} between ${from} and ${to}`;

    const rows = await ctx.db
      .select({
        period,
        count: sql<string>`count(*)`,
        // Gross professional fees on which TDS u/s 194J was deducted.
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

    return { from, to, periods, totals };
  }),
});
