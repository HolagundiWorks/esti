import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { env } from "../env.js";
import { writeSession } from "../lib/session.js";
import { markEmailVerified, upsertAccount } from "../modules/auth/service.js";

/**
 * Google sign-in (OAuth 2.0 / OIDC) for the platform account.
 *
 *   GET /platform/auth/google/start?return=/login%3Fgoogle%3D1
 *   GET /platform/auth/google/callback   (the registered GOOGLE_REDIRECT_URI)
 *
 * The callback exchanges the code server-to-server, reads the OIDC userinfo,
 * upserts the account by Google subject (creating it on first sign-in), marks
 * the email verified (Google has verified it), writes the platform session and
 * bounces back to `return`. Every failure lands back on `return` with
 * ?google_error=<code> — never a raw JSON page in the browser.
 *
 * `return` accepts same-origin RELATIVE paths only (open-redirect guard); the
 * default is the account portal. The state param is a nonce held in a signed,
 * short-lived cookie.
 */

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

const STATE_COOKIE = "hlp_gstate";
const isProd = process.env.NODE_ENV === "production";

function safeReturnPath(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/account";
  return raw;
}

function withError(ret: string, code: string): string {
  return `${ret}${ret.includes("?") ? "&" : "?"}google_error=${code}`;
}

export function registerGoogleRoutes(app: FastifyInstance): void {
  app.get("/auth/google/start", async (req, reply) => {
    const ret = safeReturnPath((req.query as { return?: string })?.return);
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return reply.redirect(withError(ret, "not_configured"));
    }
    const nonce = randomBytes(16).toString("base64url");
    reply.setCookie(STATE_COOKIE, JSON.stringify({ n: nonce, r: ret }), {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/platform/auth/google",
      maxAge: 600,
      secure: isProd,
    });
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    u.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "openid email profile");
    u.searchParams.set("state", nonce);
    u.searchParams.set("prompt", "select_account");
    return reply.redirect(u.toString());
  });

  app.get("/auth/google/callback", async (req, reply) => {
    const q = req.query as { code?: string; state?: string; error?: string };
    let ret = "/account";
    let nonce = "";
    const raw = req.cookies?.[STATE_COOKIE];
    reply.clearCookie(STATE_COOKIE, { path: "/platform/auth/google" });
    if (raw) {
      const un = req.unsignCookie(raw);
      if (un.valid && un.value) {
        try {
          const p = JSON.parse(un.value) as { n?: string; r?: string };
          nonce = p.n ?? "";
          ret = safeReturnPath(p.r);
        } catch {
          /* fall through to state_mismatch */
        }
      }
    }
    if (q.error) return reply.redirect(withError(ret, "denied"));
    if (!q.code || !q.state || !nonce || q.state !== nonce) {
      return reply.redirect(withError(ret, "state_mismatch"));
    }

    // Exchange the code server-to-server (the response is trusted: it comes
    // straight from Google's token endpoint over TLS).
    let accessToken = "";
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: q.code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const body = (await res.json()) as { access_token?: string };
        accessToken = body.access_token ?? "";
      }
    } catch {
      /* handled below */
    }
    if (!accessToken) return reply.redirect(withError(ret, "exchange_failed"));

    let info: GoogleUserInfo | null = null;
    try {
      const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) info = (await res.json()) as GoogleUserInfo;
    } catch {
      /* handled below */
    }
    if (!info?.sub || !info.email || info.email_verified === false) {
      return reply.redirect(withError(ret, "userinfo_failed"));
    }

    const account = await upsertAccount({
      email: info.email,
      googleSub: info.sub,
      name: info.name ?? null,
      avatarUrl: info.picture ?? null,
    });
    // Google has verified control of the email — unlocks domain auto-join.
    await markEmailVerified(account.id);
    writeSession(reply, account.id);
    return reply.redirect(ret);
  });
}
