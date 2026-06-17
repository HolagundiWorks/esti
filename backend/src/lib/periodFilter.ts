import { PeriodFilterInput, resolvePeriodRange } from "@esti/contracts";
import { sql, type SQL } from "drizzle-orm";
import { invoices } from "../db/schema.js";

/** Invoice period column: stamped date when issued, else creation date. */
export const invoicePeriodDate = sql`coalesce(${invoices.dateInvoice}, ${invoices.createdAt}::date)`;

export function invoicePeriodWhere(period?: PeriodFilterInput): SQL | undefined {
  if (!period) return undefined;
  const { from, to } = resolvePeriodRange(period);
  return sql`${invoicePeriodDate} between ${from} and ${to}`;
}

export function periodRangeFromInput(period?: PeriodFilterInput) {
  return resolvePeriodRange(period);
}
