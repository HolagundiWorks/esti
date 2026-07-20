import { z } from "zod";

/** Indian financial year: 1 April – 31 March. Fixed, non-configurable. */

/**
 * IST offset in minutes (UTC+5:30). The product is India-only, so "which day
 * is it" and "which financial year is it" are IST questions, not UTC ones.
 *
 * Reading the UTC calendar fields directly put the first 5½ hours of every day
 * into the previous day — and the first 5½ hours of 1 April into the closing
 * financial year, so invoices raised on the morning of 1 April drew a serial
 * from an FY that had ended (Rule 46(b) requires the series to be unique per
 * FY). India does not observe DST, so a fixed offset is exact.
 */
const IST_OFFSET_MIN = 5 * 60 + 30;

/** The same instant expressed as IST calendar fields (via UTC getters). */
function istParts(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MIN * 60_000);
}

/** FY label for a date, e.g. "2026-27" for any date 2026-04-01..2027-03-31 IST. */
export function financialYear(date: Date = new Date()): string {
  const ist = istParts(date);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const startYear = m >= 3 ? y : y - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endShort}`;
}

/** Today's date in IST as an ISO `YYYY-MM-DD` string. */
export function istToday(date: Date = new Date()): string {
  return istParts(date).toISOString().slice(0, 10);
}

/** Start (inclusive) and end (exclusive) of the FY containing `date`. */
export function financialYearRange(date: Date = new Date()): { start: Date; end: Date } {
  const ist = istParts(date);
  const y = ist.getUTCFullYear();
  const startYear = ist.getUTCMonth() >= 3 ? y : y - 1;
  return {
    start: new Date(Date.UTC(startYear, 3, 1)),
    end: new Date(Date.UTC(startYear + 1, 3, 1)),
  };
}

/** Parse FY label "2026-27" → start year 2026. */
export function fyStartYear(fyLabel: string): number {
  const m = /^(\d{4})-\d{2}$/.exec(fyLabel);
  if (!m) throw new Error(`Invalid FY label: ${fyLabel}`);
  return Number(m[1]);
}

/** ISO date range [from, to] inclusive for an FY label. */
export function fyDateRange(fyLabel: string): { from: string; to: string } {
  const start = fyStartYear(fyLabel);
  return { from: `${start}-04-01`, to: `${start + 1}-03-31` };
}

export const PeriodPreset = z.enum([
  "CURRENT_FY",
  "PREVIOUS_FY",
  "FY",
  "QUARTER",
  "MONTH",
  "ASSESSMENT_YEAR",
  "CUSTOM",
]);
export type PeriodPreset = z.infer<typeof PeriodPreset>;

export const FyQuarter = z.enum(["Q1", "Q2", "Q3", "Q4"]);
export type FyQuarter = z.infer<typeof FyQuarter>;

/** Shared period filter for GST/TDS abstracts, invoice lists, and exports. */
export const PeriodFilterInput = z.object({
  preset: PeriodPreset.optional(),
  /** FY label e.g. "2026-27" when preset is FY or QUARTER. */
  fy: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  quarter: FyQuarter.optional(),
  /** Calendar month YYYY-MM when preset is MONTH. */
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  /** Assessment / TDS credit year (calendar year ending 31 Mar of FY). */
  assessmentYear: z.number().int().min(2000).max(2100).optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
});
export type PeriodFilterInput = z.infer<typeof PeriodFilterInput>;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Indian FY quarter date ranges (inclusive ISO dates). */
export function quarterDateRange(fyLabel: string, quarter: FyQuarter): { from: string; to: string } {
  const y = fyStartYear(fyLabel);
  switch (quarter) {
    case "Q1":
      return { from: `${y}-04-01`, to: `${y}-06-30` };
    case "Q2":
      return { from: `${y}-07-01`, to: `${y}-09-30` };
    case "Q3":
      return { from: `${y}-10-01`, to: `${y}-12-31` };
    case "Q4":
      return { from: `${y + 1}-01-01`, to: `${y + 1}-03-31` };
  }
}

/** Month YYYY-MM → inclusive from/to ISO dates. */
export function monthDateRange(month: string): { from: string; to: string } {
  const [ys, ms] = month.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
}

/** Resolve a period filter to inclusive ISO from/to dates and a display label. */
export function resolvePeriodRange(
  input?: PeriodFilterInput,
  today = new Date(),
): { from: string; to: string; label: string } {
  const preset = input?.preset ?? "CURRENT_FY";
  const currentFy = financialYear(today);

  if (preset === "CUSTOM" && input?.fromDate && input?.toDate) {
    return { from: input.fromDate, to: input.toDate, label: `${input.fromDate} – ${input.toDate}` };
  }

  if (preset === "CURRENT_FY" || (preset === "FY" && !input?.fy)) {
    const { from, to } = fyDateRange(currentFy);
    return { from, to, label: `FY ${currentFy}` };
  }

  if (preset === "PREVIOUS_FY") {
    const prevStart = fyStartYear(currentFy) - 1;
    const prev = `${prevStart}-${String((prevStart + 1) % 100).padStart(2, "0")}`;
    const { from, to } = fyDateRange(prev);
    return { from, to, label: `FY ${prev}` };
  }

  if (preset === "FY" && input?.fy) {
    const { from, to } = fyDateRange(input.fy);
    return { from, to, label: `FY ${input.fy}` };
  }

  if (preset === "QUARTER" && input?.quarter) {
    const fy = input.fy ?? currentFy;
    const { from, to } = quarterDateRange(fy, input.quarter);
    return { from, to, label: `${input.quarter} FY ${fy}` };
  }

  if (preset === "MONTH" && input?.month) {
    const { from, to } = monthDateRange(input.month);
    return { from, to, label: input.month };
  }

  if (preset === "ASSESSMENT_YEAR" && input?.assessmentYear) {
    const y = input.assessmentYear;
    return { from: `${y - 1}-04-01`, to: `${y}-03-31`, label: `AY ${y - 1}–${String(y).slice(2)}` };
  }

  const { from, to } = fyDateRange(currentFy);
  return { from, to, label: `FY ${currentFy}` };
}
