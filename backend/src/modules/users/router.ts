import { ASSIGNABLE_STAFF_ROLES, OfficeListParams, clampListLimit } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../../auth/session.js";
import { users } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const publicUser = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  role: users.role,
  disabled: users.disabled,
  clientId: users.clientId,
  consultantId: users.consultantId,
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
      const [taken] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email));
      if (taken) throw new TRPCError({ code: "CONFLICT", message: "email already in use" });
      const [u] = await ctx.db
        .insert(users)
        .values({
          email: input.email,
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

  /** Self-service: update own display name. */
  updateProfile: protectedProcedure
    .input(z.object({ fullName: z.string().min(2).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select({ fullName: users.fullName }).from(users).where(eq(users.id, ctx.user.id));
      await ctx.db.update(users).set({ fullName: input.fullName }).where(eq(users.id, ctx.user.id));
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: ctx.user.id,
        action: "PROFILE_UPDATE",
        actorId: ctx.user.id,
        before,
        after: { fullName: input.fullName },
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
