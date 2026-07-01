import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";
import { clearSession, readSession, type SessionData, writeSession } from "../lib/session.js";
import {
  getAccountById,
  hasPlatformAdmin,
  loginWithPassword,
  registerWithPassword,
  upsertAccount,
  type AccountView,
} from "../modules/auth/service.js";
import { provisionTrial } from "../modules/onboarding/service.js";
import {
  type OrgHandle,
  membership,
  membershipsFor,
  orgHandleById,
  orgIdFromHandle,
  resolveCompany,
} from "../modules/auth/tenant.js";
import {
  createCompany,
  joinCompany,
  leaveCompany,
} from "../modules/membership/service.js";
import { listCertifications, listGrowth } from "../modules/portable/service.js";
import {
  checkTotpForLogin,
  disableTotp,
  enableTotp,
  startEnrollment,
  totpEnabled,
} from "../modules/auth/totp.js";

/** The `me` view: the person + their active company + every company they can enter. */
interface MeView {
  account: AccountView;
  activeOrg: OrgHandle | null;
  memberships: Array<{ org: OrgHandle; role: string }>;
  totpEnabled: boolean;
}

async function buildMe(s: SessionData): Promise<MeView | null> {
  const account = await getAccountById(s.accountId);
  if (!account) return null;
  const [activeOrg, memberships, twoFactor] = await Promise.all([
    s.orgId ? orgHandleById(s.orgId) : Promise.resolve(null),
    membershipsFor(s.accountId),
    totpEnabled(s.accountId),
  ]);
  return { account, activeOrg, memberships, totpEnabled: twoFactor };
}

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
      return { account: null, activeOrg: null, memberships: [], totpEnabled: false };
    }
    const me = await buildMe(s);
    if (!me) {
      clearSession(reply);
      reply.code(401);
      return { account: null, activeOrg: null, memberships: [], totpEnabled: false };
    }
    return me;
  });

  app.post("/auth/logout", async (_req, reply) => {
    clearSession(reply);
    return { ok: true };
  });

  // Whether self-serve account creation is still open on the admin console. Closes
  // once the first platform admin exists (product onboarding is unaffected).
  app.get("/auth/registration-status", async () => {
    return { adminExists: await hasPlatformAdmin() };
  });

  // --- Two-factor authenticator (TOTP) enrollment ---
  // Begin: issue a fresh secret + otpauth URI to scan (not stored until confirmed).
  app.post("/auth/totp/setup", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const account = await getAccountById(s.accountId);
    if (!account) {
      clearSession(reply);
      reply.code(401);
      return { error: "unauthenticated" };
    }
    return startEnrollment(account.email);
  });

  // Confirm: the code must validate against the issued secret to turn 2FA on.
  app.post("/auth/totp/enable", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const body = req.body as { secret?: string; code?: string } | undefined;
    if (!body?.secret || !body?.code) {
      reply.code(400);
      return { error: "invalid_input" };
    }
    const ok = await enableTotp(s.accountId, body.secret.trim(), body.code.trim());
    if (!ok) {
      reply.code(400);
      return { error: "totp_invalid" };
    }
    return { ok: true };
  });

  // Turn off — requires a current code so a hijacked session can't disable 2FA.
  app.post("/auth/totp/disable", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const body = req.body as { code?: string } | undefined;
    const ok = await disableTotp(s.accountId, body?.code?.trim() ?? "");
    if (!ok) {
      reply.code(400);
      return { error: "totp_invalid" };
    }
    return { ok: true };
  });

  // --- The signed-in person's portable credentials (certs + growth), AORMS-U keyed ---
  app.get("/auth/my-credentials", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { certifications: [], growth: [] };
    }
    const account = await getAccountById(s.accountId);
    if (!account?.publicId) return { certifications: [], growth: [] };
    const [certifications, growth] = await Promise.all([
      listCertifications(account.publicId),
      listGrowth(account.publicId),
    ]);
    return { certifications, growth };
  });

  // --- Step 1: resolve the company (tenant) from what the person typed ---
  app.post("/auth/resolve-company", async (req, reply) => {
    const body = req.body as { company?: string } | undefined;
    const input = body?.company?.trim() ?? "";
    if (!input) {
      reply.code(400);
      return { mode: "not_found" as const };
    }
    return resolveCompany(input);
  });

  // --- Switch the active company (must be a member) ---
  app.post("/auth/switch-company", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const body = req.body as { company?: string } | undefined;
    const input = body?.company?.trim() ?? "";
    const orgId = input ? await orgIdFromHandle(input) : null;
    if (!orgId) {
      reply.code(404);
      return { error: "company_not_found" };
    }
    if (!(await membership(s.accountId, orgId))) {
      reply.code(403);
      return { error: "not_a_member" };
    }
    writeSession(reply, s.accountId, orgId);
    const me = await buildMe({ accountId: s.accountId, orgId });
    return { ok: true, ...me };
  });

  // --- Create a company (the signed-in account becomes its OWNER) ---
  app.post("/auth/create-company", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const body = req.body as { name?: string; loginDomain?: string } | undefined;
    const name = body?.name?.trim() ?? "";
    if (name.length < 2) {
      reply.code(400);
      return { error: "invalid_name" };
    }
    const org = await createCompany(s.accountId, { name, loginDomain: body?.loginDomain });
    const orgId = org.publicId ? await orgIdFromHandle(org.publicId) : null;
    writeSession(reply, s.accountId, orgId ?? undefined);
    const me = await buildMe({ accountId: s.accountId, orgId: orgId ?? undefined });
    return { ok: true, ...me };
  });

  // --- Join / request access to a company ---
  app.post("/auth/join-company", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const account = await getAccountById(s.accountId);
    if (!account) {
      clearSession(reply);
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const body = req.body as { company?: string } | undefined;
    const company = body?.company?.trim() ?? "";
    const res = await joinCompany(s.accountId, account.email, company);
    if ("error" in res) {
      reply.code(404);
      return { error: res.error };
    }
    // Auto-activated → make it the active tenant; otherwise stay where we are.
    const activeOrgId =
      res.status === "ACTIVE" ? (await orgIdFromHandle(company)) ?? s.orgId : s.orgId;
    writeSession(reply, s.accountId, activeOrgId);
    const me = await buildMe({ accountId: s.accountId, orgId: activeOrgId });
    return { ok: true, status: res.status, ...me };
  });

  // --- Leave a company ---
  app.post("/auth/leave-company", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const body = req.body as { company?: string } | undefined;
    const orgId = body?.company ? await orgIdFromHandle(body.company) : null;
    if (!orgId) {
      reply.code(404);
      return { error: "company_not_found" };
    }
    await leaveCompany(s.accountId, orgId);
    const nextOrg = s.orgId === orgId ? undefined : s.orgId;
    writeSession(reply, s.accountId, nextOrg);
    const me = await buildMe({ accountId: s.accountId, orgId: nextOrg });
    return { ok: true, ...me };
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
    // Admin-console self-signup is a one-time bootstrap: once a platform admin
    // exists it is closed. Product onboarding (carrying the onboard-intent cookie)
    // still creates ordinary company/personal accounts.
    const onboarding = Boolean(req.cookies?.[ONBOARD_COOKIE]);
    if (!onboarding && (await hasPlatformAdmin())) {
      reply.code(403);
      return { error: "registration_closed" };
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

  // --- Log in with email + password (optionally company-scoped) ---
  // `company` is the resolved Step-1 handle. Omitted → the legacy single-step
  // login (unscoped session), so existing platform-admin sign-in is unchanged.
  app.post("/auth/login", async (req, reply) => {
    const body = req.body as
      | { email?: string; password?: string; company?: string; code?: string }
      | undefined;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";
    const company = body?.company?.trim() ?? "";
    if (!emailValid(email) || !password) {
      reply.code(400);
      return { error: "invalid_credentials" };
    }
    const account = await loginWithPassword(email, password);
    if (!account) {
      reply.code(401);
      return { error: "invalid_credentials" };
    }

    // Second factor: if this account has an authenticator, a valid code is required.
    const totp = await checkTotpForLogin(account.id, body?.code?.trim());
    if (totp === "required") {
      reply.code(401);
      return { error: "totp_required" };
    }
    if (totp === "invalid") {
      reply.code(401);
      return { error: "totp_invalid" };
    }

    // Tenant-first: when a company is named, only the admin branch or a verified
    // membership may sign in, and the session is scoped to that active company.
    let orgId: string | undefined;
    if (company) {
      const res = await resolveCompany(company);
      if (res.mode === "not_found") {
        reply.code(404);
        return { error: "company_not_found" };
      }
      if (res.mode === "company") {
        const id = await orgIdFromHandle(company);
        if (!id) {
          reply.code(404);
          return { error: "company_not_found" };
        }
        if (!(await membership(account.id, id))) {
          reply.code(403);
          return { error: "not_a_member" };
        }
        orgId = id;
      }
      // res.mode === "admin" → unscoped session; the Panel gates on isPlatformAdmin.
    }
    writeSession(reply, account.id, orgId);

    const intent = takeOnboardIntent(req, reply);
    const redirect = intent ? await buildOnboardRedirect(account, intent.product, intent.ret) : null;
    const activeOrg = orgId ? await orgHandleById(orgId) : null;
    return { ok: true, account, redirect, activeOrg };
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
