import {
  ProgrammeProjectParams,
  ProjectMilestoneCreate,
  ProjectMilestoneUpdate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, max } from "drizzle-orm";
import { z } from "zod";
import { phases, projectMilestones, projectOffices } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import {
  buildProgrammeGantt,
  buildProgrammePortfolio,
  buildProjectProgrammeSummary,
} from "./readModels.js";

async function assertProject(db: Parameters<typeof buildProjectProgrammeSummary>[0], projectId: string) {
  const [row] = await db
    .select({ id: projectOffices.id })
    .from(projectOffices)
    .where(eq(projectOffices.id, projectId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
}

export const programmeRouter = router({
  /** Office portfolio — active projects with schedule health (Phase 14). */
  portfolio: protectedProcedure.query(async ({ ctx }) => buildProgrammePortfolio(ctx.db, ctx.user)),

  /** Programme summary: phases, milestones, tasks, progress %, upcoming schedule. */
  summary: protectedProcedure.input(ProgrammeProjectParams).query(async ({ ctx, input }) => {
    const summary = await buildProjectProgrammeSummary(ctx.db, input.projectId);
    if (!summary) throw new TRPCError({ code: "NOT_FOUND" });
    return summary;
  }),

  gantt: protectedProcedure.input(ProgrammeProjectParams).query(async ({ ctx, input }) => {
    const gantt = await buildProgrammeGantt(ctx.db, input.projectId);
    if (!gantt) throw new TRPCError({ code: "NOT_FOUND" });
    return gantt;
  }),

  listMilestones: protectedProcedure.input(ProgrammeProjectParams).query(async ({ ctx, input }) => {
    return ctx.db
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, input.projectId))
      .orderBy(asc(projectMilestones.sortOrder), asc(projectMilestones.targetDate));
  }),

  createMilestone: protectedProcedure.input(ProjectMilestoneCreate).mutation(async ({ ctx, input }) => {
    await assertProject(ctx.db, input.projectId);
    if (input.phaseId) {
      const [ph] = await ctx.db.select().from(phases).where(eq(phases.id, input.phaseId));
      if (!ph || ph.projectId !== input.projectId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Phase does not belong to project" });
      }
    }

    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      const [row] = await ctx.db
        .select({ maxOrder: max(projectMilestones.sortOrder) })
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, input.projectId));
      sortOrder = Number(row?.maxOrder ?? -1) + 1;
    }

    const [created] = await ctx.db
      .insert(projectMilestones)
      .values({
        projectId: input.projectId,
        phaseId: input.phaseId ?? null,
        title: input.title,
        description: input.description ?? null,
        targetDate: input.targetDate ?? null,
        status: input.status,
        sortOrder,
      })
      .returning();

    await writeAudit(ctx.db, {
      entity: "project_milestone",
      entityId: created!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { title: created!.title, projectId: input.projectId },
    });
    await writeActivity(ctx.db, {
      projectId: input.projectId,
      objectType: "project_milestone",
      objectId: created!.id,
      eventType: "MILESTONE_CREATED",
      summary: `Milestone added: ${created!.title}`,
      actorId: ctx.user.id,
      visibility: "STAFF",
    });

    return created!;
  }),

  updateMilestone: protectedProcedure.input(ProjectMilestoneUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.id, input.id));
    if (!before || before.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    if (input.phaseId) {
      const [ph] = await ctx.db.select().from(phases).where(eq(phases.id, input.phaseId));
      if (!ph || ph.projectId !== input.projectId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Phase does not belong to project" });
      }
    }

    const [row] = await ctx.db
      .update(projectMilestones)
      .set({
        ...(input.phaseId !== undefined ? { phaseId: input.phaseId } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(projectMilestones.id, input.id), eq(projectMilestones.projectId, input.projectId)))
      .returning();

    await writeAudit(ctx.db, {
      entity: "project_milestone",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before: { status: before.status, title: before.title },
      after: { status: row!.status, title: row!.title },
    });

    if (input.status === "DONE" && before.status !== "DONE") {
      await writeActivity(ctx.db, {
        projectId: input.projectId,
        objectType: "project_milestone",
        objectId: input.id,
        eventType: "MILESTONE_DONE",
        summary: `Milestone completed: ${row!.title}`,
        actorId: ctx.user.id,
        visibility: "STAFF",
      });
    }

    return row!;
  }),

  deleteMilestone: protectedProcedure
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.id, input.id));
      if (!before || before.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.delete(projectMilestones).where(eq(projectMilestones.id, input.id));
      await writeAudit(ctx.db, {
        entity: "project_milestone",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before: { title: before.title },
      });
      return { ok: true as const };
    }),
});
