import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

/**
 * ESE auth primitives — dependency-free so the service keeps its tiny footprint.
 * Passwords are scrypt (`salt:hash`, same shape the seeder writes); sessions are
 * a signed, expiring cookie (HMAC-SHA256 over `userId.expiry`). No cookie/JWT
 * library is pulled in.
 */

export const SESSION_COOKIE = "ese_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

/** scrypt hash in the `salt:hash` form the DB stores. */
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

/** Constant-time verify against a stored `salt:hash`. */
export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(pw, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Sign a session token for `userId`, valid for SESSION_TTL_MS. */
export function signSession(userId: string, secret: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${exp}`;
  const sig = b64url(createHmac("sha256", secret).update(payload).digest());
  return `${b64url(Buffer.from(payload))}.${sig}`;
}

/** Verify a session token; returns the userId or null (bad sig / expired). */
export function verifySession(token: string | undefined, secret: string): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let payload: string;
  try {
    payload = Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
  } catch {
    return null;
  }
  const want = b64url(createHmac("sha256", secret).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [userId, expStr] = payload.split(".");
  const exp = Number(expStr);
  if (!userId || !Number.isFinite(exp) || Date.now() > exp) return null;
  return userId;
}

/** Read one cookie value from a raw Cookie header. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

/** Build a Set-Cookie header value for the session (HttpOnly, SameSite=Lax). */
export function sessionCookie(token: string): string {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`;
}

/** Set-Cookie value that clears the session. */
export function clearCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}
