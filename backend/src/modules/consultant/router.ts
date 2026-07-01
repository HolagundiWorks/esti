import { ConsultantCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "../../auth/session.js";
import { consultants, users } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { emailMatches, normalizeEmail } from "../../lib/email.js";
import { assertNotFixedPlan, assertQuota } from "../../lib/plan.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

export const consultantRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(consultants).orderBy(asc(consultants.name));
  }),

  create: protectedProcedure.input(ConsultantCreate).mutation(async ({ ctx, input }) => {
    await assertNotFixedPlan(ctx.db);
    const rows = await ctx.db.select({ count: sql<number>`count(*)::int` }).from(consultants);
    const currentCount = rows[0] ? rows[0].count : 0;
    await assertQuota(ctx.db, "consultants", currentCount);
    const [row] = await ctx.db
      .insert(consultants)
      .values({
        name: input.name,
        discipline: input.discipline,
        firm: input.firm ?? null,
        email: input.email || null,
        phone: input.phone ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "consultant",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  /** Owner provisions a project-scoped collaborator login for a consultant. */
  createLogin: ownerProcedure
    .input(
      z.object({
        consultantId: z.string().uuid(),
        email: z.string().email(),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [consultant] = await ctx.db
        .select()
        .from(consultants)
        .where(eq(consultants.id, input.consultantId));
      if (!consultant) throw new TRPCError({ code: "NOT_FOUND", message: "consultant not found" });

      const email = normalizeEmail(input.email);
      const [taken] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(emailMatches(users.email, email));
      if (taken) throw new TRPCError({ code: "CONFLICT", message: "email already in use" });

      const [u] = await ctx.db
        .insert(users)
        .values({
          email,
          fullName: consultant.name,
          role: "CONSULTANT",
          consultantId: input.consultantId,
          passwordHash: await hashPassword(input.password),
        })
        .returning({ id: users.id, email: users.email });
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: u!.id,
        action: "CREATE_COLLAB",
        actorId: ctx.user.id,
        after: { email, consultantId: input.consultantId },
      });
      return u!;
    }),
});
