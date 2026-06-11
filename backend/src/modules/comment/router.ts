import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { comments, projectOffices, tasks } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const commentObjectType = z.enum(["projectoffice", "task"]);

function commentVisibilityFromObjectType(objectType: z.infer<typeof commentObjectType>) {
  return objectType === "projectoffice" ? "STAFF" : "STAFF";
}

export const commentRouter = router({
  listByObject: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        objectType: commentObjectType,
        objectId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.projectId, input.projectId),
            eq(comments.objectType, input.objectType),
            eq(comments.objectId, input.objectId),
          ),
        )
        .orderBy(desc(comments.createdAt));
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        objectType: commentObjectType,
        objectId: z.string().min(1),
        body: z.string().min(1).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.objectType === "projectoffice") {
        const [project] = await ctx.db.select().from(projectOffices).where(eq(projectOffices.id, input.projectId)).limit(1);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        if (input.objectId !== input.projectId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Comment target does not match project" });
        }
      } else if (input.objectType === "task") {
        const [task] = await ctx.db.select().from(tasks).where(and(eq(tasks.id, input.objectId), eq(tasks.projectId, input.projectId))).limit(1);
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found for project" });
      }

      const row = await ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(comments)
          .values({
            projectId: input.projectId,
            objectType: input.objectType,
            objectId: input.objectId,
            body: input.body,
            actorId: ctx.user.id,
            actorName: ctx.user.fullName,
            visibility: commentVisibilityFromObjectType(input.objectType),
          })
          .returning();
        await writeActivity(tx, {
          projectId: input.projectId,
          objectType: "comment",
          objectId: created!.id,
          eventType: "comment.created",
          actorId: ctx.user.id,
          actorName: ctx.user.fullName,
          visibility: commentVisibilityFromObjectType(input.objectType),
          summary: input.body.slice(0, 140),
          metadata: { objectType: input.objectType, objectId: input.objectId, body: input.body },
        });
        await writeAudit(tx, {
          entity: "comment",
          entityId: created!.id,
          action: "CREATE",
          actorId: ctx.user.id,
          after: created,
        });
        return created!;
      });
      return row;
    }),
});
