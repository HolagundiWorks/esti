import { randomBytes, randomUUID } from "node:crypto";

/** Prefixed opaque id, e.g. `lic_3f2a…`. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

/**
 * Portable, human-quotable AORMS handle — `AORMS-U-XXXX` for a person, `AORMS-C-XXXX`
 * for a company. Crockford base32 (no ambiguous I/L/O/U). 6 chars ≈ 1.07e9 space;
 * the `public_id` unique index is the collision guard.
 */
export function newPublicId(kind: "U" | "C", len = 6): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const body = Array.from(randomBytes(len))
    .map((b) => alphabet[b % alphabet.length])
    .join("");
  return `AORMS-${kind}-${body}`;
}

/** Customer-facing license key, e.g. `HLP-AB12-CD34-EF56`. No ambiguous chars. */
export function newLicenseKey(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = (): string =>
    Array.from(randomBytes(4))
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  return `HLP-${block()}-${block()}-${block()}`;
}

/** A product API key (machine secret). Shown once; only its hash is stored. */
export function newApiKey(): string {
  return `hlp_sk_${randomBytes(24).toString("base64url")}`;
}
