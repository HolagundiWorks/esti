import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { env } from "../env.js";

/**
 * At-rest encryption for small stored secrets (e.g. the firm's BYO AI API key
 * inside org_settings.ai_settings). AES-256-GCM.
 *
 * The key is derived from SESSION_SECRET through HKDF with a distinct info
 * label rather than a bare hash of it. The same secret also signs session
 * cookies, and a plain digest would leave the cookie-signing and encryption
 * keys as the same derived value; HKDF gives domain separation, so misuse of
 * one context does not hand over the other.
 *
 * Threat model and limits, stated plainly:
 *  - Confidentiality rests entirely on SESSION_SECRET. Where it is weak, or left
 *    at the dev default (which happens whenever NODE_ENV is not "production"),
 *    this offers no real protection. It defends a stolen database dump, not a
 *    compromised host.
 *  - Rotating SESSION_SECRET invalidates every sealed value. Callers must treat
 *    a failed open as "no secret" and ask for re-entry (see lib/settings.ts).
 *  - Ciphertexts are not bound to the row holding them, so an attacker who can
 *    already write the database could move one between rows — not a meaningful
 *    escalation for someone who can write arbitrary rows anyway.
 */

const PREFIX = "enc:v1:";
const IV_LEN = 12;
const TAG_LEN = 16;
/** Fixed, non-secret label. Changing it invalidates every existing ciphertext. */
const HKDF_INFO = "aorms:secretbox:v1";

function key(): Buffer {
  // Empty salt is acceptable here: the info label supplies domain separation
  // and the input secret is meant to be high-entropy.
  return Buffer.from(hkdfSync("sha256", env.SESSION_SECRET, "", HKDF_INFO, 32));
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
