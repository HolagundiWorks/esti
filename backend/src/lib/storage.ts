import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { Client } from "minio";
import { parseStorageSettings, type StorageSettings } from "@esti/contracts";
import { db } from "../db/index.js";
import { env } from "../env.js";
import { getOrgSettings } from "./settings.js";
import {
  assertStorageAvailable,
  recordStorageDelta,
  setStorageUsed,
} from "./storageQuota.js";

/**
 * Object storage with BYOS (bring-your-own-storage). The active backend is
 * resolved per-firm from `orgSettings.storageSettings`:
 *   - DEFAULT → env config (S3/MinIO on the VPS, or local fs on desktop)
 *   - NAS     → local filesystem at a configured (mounted) path
 *   - S3      → the firm's own S3-compatible endpoint/bucket/keys
 * Resolution is cached and rebuilt on `invalidateStorageCache()` (called when the
 * firm changes the config). Function signatures are unchanged so the ~20 callers
 * are untouched.
 */

function clientFor(endpoint: string, accessKey: string, secretKey: string, region = "us-east-1"): Client {
  const url = new URL(endpoint);
  return new Client({
    endPoint: url.hostname,
    port: Number(url.port) || (url.protocol === "https:" ? 443 : 80),
    useSSL: url.protocol === "https:",
    accessKey,
    secretKey,
    region,
  });
}

// Env clients (DEFAULT mode): internal for put/get, public only signs GET URLs.
const s3Env = clientFor(env.S3_ENDPOINT, env.S3_ACCESS_KEY, env.S3_SECRET_KEY);
const s3PublicEnv = clientFor(env.S3_PUBLIC_ENDPOINT, env.S3_ACCESS_KEY, env.S3_SECRET_KEY);

/** Kept for backward compat — the env bucket name, used by callers only as a label. */
export const BUCKET = env.S3_BUCKET;
/** @deprecated env internal client — storage ops go through the resolved backend. */
export const s3 = s3Env;

type Backend =
  | { kind: "fs"; root: string }
  | { kind: "s3"; put: Client; sign: Client; bucket: string };

let cached: Backend | null = null;
let gen = 0;
let ensuredGen = -1;

/** Drop the cached backend so the next op rebuilds it from fresh settings. */
export function invalidateStorageCache(): void {
  cached = null;
  gen++;
}

/** Build the active backend object from a settings record (pure — no DB/cache). */
function backendFromSettings(settings: StorageSettings): Backend {
  if (settings.mode === "NAS" && settings.nasPath?.trim()) {
    return { kind: "fs", root: resolve(settings.nasPath.trim()) };
  }
  if (settings.mode === "S3" && settings.s3Endpoint?.trim() && settings.s3Bucket?.trim()) {
    const client = clientFor(
      settings.s3Endpoint.trim(),
      settings.s3AccessKey ?? "",
      settings.s3SecretKey ?? "",
      settings.s3Region || "us-east-1",
    );
    return { kind: "s3", put: client, sign: client, bucket: settings.s3Bucket.trim() };
  }
  // DEFAULT — the env-configured backend (unchanged behavior).
  if (env.STORAGE_DRIVER === "fs") {
    return { kind: "fs", root: resolve(env.STORAGE_DIR) };
  }
  return { kind: "s3", put: s3Env, sign: s3PublicEnv, bucket: env.S3_BUCKET };
}

async function getBackend(): Promise<Backend> {
  if (!cached) {
    cached = backendFromSettings(parseStorageSettings((await getOrgSettings(db)).storageSettings));
  }
  return cached;
}

/**
 * Validate a candidate storage config by round-tripping a tiny probe object —
 * powers the "Test connection" action before a firm saves BYOS settings. Never
 * touches the active cache. Returns a friendly error string on failure.
 */
