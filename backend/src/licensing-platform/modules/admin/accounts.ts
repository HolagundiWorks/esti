import { TRPCError } from "@trpc/server";
import { desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { AccountSignupProfile } from "@esti/contracts";
import { hashPassword } from "../../../auth/session.js";
import {
  deleteAccount,
  setAccountStatus,
} from "../auth/service.js";
import { db, schema } from "../../db/client.js";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";

/**
 * Manual account administration — search, password reset, suspend/reactivate,
 * and soft-delete from the licence manager console.
 */
export const accountsRouter = router({
  list: platformAdminProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const q = input?.search?.trim();
      const where = q
        ? or(
            sql`lower(${schema.accounts.email}) like ${`%${q.toLowerCase()}%`}`,
            eq(schema.accounts.publicId, q.toUpperCase()),
            sql`${schema.accounts.profile}->>'firmName' ilike ${`%${q}%`}`,
            sql`${schema.accounts.profile}->>'mobile' ilike ${`%${q}%`}`,
          )
        : undefined;
      return db
        .select({
          id: schema.accounts.id,
          publicId: schema.accounts.publicId,
          email: schema.accounts.email,
          name: schema.accounts.name,
          status: schema.accounts.status,
          profile: schema.accounts.profile,
          isPlatformAdmin: schema.accounts.isPlatformAdmin,
          createdAt: schema.accounts.createdAt,
          suspendedAt: schema.accounts.suspendedAt,
        })
        .from(schema.accounts)
        .where(where)
        .orderBy(desc(schema.accounts.createdAt))
        .limit(200);
    }),

  resetPassword: platformAdminProcedure
    .input(z.object({ email: z.string().email(), newPassword: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const [account] = await db
        .select({ id: schema.accounts.id, status: schema.accounts.status })
        .from(schema.accounts)
        .where(eq(schema.accounts.email, email))
        .limit(1);
      if (!account || account.status === "DELETED") {
        throw new TRPCError({ code: "NOT_FOUND", message: "No account with that email" });
      }
      const passwordHash = await hashPassword(input.newPassword);
      await db
        .update(schema.accounts)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(schema.accounts.id, account.id));
      return { ok: true };
    }),

  setStatus: platformAdminProcedure
    .input(
      z.object({
        accountId: z.string(),
        status: z.enum(["ACTIVE", "SUSPENDED"]),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await setAccountStatus(input.accountId, input.status);
        return { ok: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "failed";
        if (msg === "not_found") throw new TRPCError({ code: "NOT_FOUND" });
        if (msg === "cannot_suspend_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot suspend a platform admin account" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  remove: platformAdminProcedure
    .input(
      z.object({
        accountId: z.string(),
        confirmEmail: z.string().email(),
      }),
    )
    .mutation(async ({ input }) => {
      const [row] = await db
        .select({ id: schema.accounts.id, email: schema.accounts.email })
        .from(schema.accounts)
        .where(eq(schema.accounts.id, input.accountId))
        .limit(1);
      if (!row || row.email.toLowerCase() !== input.confirmEmail.trim().toLowerCase()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email confirmation does not match" });
      }
      try {
        await deleteAccount(input.accountId);
        return { ok: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "failed";
        if (msg === "cannot_delete_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete a platform admin account" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  updateProfile: platformAdminProcedure
    .input(z.object({ accountId: z.string(), profile: AccountSignupProfile }))
    .mutation(async ({ input }) => {
      const parsed = AccountSignupProfile.parse(input.profile);
      const [row] = await db
        .select({ id: schema.accounts.id })
        .from(schema.accounts)
        .where(eq(schema.accounts.id, input.accountId))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(schema.accounts)
        .set({ profile: parsed, name: parsed.fullName, updatedAt: new Date() })
        .where(eq(schema.accounts.id, input.accountId));
      return { ok: true };
    }),
});
