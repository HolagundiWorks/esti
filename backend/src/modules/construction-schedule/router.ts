import {
  ApplyConstructionTemplateInput,
  ConstructionActivityCreate,
  ConstructionActivityUpdate,
  ConstructionDependencyCreate,
  ConstructionLookaheadInput,
  ConstructionScheduleProjectParams,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  constructionActivities,
  constructionDependencies,
  constructionSchedules,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { assertProjectPmcEnabled } from "../../lib/settings.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";
import {
  applyConstructionTemplate,
  buildConstructionGantt,
  buildConstructionSchedulePortfolio,
  buildConstructionScheduleSummary,
  buildCriticalPath,
  buildLookahead,
  loadActivities,
  loadDependencies,
  recalculateAndPersist,
  resolveTemplateKeyForProject,
} from "./readModels.js";

const manage = capabilityProcedure("write");

async function guardProject(db: Parameters<typeof assertProjectPmcEnabled>[0], projectId: string) {
  await assertProjectPmcEnabled(db, projectId);
}

export const constructionScheduleRouter = router({
  summary: protectedProcedure.input(ConstructionScheduleProjectParams).query(async ({ ctx, input }) => {
    await guardProject(ctx.db, input.projectId);
    return buildConstructionScheduleSummary(ctx.db, input.projectId);
  }),

  portfolio: protectedProcedure.query(async ({ ctx }) => {
    const { requirePmcEnabled } = await import("../../lib/settings.js");
    await requirePmcEnabled(ctx.db);
    return buildConstructionSchedulePortfolio(ctx.db);
  }),

  listActivities: protectedProcedure.input(ConstructionScheduleProjectParams).query(async ({ ctx, input }) => {
    await guardProject(ctx.db, input.projectId);
    const activities = await loadActivities(ctx.db, input.projectId);
    const dependencies = await loadDependencies(ctx.db, input.projectId);
    const [schedule] = await ctx.db
      .select()
      .from(constructionSchedules)
      .where(eq(constructionSchedules.projectId, input.projectId))
      .limit(1);
    return { schedule: schedule ?? null, activities, dependencies };
  }),

  applyTemplate: manage.input(ApplyConstructionTemplateInput).mutation(async ({ ctx, input }) => {
    await guardProject(ctx.db, input.projectId);
    const templateKey = await resolveTemplateKeyForProject(
      ctx.db,
      input.projectId,
      input.templateKey,
    );
    const result = await applyConstructionTemplate(
      ctx.db,
      input.projectId,
      templateKey,
      input.projectStart,
      input.force ?? false,
    );
    await writeAudit(ctx.db, {
      entity: "construction_schedule",
      entityId: result.schedule.id,
      action: "APPLY_TEMPLATE",
      actorId: ctx.user.id,
      after: { templateKey, activityCount: result.activities.length },
    });
    return { ok: true as const, templateKey, activityCount: result.activities.length };
  }),

  createActivity: manage.input(ConstructionActivityCreate).mutation(async ({ ctx, input }) => {
    await guardProject(ctx.db, input.projectId);
    const { getOrCreateSchedule } = await import("./readModels.js");
    const schedule = await getOrCreateSchedule(ctx.db, input.projectId);
    const [row] = await ctx.db
      .insert(constructionActivities)
      .values({
        projectId: input.projectId,
        scheduleId: schedule.id,
        wbsCode: input.wbsCode,
        title: input.title,
        trade: input.trade ?? null,
        location: input.location ?? null,
        durationDays: input.durationDays,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    await recalculateAndPersist(ctx.db, input.projectId);
    return row!;
  }),

  updateActivity: manage.input(ConstructionActivityUpdate).mutation(async ({ ctx, input }) => {
    await guardProject(ctx.db, input.projectId);
    const [before] = await ctx.db
      .select()
      .from(constructionActivities)
      .where(eq(constructionActivities.id, input.id));
    if (!before || before.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const [row] = await ctx.db
      .update(constructionActivities)
      .set({
        ...(input.wbsCode !== undefined ? { wbsCode: input.wbsCode } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.trade !== undefined ? { trade: input.trade } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.durationDays !== undefined ? { durationDays: input.durationDays } : {}),
        ...(input.plannedStart !== undefined ? { plannedStart: input.plannedStart } : {}),
        ...(input.plannedEnd !== undefined ? { plannedEnd: input.plannedEnd } : {}),
        ...(input.actualStart !== undefined ? { actualStart: input.actualStart } : {}),
        ...(input.actualEnd !== undefined ? { actualEnd: input.actualEnd } : {}),
        ...(input.percentComplete !== undefined ? { percentComplete: input.percentComplete } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(constructionActivities.id, input.id), eq(constructionActivities.projectId, input.projectId)))
      .returning();
    await recalculateAndPersist(ctx.db, input.projectId);
    return row!;
  }),

  deleteActivity: manage
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await guardProject(ctx.db, input.projectId);
      await ctx.db
        .delete(constructionDependencies)
        .where(
          and(
            eq(constructionDependencies.projectId, input.projectId),
            eq(constructionDependencies.predecessorId, input.id),
          ),
        );
      await ctx.db
        .delete(constructionDependencies)
        .where(
          and(
            eq(constructionDependencies.projectId, input.projectId),
            eq(constructionDependencies.successorId, input.id),
          ),
        );
      await ctx.db
        .delete(constructionActivities)
        .where(
          and(eq(constructionActivities.id, input.id), eq(constructionActivities.projectId, input.projectId)),
        );
      await recalculateAndPersist(ctx.db, input.projectId);
      return { ok: true as const };
    }),

  createDependency: manage.input(ConstructionDependencyCreate).mutation(async ({ ctx, input }) => {
    await guardProject(ctx.db, input.projectId);
    if (input.predecessorId === input.successorId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Activity cannot depend on itself" });
    }
    const [row] = await ctx.db
      .insert(constructionDependencies)
      .values({
        projectId: input.projectId,
        predecessorId: input.predecessorId,
        successorId: input.successorId,
        type: input.type,
        lagDays: input.lagDays,
      })
      .returning();
    await recalculateAndPersist(ctx.db, input.projectId);
    return row!;
  }),

  deleteDependency: manage
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await guardProject(ctx.db, input.projectId);
      await ctx.db
        .delete(constructionDependencies)
        .where(
          and(eq(constructionDependencies.id, input.id), eq(constructionDependencies.projectId, input.projectId)),
        );
      await recalculateAndPersist(ctx.db, input.projectId);
      return { ok: true as const };
    }),

  setBaseline: manage.input(ConstructionScheduleProjectParams).mutation(async ({ ctx, input }) => {
    await guardProject(ctx.db, input.projectId);
    const [row] = await ctx.db
      .update(constructionSchedules)
      .set({ status: "BASELINE", updatedAt: new Date() })
      .where(eq(constructionSchedules.projectId, input.projectId))
      .returning();
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "No construction schedule" });
    return row;
  }),

  recalculate: manage.input(ConstructionScheduleProjectParams).mutation(async ({ ctx, input }) => {
    await guardProject(ctx.db, input.projectId);
    const result = await recalculateAndPersist(ctx.db, input.projectId);
    return { ok: true as const, criticalCount: result.criticalCount };
  }),

  gantt: protectedProcedure.input(ConstructionScheduleProjectParams).query(async ({ ctx, input }) => {
    await guardProject(ctx.db, input.projectId);
    const gantt = await buildConstructionGantt(ctx.db, input.projectId);
    if (!gantt) throw new TRPCError({ code: "NOT_FOUND" });
    return gantt;
  }),

  criticalPath: protectedProcedure.input(ConstructionScheduleProjectParams).query(async ({ ctx, input }) => {
    await guardProject(ctx.db, input.projectId);
    return buildCriticalPath(ctx.db, input.projectId);
  }),

  lookahead: protectedProcedure.input(ConstructionLookaheadInput).query(async ({ ctx, input }) => {
    await guardProject(ctx.db, input.projectId);
    return buildLookahead(ctx.db, input.projectId, input.weeks);
  }),
});
