import { parseEscalationSettings } from "@esti/contracts";
import { buildAlerts, buildDigest } from "../../lib/buildAlerts.js";
import { getOrgSettings } from "../../lib/settings.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export type { Alert, AlertKind, Severity } from "../../lib/buildAlerts.js";

/**
 * Actionable alerts for staff — stale client approvals, due follow-ups,
 * overdue permits, portal submissions, tasks, and leave impact.
 */
export const notificationsRouter = router({
  /** Immediate high-priority alerts (respects owner escalation rules). */
  list: protectedProcedure.query(async ({ ctx }) => {
    const settings = await getOrgSettings(ctx.db);
    const rules = parseEscalationSettings(settings.escalationSettings);
    const alerts = await buildAlerts(ctx.db, rules);
    return alerts.filter((a) => a.immediate);
  }),

  /** Lower-priority items grouped for the daily Activity Center digest. */
  digest: protectedProcedure.query(async ({ ctx }) => {
    const settings = await getOrgSettings(ctx.db);
    const rules = parseEscalationSettings(settings.escalationSettings);
    const alerts = await buildAlerts(ctx.db, rules);
    const items = buildDigest(alerts, rules.digestEnabled);
    const today = new Date().toISOString().slice(0, 10);
    return {
      date: today,
      count: items.length,
      items,
    };
  }),
});
