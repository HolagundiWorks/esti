import { DashboardLayout } from "@esti/contracts";
import { eq } from "drizzle-orm";
import { users } from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
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
} from "./readModels.js";

/** Office-health KPIs aggregated across projects, fees, invoices and permits. */
export const dashboardRouter = router({
  /** Per-user header strip: server date + this user's leave balance. */
  me: protectedProcedure.query(({ ctx }) => getDashboardMe(ctx.db, ctx.user)),

  /** Bundled office dashboard data — one server round-trip for the home view. */
  home: protectedProcedure.query(({ ctx }) => getDashboardHome(ctx.db)),

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
