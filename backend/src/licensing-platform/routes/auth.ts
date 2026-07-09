import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";
import { clearSession, readSession, type SessionData, writeSession } from "../lib/session.js";
import {
  accountIdByEmail,
  createEmailVerification,
  ensureAccountPublicId,
  getAccountById,
  hasPlatformAdmin,
  accountLoginBlock,
  loginWithPassword,
  loginWithWorkspaceCredentials,
  adoptWorkspaceSessionOwner,
  registerWithPassword,
  updateAccountProfile,
  upsertAccount,
  verifyEmailToken,
  type AccountView,
} from "../modules/auth/service.js";
import { env as workspaceEnv } from "../../env.js";
import { SESSION_COOKIE as WORKSPACE_SESSION_COOKIE, userFromToken } from "../../auth/session.js";
import { sendMail } from "../../lib/mail/transport.js";
import {
  type OrgHandle,
  membership,
  membershipsFor,
  orgHandleById,
  orgIdFromHandle,
  resolveCompany,
} from "../modules/auth/tenant.js";
import {
  acceptInvite,
  accountUsageMinutes,
  adoptInvite,
  companyIdStatus,
  createCompany,
  declineInvite,
  generateCompanyId,
  inviteMember,
  isOrgAdmin,
  joinCompany,
  leaveCompany,
  listMembers,
  pendingInvitesFor,
  setMemberStatus,
} from "../modules/membership/service.js";
import { AORMS_ID_USAGE_MINUTES } from "@esti/contracts";
import { provisionTrial } from "../modules/onboarding/service.js";
import { listCertifications, listGrowth } from "../modules/portable/service.js";
import {
  checkTotpForLogin,
  disableTotp,
  enableTotp,
  startEnrollment,
  totpEnabled,
} from "../modules/auth/totp.js";
import { PLAN_CODES, type PlanCode, createPlanRequest, myLicense, myRequest } from "../modules/request/service.js";
import { AccountSignupProfile, AccountSignupProfileUpdate } from "@esti/contracts";

/** The `me` view: the person + their active company + every company they can enter. */
interface MeView {
  account: AccountView;
  activeOrg: OrgHandle | null;
  memberships: Array<{ org: OrgHandle; role: string }>;
  /** Companies awaiting this person's acceptance (Phase 34 invites). */
  pendingInvites: Array<{ org: OrgHandle; role: string }>;
  /** May mint an AORMS-U handle instantly (invited into a company). */
  instantIdEligible: boolean;
  totpEnabled: boolean;
}

async function buildMe(s: SessionData): Promise<MeView | null> {
  const account = await getAccountById(s.accountId);
  if (!account) return null;
  const [activeOrg, memberships, pendingInvites, twoFactor] = await Promise.all([
    s.orgId ? orgHandleById(s.orgId) : Promise.resolve(null),
    membershipsFor(s.accountId),
    pendingInvitesFor(s.accountId),
    totpEnabled(s.accountId),
  ]);
  const instantIdEligible = false;
  return { account, activeOrg, memberships, pendingInvites, instantIdEligible, totpEnabled: twoFactor };
}

const ONBOARD_COOKIE = "hlp_onboard";
const isProd = process.env.NODE_ENV === "production";

// The AORMS account + licence portal has its own hub destination at /account
// (distinct from the firm workspace /login and the /platform-admin console).
// Onboarding, email verification, and customer sign-in all land there.
const ACCOUNT_URL = `${env.FRONTEND_ORIGIN}/account`;

