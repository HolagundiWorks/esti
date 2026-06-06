import { ClientCreate, ListParams } from "@esti/contracts";
import { desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { clients } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

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
});
