import { LessonCreate, LessonUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { lessonsLearned, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { writeActivity } from "../../lib/activity.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const lessonRouter = router({
  listPublished: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(100) }).optional())
    .query(async ({ ctx, input }) =>
      ctx.db
        .select({
          lesson: lessonsLearned,
          projectRef: projectOffices.ref,
          projectTitle: projectOffices.title,
        })
        .from(lessonsLearned)
        .innerJoin(projectOffices, eq(lessonsLearned.projectId, projectOffices.id))
        .where(eq(lessonsLearned.status, "PUBLISHED"))
        .orderBy(desc(lessonsLearned.updatedAt))
        .limit(input?.limit ?? 100),
    ),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(lessonsLearned)
        .where(eq(lessonsLearned.projectId, input.projectId))
        .orderBy(desc(lessonsLearned.createdAt)),
    ),

  create: protectedProcedure.input(LessonCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(lessonsLearned)
      .values({
        projectId: input.projectId,
        title: input.title,
        category: input.category,
        body: input.body,
        recommendations: input.recommendations ?? "",
        tags: input.tags ?? null,
        authorId: ctx.user.id,
        authorName: ctx.user.fullName ?? ctx.user.email,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "lesson_learned",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    await writeActivity(ctx.db, {
      projectId: input.projectId,
      objectType: "LESSON",
      objectId: row!.id,
      eventType: "LESSON_CREATED",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName ?? ctx.user.email,
      summary: `Lesson draft: ${input.title}`,
    });
    return row!;
  }),

  update: protectedProcedure.input(LessonUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(lessonsLearned).where(eq(lessonsLearned.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    if (before.status === "PUBLISHED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Published lesson — create a new draft instead" });
    }
    const patch = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.recommendations !== undefined ? { recommendations: input.recommendations } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
    };
    const [after] = await ctx.db
      .update(lessonsLearned)
      .set(patch)
      .where(eq(lessonsLearned.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "lesson_learned",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before,
      after,
    });
    return after!;
  }),

  publish: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(lessonsLearned).where(eq(lessonsLearned.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const [after] = await ctx.db
      .update(lessonsLearned)
      .set({ status: "PUBLISHED" })
      .where(eq(lessonsLearned.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "lesson_learned",
      entityId: input.id,
      action: "PUBLISH",
      actorId: ctx.user.id,
      before: { status: before.status },
      after: { status: after!.status },
    });
    await writeActivity(ctx.db, {
      projectId: before.projectId,
      objectType: "LESSON",
      objectId: input.id,
      eventType: "LESSON_PUBLISHED",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName ?? ctx.user.email,
      summary: `Published lesson: ${before.title}`,
    });
    return after!;
  }),

  remove: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(lessonsLearned).where(eq(lessonsLearned.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    if (row.status === "PUBLISHED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Published lessons are retained for the knowledge bank" });
    }
    await ctx.db.delete(lessonsLearned).where(eq(lessonsLearned.id, input.id));
    await writeAudit(ctx.db, {
      entity: "lesson_learned",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
      before: row,
    });
    return { ok: true };
  }),
});