export async function probeStorage(settings: StorageSettings): Promise<{ ok: boolean; error?: string }> {
  const key = `.esti-probe/${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
  try {
    const b = backendFromSettings(settings);
    const body = Buffer.from("esti-storage-probe");
    if (b.kind === "fs") {
      await mkdir(b.root, { recursive: true });
      const path = fsPathFor(b.root, key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
      const back = await readFile(path);
      await rm(path, { force: true });
      if (back.toString() !== "esti-storage-probe") return { ok: false, error: "read-back mismatch" };
    } else {
      const exists = await b.put.bucketExists(b.bucket).catch(() => false);
      if (!exists) await b.put.makeBucket(b.bucket);
      await b.put.putObject(b.bucket, key, body, body.length, { "Content-Type": "text/plain" });
      const stream = await b.put.getObject(b.bucket, key);
      const chunks: Buffer[] = [];
      for await (const c of stream) chunks.push(c as Buffer);
      await b.put.removeObject(b.bucket, key).catch(() => undefined);
      if (Buffer.concat(chunks).toString() !== "esti-storage-probe") return { ok: false, error: "read-back mismatch" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "storage unreachable" };
  }
}

/** Resolve a storage key to an absolute fs path, guarding against traversal. */
function fsPathFor(root: string, key: string): string {
  const p = resolve(root, key);
  if (p !== root && !p.startsWith(root + sep)) throw new Error("invalid storage key");
  return p;
}

async function objectSize(b: Backend, key: string): Promise<number> {
  if (b.kind === "fs") return stat(fsPathFor(b.root, key)).then((s) => s.size).catch(() => 0);
  return b.put.statObject(b.bucket, key).then((s) => s.size).catch(() => 0);
}

/** Idempotently prepare the store (bucket on S3, root dir on fs). */
export async function ensureBucket(): Promise<void> {
  if (ensuredGen === gen && cached) return;
  const b = await getBackend();
  if (b.kind === "fs") {
    await mkdir(b.root, { recursive: true });
  } else {
    const exists = await b.put.bucketExists(b.bucket).catch(() => false);
    if (!exists) await b.put.makeBucket(b.bucket);
  }
  ensuredGen = gen;
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

/** Liveness of the active object store (driver-aware) — used by /readyz + release info. */
export async function storageHealthy(): Promise<boolean> {
  const b = await getBackend();
  if (b.kind === "fs") return stat(b.root).then((s) => s.isDirectory()).catch(() => false);
  return b.put.bucketExists(b.bucket).catch(() => false);
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await ensureBucket();
  const b = await getBackend();
  // Overwrites only cost the size delta; enforce the plan cap before writing.
  const prior = await objectSize(b, key);
  const delta = body.length - prior;
  await assertStorageAvailable(Math.max(0, delta));
  if (b.kind === "fs") {
    const path = fsPathFor(b.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  } else {
    await b.put.putObject(b.bucket, key, body, body.length, { "Content-Type": contentType });
  }
  await recordStorageDelta(delta);
}

/**
 * A URL the SPA can use directly to fetch an object. On S3 this is a time-limited
 * presigned URL; on fs it is the backend's own GET /files route (served locally).
 */
export async function presignedGet(key: string, expirySeconds = 300): Promise<string> {
  const b = await getBackend();
  if (b.kind === "fs") return `${env.FILES_PUBLIC_BASE}/${key}`;
  return b.sign.presignedGetObject(b.bucket, key, expirySeconds);
}

/** Best-effort delete; ignores "not found" so callers can fire-and-forget. */
export async function removeObject(key: string): Promise<void> {
  const b = await getBackend();
  const size = await objectSize(b, key);
  if (b.kind === "fs") {
    await rm(fsPathFor(b.root, key), { force: true }).catch(() => undefined);
  } else {
    await b.put.removeObject(b.bucket, key).catch(() => undefined);
  }
  if (size) await recordStorageDelta(-size);
}

/**
 * Recompute the firm's storage usage by summing every object in the store.
 * Drift-correction fallback for the running counter; safe to run any time.
 */
export async function recomputeStorageUsage(): Promise<number> {
  await ensureBucket();
  const b = await getBackend();
  let total = 0;
  if (b.kind === "fs") {
    async function walk(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) await walk(p);
        else total += await stat(p).then((s) => s.size).catch(() => 0);
      }
    }
    await walk(b.root);
  } else {
    for await (const obj of b.put.listObjects(b.bucket, "", true)) {
      total += (obj as { size?: number }).size ?? 0;
    }
  }
  await setStorageUsed(total);
  return total;
}

/** Read an object's full contents as UTF-8 text (used to proxy the SVG). */
export async function getObjectText(key: string): Promise<string> {
  const b = await getBackend();
  if (b.kind === "fs") return readFile(fsPathFor(b.root, key), "utf-8");
  const stream = await b.put.getObject(b.bucket, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

/** Stream an object's bytes (driver-aware) — used by the GET /files route. */
export async function getObjectStream(key: string): Promise<NodeJS.ReadableStream> {
  const b = await getBackend();
  if (b.kind === "fs") return createReadStream(fsPathFor(b.root, key));
  return b.put.getObject(b.bucket, key);
}

/** Size of a single stored object in bytes (0 if missing) — used by project archive. */
export async function objectBytes(key: string): Promise<number> {
  return objectSize(await getBackend(), key);
}

/** Read a whole object into a Buffer (driver-aware) — used to package project files. */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const stream = await getObjectStream(key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}
