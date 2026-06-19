/** ISO date (YYYY-MM-DD) in UTC — shared by programme/PMC/construction read models. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
