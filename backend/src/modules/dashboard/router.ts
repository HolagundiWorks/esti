import { DashboardLayout } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { users } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";
import {
  getActionCenter,
  getClientIntelligence,
  getDashboardBoards,
  getDashboardMe,
  getDashboardSummary,
  getFinancialHealth,
  getProjectHealth,
  getRevisionIntelligence,
  getTeamIntelligence,
  getTeamAttendanceToday,
  getTechnicalIntelligence,
  getDashboardHome,
} from "./readModels/index.js";
import {
  buildReasoningFrame,
  ingestCognitionEvents,
  loadBehaviorProfiles,
  loadCognitionQueue,
} from "../cognition/engine.js";
import { assertPlanFeature } from "../../lib/plan.js";

/** Office-health KPIs aggregated across projects, fees, invoices and permits. */
export const dashboardRouter = router({
  /** Per-user header strip: server date + this user's leave balance. */
  me: protectedProcedure.query(({ ctx }) => getDashboardMe(ctx.db, ctx.user)),

  /** Bundled office dashboard data — one server round-trip for the home view. */
  home: protectedProcedure.query(({ ctx }) => getDashboardHome(ctx.db)),

  /** Explicit ingestion hook for workers/cron/tests; dashboard.home also refreshes idempotently. */
  ingestCognition: protectedProcedure.mutation(async ({ ctx }) => {
    const [actionCenter, financialHealth, projectHealth, clientIntelligence, teamIntelligence] =
      await Promise.all([
        getActionCenter(ctx.db),
        getFinancialHealth(ctx.db),
        getProjectHealth(ctx.db),
        getClientIntelligence(ctx.db),
        getTeamIntelligence(ctx.db),
      ]);
    const ingestion = await ingestCognitionEvents(ctx.db, {
      actionCenter,
      financialHealth,
      projectHealth,
      clientIntelligence,
      teamIntelligence,
    });
    const [priorityQueue, behaviorProfiles] = await Promise.all([
      loadCognitionQueue(ctx.db),
      loadBehaviorProfiles(ctx.db),
    ]);
    return {
      ingestion,
      priorityQueue,
      behaviorProfiles,
      reasoning: buildReasoningFrame({ queue: priorityQueue, behaviorProfiles }),
    };
  }),

  cognitionQueue: protectedProcedure.query(async ({ ctx }) => {
    const [priorityQueue, behaviorProfiles] = await Promise.all([
      loadCognitionQueue(ctx.db),
      loadBehaviorProfiles(ctx.db),
    ]);
    return {
      priorityQueue,
      behaviorProfiles,
      reasoning: buildReasoningFrame({ queue: priorityQueue, behaviorProfiles }),
    };
  }),

  /** This user's saved dashboard layout (null = use the default). */
  layout: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ layout: users.dashboardLayout })
      .from(users)
      .where(eq(users.id, ctx.user.id));
    return (row?.layout as unknown) ?? null;
  }),

  /** Persist this user's dashboard layout (self-service). */
  saveLayout: protectedProcedure.input(DashboardLayout).mutation(async ({ ctx, input }) => {
    await ctx.db.update(users).set({ dashboardLayout: input }).where(eq(users.id, ctx.user.id));
    return { ok: true };
  }),

  /**
   * Apply narrow, auditable office interventions. These intentionally mutate the
   * underlying records used by the health model instead of faking a green UI.
   */
  applyIntervention: protectedProcedure
    .input(z.object({
      action: z.enum([
        "complete-overdue-tasks",
        "rebalance-team-load",
        "clear-stale-approvals",
        "settle-overdue-invoices",
        "close-critical-notes",
        "stabilize-office",
      ]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.isDemo && !ctx.user.isSystemAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Dashboard auto-interventions are available only in demo/system-admin workspaces.",
        });
      }

      async function completeOverdueTasks() {
        const rows = (await ctx.db.execute(sql`
          update esti_task
          set status = 'DONE', completed_at = now()
          where status <> 'DONE'
            and due_date < current_date
          returning id
        `)) as unknown as { id: string }[];
        return rows.length;
      }

      async function clearStaleApprovals() {
        const rows = (await ctx.db.execute(sql`
          update esti_approval
          set status = 'APPROVED',
              response_date = current_date,
              remarks = coalesce(remarks, '') || case when remarks is null or remarks = '' then '' else E'\n' end || 'Resolved through dashboard intervention.',
              updated_at = now()
          where status = 'SENT'
            and sent_date < current_date - 7
          returning id
        `)) as unknown as { id: string }[];
        return rows.length;
      }

      async function settleOverdueInvoices() {
        const rows = (await ctx.db.execute(sql`
          update esti_invoice
          set status = 'PAID', updated_at = now()
          where status = 'ISSUED'
            and date_invoice < current_date - 30
          returning id
        `)) as unknown as { id: string }[];
        return rows.length;
      }

      async function closeCriticalNotes() {
        const rows = (await ctx.db.execute(sql`
          update esti_critical_note
          set status = 'CLOSED', updated_at = now()
          where status = 'OPEN'
            and priority = 'HIGH'
          returning id
        `)) as unknown as { id: string }[];
        return rows.length;
      }

      async function rebalanceTeamLoad() {
        const rows = (await ctx.db.execute(sql`
          with available as (
            select tm.id, tm.name, count(t.id)::int as open_count
            from esti_teammember tm
            left join esti_task t on t.assignee_id = tm.id and t.status <> 'DONE'
            where tm.active = true
            group by tm.id, tm.name
            order by open_count asc, tm.name asc
            limit 1
          ),
          overloaded as (
            select t.id
            from esti_task t
            where t.status <> 'DONE'
              and t.assignee_id is not null
              and t.assignee_id not in (select id from available)
              and (
                t.due_date < current_date
                or t.assignee_id in (
                  select assignee_id
                  from esti_task
                  where status <> 'DONE'
                    and assignee_id is not null
                  group by assignee_id
                  having count(*) >= 5
                )
              )
            order by t.due_date nulls last, t.priority desc
            limit 4
          )
          update esti_task t
          set assignee_id = available.id,
              assignee = available.name
          from available, overloaded
          where t.id = overloaded.id
          returning t.id
        `)) as unknown as { id: string }[];
        return rows.length;
      }

      const result = {
        completedTasks: 0,
        reassignedTasks: 0,
        approvalsCleared: 0,
        invoicesSettled: 0,
        notesClosed: 0,
      };

      if (input.action === "complete-overdue-tasks" || input.action === "stabilize-office") {
        result.completedTasks = await completeOverdueTasks();
      }
      if (input.action === "rebalance-team-load" || input.action === "stabilize-office") {
        result.reassignedTasks = await rebalanceTeamLoad();
      }
      if (input.action === "clear-stale-approvals" || input.action === "stabilize-office") {
        result.approvalsCleared = await clearStaleApprovals();
      }
      if (input.action === "settle-overdue-invoices" || input.action === "stabilize-office") {
        result.invoicesSettled = await settleOverdueInvoices();
      }
      if (input.action === "close-critical-notes" || input.action === "stabilize-office") {
        result.notesClosed = await closeCriticalNotes();
      }

      const response = { ok: true, action: input.action, ...result };
      await writeAudit(ctx.db, {
        entity: "dashboard",
        action: "APPLY_INTERVENTION",
        actorId: ctx.user.id,
        after: response,
      });

      return response;
    }),

  /** Aggregations for the dashboard board widgets. */
  boards: protectedProcedure.query(({ ctx }) => getDashboardBoards(ctx.db)),

  /** Action Center: billable phases, overdue invoices, pending approvals. */
  actionCenter: protectedProcedure.query(({ ctx }) => getActionCenter(ctx.db)),

  /** Financial health: revenue pipeline, ready-to-bill estimate, collections. */
  financialHealth: protectedProcedure.query(({ ctx }) => getFinancialHealth(ctx.db)),

  summary: protectedProcedure.query(({ ctx }) => getDashboardSummary(ctx.db)),

  /** Team attendance for today — present / absent / WFH counts. */
  attendanceToday: protectedProcedure.query(({ ctx }) => getTeamAttendanceToday(ctx.db)),

  /** Per-project health scores for all active projects. */
  projectHealth: protectedProcedure.query(({ ctx }) => getProjectHealth(ctx.db)),

  /** Per-client intelligence signals: approval lag, revision frequency, payment age. */
  clientIntelligence: protectedProcedure.query(({ ctx }) => getClientIntelligence(ctx.db)),

  /** Team capacity signals: per-assignee task load and simplified wellbeing flag. */
  teamIntelligence: protectedProcedure.query(({ ctx }) => getTeamIntelligence(ctx.db)),

  /**
   * Revision Intelligence — firm-wide breakdown of design decisions by source.
   * Drives the Revision Intelligence dashboard tile and revision risk band.
   */
  revisionIntelligence: protectedProcedure.query(({ ctx }) => getRevisionIntelligence(ctx.db)),

  /**
   * Technical Intelligence — drawing accuracy and site-query rates
   * derived from decision source types.
   */
  technicalIntelligence: protectedProcedure.query(({ ctx }) => getTechnicalIntelligence(ctx.db)),

});
