import { and, desc, eq, lt, or } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { activities, projectOffices } from "../../db/schema.js";

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

export async function listOfficeActivity(
  db: DB,
  input: { limit: number; visibility: "STAFF" | "ALL"; cursor?: { createdAt: string; id: string } | null },
) {
  const cursorFilter = input.cursor
    ? or(
        lt(activities.createdAt, new Date(input.cursor.createdAt)),
        and(eq(activities.createdAt, new Date(input.cursor.createdAt)), lt(activities.id, input.cursor.id)),
      )
    : undefined;

  const rows = await db
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
}
