import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { Client } from "minio";
import { env } from "../env.js";
import {
  assertStorageAvailable,
  recordStorageDelta,
  setStorageUsed,
} from "./storageQuota.js";

const DRIVER = env.STORAGE_DRIVER; // "s3" (VPS/MinIO) | "fs" (desktop)

// ── Filesystem driver helpers (desktop) ─────────────────────────────────────
const FS_ROOT = resolve(env.STORAGE_DIR);

/** Resolve a storage key to an absolute path, guarding against traversal. */
function fsPathFor(key: string): string {
  const p = resolve(FS_ROOT, key);
  if (p !== FS_ROOT && !p.startsWith(FS_ROOT + sep)) {
    throw new Error("invalid storage key");
  }
  return p;
}

async function fsSize(key: string): Promise<number> {
  return stat(fsPathFor(key)).then((s) => s.size).catch(() => 0);
}

// ── S3 driver (VPS/MinIO) ───────────────────────────────────────────────────
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
// Constructed lazily-safe (no network) so the fs driver never touches them.
export const s3 = clientFor(env.S3_ENDPOINT);
const s3Public = clientFor(env.S3_PUBLIC_ENDPOINT);

export const BUCKET = env.S3_BUCKET;

/** Object size in bytes, or 0 if the key does not exist. */
async function objectSize(key: string): Promise<number> {
  if (DRIVER === "fs") return fsSize(key);
  return s3.statObject(BUCKET, key).then((s) => s.size).catch(() => 0);
}

let ensured = false;
/** Idempotently prepare the store (bucket on S3, root dir on fs). */
export async function ensureBucket(): Promise<void> {
  if (ensured) return;
  if (DRIVER === "fs") {
    await mkdir(FS_ROOT, { recursive: true });
  } else {
    const exists = await s3.bucketExists(BUCKET).catch(() => false);
    if (!exists) await s3.makeBucket(BUCKET);
  }
  ensured = true;
}

/** Retry store setup while the backend (S3 or fs) is still coming up. */
export async function ensureBucketWithRetry(attempts = 30, delayMs = 2000): Promise<void> {
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

/** Liveness of the object store (driver-aware) — used by /readyz and release info. */
export async function storageHealthy(): Promise<boolean> {
  if (DRIVER === "fs") {
    return stat(FS_ROOT).then((s) => s.isDirectory()).catch(() => false);
  }
  return s3.bucketExists(BUCKET).catch(() => false);
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await ensureBucket();
  // Overwrites only cost the size delta; enforce the plan cap before writing,
  // then fold the delta into the running usage counter.
  const prior = await objectSize(key);
  const delta = body.length - prior;
  await assertStorageAvailable(Math.max(0, delta));
  if (DRIVER === "fs") {
    const path = fsPathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  } else {
    await s3.putObject(BUCKET, key, body, body.length, { "Content-Type": contentType });
  }
  await recordStorageDelta(delta);
}

/**
 * A URL the SPA can use directly to fetch an object. On S3 this is a time-limited
 * presigned URL; on fs it is the backend's own GET /files route (loopback, no signing).
 */
export async function presignedGet(key: string, expirySeconds = 300): Promise<string> {
  if (DRIVER === "fs") {
    return `${env.FILES_PUBLIC_BASE}/${key}`;
  }
  return s3Public.presignedGetObject(BUCKET, key, expirySeconds);
}

/** Best-effort delete; ignores "not found" so callers can fire-and-forget. */
export async function removeObject(key: string): Promise<void> {
  const size = await objectSize(key);
  if (DRIVER === "fs") {
    await rm(fsPathFor(key), { force: true }).catch(() => undefined);
  } else {
    await s3.removeObject(BUCKET, key).catch(() => undefined);
  }
  if (size) await recordStorageDelta(-size);
}

/**
 * Recompute the firm's storage usage by summing every object in the store.
 * Drift-correction fallback for the running counter; safe to run any time.
 */
export async function recomputeStorageUsage(): Promise<number> {
  await ensureBucket();
  let total = 0;
  if (DRIVER === "fs") {
    const { readdir } = await import("node:fs/promises");
    async function walk(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) await walk(p);
        else total += await stat(p).then((s) => s.size).catch(() => 0);
      }
    }
    await walk(FS_ROOT);
  } else {
    for await (const obj of s3.listObjects(BUCKET, "", true)) {
      total += (obj as { size?: number }).size ?? 0;
    }
  }
  await setStorageUsed(total);
  return total;
}

/** Read an object's full contents as UTF-8 text (used to proxy the SVG). */
export async function getObjectText(key: string): Promise<string> {
  if (DRIVER === "fs") {
    return readFile(fsPathFor(key), "utf-8");
  }
  const stream = await s3.getObject(BUCKET, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

/** Stream an object's bytes (driver-aware) — used by the GET /files route on desktop. */
export async function getObjectStream(key: string): Promise<NodeJS.ReadableStream> {
  if (DRIVER === "fs") {
    return createReadStream(fsPathFor(key));
  }
  return s3.getObject(BUCKET, key);
}