/** Mint a verification token and email the confirmation link (best-effort). */
async function sendEmailVerification(accountId: string, email: string): Promise<void> {
  const token = await createEmailVerification(accountId);
  const link = `${env.FRONTEND_ORIGIN}/platform/auth/verify-email?token=${encodeURIComponent(token)}`;
  const subject = "Confirm your AORMS email";
  const text = `Confirm your email to finish setting up your AORMS account:\n\n${link}\n\nThis link expires in 24 hours. If you didn't create an account, ignore this email.\n\n— AORMS`;
  const html = `<p>Confirm your email to finish setting up your AORMS account:</p>
<p><a href="${link}">Confirm my email</a></p>
<p>This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
<p>— AORMS</p>`;
  await sendMail({ to: email, subject, text, html });
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
      return { account: null, activeOrg: null, memberships: [], pendingInvites: [], instantIdEligible: false, totpEnabled: false };
    }
    const me = await buildMe(s);
    if (!me) {
      clearSession(reply);
      reply.code(401);
      return { account: null, activeOrg: null, memberships: [], pendingInvites: [], instantIdEligible: false, totpEnabled: false };
    }
    return me;
  });

  app.patch("/auth/profile", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const parsed = AccountSignupProfileUpdate.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "profile_invalid" };
    }
    try {
      const account = await updateAccountProfile(s.accountId, parsed.data);
      return { account };
    } catch (e) {
      const missing = e instanceof Error && e.message === "not_found";
      reply.code(missing ? 404 : 500);
      return { error: missing ? "not_found" : "update_failed" };
    }
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

  // --- Plan requests: sign up, ask for a tier; an admin fulfils it in the portal ---
  app.get("/auth/my-request", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { request: null };
    }
    return { request: await myRequest(s.accountId) };
  });

  // --- Current licence (plan / seats / expiry) for the account's own org ---
  app.get("/auth/my-license", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { license: null };
    }
    return { license: await myLicense(s.accountId) };
  });

  app.post("/auth/request-plan", async (req, reply) => {
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
    const plan = (req.body as { plan?: string } | undefined)?.plan?.toUpperCase() ?? "";
    if (!PLAN_CODES.includes(plan as PlanCode)) {
      reply.code(400);
      return { error: "invalid_plan" };
    }
    const request = await createPlanRequest(account, plan as PlanCode);
    return { ok: true, request };
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
    if ("error" in org) {
      reply.code(400);
      return { error: org.error };
    }
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

  // --- Invite a person into a company by email (company owner only) ---
  // Creates a claimable passwordless account shell when the email is new;
  // signing up with that email later claims the shell and its invitation.
  app.post("/auth/invite-member", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const body = req.body as { company?: string; email?: string; role?: string } | undefined;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const orgId = body?.company ? await orgIdFromHandle(body.company) : null;
    if (!orgId) {
      reply.code(404);
      return { error: "company_not_found" };
    }
    if (!emailValid(email)) {
      reply.code(400);
      return { error: "invalid_email" };
    }
    if (!(await isOrgAdmin(s.accountId, orgId))) {
      reply.code(403);
      return { error: "not_company_owner" };
    }
    const role = body?.role === "OWNER" ? "OWNER" : "MEMBER";
    await inviteMember(orgId, email, role);
    return { ok: true };
  });

  // --- List members (owner) — includes pending join requests ---
  app.get("/auth/org-members", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const company = (req.query as { company?: string })?.company?.trim() ?? "";
    const orgId = company ? await orgIdFromHandle(company) : null;
    if (!orgId) {
      reply.code(404);
      return { error: "company_not_found" };
    }
    if (!(await isOrgAdmin(s.accountId, orgId))) {
      reply.code(403);
      return { error: "not_company_owner" };
    }
    const members = await listMembers(orgId);
    return { ok: true, members };
  });

  // --- Approve or reject a join request (owner) ---
  app.post("/auth/review-member", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const body = req.body as
      | { company?: string; accountId?: string; action?: "approve" | "reject" }
      | undefined;
    const orgId = body?.company ? await orgIdFromHandle(body.company) : null;
    const accountId = body?.accountId?.trim() ?? "";
    if (!orgId || !accountId) {
      reply.code(400);
      return { error: "invalid_request" };
    }
    if (!(await isOrgAdmin(s.accountId, orgId))) {
      reply.code(403);
      return { error: "not_company_owner" };
    }
    if (body?.action !== "approve" && body?.action !== "reject") {
      reply.code(400);
      return { error: "invalid_request" };
    }
    await setMemberStatus(orgId, accountId, body.action === "approve" ? "ACTIVE" : "LEFT");
    const members = await listMembers(orgId);
    return { ok: true, members };
  });

  // --- Accept / decline my pending invitation ---
  app.post("/auth/accept-invite", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const body = req.body as { company?: string } | undefined;
    const res = await acceptInvite(s.accountId, body?.company?.trim() ?? "");
    if ("error" in res) {
      reply.code(res.error === "company_not_found" ? 404 : 400);
      return { error: res.error };
    }
    const me = await buildMe(s);
    return { ok: true, org: res.org, ...me };
  });

  app.post("/auth/decline-invite", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const body = req.body as { company?: string } | undefined;
    await declineInvite(s.accountId, body?.company?.trim() ?? "");
    const me = await buildMe(s);
    return { ok: true, ...me };
  });

  // --- Instant AORMS-U generation (Phase 34) ---
  // Generate AORMS-U after 100 hours of active use (workspace usage ledger).
  app.post("/auth/generate-id", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const account = await getAccountById(s.accountId);
    if (!account) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    if (account.publicId) return { ok: true, publicId: account.publicId };
    const minutes = await accountUsageMinutes(account.email);
    if (minutes < AORMS_ID_USAGE_MINUTES) {
      reply.code(403);
      return { error: "not_eligible" };
    }
    const publicId = await ensureAccountPublicId(s.accountId);
    return { ok: true, publicId };
  });

  // --- Earned COMPANY identity (Phase 34) ---
  // Companies are founded without an AORMS-C handle; it unlocks at 100 hours
  // of company usage (the ACTIVE members' summed active time). Owner-only.
  app.get("/auth/company-id-status", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const company = (req.query as { company?: string })?.company?.trim() ?? "";
    const orgId = company ? await orgIdFromHandle(company) : null;
    if (!orgId) {
      reply.code(404);
      return { error: "company_not_found" };
    }
    if (!(await isOrgAdmin(s.accountId, orgId))) {
      reply.code(403);
      return { error: "not_company_owner" };
    }
    const status = await companyIdStatus(orgId);
    return { ok: true, ...status };
  });

  app.post("/auth/generate-company-id", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const body = req.body as { company?: string } | undefined;
    const res = await generateCompanyId(s.accountId, body?.company?.trim() ?? "");
    if ("error" in res) {
      reply.code(
        res.error === "company_not_found" ? 404 : res.error === "not_company_owner" ? 403 : 400,
      );
      return { error: res.error };
    }
    const me = await buildMe(s);
    return { ok: true, publicId: res.publicId, ...me };
  });

  // --- "Use my existing AORMS ID" (Phase 34) ---
  // The signed-in invited person proves control of their existing account
  // (email + password (+ authenticator code)); the pending invitation moves to
  // that account and the session continues AS the existing account, so one
  // identity spans every company.
  app.post("/auth/adopt-identity", async (req, reply) => {
    const s = readSession(req);
    if (!s) {
      reply.code(401);
      return { error: "unauthenticated" };
    }
    const body = req.body as
      | { company?: string; email?: string; password?: string; code?: string }
      | undefined;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";
    if (!emailValid(email) || !password) {
      reply.code(400);
      return { error: "invalid_credentials" };
    }
    const existing = await loginWithPassword(email, password);
    if (!existing) {
      reply.code(401);
      return { error: "invalid_credentials" };
    }
    if (!existing.publicId) {
      reply.code(400);
      return { error: "no_existing_id" };
    }
    const totp = await checkTotpForLogin(existing.id, body?.code?.trim());
    if (totp === "required") {
      reply.code(401);
      return { error: "totp_required" };
    }
    if (totp === "invalid") {
      reply.code(401);
      return { error: "totp_invalid" };
    }
    const res = await adoptInvite(s.accountId, existing.id, body?.company?.trim() ?? "");
    if ("error" in res) {
      reply.code(res.error === "company_not_found" ? 404 : 400);
      return { error: res.error };
    }
    // Continue as the existing (identity-holding) account.
    writeSession(reply, existing.id);
    const me = await buildMe({ accountId: existing.id });
    return { ok: true, org: res.org, ...me };
  });

  // --- Register with email + password ---
  app.post("/auth/register", async (req, reply) => {
    const body = req.body as
      | { email?: string; password?: string; name?: string; portal?: boolean; profile?: unknown }
      | undefined;
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
    const portal = Boolean(body?.portal);
    const profileParsed = body?.profile
      ? AccountSignupProfile.safeParse(body.profile)
      : null;
    if (portal && (!profileParsed || !profileParsed.success)) {
      reply.code(400);
      return { error: "profile_invalid" };
    }
    // Admin-console self-signup is a one-time bootstrap: once a platform admin
    // exists it is closed. Customer sign-up on the user portal (`portal: true`)
    // and product onboarding (the onboard cookie) create ordinary accounts and
    // are always open — they never grant admin (that's PLATFORM_ADMIN_EMAILS).
    const onboarding = Boolean(req.cookies?.[ONBOARD_COOKIE]);
    if (!onboarding && !portal && (await hasPlatformAdmin())) {
      reply.code(403);
      return { error: "registration_closed" };
    }
    let account: AccountView;
    try {
      account = await registerWithPassword({
        email,
        password,
        name,
        profile: profileParsed?.success ? profileParsed.data : undefined,
      });
    } catch (e) {
      const taken = e instanceof Error && e.message === "email_taken";
      reply.code(taken ? 409 : 500);
      return { error: taken ? "email_taken" : "register_failed" };
    }
    writeSession(reply, account.id);

    // Self-serve free tier: every new account instantly gets a personal org + a
    // free-forever LITE licence (idempotent, self-healing) — no admin approval,
    // no emailed key. Paid tiers stay a request→approve flow. Best-effort so a
    // provisioning hiccup never blocks signup.
    try {
      await provisionTrial(account);
    } catch {
      /* ignore — LITE can be re-provisioned; signup still succeeds */
    }

    // Fire off the email-verification link (best-effort — never fails signup if
    // SMTP is down; the account just stays unverified, which only blocks
    // domain-based company auto-join, not login).
    try {
      await sendEmailVerification(account.id, account.email);
    } catch {
      /* ignore — verification can be re-requested */
    }

    // Customer (portal) sign-ups stay in the user portal; never bounce to the
    // admin console. The onboard cookie is still consumed to clear it.
    takeOnboardIntent(req, reply);
    return { ok: true, account, redirect: null };
  });

  // --- Confirm an email-verification link (GET so it works straight from mail) ---
  app.get("/auth/verify-email", async (req, reply) => {
    const token = (req.query as { token?: string })?.token ?? "";
    const ok = await verifyEmailToken(token);
    // Land back on the login page either way; the query flag drives a banner.
    return reply.redirect(`${ACCOUNT_URL}?verified=${ok ? "1" : "0"}`);
  });

  // --- Resend the verification email to the signed-in account ---
  app.post("/auth/resend-verification", async (req, reply) => {
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
    const info = await accountIdByEmail(account.email);
    if (info?.verified) return { ok: true, alreadyVerified: true };
    try {
      await sendEmailVerification(account.id, account.email);
    } catch {
      reply.code(502);
      return { error: "send_failed" };
    }
    return { ok: true };
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
    const blocked = await accountLoginBlock(email);
    if (blocked) {
      reply.code(403);
      return { error: blocked };
    }
    let account = await loginWithPassword(email, password);
    // Unified single-box installs: fall back to the WORKSPACE login (the seeded
    // owner, owner-created staff) and mirror it onto a platform account, so one
    // set of credentials works at both /login and /account. The workspace
    // user's authenticator is enforced inside the fallback.
    if (!account && workspaceEnv.ESTI_UNIFIED_ACCOUNTS) {
      const adopted = await loginWithWorkspaceCredentials(email, password, body?.code?.trim());
      if (adopted.kind === "totp_required" || adopted.kind === "totp_invalid") {
        reply.code(401);
        return { error: adopted.kind };
      }
      if (adopted.kind === "ok") account = adopted.account;
    }
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
    // Onboarding lands the account in the customer portal, where they raise a
    // plan request an admin fulfils — never the admin/licensing console.
    const redirect = intent ? ACCOUNT_URL : null;
    const activeOrg = orgId ? await orgHandleById(orgId) : null;
    return { ok: true, account, redirect, activeOrg };
  });

  // Workspace OWNER already signed in — open company account without re-auth.
  app.post("/auth/session-from-workspace", async (req, reply) => {
    if (!workspaceEnv.ESTI_UNIFIED_ACCOUNTS) {
      reply.code(412);
      return { error: "unified_disabled" };
    }
    const wsUser = await userFromToken(req.cookies?.[WORKSPACE_SESSION_COOKIE]);
    if (!wsUser) {
      reply.code(401);
      return { error: "no_workspace_session" };
    }
    const account = await adoptWorkspaceSessionOwner(wsUser.id);
    if (!account) {
      reply.code(403);
      return { error: "workspace_owner_required" };
    }
    const memberships = await membershipsFor(account.id);
    const owned = memberships.find((m) => m.role === "OWNER");
    const orgId = owned ? await orgIdFromHandle(owned.org.publicId ?? owned.org.slug) : undefined;
    writeSession(reply, account.id, orgId ?? undefined);
    const activeOrg = orgId ? await orgHandleById(orgId) : null;
    return { ok: true, account, activeOrg };
  });

  // --- Self-serve onboarding (a product's "Create account") ---
  // Products redirect here:  /onboard?product=AORMS&return=<product-url>
  app.get("/onboard", async (req, reply) => {
    const q = req.query as { product?: string; return?: string };
    const product = (q.product || "AORMS").toUpperCase();
    const ret = typeof q.return === "string" ? q.return : "";

    // Already signed in → straight to the account portal.
    const s = readSession(req);
    if (s) {
      const account = await getAccountById(s.accountId);
      if (account) return reply.redirect(ACCOUNT_URL);
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
    return reply.redirect(`${ACCOUNT_URL}?onboard=${encodeURIComponent(product)}`);
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
