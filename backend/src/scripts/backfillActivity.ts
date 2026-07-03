/**
 * Backfill the activity stream from existing reliable project notes and audit
 * history. Idempotent: skips rows already represented by an activity entry
 * with the same object, event type, and source timestamp.
 *
 *   pnpm --filter @esti/backend backfill:activity
 *   (or: podman exec esti-backend sh -lc "cd /app/esti/backend && pnpm backfill:activity")
 */
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { activities, audit, projectLogs } from "../db/schema.js";
import { writeActivity } from "../lib/activity.js";

type AuditRow = typeof audit.$inferSelect;

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function activityExists(args: {
  objectType: string;
  objectId: string | null;
  eventType: string;
  createdAt: Date;
}): Promise<boolean> {
  const [row] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.objectType, args.objectType),
        eq(activities.eventType, args.eventType),
        eq(activities.createdAt, args.createdAt),
      ),
    )
    .limit(1);
  return !!row;
}

async function backfillProjectLogs(): Promise<number> {
  const rows = await db.select().from(projectLogs).orderBy(projectLogs.createdAt);
  let inserted = 0;
  for (const row of rows) {
    const createdAt = row.createdAt ?? new Date();
    if (await activityExists({ objectType: "projectlog", objectId: row.id, eventType: "note.created", createdAt })) continue;
    await writeActivity(db, {
      projectId: row.projectId,
      objectType: "projectlog",
      objectId: row.id,
      eventType: "note.created",
      actorId: row.authorId ?? null,
      actorName: row.authorName ?? null,
      visibility: "STAFF",
      summary: row.note.slice(0, 140),
      metadata: { note: row.note },
    });
    inserted += 1;
  }
  return inserted;
}

function mapAuditEvent(row: AuditRow): { eventType: string; summary: string; metadata: unknown } | null {
  const before = row.before as Record<string, unknown> | null;
  const after = row.after as Record<string, unknown> | null;

  if (row.entity === "projectoffice") {
    if (row.action === "CREATE") {
      return { eventType: "project.created", summary: `Project created`, metadata: after ?? before ?? null };
    }
    if (row.action === "UPDATE") {
      return { eventType: "project.updated", summary: `Project details updated`, metadata: { before, after } };
    }
    if (row.action === "SITE_UPDATE") {
      return { eventType: "project.site_updated", summary: `Project site details updated`, metadata: { before, after } };
    }
    if (row.action === "ARCHIVE") {
      return { eventType: "project.archived", summary: `Project archived`, metadata: { before, after } };
    }
    if (row.action === "RESTORE") {
      return { eventType: "project.restored", summary: `Project restored`, metadata: { before, after } };
    }
  }

  if (row.entity === "task") {
    if (row.action === "CREATE") {
      return { eventType: "task.created", summary: `Task created`, metadata: { before, after } };
    }
    if (row.action === "UPDATE") {
      const status = (after?.status as string | undefined) ?? (before?.status as string | undefined);
      return {
        eventType: status ? `task.${status.toLowerCase()}` : "task.updated",
        summary: `Task updated`,
        metadata: { before, after },
      };
    }
    if (row.action === "DELETE") {
      return { eventType: "task.deleted", summary: `Task deleted`, metadata: { before, after } };
    }
  }

  if (row.entity === "projectlog") {
    return { eventType: "note.created", summary: `Project note added`, metadata: after ?? before ?? null };
  }

  return null;
}

async function backfillAudit(): Promise<number> {
  const rows = await db.select().from(audit).orderBy(audit.createdAt);
  let inserted = 0;
  for (const row of rows) {
    const mapped = mapAuditEvent(row);
    if (!mapped) continue;
    const projectId =
      ((row.after as Record<string, unknown> | null)?.projectId as string | undefined) ??
      ((row.before as Record<string, unknown> | null)?.projectId as string | undefined) ??
      null;
    const objectId = row.entityId ? String(row.entityId) : null;
    const createdAt = toDate(row.createdAt) ?? new Date();
    if (await activityExists({ objectType: row.entity, objectId, eventType: mapped.eventType, createdAt })) continue;
    await writeActivity(db, {
      projectId,
      objectType: row.entity,
      objectId,
      eventType: mapped.eventType,
      actorId: row.actorId ?? null,
      summary: mapped.summary,
      visibility: "STAFF",
      metadata: mapped.metadata,
    });
    inserted += 1;
  }
  return inserted;
}

async function main(): Promise<void> {
  const notes = await backfillProjectLogs();
  const audits = await backfillAudit();
  console.log(`✓ backfilled activity: ${notes} project notes, ${audits} audit events`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("activity backfill failed:", err);
    process.exit(1);
  });
