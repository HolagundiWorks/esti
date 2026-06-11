import { and, desc, eq, lt, or } from "drizzle-orm";
import { z } from "zod";
import { activities, projectOffices } from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const activityRow = {
  id: activities.id,
  projectId: activities.projectId,
  projectRef: projectOffices.ref,
  projectTitle: projectOffices.title,
  objectType: activities.objectType,
  objectId: activities.objectId,
  eventType: activities.eventType,
  actorId: activities.actorId,
  actorName: activities.actorName,
  visibility: activities.visibility,
  summary: activities.summary,
  metadata: activities.metadata,
  createdAt: activities.createdAt,
} as const;

export const activityRouter = router({
  listByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select(activityRow)
        .from(activities)
        .leftJoin(projectOffices, eq(projectOffices.id, activities.projectId))
        .where(eq(activities.projectId, input.projectId))
        .orderBy(desc(activities.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  listOffice: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(25),
        visibility: z.enum(["STAFF", "ALL"]).default("STAFF"),
        cursor: z
          .object({
            createdAt: z.string().datetime(),
            id: z.string().uuid(),
          })
          .nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const cursorFilter = input.cursor
        ? or(
            lt(activities.createdAt, new Date(input.cursor.createdAt)),
            and(eq(activities.createdAt, new Date(input.cursor.createdAt)), lt(activities.id, input.cursor.id)),
          )
        : undefined;

      const rows = await ctx.db
        .select(activityRow)
        .from(activities)
        .leftJoin(projectOffices, eq(projectOffices.id, activities.projectId))
        .where(
          and(
            input.visibility === "ALL" ? undefined : eq(activities.visibility, input.visibility),
            cursorFilter,
          ),
        )
        .orderBy(desc(activities.createdAt), desc(activities.id))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const pageRows = hasMore ? rows.slice(0, input.limit) : rows;
      const last = pageRows.at(-1);

      return {
        rows: pageRows,
        nextCursor: hasMore && last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null,
      };
    }),
});
