import { audit } from "../db/schema.js";
import type { DB } from "../db/index.js";

export async function writeAudit(
  db: DB,
  entry: {
    entity: string;
    entityId?: string;
    action: string;
    actorId?: string;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  await db.insert(audit).values({
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    action: entry.action,
    actorId: entry.actorId ?? null,
    before: (entry.before ?? null) as never,
    after: (entry.after ?? null) as never,
  });
}
