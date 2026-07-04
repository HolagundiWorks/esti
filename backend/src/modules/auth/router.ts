import { DeviceLoginInput, DeviceRefreshInput } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);
import { createDeviceSession, refreshDeviceAccessToken } from "../../auth/device.js";
import {
  SESSION_COOKIE,
  createSession,
  hashPassword,
  revokeSessionByToken,
  verifyPassword,
} from "../../auth/session.js";
import { firm, orgSettings, users } from "../../db/schema.js";
import { env } from "../../env.js";
import { writeAudit } from "../../lib/audit.js";
import { emailMatches, normalizeEmail } from "../../lib/email.js";
import { licenseState } from "../../lib/plan.js";
import { sendMail } from "../../lib/mail/transport.js";
import { verifyTotp } from "../../lib/totp.js";
import {
  delegationEnabled,
  isLoginable,
  provisionLocalUser,
  verifyAtPlatform,
} from "../../lib/identityDelegate.js";
import {
  getAccountById as getPlatformAccount,
  verifyLogin as verifyPlatformLogin,
} from "../../licensing-platform/modules/auth/service.js";
import { activeCompaniesByEmail } from "../../licensing-platform/modules/membership/service.js";
import { provisionLiteWorkspace } from "../../lib/provisionLite.js";
import { clearRateLimit, enforceRateLimit } from "../../lib/ratelimit.js";
import { publicProcedure, router } from "../../trpc/trpc.js";

const Credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  /** Authenticator (TOTP) code — required only when the account has 2FA enabled. */
  code: z.string().optional(),
});

const RegisterInput = Credentials.extend({
  fullName: z.string().min(2).max(200),
  role: z.enum(["OWNER", "CONSULTANT", "CLIENT"]).optional(),
});

const BootstrapInput = Credentials.extend({
  companyName: z.string().min(2).max(200),
  adminName: z.string().min(2).max(200),
});

