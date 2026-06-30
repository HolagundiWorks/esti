import "@fastify/cookie"; // loads the unsignCookie / setCookie type augmentation
import type { FastifyReply, FastifyRequest } from "fastify";

/** Stateless signed-cookie session: the cookie holds `{ sub, exp }` (HMAC-signed
 *  by @fastify/cookie). No session table — logout clears the cookie. */
export const SESSION_COOKIE = "hlp_session";
const MAX_AGE_S = 30 * 24 * 3600;

export interface SessionData {
  accountId: string;
}

const isProd = process.env.NODE_ENV === "production";

export function readSession(req: FastifyRequest): SessionData | null {
  const raw = req.cookies?.[SESSION_COOKIE];
  if (!raw) return null;
  const un = req.unsignCookie(raw);
  if (!un.valid || !un.value) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(un.value, "base64url").toString("utf8")) as {
      sub?: string;
      exp?: number;
    };
    if (!sub || typeof exp !== "number" || exp < Math.floor(Date.now() / 1000)) return null;
    return { accountId: sub };
  } catch {
    return null;
  }
}

export function writeSession(reply: FastifyReply, accountId: string): void {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const value = Buffer.from(JSON.stringify({ sub: accountId, exp }), "utf8").toString("base64url");
  reply.setCookie(SESSION_COOKIE, value, {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
    secure: isProd,
  });
}

export function clearSession(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}
