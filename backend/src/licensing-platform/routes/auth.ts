import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";
import { clearSession, readSession, writeSession } from "../lib/session.js";
import {
  getAccountById,
  loginWithPassword,
  registerWithPassword,
  upsertAccount,
  type AccountView,
} from "../modules/auth/service.js";
import { provisionTrial } from "../modules/onboarding/service.js";

const ONBOARD_COOKIE = "hlp_onboard";
const isProd = process.env.NODE_ENV === "production";

// The admin panel SPA is served at /platform-admin on the frontend origin.
const PANEL_URL = `${env.FRONTEND_ORIGIN}/platform-admin`;

/** Only redirect back to product origins on the configured allowlist. */
function isAllowedReturn(ret: string): boolean {
  try {
    return env.ONBOARD_RETURN_ORIGINS.includes(new URL(ret).origin.toLowerCase());
  } catch {
    return false;
  }
}

/** Provision the trial and build the post-onboarding redirect URL (the product
 *  return URL carrying the issued license, or the admin panel). */
async function buildOnboardRedirect(
  account: AccountView,
  product: string,
  ret: string,
): Promise<string> {
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
    return u.toString();
  }
  return PANEL_URL;
}

/** Read + clear a pending onboard intent cookie (set by GET /onboard). */
function takeOnboardIntent(
  req: FastifyRequest,
  reply: FastifyReply,
): { product: string; ret: string } | null {
  const raw = req.cookies?.[ONBOARD_COOKIE];
  if (!raw) return null;
  const chk = req.unsignCookie(raw);
  reply.clearCookie(ONBOARD_COOKIE, { path: "/" });
  if (!chk.valid || !chk.value) return null;
  try {
    const intent = JSON.parse(chk.value) as { product?: string; ret?: string };
    return { product: intent.product || "AORMS", ret: intent.ret || "" };
  } catch {
    return null;
  }
}

function emailValid(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/** Account auth: email + password registration / login + session endpoints. */
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

  // --- Register with email + password ---
  app.post("/auth/register", async (req, reply) => {
    const body = req.body as { email?: string; password?: string; name?: string } | undefined;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";
    const name = body?.name?.trim() || null;
    if (!emailValid(email)) {
      reply.code(400);
      return { error: "invalid_email" };
    }
    if (password.length < 8) {
      reply.code(400);
      return { error: "weak_password" };
    }
    let account: AccountView;
    try {
      account = await registerWithPassword({ email, password, name });
    } catch (e) {
      const taken = e instanceof Error && e.message === "email_taken";
      reply.code(taken ? 409 : 500);
      return { error: taken ? "email_taken" : "register_failed" };
    }
    writeSession(reply, account.id);

    const intent = takeOnboardIntent(req, reply);
    const redirect = intent ? await buildOnboardRedirect(account, intent.product, intent.ret) : null;
    return { ok: true, account, redirect };
  });

  // --- Log in with email + password ---
  app.post("/auth/login", async (req, reply) => {
    const body = req.body as { email?: string; password?: string } | undefined;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";
    if (!emailValid(email) || !password) {
      reply.code(400);
      return { error: "invalid_credentials" };
    }
    const account = await loginWithPassword(email, password);
    if (!account) {
      reply.code(401);
      return { error: "invalid_credentials" };
    }
    writeSession(reply, account.id);

    const intent = takeOnboardIntent(req, reply);
    const redirect = intent ? await buildOnboardRedirect(account, intent.product, intent.ret) : null;
    return { ok: true, account, redirect };
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
      if (account) return reply.redirect(await buildOnboardRedirect(account, product, ret));
    }

    // Otherwise stash the intent and send the visitor to the sign-up form; the
    // register/login endpoint finishes onboarding once they have an account.
    reply.setCookie(ONBOARD_COOKIE, JSON.stringify({ product, ret }), {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
      secure: isProd,
    });
    return reply.redirect(`${PANEL_URL}?onboard=${encodeURIComponent(product)}`);
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
