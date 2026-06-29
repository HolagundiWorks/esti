import { and, count, countDistinct, eq, gte, ne, sql } from "drizzle-orm";
import { assignments, attendance, tasks, teamMembers } from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const profileRouter = router({
  /** Current user's Work Profile aggregate (projects, tasks, attendance). */
  workSummary: protectedProcedure.query(async ({ ctx }) => {
    const [tm] = await ctx.db
      .select({ id: teamMembers.id, name: teamMembers.name, role: teamMembers.role })
      .from(teamMembers)
      .where(eq(teamMembers.userId, ctx.user.id));
    if (!tm) {
      return {
        hasTeamMember: false,
        teamMemberName: null as string | null,
        teamRole: null as string | null,
        assignedProjects: 0,
        openTasks: 0,
        doneTasks: 0,
        attendance30: 0,
      };
    }

    const [proj] = await ctx.db
      .select({ n: countDistinct(assignments.projectId) })
      .from(assignments)
      .where(eq(assignments.teamMemberId, tm.id));

    const [open] = await ctx.db
      .select({ n: count() })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, tm.id), ne(tasks.status, "DONE")));

    const [done] = await ctx.db
      .select({ n: count() })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, tm.id), eq(tasks.status, "DONE")));

    const [att] = await ctx.db
      .select({ n: count() })
      .from(attendance)
      .where(
        and(
          eq(attendance.teamMemberId, tm.id),
          gte(attendance.attendanceDate, daysAgoIso(30)),
          sql`${attendance.status} <> 'ABSENT'`,
        ),
      );

    return {
      hasTeamMember: true,
      teamMemberName: tm.name,
      teamRole: tm.role,
      assignedProjects: Number(proj?.n ?? 0),
      openTasks: Number(open?.n ?? 0),
      doneTasks: Number(done?.n ?? 0),
      attendance30: Number(att?.n ?? 0),
    };
  }),
});
