import { Client } from "minio";
import { env } from "../env.js";

const url = new URL(env.S3_ENDPOINT);

export const s3 = new Client({
  endPoint: url.hostname,
  port: Number(url.port) || (url.protocol === "https:" ? 443 : 80),
  useSSL: url.protocol === "https:",
  accessKey: env.S3_ACCESS_KEY,
  secretKey: env.S3_SECRET_KEY,
});

export const BUCKET = env.S3_BUCKET;

let ensured = false;
/** Idempotently create the documents bucket. Cheap to call repeatedly. */
export async function ensureBucket(): Promise<void> {
  if (ensured) return;
  const exists = await s3.bucketExists(BUCKET).catch(() => false);
  if (!exists) await s3.makeBucket(BUCKET);
  ensured = true;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await ensureBucket();
  await s3.putObject(BUCKET, key, body, body.length, { "Content-Type": contentType });
}

/** Time-limited GET URL the SPA can use directly (e.g. for rendered SVG). */
export async function presignedGet(key: string, expirySeconds = 300): Promise<string> {
  return s3.presignedGetObject(BUCKET, key, expirySeconds);
}
