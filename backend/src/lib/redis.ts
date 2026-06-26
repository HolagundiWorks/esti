import Redis from "ioredis";
import { env } from "../env.js";

export const INPROC_WORKER = env.WORKER_MODE === "inproc";

// On desktop (inproc) there is no Redis. Construct a non-connecting client so the
// `redis` export stays valid for callers (release info, etc.) but it never spams
// reconnect attempts in the background.
export const redis = INPROC_WORKER
  ? new Redis({
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    })
  : new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export type JobType = "dxf_to_svg" | "render_pdf" | "reconcile_import";

/**
 * Publish a job to the Redis Stream consumed by the Python worker (ADR-10).
 * Pass requestId to propagate the SPA→backend request ID into worker logs.
 *
 * On desktop (WORKER_MODE=inproc) there is no worker yet (P1): the job is
 * recorded as a no-op and the dependent record stays in its PENDING state until
 * a local worker is bundled (P2). The signature is unchanged so the ~15 call
 * sites need no edits.
 */
export async function enqueueJob(
  type: JobType,
  payload: Record<string, unknown>,
  requestId?: string,
): Promise<string> {
  const body = requestId ? { ...payload, request_id: requestId } : payload;
  if (INPROC_WORKER) {
    const id = `inproc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Intentionally not processed in P1 — see the doc comment above.
    console.info(`[worker:inproc] job ${type} queued (${id}) — deferred (no local worker yet)`);
    return id;
  }
  return redis.xadd(
    env.WORKER_JOB_STREAM,
    "*",
    "type",
    type,
    "payload",
    JSON.stringify(body),
  ) as Promise<string>;
}
