import { TRPCError } from "@trpc/server";
import { INPROC_WORKER, redis } from "./redis.js";

// Desktop (WORKER_MODE=inproc) has no Redis, so fall back to an in-process
// fixed-window counter. The desktop app is single-user and single-process, so a
// plain Map is sufficient — brute-force throttling still works without a Redis
// dependency. Entries self-expire on read; only a handful of login/bootstrap
// buckets ever exist, so no active eviction is needed. Server deployments
// (non-inproc) keep the Redis path unchanged, including fail-closed on outage.
const memWindows = new Map<string, { count: number; expiresAt: number }>();

function hitMemoryWindow(redisKey: string, windowSec: number): number {
  const now = Date.now();
  const cur = memWindows.get(redisKey);
  if (!cur || cur.expiresAt <= now) {
    memWindows.set(redisKey, { count: 1, expiresAt: now + windowSec * 1000 });
    return 1;
  }
  cur.count += 1;
  return cur.count;
}

/**
 * Fixed-window rate limiter backed by Redis. Increments a counter under
 * `rl:{bucket}:{key}` and expires it after `windowSec`. Returns the current
 * count so callers can decide; `enforceRateLimit` throws when the cap is hit.
 */
export async function hitRateLimit(
  bucket: string,
  key: string,
  windowSec: number,
): Promise<number> {
  const redisKey = `rl:${bucket}:${key}`;
  if (INPROC_WORKER) return hitMemoryWindow(redisKey, windowSec);
  const count = await redis.incr(redisKey);
  if (count === 1) await redis.expire(redisKey, windowSec);
  return count;
}

/** Throw TOO_MANY_REQUESTS once more than `limit` hits occur in the window. */
export async function enforceRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSec: number,
): Promise<void> {
  const count = await hitRateLimit(bucket, key, windowSec);
  if (count > limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts. Please wait a minute and try again.",
    });
  }
}

/** Clear a limiter bucket (e.g. on a successful login). */
export async function clearRateLimit(bucket: string, key: string): Promise<void> {
  const redisKey = `rl:${bucket}:${key}`;
  if (INPROC_WORKER) {
    memWindows.delete(redisKey);
    return;
  }
  await redis.del(redisKey);
}
