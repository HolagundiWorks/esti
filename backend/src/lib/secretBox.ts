import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../env.js";

/**
 * At-rest encryption for small stored secrets (e.g. the firm's BYO AI API key
 * inside org_settings.ai_settings). AES-256-GCM keyed from SESSION_SECRET —
 * rotating SESSION_SECRET invalidates sealed values (callers must treat a
 * failed open as "no secret" and ask for re-entry).
 */

const PREFIX = "enc:v1:";
const IV_LEN = 12;
const TAG_LEN = 16;

function key(): Buffer {
  return createHash("sha256").update(env.SESSION_SECRET).digest();
}

export function isSealed(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function sealSecret(plain: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

/** Opens a sealed value; passes legacy plaintext through unchanged. Throws on tamper/rotated secret. */
export function openSecret(stored: string): string {
  if (!isSealed(stored)) return stored;
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
