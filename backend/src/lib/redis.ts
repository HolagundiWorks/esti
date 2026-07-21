import Redis from "ioredis";
import { env } from "../env.js";

export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export type JobType = "dxf_to_svg" | "render_pdf" | "pdf_to_markdown" | "reconcile_import";

/**
 * Publish a job to the Redis Stream consumed by the Python worker (ADR-10).
 * Pass requestId to propagate the SPA→backend request ID into worker logs.
 */
export async function enqueueJob(
  type: JobType,
  payload: Record<string, unknown>,
  requestId?: string,
): Promise<string> {
  const body = requestId ? { ...payload, request_id: requestId } : payload;
  return redis.xadd(
    env.WORKER_JOB_STREAM,
    "*",
    "type",
    type,
    "payload",
    JSON.stringify(body),
  ) as Promise<string>;
}
