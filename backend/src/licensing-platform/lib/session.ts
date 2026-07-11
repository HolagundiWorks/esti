import "@fastify/cookie"; // loads the unsignCookie / setCookie type augmentation
import type { FastifyReply, FastifyRequest } from "fastify";

/** Stateless signed-cookie session: the cookie holds `{ sub, exp }` (HMAC-signed
 *  by @fastify/cookie). No session table — logout clears the cookie. */
export const SESSION_COOKIE = "hlp_session";
const MAX_AGE_S = 30 * 24 * 3600;

export interface SessionData {
  accountId: string;
  /** Active company (tenant) for this session — set when logged in company-scoped. */
  orgId?: string;
}

const isProd = process.env.NODE_ENV === "production";

export function readSession(req: FastifyRequest): SessionData | null {
  const raw = req.cookies?.[SESSION_COOKIE];
  if (!raw) return null;
  const un = req.unsignCookie(raw);
  if (!un.valid || !un.value) return null;
  try {
    const { sub, exp, org } = JSON.parse(
      Buffer.from(un.value, "base64url").toString("utf8"),
    ) as { sub?: string; exp?: number; org?: string };
    if (!sub || typeof exp !== "number" || exp < Math.floor(Date.now() / 1000)) return null;
    return org ? { accountId: sub, orgId: org } : { accountId: sub };
  } catch {
    return null;
  }
}

export function writeSession(reply: FastifyReply, accountId: string, orgId?: string): void {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const payload: { sub: string; exp: number; org?: string } = { sub: accountId, exp };
  if (orgId) payload.org = orgId;
  const value = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  // No Max-Age: a browser-SESSION cookie — signing out happens automatically
  // when the browser exits (matches the workspace cookie's behaviour; the
  // payload `exp` still hard-caps a long-lived browser at MAX_AGE_S). This
  // guards the account portal and, above all, the admin console.
  reply.setCookie(SESSION_COOKIE, value, {
    signed: true,
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: isProd,
  });
}

export function clearSession(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}
