import { TRPCError } from "@trpc/server";
import { desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "../../../auth/session.js";
import { db, schema } from "../../db/client.js";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";

/**
 * Manual account administration — for support cases where a customer (or a
 * firm's owner) is locked out and an admin resets their platform password by
 * hand, then communicates it to them outside the app (phone/email/chat).
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
          )
        : undefined;
      return db
        .select({
          id: schema.accounts.id,
          publicId: schema.accounts.publicId,
          email: schema.accounts.email,
          name: schema.accounts.name,
          isPlatformAdmin: schema.accounts.isPlatformAdmin,
          createdAt: schema.accounts.createdAt,
        })
        .from(schema.accounts)
        .where(where)
        .orderBy(desc(schema.accounts.createdAt))
        .limit(200);
    }),

  /** Manually set a new password for an account (support / lockout recovery). */
  resetPassword: platformAdminProcedure
    .input(z.object({ email: z.string().email(), newPassword: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const [account] = await db
        .select({ id: schema.accounts.id })
        .from(schema.accounts)
        .where(eq(schema.accounts.email, email))
        .limit(1);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "No account with that email" });
      const passwordHash = await hashPassword(input.newPassword);
      await db
        .update(schema.accounts)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(schema.accounts.id, account.id));
      return { ok: true };
    }),
});
