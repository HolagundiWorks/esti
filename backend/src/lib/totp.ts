import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Dependency-free TOTP (RFC 6238, SHA-1, 6 digits, 30s step) — the standard
 * authenticator-app scheme (Google Authenticator, Authy, 1Password, …).
 */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_S = 30;
const DIGITS = 6;

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    value = (value << 5) | B32.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", secret).update(buf).digest();
  const offset = mac[mac.length - 1]! & 0xf;
  const code =
    ((mac[offset]! & 0x7f) << 24) |
    ((mac[offset + 1]! & 0xff) << 16) |
    ((mac[offset + 2]! & 0xff) << 8) |
    (mac[offset + 3]! & 0xff);
  return (code % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

/** A fresh base32 authenticator secret (160-bit). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** The current code for a secret — used in tests and setup previews. */
export function totpCode(secretB32: string, nowMs: number = Date.now()): string {
  const counter = Math.floor(nowMs / 1000 / STEP_S);
  return hotp(base32Decode(secretB32), counter);
}

/** Verify a 6-digit token, tolerating ±`window` time steps for clock drift. */
export function verifyTotp(
  secretB32: string,
  token: string,
  window = 1,
  nowMs: number = Date.now(),
): boolean {
  const clean = (token ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const secret = base32Decode(secretB32);
  const counter = Math.floor(nowMs / 1000 / STEP_S);
  const provided = Buffer.from(clean);
  for (let w = -window; w <= window; w++) {
    const candidate = Buffer.from(hotp(secret, counter + w));
    if (candidate.length === provided.length && timingSafeEqual(candidate, provided)) return true;
  }
  return false;
}

/** The `otpauth://` URI an authenticator app scans / imports. */
export function otpauthUri(secretB32: string, label: string, issuer = "AORMS"): string {
  const acct = encodeURIComponent(`${issuer}:${label}`);
  const params = new URLSearchParams({
    secret: secretB32,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_S),
  });
  return `otpauth://totp/${acct}?${params.toString()}`;
}
