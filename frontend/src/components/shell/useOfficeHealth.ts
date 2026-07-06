import { trpc } from "../../lib/trpc.js";
import type { ZoneState } from "../dashboard/zoneState.js";

/**
 * Office-health state (shape indicator) + due-date counts — shared by the footer
 * (health indicator on the right, due dates beside the clock) and the floating
 * dock's alert-status top border. Derived from dashboard.home + todayGlance;
 * cached / deduped by react-query so calling it in two places is one request.
 */
export function useOfficeHealth(): { state: ZoneState; pendingTasks: number; overdueInvoices: number } {
  const homeQ = trpc.dashboard.home.useQuery(undefined, { staleTime: 60_000 });
  const glanceQ = trpc.dashboard.todayGlance.useQuery(undefined, { staleTime: 60_000 });
  const home = homeQ.data;
  const overdueInvoices = home?.actionCenter?.overdueInvoices?.length ?? 0;
  const pendingTasks = glanceQ.data?.pendingTasks ?? 0;

  let state: ZoneState = "inactive";
  if (home) {
    const risk = (home.projectHealth ?? []).filter((p: { health: string }) => p.health === "RED").length;
    const overduePaise = home.financialHealth?.overdue30dPaise ?? 0;
    state =
      risk >= 2 || overduePaise > 5_000_000 || overdueInvoices >= 3
        ? "critical"
        : risk >= 1 || overduePaise > 0 || overdueInvoices > 0
        ? "watch"
        : "stable";
  }
  return { state, pendingTasks, overdueInvoices };
}
