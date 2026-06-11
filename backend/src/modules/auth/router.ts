import { TRPCError } from "@trpc/server";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import {
  SESSION_COOKIE,
  createSession,
  hashPassword,
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
    const rows = await ctx.db.select({ n: count() }).from(users);
    const isFirst = Number(rows[0]?.n ?? 0) === 0;
    if (!isFirst && ctx.user?.role !== "OWNER") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can add users" });
    }
    const role = isFirst ? "OWNER" : (input.role ?? "CONSULTANT");
    const passwordHash = await hashPassword(input.password);
    const [u] = await ctx.db
      .insert(users)
      .values({ email: input.email, fullName: input.fullName, role, passwordHash })
      .returning({ id: users.id, email: users.email, role: users.role, fullName: users.fullName });
    await writeAudit(ctx.db, {
      entity: "user",
      entityId: u!.id,
      action: isFirst ? "REGISTER_OWNER" : "REGISTER_USER",
      actorId: ctx.user?.id ?? u!.id,
      after: { email: u!.email, role: u!.role },
    });
    return u!;
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

  me: publicProcedure.query(({ ctx }) => ctx.user),

  logout: publicProcedure.mutation(async ({ ctx }) => {
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