export const authRouter = router({
  /**
   * First-run onboarding for a fresh single-tenant install: create the company,
   * the OWNER (admin), a fixed AORMS-Lite workspace, and sign the admin in.
   * Runs only when the install has no users yet — afterwards it 409s.
   */
  bootstrap: publicProcedure.input(BootstrapInput).mutation(async ({ ctx, input }) => {
    await enforceRateLimit("bootstrap-ip", ctx.ip, 5, 300);
    const email = normalizeEmail(input.email);
    const owner = await ctx.db.transaction(async (tx) => {
      // Serialize against a concurrent bootstrap, then refuse if already set up.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(8347292)`);
      const rows = await tx.select({ n: count() }).from(users);
      if (Number(rows[0]?.n ?? 0) > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This workspace is already set up — please log in.",
        });
      }

      const passwordHash = await hashPassword(input.password);
      const [u] = await tx
        .insert(users)
        .values({ email, fullName: input.adminName, role: "OWNER", passwordHash })
        .returning({ id: users.id, email: users.email, role: users.role, fullName: users.fullName });

      // Name the (single-row) firm; AORMS-Lite firms bill without GST
      // (NOT_APPLICABLE — below the registration threshold, no tax on invoices).
      const [f] = await tx.select({ id: firm.id }).from(firm).limit(1);
      if (f) {
        await tx
          .update(firm)
          .set({ companyName: input.companyName, gstType: "NOT_APPLICABLE" })
          .where(eq(firm.id, f.id));
      } else {
        await tx.insert(firm).values({ companyName: input.companyName, gstType: "NOT_APPLICABLE" });
      }

      // Pin the plan to LITE and seed the fixed workspace.
      const [s] = await tx.select({ id: orgSettings.id }).from(orgSettings).limit(1);
      if (s) {
        await tx.update(orgSettings).set({ plan: "LITE" }).where(eq(orgSettings.id, s.id));
      } else {
        await tx.insert(orgSettings).values({ plan: "LITE" });
      }
      await provisionLiteWorkspace(tx, u!.id);

      await writeAudit(tx, {
        entity: "user",
        entityId: u!.id,
        action: "BOOTSTRAP_OWNER",
        actorId: u!.id,
        after: { email: u!.email, companyName: input.companyName, plan: "LITE" },
      });
      return u!;
    });

    const token = await createSession(owner.id);
    ctx.setCookie(SESSION_COOKIE, token);
    // On desktop the webview is cross-origin to the loopback backend, so cookies
    // aren't sent — return the token for the SPA to attach as a bearer header.
    return env.DESKTOP ? { ...owner, token } : owner;
  }),

  /**
   * Bootstrap the first user as OWNER; afterwards only an OWNER may create
   * users (single-firm — see ARCHITECTURE ADR-03/ADR-04).
   */
  register: publicProcedure.input(RegisterInput).mutation(async ({ ctx, input }) => {
    if (ctx.user?.isDemo) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Managing users and credentials is disabled on the demo account.",
      });
    }
    return ctx.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(8347291)`);
      const rows = await tx.select({ n: count() }).from(users);
      const isFirst = Number(rows[0]?.n ?? 0) === 0;
      if (!isFirst && ctx.user?.role !== "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can add users" });
      }
      const role = isFirst ? "OWNER" : (input.role ?? "CONSULTANT");
      const passwordHash = await hashPassword(input.password);
      const [u] = await tx
        .insert(users)
        .values({
          email: normalizeEmail(input.email),
          fullName: input.fullName,
          role,
          passwordHash,
        })
        .returning({ id: users.id, email: users.email, role: users.role, fullName: users.fullName });
      await writeAudit(tx, {
        entity: "user",
        entityId: u!.id,
        action: isFirst ? "REGISTER_OWNER" : "REGISTER_USER",
        actorId: ctx.user?.id ?? u!.id,
        after: { email: u!.email, role: u!.role },
      });
      return u!;
    });
  }),

  /**
   * Step 1 of the two-step login: resolve which workspaces are active for a
   * given email on this install. Returns at most one workspace (the firm) if
   * the email exists in esti_user, plus the firm name so the UI can show it.
   * Rate-limited gently (not a password check — no secret material returned).
   */
  resolveEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      await enforceRateLimit("resolve-email-ip", ctx.ip, 30, 60);
      const email = normalizeEmail(input.email);
      const [user] = await ctx.db
        .select({ id: users.id, disabled: users.disabled })
        .from(users)
        .where(emailMatches(users.email, email))
        .limit(1);
      const [f] = await ctx.db.select({ companyName: firm.companyName }).from(firm).limit(1);
      const firmName = f?.companyName ?? "Workspace";
      // Return the workspace option only when a non-disabled user exists here.
      const workspaces =
        user && !user.disabled
          ? [{ id: "local", name: firmName }]
          : [];
      return { workspaces };
    }),

  login: publicProcedure.input(Credentials).mutation(async ({ ctx, input }) => {
    const email = normalizeEmail(input.email);
    // Throttle brute-force: cap attempts per IP and per targeted email.
    await enforceRateLimit("login-ip", ctx.ip, 10, 60);
    await enforceRateLimit("login-email", email, 10, 300);

    let u: typeof users.$inferSelect | undefined;

    // Unified individual accounts (Phase 34, opt-in): on a single-box install
    // the licensing platform lives in this same process, so verify against the
    // local platform account store directly — no HTTP hop, no product API key.
    // Same additive rule as HTTP delegation below: a miss (no account / wrong
    // central password / not a member) falls through to the local check.
    if (env.ESTI_UNIFIED_ACCOUNTS) {
      const unified = await verifyPlatformLogin({
        email,
        password: input.password,
        company: env.ESTI_COMPANY || undefined,
      });
      if (unified) {
        const projected = await provisionLocalUser(
          ctx.db,
          { account: unified.account, role: unified.role },
          input.password,
        );
        if (!isLoginable(projected)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This account has been disabled" });
        }
        u = projected!;
      }
    }

    // Delegated identity (opt-in): verify against the central platform and project
    // the person onto a local firm user. The hub's "invalid" covers three cases a
    // node can't tell apart — wrong central password, no central account at all
    // (e.g. a staff login created purely locally, which never touches hlp_account),
    // or a real central account that isn't an ACTIVE member of this company yet.
    // Only cases 2/3 are normal for ordinary local staff, so we never hard-fail
    // here — same as when the platform is unreachable, fall through and let the
    // local password (below) decide. This keeps delegation additive: it can only
    // let a login succeed that the local password check would have rejected
    // anyway, never the reverse.
    if (!u && delegationEnabled()) {
      const res = await verifyAtPlatform(email, input.password);
      if (res.kind === "ok") {
        const projected = await provisionLocalUser(ctx.db, res.identity, input.password);
        if (!isLoginable(projected)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This account has been disabled" });
        }
        u = projected!;
      }
      // res.kind === "invalid" or "unreachable" → leave u undefined and try local verify.
    }

    if (!u) {
      const rows = await ctx.db
        .select()
        .from(users)
        .where(emailMatches(users.email, email))
        .limit(1);
      const local = rows[0];
      if (!local || !local.passwordHash || !(await verifyPassword(local.passwordHash, input.password))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      if (local.disabled) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This account has been disabled" });
      }
      u = local;
    }

    // Second factor: if this login has an authenticator, require a valid code.
    if (u.totpSecret) {
      const code = input.code?.trim();
      if (!code) throw new TRPCError({ code: "UNAUTHORIZED", message: "totp_required" });
      if (!verifyTotp(u.totpSecret, code)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "totp_invalid" });
      }
    }

    const token = await createSession(u.id);
    ctx.setCookie(SESSION_COOKIE, token);
    // Successful login clears the per-email counter so it can't lock out a
    // legitimate user who just fat-fingered the password a few times.
    await clearRateLimit("login-email", email);
    await writeAudit(ctx.db, {
      entity: "user",
      entityId: u.id,
      action: "LOGIN",
      actorId: u.id,
    });
    // Tenant-select (Phase 34, unified installs): one identity spans many
    // company workspaces — architects freelance alongside firm work — so hand
    // the SPA every company this person can enter. It shows a picker when
    // there is more than just this studio's workspace.
    const companies = env.ESTI_UNIFIED_ACCOUNTS ? await activeCompaniesByEmail(email) : [];
    const profile = { id: u.id, email: u.email, role: u.role, fullName: u.fullName, companies };
    return env.DESKTOP ? { ...profile, token } : profile;
  }),

  /**
   * Exchange a signed-in PLATFORM session (e.g. a Google sign-in) for a
   * workspace session — unified single-box installs only. Links or provisions
   * the local user by email (never touching passwords: Google-only people stay
   * passwordless locally) and returns the same shape as `login`, so the SPA
   * continues into the tenant-select step.
   */
  sessionFromPlatform: publicProcedure.mutation(async ({ ctx }) => {
    if (!env.ESTI_UNIFIED_ACCOUNTS) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "unified accounts disabled" });
    }
    if (!ctx.platformAccountId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "no platform session" });
    }
    const account = await getPlatformAccount(ctx.platformAccountId);
    if (!account) throw new TRPCError({ code: "UNAUTHORIZED", message: "no platform session" });
    const email = normalizeEmail(account.email);

    let [u] = await ctx.db.select().from(users).where(emailMatches(users.email, email)).limit(1);
    if (u?.disabled) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This account has been disabled" });
    }
    if (!u) {
      const [created] = await ctx.db
        .insert(users)
        .values({
          email,
          fullName: account.name ?? email,
          role: "ASSOCIATE",
          accountPublicId: account.publicId,
        })
        .returning();
      u = created!;
    } else if (!u.accountPublicId && account.publicId) {
      await ctx.db
        .update(users)
        .set({ accountPublicId: account.publicId })
        .where(eq(users.id, u.id));
    }

    const token = await createSession(u.id);
    ctx.setCookie(SESSION_COOKIE, token);
    await writeAudit(ctx.db, { entity: "user", entityId: u.id, action: "LOGIN", actorId: u.id });
    const companies = await activeCompaniesByEmail(email);
    const profile = { id: u.id, email: u.email, role: u.role, fullName: u.fullName, companies };
    return env.DESKTOP ? { ...profile, token } : profile;
  }),

  /**
   * Self-serve "forgot password" — step 1. Always returns { ok: true } (never
   * reveals whether the email exists) and only emails a reset link when a
   * matching, non-disabled login actually exists. Token is stored hashed with a
   * 1-hour expiry.
   */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const email = normalizeEmail(input.email);
      await enforceRateLimit("pwreset-ip", ctx.ip, 5, 300);
      await enforceRateLimit("pwreset-email", email, 5, 900);
      const [u] = await ctx.db
        .select({ id: users.id, disabled: users.disabled })
        .from(users)
        .where(emailMatches(users.email, email))
        .limit(1);
      if (u && !u.disabled) {
        const token = randomBytes(24).toString("base64url");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        await ctx.db
          .update(users)
          .set({
            passwordResetToken: tokenHash,
            passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
          })
          .where(eq(users.id, u.id));
        const origin = env.ALLOWED_ORIGINS.split(",")[0]?.trim() || "http://localhost:5173";
        const link = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
        await sendMail({
          to: email,
          subject: "Reset your AORMS password",
          text: `Reset your AORMS password using this link (valid 1 hour):\n\n${link}\n\nIf you didn't request this, ignore this email.`,
          html: `<p>Reset your AORMS password using this link (valid 1 hour):</p><p><a href="${link}">Reset my password</a></p><p>If you didn't request this, ignore this email.</p>`,
        }).catch(() => undefined);
      }
      return { ok: true };
    }),

  /** Self-serve "forgot password" — step 2: consume the token, set a new password. */
  resetPassword: publicProcedure
    .input(z.object({ token: z.string().min(1), password: z.string().min(8).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit("pwreset-consume-ip", ctx.ip, 10, 300);
      const tokenHash = createHash("sha256").update(input.token.trim()).digest("hex");
      const [u] = await ctx.db
        .update(users)
        .set({
          passwordHash: await hashPassword(input.password),
          passwordResetToken: null,
          passwordResetExpires: null,
        })
        .where(
          and(
            eq(users.passwordResetToken, tokenHash),
            gt(users.passwordResetExpires, new Date()),
            eq(users.disabled, false),
          ),
        )
        .returning({ id: users.id });
      if (!u) throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or has expired." });
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: u.id,
        action: "RESET_PASSWORD_SELF",
        actorId: u.id,
      });
      return { ok: true };
    }),

  /** ESTICAD companion — email/password → bearer token pair (no browser cookie). */
  loginDevice: publicProcedure.input(DeviceLoginInput).mutation(async ({ ctx, input }) => {
    const email = normalizeEmail(input.email);
    await enforceRateLimit("device-login-ip", ctx.ip, 10, 60);
    await enforceRateLimit("device-login-email", email, 10, 300);

    const rows = await ctx.db
      .select()
      .from(users)
      .where(emailMatches(users.email, email))
      .limit(1);
    const u = rows[0];
    if (!u || !u.passwordHash || !(await verifyPassword(u.passwordHash, input.password))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }
    if (u.disabled) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This account has been disabled" });
    }
    if (u.role === "CLIENT" || (u.role === "CONSULTANT" && u.consultantId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Companion login is for office staff only" });
    }

    // Second factor: a device token grants the same full API access as a browser
    // session, so it must clear the same 2FA bar as `login` — otherwise pairing a
    // device is a password-only bypass of an account's authenticator.
    if (u.totpSecret) {
      const code = input.code?.trim();
      if (!code) throw new TRPCError({ code: "UNAUTHORIZED", message: "totp_required" });
      if (!verifyTotp(u.totpSecret, code)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "totp_invalid" });
      }
    }

    const tokens = await createDeviceSession(ctx.db, {
      userId: u.id,
      deviceName: input.deviceName,
      clientId: input.clientId,
    });

    await clearRateLimit("device-login-email", input.email.toLowerCase());
    await writeAudit(ctx.db, {
      entity: "device_session",
      entityId: tokens.sessionId,
      action: "LOGIN_DEVICE",
      actorId: u.id,
      after: { clientId: input.clientId, deviceName: input.deviceName },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresAt: tokens.accessExpiresAt.toISOString(),
      refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
      userId: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
    };
  }),

  refreshDevice: publicProcedure.input(DeviceRefreshInput).mutation(async ({ ctx, input }) => {
    await enforceRateLimit("device-refresh-ip", ctx.ip, 30, 60);
    const tokens = await refreshDeviceAccessToken(ctx.db, {
      refreshToken: input.refreshToken,
      clientId: input.clientId,
    });
    if (!tokens) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired refresh token" });
    }
    await writeAudit(ctx.db, {
      entity: "device_session",
      entityId: tokens.sessionId,
      action: "REFRESH_DEVICE",
      actorId: ctx.user?.id,
    });
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresAt: tokens.accessExpiresAt.toISOString(),
      refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
    };
  }),

  me: publicProcedure.query(({ ctx }) => ctx.user),

  /**
   * Server-authoritative runtime signal so the SPA can branch on WHERE it runs
   * instead of guessing from build flags. `desktop` = a local-first desktop
   * install (data on this machine, no online workspace); `managed` = a licence
   * token or hub is configured; `mode` folds these for convenience.
   */
  runtime: publicProcedure.query(async ({ ctx }) => {
    const state = await licenseState(ctx.db);
    const desktop = Boolean(env.DESKTOP);
    return {
      desktop,
      managed: state.managed,
      mode: desktop ? ("local" as const) : ("cloud" as const),
    };
  }),

  /** Wipe and re-seed the demo workspace. Only callable while logged in as a demo user. */
  resetDemo: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user?.isDemo) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only available on demo accounts" });
    }
    await execFileAsync("pnpm", ["seed:demo"], {
      cwd: process.cwd(),
      env: { ...process.env, SEED_DEMO_FORCE: "1" },
      timeout: 90_000,
    });
    // Switch session to the principal demo account so the page lands cleanly.
    const [principal] = await ctx.db
      .select()
      .from(users)
      .where(and(eq(users.email, "principal@demo.aorms.in"), eq(users.isDemo, true)))
      .limit(1);
    if (principal) {
      await revokeSessionByToken(ctx.db, ctx.sessionToken);
      const token = await createSession(principal.id);
      ctx.setCookie(SESSION_COOKIE, token);
    }
    return { ok: true };
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    await revokeSessionByToken(ctx.db, ctx.sessionToken);
    ctx.setCookie(SESSION_COOKIE, "");
    if (ctx.user) {
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: ctx.user.id,
        action: "LOGOUT",
        actorId: ctx.user.id,
      });
    }
    return { ok: true };
  }),
});
