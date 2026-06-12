import { DailyUpdateListParams, DailyUpdateUpsert } from "@esti/contracts";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { dailyUpdates, teamMembers } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const dailyUpdateRouter = router({
  list: protectedProcedure
    .input(DailyUpdateListParams.optional())
    .query(async ({ ctx, input }) => {
      const filters: ReturnType<typeof eq>[] = [];

      if (input?.myOnly) {
        const [tm] = await ctx.db
          .select({ id: teamMembers.id })
          .from(teamMembers)
          .where(eq(teamMembers.userId, ctx.user.id));
        if (!tm) return [];
        filters.push(eq(dailyUpdates.teamMemberId, tm.id));
      } else if (input?.teamMemberId) {
        filters.push(eq(dailyUpdates.teamMemberId, input.teamMemberId));
      }

      if (input?.dateFrom) filters.push(gte(dailyUpdates.updateDate, input.dateFrom));
      if (input?.dateTo) filters.push(lte(dailyUpdates.updateDate, input.dateTo));

      const base = ctx.db
        .select({
          id: dailyUpdates.id,
          teamMemberId: dailyUpdates.teamMemberId,
          updateDate: dailyUpdates.updateDate,
          completed: dailyUpdates.completed,
          inProgress: dailyUpdates.inProgress,
          blockers: dailyUpdates.blockers,
          createdAt: dailyUpdates.createdAt,
          updatedAt: dailyUpdates.updatedAt,
          memberName: teamMembers.name,
          memberRole: teamMembers.role,
        })
        .from(dailyUpdates)
        .leftJoin(teamMembers, eq(teamMembers.id, dailyUpdates.teamMemberId));

      return filters.length
        ? base.where(and(...filters)).orderBy(desc(dailyUpdates.updateDate))
        : base.orderBy(desc(dailyUpdates.updateDate));
    }),

  /** Upsert today's update for the calling user's team member profile. */
  upsertMine: protectedProcedure.input(DailyUpdateUpsert).mutation(async ({ ctx, input }) => {
    const [tm] = await ctx.db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(eq(teamMembers.userId, ctx.user.id));

    const tmId = tm?.id;
    if (!tmId) {
      // Graceful no-op: user has no team member profile.
      return { ok: false, message: "No team member profile found" };
    }

    // Check for existing row on this date.
    const [existing] = await ctx.db
      .select({ id: dailyUpdates.id })
      .from(dailyUpdates)
      .where(and(
        eq(dailyUpdates.teamMemberId, tmId),
        eq(dailyUpdates.updateDate, input.updateDate),
      ));

    if (existing) {
      const [updated] = await ctx.db
        .update(dailyUpdates)
        .set({
          completed: input.completed ?? null,
          inProgress: input.inProgress ?? null,
          blockers: input.blockers ?? null,
        })
        .where(eq(dailyUpdates.id, existing.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "daily_update", entityId: existing.id, action: "UPDATE",
        actorId: ctx.user.id, after: updated,
      });
      return updated!;
    }

    const [created] = await ctx.db
      .insert(dailyUpdates)
      .values({
        teamMemberId: tmId,
        updateDate: input.updateDate,
        completed: input.completed ?? null,
        inProgress: input.inProgress ?? null,
        blockers: input.blockers ?? null,
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "daily_update", entityId: created!.id, action: "CREATE",
      actorId: ctx.user.id, after: created,
    });
    return created!;
  }),

  today: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const [tm] = await ctx.db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(eq(teamMembers.userId, ctx.user.id));
      if (!tm) return null;
      const [row] = await ctx.db
        .select()
        .from(dailyUpdates)
        .where(and(
          eq(dailyUpdates.teamMemberId, tm.id),
          eq(dailyUpdates.updateDate, input.date),
        ));
      return row ?? null;
    }),
});
