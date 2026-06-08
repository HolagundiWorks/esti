import { TRPCError } from "@trpc/server";
import { redis } from "./redis.js";

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
  await redis.del(`rl:${bucket}:${key}`);
}
