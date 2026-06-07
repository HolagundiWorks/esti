import { AssignmentCreate, TeamMemberCreate, TeamMemberUpdate } from "@esti/contracts";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { assignments, teamMembers } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { requireHrEnabled } from "../../lib/settings.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

export const teamRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(teamMembers).orderBy(asc(teamMembers.name));
  }),

  create: ownerProcedure.input(TeamMemberCreate).mutation(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    const [row] = await ctx.db
      .insert(teamMembers)
      .values({
        name: input.name,
        role: input.role,
        employmentType: input.employmentType,
        email: input.email || null,
        phone: input.phone ?? null,
        monthlySalaryPaise: input.monthlySalaryPaise,
        dateJoined: input.dateJoined ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "teammember",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  update: ownerProcedure.input(TeamMemberUpdate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(teamMembers)
      .set({
        ...(input.monthlySalaryPaise !== undefined
          ? { monthlySalaryPaise: input.monthlySalaryPaise }
          : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      })
      .where(eq(teamMembers.id, input.id))
      .returning();
    return row ?? null;
  }),
});

export const assignmentRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: assignments.id,
          teamMemberId: assignments.teamMemberId,
          name: teamMembers.name,
          memberRole: teamMembers.role,
          role: assignments.role,
        })
        .from(assignments)
        .innerJoin(teamMembers, eq(teamMembers.id, assignments.teamMemberId))
        .where(eq(assignments.projectId, input.projectId))
        .orderBy(desc(assignments.createdAt));
    }),

  create: protectedProcedure.input(AssignmentCreate).mutation(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    const [row] = await ctx.db
      .insert(assignments)
      .values({
        projectId: input.projectId,
        teamMemberId: input.teamMemberId,
        role: input.role,
      })
      .returning();
    return row!;
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(assignments).where(eq(assignments.id, input.id));
      return { ok: true };
    }),
});
