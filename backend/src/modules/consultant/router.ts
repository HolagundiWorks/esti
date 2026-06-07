import { ConsultantCreate } from "@esti/contracts";
import { asc } from "drizzle-orm";
import { consultants } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const consultantRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(consultants).orderBy(asc(consultants.name));
  }),

  create: protectedProcedure.input(ConsultantCreate).mutation(async ({ ctx, input }) => {
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
});
