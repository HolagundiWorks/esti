import { ClientCreate, ListParams } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "../../auth/session.js";
import { clients, users } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

export const clientRouter = router({
  list: protectedProcedure.input(ListParams).query(async ({ ctx, input }) => {
    const where = input.search ? ilike(clients.name, `%${input.search}%`) : undefined;
    return ctx.db
      .select()
      .from(clients)
      .where(where)
      .orderBy(desc(clients.createdAt))
      .limit(input.limit)
      .offset(input.offset);
  }),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const rows = await ctx.db.select().from(clients).where(eq(clients.id, input.id)).limit(1);
    return rows[0] ?? null;
  }),

  create: protectedProcedure.input(ClientCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(clients)
      .values({
        name: input.name,
        kind: input.kind,
        gstin: input.gstin ?? null,
        pan: input.pan ?? null,
        state: input.state ?? null,
        city: input.city ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "client",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  /** Owner provisions a read-only portal login for a client. */
  createPortalUser: ownerProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        email: z.string().email(),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [client] = await ctx.db.select().from(clients).where(eq(clients.id, input.clientId));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "client not found" });

      const [taken] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email));
      if (taken) throw new TRPCError({ code: "CONFLICT", message: "email already in use" });

      const [u] = await ctx.db
        .insert(users)
        .values({
          email: input.email,
          fullName: client.name,
          role: "CLIENT",
          clientId: input.clientId,
          passwordHash: await hashPassword(input.password),
        })
        .returning({ id: users.id, email: users.email });
      await writeAudit(ctx.db, {
        entity: "user",
        entityId: u!.id,
        action: "CREATE_PORTAL",
        actorId: ctx.user.id,
        after: { email: input.email, clientId: input.clientId },
      });
      return u!;
    }),
});
