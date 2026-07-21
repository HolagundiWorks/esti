import { WorkspaceProfileCompletion } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import {
  SESSION_COOKIE,
  createSession,
  hashPassword,
  revokeSessionByToken,
  revokeAllSessionsForUser,
  verifyPassword,
} from "../../auth/session.js";
import { firm, orgSettings, users } from "../../db/schema.js";
import { env } from "../../env.js";
import { writeAudit } from "../../lib/audit.js";
import { emailMatches, normalizeEmail } from "../../lib/email.js";
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
import {
  revokeDemoAdminSession,
  unlockDemoAdminSession,
  verifyDemoMasterPassword,
} from "../../lib/demoAdmin.js";
import { runDemoSeedForce } from "../../lib/demoReset.js";
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
    if (env.NODE_ENV === "production") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Bootstrap is disabled in production — use the install seed.",
      });
    }
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
    return owner;
  }),

  /**
   * Bootstrap the first user as OWNER; afterwards only an OWNER may create
   * users (single-firm — see ARCHITECTURE ADR-03/ADR-04).
   */
  register: publicProcedure.input(RegisterInput).mutation(async ({ ctx, input }) => {
    // Public procedure that can mint the first OWNER on an empty install, so it
    // needs the same throttle as bootstrap rather than being the unthrottled
    // way around it.
    await enforceRateLimit("register-ip", ctx.ip, 5, 300);
    if (ctx.user?.isDemo) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Managing users and credentials is disabled on the demo account.",
      });
    }
    if (env.NODE_ENV === "production") {
      const rows = await ctx.db.select({ n: count() }).from(users);
      if (Number(rows[0]?.n ?? 0) === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Self-registration is disabled in production — use the install seed.",
        });
      }
    }
    return ctx.db.transaction(async (tx) => {
      // Same lock id as `bootstrap` on purpose: both decide "is this install
      // empty, and may I create the first OWNER?". Two different ids let a
      // concurrent bootstrap+register each see an empty install and each insert
      // an owner, with the email unique constraint powerless to stop it.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(8347292)`);
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
      await enforceRateLimit("resolve-email-addr", normalizeEmail(input.email), 30, 300);
      const [f] = await ctx.db.select({ companyName: firm.companyName }).from(firm).limit(1);
      const firmName = f?.companyName ?? "Workspace";
      const rows = await ctx.db.select({ n: count() }).from(users);
      const hasUsers = Number(rows[0]?.n ?? 0) > 0;
      // Never reveal whether the email is registered — offer the local workspace
      // whenever this install is set up (single-tenant).
      return {
        workspaces: hasUsers ? [{ id: "local", name: firmName }] : [],
      };
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

    await revokeAllSessionsForUser(ctx.db, u.id);
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
    return profile;
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
    return profile;
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
      await revokeAllSessionsForUser(ctx.db, u.id);
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: u.id,
        action: "RESET_PASSWORD_SELF",
        actorId: u.id,
      });
      return { ok: true };
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const { getOrgSettings } = await import("../../lib/settings.js");
    const { DEFAULT_STORAGE_BYTES } = await import("@esti/contracts");
    const { greetingGivenNameForEmail } = await import("../../lib/accountGreeting.js");
    const settings = await getOrgSettings(ctx.db);
    const greetingGivenName = await greetingGivenNameForEmail(ctx.user.email, ctx.user.fullName);
    return {
      ...ctx.user,
      greetingGivenName,
      /** 2026-07: ACTIVE | SUSPENDED — replaces plan tier logic. */
      licenceStatus: settings.licenceStatus,
      /** Effective storage quota in bytes (5 GiB base + purchased add-ons). */
      storageQuotaBytes: DEFAULT_STORAGE_BYTES + Math.max(0, settings.storagePurchasedBytes),
      storageUsedBytes: settings.storageBytesUsed,
    };
  }),

  /**
   * `recoverWithBackupCode` removed 2026-07-20. It was Community edition's
   * offline recovery, and its only issuer was the first-run seed deleted with
   * that edition — so no account has ever held a code since, every call could
   * only fail, and the /recover page advertised a route that could not work.
   * Password recovery is `requestPasswordReset` / `resetPassword` over email.
   *
   * The all-NULL `esti_user.backup_code_hash` column is left in place; dropping
   * it belongs in a deliberate cleanup migration.
   */

  /** Wipe and re-seed the demo workspace. Only callable while logged in as a demo user. */
  resetDemo: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user?.isDemo) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only available on demo accounts" });
    }
    await runDemoSeedForce();
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

  /** Unlock demo admin mutations for this session (DEMO_MASTER_PASSWORD). */
  unlockDemoAdmin: publicProcedure
    .input(z.object({ password: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.isDemo) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Demo accounts only" });
      }
      if (!verifyDemoMasterPassword(input.password)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid demo master password" });
      }
      unlockDemoAdminSession(ctx.sessionToken);
      return { ok: true as const };
    }),

  /**
   * One-time post-upgrade gate — existing users confirm critical firm and profile
   * details before accessing the workspace.
   */
  completeWorkspaceProfile: publicProcedure
    .input(WorkspaceProfileCompletion)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      if (!ctx.user.mustCompleteWorkspaceProfile) return { ok: true as const };

      const isOwner = ctx.user.role === "OWNER" || ctx.user.role === "PARTNER";
      if (isOwner) {
        if (
          !input.companyName ||
          !input.coaRegNo ||
          !input.phone1 ||
          !input.email ||
          !input.city ||
          !input.state
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Owners must confirm company name, COA no., phone, email, city, and state.",
          });
        }
        const [current] = await ctx.db.select({ id: firm.id }).from(firm).limit(1);
        if (current) {
          await ctx.db
            .update(firm)
            .set({
              companyName: input.companyName,
              coaRegNo: input.coaRegNo,
              architectName: input.fullName,
              phone1: input.phone1,
              phone1Type: "MOBILE",
              email: input.email,
              city: input.city,
              state: input.state,
              gstType: input.gstType ?? "REGULAR",
              gstin: input.gstin?.trim() || null,
            })
            .where(eq(firm.id, current.id));
        }
      }

      await ctx.db
        .update(users)
        .set({
          fullName: input.fullName,
          designation: input.designation,
          mustCompleteWorkspaceProfile: false,
        })
        .where(eq(users.id, ctx.user.id));

      await writeAudit(ctx.db, {
        entity: "user",
        entityId: ctx.user.id,
        action: "WORKSPACE_PROFILE_COMPLETED",
        actorId: ctx.user.id,
      });
      return { ok: true as const };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    revokeDemoAdminSession(ctx.sessionToken);
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
