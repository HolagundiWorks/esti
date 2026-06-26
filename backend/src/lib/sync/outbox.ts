import { type SyncOp, type SyncStatusView, type SyncEntity } from "@esti/contracts";
import { and, eq, lt, ne, sql } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { syncOutbox } from "../../db/schema.js";
import { env } from "../../env.js";
import { getOrgSettings } from "../settings.js";

const MAX_ATTEMPTS = 5;
const BATCH = 100;

/**
 * Enqueue a finalized record for publication to the hub. Called from
 * finalize/issue mutations (after commit); the drainer ships it. `payload` is the
 * portal-shaped DTO the hub stores; `fileKeys` are object keys to mirror later.
 */
export async function enqueuePublish(
  db: DB,
  args: {
    entity: SyncEntity;
    entityId: string;
    op?: SyncOp;
    payload?: Record<string, unknown>;
    fileKeys?: string[];
  },
): Promise<void> {
  await db.insert(syncOutbox).values({
    entity: args.entity,
    entityId: args.entityId,
    op: args.op ?? "UPSERT",
    payload: args.payload ?? {},
    fileKeys: args.fileKeys ?? [],
  });
}

/** Drain pending/failed outbox rows to the hub. Offline failures are retried later. */
export async function drainOutbox(db: DB): Promise<{ sent: number; failed: number }> {
  if (env.ESTI_ROLE !== "node" || !env.ESTI_HUB_URL) return { sent: 0, failed: 0 };
  const { syncToken } = await getOrgSettings(db);
  if (!syncToken) return { sent: 0, failed: 0 };
  const base = env.ESTI_HUB_URL.replace(/\/+$/, "");

  const rows = await db
    .select()
    .from(syncOutbox)
    .where(and(ne(syncOutbox.state, "SYNCED"), lt(syncOutbox.attempts, MAX_ATTEMPTS)))
    .limit(BATCH);

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const res = await fetch(`${base}/api/sync/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${syncToken}` },
        body: JSON.stringify({
          entity: row.entity,
          entityId: row.entityId,
          op: row.op,
          payload: row.payload,
          fileKeys: row.fileKeys,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`hub responded ${res.status}`);
      const { remoteId } = (await res.json()) as { remoteId?: string };
      await db
        .update(syncOutbox)
        .set({ state: "SYNCED", remoteId: remoteId ?? null, syncedAt: new Date(), lastError: null })
        .where(eq(syncOutbox.id, row.id));
      sent++;
    } catch (e) {
      const attempts = row.attempts + 1;
      await db
        .update(syncOutbox)
        .set({
          state: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
          attempts,
          lastError: String(e),
        })
        .where(eq(syncOutbox.id, row.id));
      failed++;
    }
  }
  return { sent, failed };
}

/** Outbox counts for the office UI. */
export async function outboxStatus(db: DB): Promise<SyncStatusView> {
  const rows = await db
    .select({ state: syncOutbox.state, n: sql<number>`count(*)::int` })
    .from(syncOutbox)
    .groupBy(syncOutbox.state);
  const by = (s: string) => rows.find((r) => r.state === s)?.n ?? 0;
  // PENDING includes rows that exhausted retries (state FAILED) — surface separately.
  return {
    pending: by("PENDING"),
    synced: by("SYNCED"),
    failed: by("FAILED"),
    hubConfigured: Boolean(env.ESTI_HUB_URL),
  };
}
