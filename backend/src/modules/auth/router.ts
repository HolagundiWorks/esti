import { DeviceLoginInput, DeviceRefreshInput } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createDeviceSession, refreshDeviceAccessToken } from "../../auth/device.js";
import {
  SESSION_COOKIE,
  createSession,
  hashPassword,
  revokeSessionByToken,
  verifyPassword,
} from "../../auth/session.js";
import { users } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { clearRateLimit, enforceRateLimit } from "../../lib/ratelimit.js";
import { publicProcedure, router } from "../../trpc/trpc.js";

const Credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

const RegisterInput = Credentials.extend({
  fullName: z.string().min(2).max(200),
  role: z.enum(["OWNER", "CONSULTANT", "CLIENT"]).optional(),
});

export const authRouter = router({
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
        .values({ email: input.email, fullName: input.fullName, role, passwordHash })
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

  login: publicProcedure.input(Credentials).mutation(async ({ ctx, input }) => {
    // Throttle brute-force: cap attempts per IP and per targeted email.
    await enforceRateLimit("login-ip", ctx.ip, 10, 60);
    await enforceRateLimit("login-email", input.email.toLowerCase(), 10, 300);

    const rows = await ctx.db.select().from(users).where(eq(users.email, input.email)).limit(1);
    const u = rows[0];
    if (!u || !u.passwordHash || !(await verifyPassword(u.passwordHash, input.password))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }
    if (u.disabled) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This account has been disabled" });
    }
    const token = await createSession(u.id);
    ctx.setCookie(SESSION_COOKIE, token);
    // Successful login clears the per-email counter so it can't lock out a
    // legitimate user who just fat-fingered the password a few times.
    await clearRateLimit("login-email", input.email.toLowerCase());
    await writeAudit(ctx.db, {
      entity: "user",
      entityId: u.id,
      action: "LOGIN",
      actorId: u.id,
    });
    return { id: u.id, email: u.email, role: u.role, fullName: u.fullName };
  }),

  /** ESTICAD companion — email/password → bearer token pair (no browser cookie). */
  loginDevice: publicProcedure.input(DeviceLoginInput).mutation(async ({ ctx, input }) => {
    await enforceRateLimit("device-login-ip", ctx.ip, 10, 60);
    await enforceRateLimit("device-login-email", input.email.toLowerCase(), 10, 300);

    const rows = await ctx.db.select().from(users).where(eq(users.email, input.email)).limit(1);
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
