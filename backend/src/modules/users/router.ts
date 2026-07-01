import {
  ASSIGNABLE_STAFF_ROLES,
  GENERAL_STAFF_ROLES,
  OfficeListParams,
  type PlanQuota,
  type StaffRole,
  clampListLimit,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../../auth/session.js";
import { users } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { emailMatches, normalizeEmail } from "../../lib/email.js";
import { generateTotpSecret, otpauthUri, verifyTotp } from "../../lib/totp.js";
import { assertQuota } from "../../lib/plan.js";
import { presignedGet } from "../../lib/storage.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const publicUser = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  role: users.role,
  disabled: users.disabled,
  clientId: users.clientId,
  consultantId: users.consultantId,
  contractorId: users.contractorId,
  userCode: users.userCode,
  designation: users.designation,
  photoKey: users.photoKey,
  accountPublicId: users.accountPublicId,
};

export const userRouter = router({
  /** All logins (owner) — staff and portal users. */
  list: ownerProcedure.input(OfficeListParams.optional()).query(async ({ ctx, input }) => {
    return ctx.db
      .select(publicUser)
      .from(users)
      .orderBy(asc(users.email))
      .limit(clampListLimit(input?.limit));
  }),

  /** Owner creates an internal staff login at a seniority tier (not OWNER). */
  createStaff: ownerProcedure
    .input(
      z.object({
        email: z.string().email(),
        fullName: z.string().min(2).max(200),
        password: z.string().min(8).max(200),
        role: z.enum(ASSIGNABLE_STAFF_ROLES).default("ASSOCIATE"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = normalizeEmail(input.email);
      const [taken] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(emailMatches(users.email, email));
      if (taken) throw new TRPCError({ code: "CONFLICT", message: "email already in use" });
      // Every edition — including Lite — creates its own staff logins directly,
      // capped per functional seat bucket. The single OWNER (admin) is pinned
      // separately, ACCOUNTANT and HR_MANAGER each get their own seat, and the
      // seniority tiers share the general "staff" bucket. Portal users (CLIENT,
      // CONSULTANT-portal, CONTRACTOR) never take a staff seat. Only *active*
      // logins consume a seat — a disabled account frees its seat back up.
      const seat: { quota: PlanQuota; roles: StaffRole[] } =
        input.role === "ACCOUNTANT"
          ? { quota: "accountants", roles: ["ACCOUNTANT"] }
          : input.role === "HR_MANAGER"
            ? { quota: "hrManagers", roles: ["HR_MANAGER"] }
            : { quota: "staff", roles: [...GENERAL_STAFF_ROLES] };
      const seatRows = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(inArray(users.role, seat.roles), eq(users.disabled, false)));
      const seatCount = seatRows[0] ? seatRows[0].count : 0;
      await assertQuota(ctx.db, seat.quota, seatCount);
      const [u] = await ctx.db
        .insert(users)
        .values({
          email,
          fullName: input.fullName,
          role: input.role,
          passwordHash: await hashPassword(input.password),
        })
        .returning(publicUser);
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: u!.id,
        action: "CREATE_STAFF",
        actorId: ctx.user.id,
        after: { role: input.role },
      });
      return u!;
    }),

  /** Owner changes a staff member's seniority tier (cannot change own role). */
  setRole: ownerProcedure
    .input(z.object({ id: z.string().uuid(), role: z.enum(ASSIGNABLE_STAFF_ROLES) }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.user.id)
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot change your own role" });
      const [target] = await ctx.db.select().from(users).where(eq(users.id, input.id));
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.role === "OWNER")
        throw new TRPCError({ code: "BAD_REQUEST", message: "The owner role cannot be changed" });
      if (target.clientId || target.consultantId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Portal users have no staff role" });
      const [u] = await ctx.db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.id))
        .returning(publicUser);
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: input.id,
        action: "SET_ROLE",
        actorId: ctx.user.id,
        before: { role: target.role },
        after: { role: input.role },
      });
      return u ?? null;
    }),

  /** Owner enables/disables a login (cannot disable own account). */
  setDisabled: ownerProcedure
    .input(z.object({ id: z.string().uuid(), disabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.user.id)
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot disable your own account" });
      const [before] = await ctx.db.select().from(users).where(eq(users.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      const [u] = await ctx.db
        .update(users)
        .set({ disabled: input.disabled })
        .where(eq(users.id, input.id))
        .returning(publicUser);
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: input.id,
        action: input.disabled ? "DISABLE" : "ENABLE",
        actorId: ctx.user.id,
        before: { disabled: before.disabled },
        after: { disabled: u!.disabled },
      });
      return u!;
    }),

  /** Owner resets another user's password. */
  resetPassword: ownerProcedure
    .input(z.object({ id: z.string().uuid(), password: z.string().min(8).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({ passwordHash: await hashPassword(input.password) })
        .where(eq(users.id, input.id));
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: input.id,
        action: "RESET_PASSWORD",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  /** Owner links a firm login to a central person's portable AORMS-U handle (I-5). */
  linkIdentity: ownerProcedure
    .input(z.object({ id: z.string().uuid(), accountPublicId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const handle = input.accountPublicId?.trim().toUpperCase() || null;
      if (handle) {
        if (!/^AORMS-U-[0-9A-HJKMNP-TV-Z]{4,}$/.test(handle))
          throw new TRPCError({ code: "BAD_REQUEST", message: "Not a valid AORMS-U handle" });
        // The person must exist on the central identity platform (same database).
        const rows = await ctx.db.execute(
          sql`SELECT 1 FROM hlp_account WHERE public_id = ${handle} LIMIT 1`,
        );
        const found = Array.isArray(rows) ? rows.length > 0 : ((rows as { rows?: unknown[] }).rows?.length ?? 0) > 0;
        if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "No such AORMS-U identity" });
      }
      const [u] = await ctx.db
        .update(users)
        .set({ accountPublicId: handle })
        .where(eq(users.id, input.id))
        .returning(publicUser);
      if (!u) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: input.id,
        action: "LINK_IDENTITY",
        actorId: ctx.user.id,
        after: { accountPublicId: handle },
      });
      return u;
    }),

  /** Self-service: fetch own profile with a short-lived photo URL. */
  myProfile: protectedProcedure.query(async ({ ctx }) => {
    const [u] = await ctx.db
      .select({ userCode: users.userCode, designation: users.designation, photoKey: users.photoKey, fullName: users.fullName, email: users.email, role: users.role, accountPublicId: users.accountPublicId, totpSecret: users.totpSecret })
      .from(users)
      .where(eq(users.id, ctx.user.id));
    const photoUrl = u?.photoKey ? await presignedGet(u.photoKey).catch(() => null) : null;
    // Build the view explicitly so the TOTP secret never leaves the backend.
    return {
      userCode: u?.userCode ?? null,
      designation: u?.designation ?? null,
      photoKey: u?.photoKey ?? null,
      fullName: u?.fullName ?? null,
      email: u?.email ?? null,
      role: u?.role ?? null,
      accountPublicId: u?.accountPublicId ?? null,
      totpEnabled: Boolean(u?.totpSecret),
      photoUrl,
    };
  }),

  /** Self-service: begin authenticator (TOTP) enrollment — secret + otpauth URI. */
  totpSetup: protectedProcedure.mutation(async ({ ctx }) => {
    const secret = generateTotpSecret();
    return { secret, otpauthUrl: otpauthUri(secret, ctx.user.email) };
  }),

  /** Self-service: confirm + enable 2FA (the code must validate the issued secret). */
  totpEnable: protectedProcedure
    .input(z.object({ secret: z.string().min(16), code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!verifyTotp(input.secret, input.code.trim()))
        throw new TRPCError({ code: "BAD_REQUEST", message: "That code didn't match" });
      await ctx.db.update(users).set({ totpSecret: input.secret }).where(eq(users.id, ctx.user.id));
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: ctx.user.id,
        action: "TOTP_ENABLE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  /** Self-service: disable 2FA — requires a current code. */
  totpDisable: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [u] = await ctx.db
        .select({ totpSecret: users.totpSecret })
        .from(users)
        .where(eq(users.id, ctx.user.id));
      if (!u?.totpSecret) return { ok: true };
      if (!verifyTotp(u.totpSecret, input.code.trim()))
        throw new TRPCError({ code: "BAD_REQUEST", message: "That code didn't match" });
      await ctx.db.update(users).set({ totpSecret: null }).where(eq(users.id, ctx.user.id));
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: ctx.user.id,
        action: "TOTP_DISABLE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  /** Self-service: update own display name and/or designation. */
  updateProfile: protectedProcedure
    .input(z.object({ fullName: z.string().min(2).max(200), designation: z.string().max(100).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select({ fullName: users.fullName, designation: users.designation }).from(users).where(eq(users.id, ctx.user.id));
      await ctx.db.update(users).set({ fullName: input.fullName, ...(input.designation !== undefined ? { designation: input.designation } : {}) }).where(eq(users.id, ctx.user.id));
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: ctx.user.id,
        action: "PROFILE_UPDATE",
        actorId: ctx.user.id,
        before,
        after: { fullName: input.fullName, designation: input.designation },
      });
      return { ok: true };
    }),

  /** Self-service: change own password (verifies the current one). */
  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(8).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const [u] = await ctx.db.select().from(users).where(eq(users.id, ctx.user.id));
      if (!u?.passwordHash || !(await verifyPassword(u.passwordHash, input.currentPassword))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect" });
      }
      await ctx.db
        .update(users)
        .set({ passwordHash: await hashPassword(input.newPassword) })
        .where(eq(users.id, ctx.user.id));
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: ctx.user.id,
        action: "CHANGE_PASSWORD",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),
});
