import { Client } from "minio";
import { env } from "../env.js";
import {
  assertStorageAvailable,
  recordStorageDelta,
  setStorageUsed,
} from "./storageQuota.js";

/** Object size in bytes, or 0 if the key does not exist. */
async function objectSize(key: string): Promise<number> {
  return s3
    .statObject(BUCKET, key)
    .then((s) => s.size)
    .catch(() => 0);
}

function clientFor(endpoint: string): Client {
  const url = new URL(endpoint);
  return new Client({
    endPoint: url.hostname,
    port: Number(url.port) || (url.protocol === "https:" ? 443 : 80),
    useSSL: url.protocol === "https:",
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    // Explicit region avoids a getBucketRegion network call at presign time
    // (which would fail for the public endpoint from inside the pod).
    region: "us-east-1",
  });
}

// Internal client (pod network) for put/get; public client only signs GET URLs
// so the browser can fetch them (presigned URLs are bound to the signing host).
export const s3 = clientFor(env.S3_ENDPOINT);
const s3Public = clientFor(env.S3_PUBLIC_ENDPOINT);

export const BUCKET = env.S3_BUCKET;

let ensured = false;
/** Idempotently create the documents bucket. Cheap to call repeatedly. */
export async function ensureBucket(): Promise<void> {
  if (ensured) return;
  const exists = await s3.bucketExists(BUCKET).catch(() => false);
  if (!exists) await s3.makeBucket(BUCKET);
  ensured = true;
}

/** Retry bucket setup while MinIO (or managed S3) is still coming up. */
export async function ensureBucketWithRetry(
  attempts = 30,
  delayMs = 2000,
): Promise<void> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await ensureBucket();
      return;
    } catch (err) {
      last = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw last;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await ensureBucket();
  // Overwrites only cost the size delta; enforce the plan cap before writing,
  // then fold the delta into the running usage counter.
  const prior = await objectSize(key);
  const delta = body.length - prior;
  await assertStorageAvailable(Math.max(0, delta));
  await s3.putObject(BUCKET, key, body, body.length, { "Content-Type": contentType });
  await recordStorageDelta(delta);
}

/** Time-limited GET URL the SPA can use directly (e.g. for rendered SVG). */
export async function presignedGet(key: string, expirySeconds = 300): Promise<string> {
  return s3Public.presignedGetObject(BUCKET, key, expirySeconds);
}

/** Best-effort delete; ignores "not found" so callers can fire-and-forget. */
export async function removeObject(key: string): Promise<void> {
  const size = await objectSize(key);
  await s3.removeObject(BUCKET, key).catch(() => undefined);
  if (size) await recordStorageDelta(-size);
}

/**
 * Recompute the firm's storage usage by summing every object in the bucket.
 * Drift-correction fallback for the running counter; safe to run any time.
 */
export async function recomputeStorageUsage(): Promise<number> {
  await ensureBucket();
  let total = 0;
  for await (const obj of s3.listObjects(BUCKET, "", true)) {
    total += (obj as { size?: number }).size ?? 0;
  }
  await setStorageUsed(total);
  return total;
}

/** Read an object's full contents as UTF-8 text (used to proxy the SVG). */
export async function getObjectText(key: string): Promise<string> {
  const stream = await s3.getObject(BUCKET, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}
