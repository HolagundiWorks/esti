import Redis from "ioredis";
import { env } from "../env.js";

export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

/** Publish a job to the Redis Stream consumed by the Python worker (ADR-10). */
export async function enqueueJob(
  type: "dxf_to_svg" | "render_pdf" | "reconcile_import",
  payload: Record<string, unknown>,
): Promise<string> {
  return redis.xadd(env.WORKER_JOB_STREAM, "*", "type", type, "payload", JSON.stringify(payload)) as Promise<string>;
}
