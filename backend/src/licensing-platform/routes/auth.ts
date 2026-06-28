import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { env } from "../env.js";
import { clearSession, readSession, writeSession } from "../lib/session.js";
import { getAccountById, upsertAccount, type AccountView } from "../modules/auth/service.js";
import { provisionTrial } from "../modules/onboarding/service.js";

const STATE_COOKIE = "hlp_oauth_state";
const ONBOARD_COOKIE = "hlp_onboard";
const isProd = process.env.NODE_ENV === "production";

// The admin panel lives behind the `#app` hash route on the frontend.
const PANEL_URL = `${env.FRONTEND_ORIGIN}/#app`;

function authError(reply: import("fastify").FastifyReply, reason: string) {
  return reply.redirect(`${env.FRONTEND_ORIGIN}/?auth_error=${encodeURIComponent(reason)}#app`);
}

/** Only redirect back to product origins on the configured allowlist. */
function isAllowedReturn(ret: string): boolean {
  try {
    return env.ONBOARD_RETURN_ORIGINS.includes(new URL(ret).origin.toLowerCase());
  } catch {
    return false;
  }
}

/** Provision the trial, then bounce back to the product (or the panel). */
async function completeOnboarding(
  reply: import("fastify").FastifyReply,
  account: AccountView,
  product: string,
  ret: string,
) {
  const result = await provisionTrial(account, product);
  if (ret && isAllowedReturn(ret)) {
    const u = new URL(ret);
    if (result) {
      u.searchParams.set("license", result.key);
      u.searchParams.set("status", result.status);
      u.searchParams.set("email", account.email);
    } else {
      u.searchParams.set("onboard_error", "unknown_product");
    }
    return reply.redirect(u.toString());
  }
  return reply.redirect(PANEL_URL);
}

/** Account auth: Google OAuth 2.0 + a dev-login fallback + session endpoints. */
export function registerAuthRoutes(app: FastifyInstance): void {
  // --- Current session ---
  app.get("/auth/me", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { account: null };
    }
    const account = await getAccountById(s.accountId);
    if (!account) {
      clearSession(reply);
      reply.code(401);
      return { account: null };
    }
    return { account };
  });

  app.post("/auth/logout", async (_req, reply) => {
    clearSession(reply);
    return { ok: true };
  });

  // --- Self-serve onboarding (a product's "Create account") ---
  // Products redirect here:  /onboard?product=AORMS&return=<product-url>
  app.get("/onboard", async (req, reply) => {
    const q = req.query as { product?: string; return?: string };
    const product = (q.product || "AORMS").toUpperCase();
    const ret = typeof q.return === "string" ? q.return : "";

    // Already signed in → provision now and bounce straight back.
    const s = readSession(req);
    if (s) {
      const account = await getAccountById(s.accountId);
      if (account) return completeOnboarding(reply, account, product, ret);
    }

    // Otherwise stash the intent and run Google sign-in; the callback finishes it.
    reply.setCookie(ONBOARD_COOKIE, JSON.stringify({ product, ret }), {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
      secure: isProd,
    });
    return reply.redirect("/auth/google/start");
  });

  // --- Google OAuth ---
  app.get("/auth/google/start", async (_req, reply) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      reply.code(503);
      return { error: "google_oauth_not_configured" };
    }
    const state = randomBytes(16).toString("base64url");
    reply.setCookie(STATE_COOKIE, state, {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
      secure: isProd,
    });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
    return reply.redirect(url.toString());
  });

  app.get("/auth/google/callback", async (req, reply) => {
    const q = req.query as { code?: string; state?: string; error?: string };
    if (q.error) return authError(reply, q.error);

    const stateRaw = req.cookies?.[STATE_COOKIE];
    const stateChk = stateRaw ? req.unsignCookie(stateRaw) : { valid: false, value: null };
    reply.clearCookie(STATE_COOKIE, { path: "/" });
    if (!q.code || !q.state || !stateChk.valid || stateChk.value !== q.state) {
      return authError(reply, "bad_state");
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: q.code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return authError(reply, "token_exchange");
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) return authError(reply, "no_token");

    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    if (!infoRes.ok) return authError(reply, "userinfo");
    const info = (await infoRes.json()) as {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
    };
    if (!info.email) return authError(reply, "no_email");

    const account = await upsertAccount({
      email: info.email,
      googleSub: info.sub,
      name: info.name ?? null,
      avatarUrl: info.picture ?? null,
    });
    writeSession(reply, account.id);

    // If this login started from a product "Create account", finish onboarding.
    const onboardRaw = req.cookies?.[ONBOARD_COOKIE];
    if (onboardRaw) {
      const chk = req.unsignCookie(onboardRaw);
      reply.clearCookie(ONBOARD_COOKIE, { path: "/" });
      if (chk.valid && chk.value) {
        try {
          const intent = JSON.parse(chk.value) as { product?: string; ret?: string };
          return completeOnboarding(reply, account, intent.product || "AORMS", intent.ret || "");
        } catch {
          /* malformed cookie — fall through to the panel */
        }
      }
    }
    return reply.redirect(PANEL_URL);
  });

  // --- Dev login (local only; gated by DEV_LOGIN=1) ---
  app.post("/auth/dev-login", async (req, reply) => {
    if (!env.DEV_LOGIN) {
      reply.code(404);
      return { error: "not_found" };
    }
    const body = req.body as { email?: string } | undefined;
    const email = body?.email?.trim();
    if (!email || !email.includes("@")) {
      reply.code(400);
      return { error: "invalid_email" };
    }
    const account = await upsertAccount({ email });
    writeSession(reply, account.id);
    return { ok: true, account };
  });
}
