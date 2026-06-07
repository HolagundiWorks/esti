import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { reconciliations } from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const reconcileRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(reconciliations).orderBy(desc(reconciliations.createdAt));
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(reconciliations)
        .where(eq(reconciliations.id, input.id));
      return row ?? null;
    }),
});
