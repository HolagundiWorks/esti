import { activities } from "../db/schema.js";
import type { DB } from "../db/index.js";

export async function writeActivity(
  db: DB,
  entry: {
    projectId?: string | null;
    objectType: string;
    objectId?: string | null;
    eventType: string;
    actorId?: string | null;
    actorName?: string | null;
    visibility?: string;
    summary: string;
    metadata?: unknown;
  },
): Promise<void> {
  await db.insert(activities).values({
    projectId: entry.projectId ?? null,
    objectType: entry.objectType,
    objectId: entry.objectId ?? null,
    eventType: entry.eventType,
    actorId: entry.actorId ?? null,
    actorName: entry.actorName ?? null,
    visibility: entry.visibility ?? "STAFF",
    summary: entry.summary,
    metadata: (entry.metadata ?? null) as never,
  });
}
