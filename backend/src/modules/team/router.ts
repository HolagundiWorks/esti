import {
  AssignTeamToProject,
  AssignmentCreate,
  TeamCreate,
  TeamMemberCreate,
  TeamMemberUpdate,
  TeamUpdate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { assignments, teamMemberships, teamMembers, teams } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { requireProject } from "../../lib/projectScope.js";
import { requireHrEnabled } from "../../lib/settings.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

export const teamRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    await requireHrEnabled(ctx.db);
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
        backupContactName: input.backupContactName ?? null,
        backupContactPhone: input.backupContactPhone ?? null,
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
    await requireHrEnabled(ctx.db);
    const [before] = await ctx.db.select().from(teamMembers).where(eq(teamMembers.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .update(teamMembers)
      .set({
        ...(input.monthlySalaryPaise !== undefined
          ? { monthlySalaryPaise: input.monthlySalaryPaise }
          : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.backupContactName !== undefined
          ? { backupContactName: input.backupContactName }
          : {}),
        ...(input.backupContactPhone !== undefined
          ? { backupContactPhone: input.backupContactPhone }
          : {}),
      })
      .where(eq(teamMembers.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "teammember",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before,
      after: row,
    });
    return row!;
  }),
});

export const teamsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    await requireHrEnabled(ctx.db);
    const rows = await ctx.db.select().from(teams).orderBy(asc(teams.name));
    const memberRows = await ctx.db
      .select({
        teamId: teamMemberships.teamId,
        teamMemberId: teamMemberships.teamMemberId,
        name: teamMembers.name,
        role: teamMembers.role,
        active: teamMembers.active,
      })
      .from(teamMemberships)
      .innerJoin(teamMembers, eq(teamMembers.id, teamMemberships.teamMemberId));
    return rows.map((t) => ({
      ...t,
      members: memberRows.filter((m) => m.teamId === t.id),
    }));
  }),

  create: ownerProcedure.input(TeamCreate).mutation(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    const row = await ctx.db.transaction(async (tx) => {
      const [team] = await tx
        .insert(teams)
        .values({ name: input.name, description: input.description ?? null })
        .returning();
      if (input.memberIds.length > 0) {
        await tx
          .insert(teamMemberships)
          .values(input.memberIds.map((teamMemberId) => ({ teamId: team!.id, teamMemberId })));
      }
      return team!;
    });
    await writeAudit(ctx.db, {
      entity: "team",
      entityId: row.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row;
  }),

  update: ownerProcedure.input(TeamUpdate).mutation(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    const [before] = await ctx.db.select().from(teams).where(eq(teams.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const hasFields =
      input.name !== undefined || input.description !== undefined || input.active !== undefined;
    const row = await ctx.db.transaction(async (tx) => {
      let updated = before;
      if (hasFields) {
        const [u] = await tx
          .update(teams)
          .set({
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.active !== undefined ? { active: input.active } : {}),
          })
          .where(eq(teams.id, input.id))
          .returning();
        if (u) updated = u;
      }
      if (input.memberIds !== undefined) {
        await tx.delete(teamMemberships).where(eq(teamMemberships.teamId, input.id));
        if (input.memberIds.length > 0) {
          await tx
            .insert(teamMemberships)
            .values(input.memberIds.map((teamMemberId) => ({ teamId: input.id, teamMemberId })));
        }
      }
      return updated;
    });
    await writeAudit(ctx.db, {
      entity: "team",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before,
      after: row,
    });
    return row;
  }),

  remove: ownerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireHrEnabled(ctx.db);
      const [before] = await ctx.db.select().from(teams).where(eq(teams.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(teams).where(eq(teams.id, input.id));
      await writeAudit(ctx.db, {
        entity: "team",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before,
      });
      return { ok: true };
    }),
});

export const assignmentRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requireHrEnabled(ctx.db);
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
    await requireProject(ctx.db, input.projectId);
    const [row] = await ctx.db
      .insert(assignments)
      .values({
        projectId: input.projectId,
        teamMemberId: input.teamMemberId,
        role: input.role,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "assignment",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  /** Staff every active member of a team onto a project (skips already-assigned members). */
  assignTeam: protectedProcedure.input(AssignTeamToProject).mutation(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    await requireProject(ctx.db, input.projectId);

    const members = await ctx.db
      .select({ teamMemberId: teamMemberships.teamMemberId })
      .from(teamMemberships)
      .innerJoin(teamMembers, eq(teamMembers.id, teamMemberships.teamMemberId))
      .where(and(eq(teamMemberships.teamId, input.teamId), eq(teamMembers.active, true)));
    if (members.length === 0) return { added: 0, skipped: 0 };

    const memberIds = members.map((m) => m.teamMemberId);
    const existing = await ctx.db
      .select({ teamMemberId: assignments.teamMemberId })
      .from(assignments)
      .where(
        and(eq(assignments.projectId, input.projectId), inArray(assignments.teamMemberId, memberIds)),
      );
    const existingSet = new Set(existing.map((e) => e.teamMemberId));
    const toAdd = memberIds.filter((memberId) => !existingSet.has(memberId));

    if (toAdd.length > 0) {
      await ctx.db
        .insert(assignments)
        .values(toAdd.map((teamMemberId) => ({ projectId: input.projectId, teamMemberId, role: input.role })));
      await writeAudit(ctx.db, {
        entity: "assignment",
        entityId: input.teamId,
        action: "CREATE",
        actorId: ctx.user.id,
        after: { projectId: input.projectId, teamId: input.teamId, added: toAdd.length },
      });
    }
    return { added: toAdd.length, skipped: existingSet.size };
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireHrEnabled(ctx.db);
      const [before] = await ctx.db.select().from(assignments).where(eq(assignments.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(assignments).where(eq(assignments.id, input.id));
      await writeAudit(ctx.db, {
        entity: "assignment",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before,
      });
      return { ok: true };
    }),
});
