import { DeviceLoginInput, DeviceRefreshInput } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { count, eq, sql, and } from "drizzle-orm";
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
import { verifyTotp } from "../../lib/totp.js";
import {
  delegationEnabled,
  isLoginable,
  provisionLocalUser,
  verifyAtPlatform,
} from "../../lib/identityDelegate.js";
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
    if (delegationEnabled()) {
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
    const profile = { id: u.id, email: u.email, role: u.role, fullName: u.fullName };
    return env.DESKTOP ? { ...profile, token } : profile;
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

  /** Returns all demo users — available to unauthenticated visitors (landing page) and demo sessions. */
  demoUsers: publicProcedure.query(async ({ ctx }) => {
    if (ctx.user && !ctx.user.isDemo) return [];
    const rows = await ctx.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.isDemo, true), eq(users.disabled, false)));
    return rows;
  }),

  /** Switch to another demo user — no password required; works for demo sessions and unauthenticated visitors. */
  demoSwitch: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user && !ctx.user.isDemo) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Demo switch is only available on demo accounts" });
      }
      const rows = await ctx.db
        .select()
        .from(users)
        .where(and(emailMatches(users.email, input.email), eq(users.isDemo, true), eq(users.disabled, false)))
        .limit(1);
      const u = rows[0];
      if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "Demo user not found" });
      // Revoke existing session then create a new one for the target user.
      await revokeSessionByToken(ctx.db, ctx.sessionToken);
      const token = await createSession(u.id);
      ctx.setCookie(SESSION_COOKIE, token);
      return { id: u.id, email: u.email, role: u.role, fullName: u.fullName };
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
