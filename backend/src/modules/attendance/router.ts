import { AttendanceDayParams, AttendanceListParams, AttendanceMark } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { attendance, teamMembers } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { requireHrEnabled } from "../../lib/settings.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const hrProcedure = capabilityProcedure("hr:manage");

/** Staff attendance register — daily present/absent/WFH (architecture offices). */
export const attendanceRouter = router({
  /** All active members with attendance status for one day (null = not marked). */
  dayRegister: protectedProcedure.input(AttendanceDayParams).query(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    const members = await ctx.db
      .select({
        id: teamMembers.id,
        name: teamMembers.name,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(eq(teamMembers.active, true))
      .orderBy(asc(teamMembers.name));

    const rows = await ctx.db
      .select({
        teamMemberId: attendance.teamMemberId,
        status: attendance.status,
        notes: attendance.notes,
        id: attendance.id,
      })
      .from(attendance)
      .where(eq(attendance.attendanceDate, input.date));

    const byMember = new Map(rows.map((r) => [r.teamMemberId, r]));

    return {
      date: input.date,
      rows: members.map((m) => {
        const row = byMember.get(m.id);
        return {
          teamMemberId: m.id,
          memberName: m.name,
          memberRole: m.role,
          attendanceId: row?.id ?? null,
          status: row?.status ?? null,
          notes: row?.notes ?? null,
        };
      }),
    };
  }),

  list: protectedProcedure.input(AttendanceListParams.optional()).query(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    const filters = [];
    if (input?.teamMemberId) filters.push(eq(attendance.teamMemberId, input.teamMemberId));
    if (input?.dateFrom) filters.push(gte(attendance.attendanceDate, input.dateFrom));
    if (input?.dateTo) filters.push(lte(attendance.attendanceDate, input.dateTo));

    const base = ctx.db
      .select({
        id: attendance.id,
        teamMemberId: attendance.teamMemberId,
        attendanceDate: attendance.attendanceDate,
        status: attendance.status,
        notes: attendance.notes,
        memberName: teamMembers.name,
        memberRole: teamMembers.role,
      })
      .from(attendance)
      .innerJoin(teamMembers, eq(teamMembers.id, attendance.teamMemberId));

    return filters.length
      ? base.where(and(...filters)).orderBy(desc(attendance.attendanceDate), asc(teamMembers.name))
      : base.orderBy(desc(attendance.attendanceDate), asc(teamMembers.name));
  }),

  /** Mark or update attendance — HR managers for anyone; others for own profile only. */
  mark: protectedProcedure.input(AttendanceMark).mutation(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    const [member] = await ctx.db
      .select({ id: teamMembers.id, userId: teamMembers.userId })
      .from(teamMembers)
      .where(eq(teamMembers.id, input.teamMemberId));
    if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Team member not found" });

    const canManageHr = ctx.user.role === "OWNER" || ctx.user.role === "PARTNER";
    if (!canManageHr && member.userId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only mark your own attendance" });
    }

    const [existing] = await ctx.db
      .select({ id: attendance.id })
      .from(attendance)
      .where(
        and(
          eq(attendance.teamMemberId, input.teamMemberId),
          eq(attendance.attendanceDate, input.attendanceDate),
        ),
      );

    if (existing) {
      const [updated] = await ctx.db
        .update(attendance)
        .set({
          status: input.status,
          notes: input.notes ?? null,
          markedById: ctx.user.id,
        })
        .where(eq(attendance.id, existing.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "attendance",
        entityId: existing.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: updated,
      });
      return updated!;
    }

    const [created] = await ctx.db
      .insert(attendance)
      .values({
        teamMemberId: input.teamMemberId,
        attendanceDate: input.attendanceDate,
        status: input.status,
        notes: input.notes ?? null,
        markedById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "attendance",
      entityId: created!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: created,
    });
    return created!;
  }),

  /** Bulk mark a day — HR managers only (office register at start of day). */
  markDay: hrProcedure
    .input(
      AttendanceDayParams.extend({
        entries: AttendanceMark.omit({ attendanceDate: true }).array().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireHrEnabled(ctx.db);
      const results = [];
      for (const entry of input.entries) {
        const [existing] = await ctx.db
          .select({ id: attendance.id })
          .from(attendance)
          .where(
            and(
              eq(attendance.teamMemberId, entry.teamMemberId),
              eq(attendance.attendanceDate, input.date),
            ),
          );
        if (existing) {
          const [updated] = await ctx.db
            .update(attendance)
            .set({
              status: entry.status,
              notes: entry.notes ?? null,
              markedById: ctx.user.id,
            })
            .where(eq(attendance.id, existing.id))
            .returning();
          results.push(updated!);
        } else {
          const [created] = await ctx.db
            .insert(attendance)
            .values({
              teamMemberId: entry.teamMemberId,
              attendanceDate: input.date,
              status: entry.status,
              notes: entry.notes ?? null,
              markedById: ctx.user.id,
            })
            .returning();
          results.push(created!);
        }
      }
      return { date: input.date, count: results.length };
    }),
});
