/** Indian financial year: 1 April – 31 March. Fixed, non-configurable. */

/** FY label for a date, e.g. "2026-27" for any date 2026-04-01..2027-03-31. */
export function financialYear(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth(); // 0=Jan
  const startYear = m >= 3 ? y : y - 1; // April (index 3) starts the FY
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endShort}`;
}

/** Start (inclusive) and end (exclusive) of the FY containing `date`, in UTC. */
export function financialYearRange(date: Date = new Date()): { start: Date; end: Date } {
  const y = date.getUTCFullYear();
  const startYear = date.getUTCMonth() >= 3 ? y : y - 1;
  return {
    start: new Date(Date.UTC(startYear, 3, 1)),
    end: new Date(Date.UTC(startYear + 1, 3, 1)),
  };
}
