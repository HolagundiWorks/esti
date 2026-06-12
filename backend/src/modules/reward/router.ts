import { RewardPointCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { rewardPoints, teamMembers } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

export const rewardRouter = router({
  listByMember: protectedProcedure
    .input(z.object({ teamMemberId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(rewardPoints)
        .where(eq(rewardPoints.teamMemberId, input.teamMemberId))
        .orderBy(desc(rewardPoints.createdAt));
    }),

  grant: ownerProcedure
    .input(RewardPointCreate)
    .mutation(async ({ ctx, input }) => {
      const [tm] = await ctx.db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(eq(teamMembers.id, input.teamMemberId));
      if (!tm) throw new TRPCError({ code: "NOT_FOUND", message: "Team member not found" });

      const [row] = await ctx.db
        .insert(rewardPoints)
        .values({
          teamMemberId: input.teamMemberId,
          points: input.points,
          reason: input.reason,
          awardType: input.awardType ?? null,
          referenceId: input.referenceId ?? null,
          createdById: ctx.user.id,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "reward_point", entityId: row!.id, action: "CREATE",
        actorId: ctx.user.id, after: row,
      });
      return row!;
    }),
});
