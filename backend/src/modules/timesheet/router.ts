import { TimesheetCreate, TimesheetListParams, TimesheetUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { projectOffices, tasks, teamMembers, timesheets } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { requireHrEnabled } from "../../lib/settings.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const withDetails = {
  id: timesheets.id,
  teamMemberId: timesheets.teamMemberId,
  projectId: timesheets.projectId,
  taskId: timesheets.taskId,
  entryDate: timesheets.entryDate,
  hours: timesheets.hours,
  billable: timesheets.billable,
  description: timesheets.description,
  createdAt: timesheets.createdAt,
  memberName: teamMembers.name,
  projectRef: projectOffices.ref,
  projectTitle: projectOffices.title,
  taskTitle: tasks.title,
};

export const timesheetRouter = router({
  list: protectedProcedure
    .input(TimesheetListParams.optional())
    .query(async ({ ctx, input }) => {
      await requireHrEnabled(ctx.db);
      const filters: ReturnType<typeof eq>[] = [];

      if (input?.myOnly) {
        const [tm] = await ctx.db
          .select({ id: teamMembers.id })
          .from(teamMembers)
          .where(eq(teamMembers.userId, ctx.user.id));
        if (!tm) return [];
        filters.push(eq(timesheets.teamMemberId, tm.id));
      } else if (input?.teamMemberId) {
        filters.push(eq(timesheets.teamMemberId, input.teamMemberId));
      }

      if (input?.projectId) filters.push(eq(timesheets.projectId, input.projectId));
      if (input?.dateFrom) filters.push(gte(timesheets.entryDate, input.dateFrom));
      if (input?.dateTo) filters.push(lte(timesheets.entryDate, input.dateTo));

      const base = ctx.db
        .select(withDetails)
        .from(timesheets)
        .leftJoin(teamMembers, eq(teamMembers.id, timesheets.teamMemberId))
        .leftJoin(projectOffices, eq(projectOffices.id, timesheets.projectId))
        .leftJoin(tasks, eq(tasks.id, timesheets.taskId));

      return filters.length
        ? base.where(and(...filters)).orderBy(desc(timesheets.entryDate))
        : base.orderBy(desc(timesheets.entryDate));
    }),

  create: protectedProcedure.input(TimesheetCreate).mutation(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    const [tm] = await ctx.db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(eq(teamMembers.id, input.teamMemberId));
    if (!tm) throw new TRPCError({ code: "NOT_FOUND", message: "Team member not found" });

    const [row] = await ctx.db
      .insert(timesheets)
      .values({
        teamMemberId: input.teamMemberId,
        projectId: input.projectId ?? null,
        taskId: input.taskId ?? null,
        entryDate: input.entryDate,
        hours: String(input.hours),
        billable: input.billable,
        description: input.description ?? null,
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "timesheet", entityId: row!.id, action: "CREATE",
      actorId: ctx.user.id, after: row,
    });
    return row!;
  }),

  update: protectedProcedure.input(TimesheetUpdate).mutation(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    const [before] = await ctx.db.select().from(timesheets).where(eq(timesheets.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const [updated] = await ctx.db
      .update(timesheets)
      .set({
        ...(input.hours !== undefined ? { hours: String(input.hours) } : {}),
        ...(input.billable !== undefined ? { billable: input.billable } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
        ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      })
      .where(eq(timesheets.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "timesheet", entityId: input.id, action: "UPDATE",
      actorId: ctx.user.id, before, after: updated,
    });
    return updated!;
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireHrEnabled(ctx.db);
      const [before] = await ctx.db.select().from(timesheets).where(eq(timesheets.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(timesheets).where(eq(timesheets.id, input.id));
      await writeAudit(ctx.db, {
        entity: "timesheet", entityId: input.id, action: "DELETE",
        actorId: ctx.user.id, before,
      });
      return { ok: true };
    }),

  /** Total hours per team member for a date range (for ASPRF scoring). */
  summary: protectedProcedure
    .input(z.object({ dateFrom: z.string(), dateTo: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireHrEnabled(ctx.db);
      const rows = await ctx.db
        .select(withDetails)
        .from(timesheets)
        .leftJoin(teamMembers, eq(teamMembers.id, timesheets.teamMemberId))
        .leftJoin(projectOffices, eq(projectOffices.id, timesheets.projectId))
        .leftJoin(tasks, eq(tasks.id, timesheets.taskId))
        .where(and(
          gte(timesheets.entryDate, input.dateFrom),
          lte(timesheets.entryDate, input.dateTo),
        ));

      const byMember = new Map<string, { name: string; total: number; billable: number }>();
      for (const row of rows) {
        const key = row.teamMemberId;
        const existing = byMember.get(key) ?? { name: row.memberName ?? "Unknown", total: 0, billable: 0 };
        const h = Number(row.hours) || 0;
        existing.total += h;
        if (row.billable) existing.billable += h;
        byMember.set(key, existing);
      }
      return Array.from(byMember.entries()).map(([teamMemberId, v]) => ({
        teamMemberId,
        memberName: v.name,
        totalHours: Math.round(v.total * 10) / 10,
        billableHours: Math.round(v.billable * 10) / 10,
        billableRate: v.total > 0 ? Math.round((v.billable / v.total) * 100) : 0,
      }));
    }),
});
