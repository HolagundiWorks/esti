import { BylawCalcInput, computeBylawEnvelope } from "@esti/contracts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { bylawCalcs } from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const bylawCalcRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(bylawCalcs)
        .where(eq(bylawCalcs.projectId, input.projectId));
      return row ?? null;
    }),

  /** Compute the envelope server-side (authoritative) and upsert per project. */
  save: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), input: BylawCalcInput }))
    .mutation(async ({ ctx, input }) => {
      const result = computeBylawEnvelope(input.input);
      const [existing] = await ctx.db
        .select({ id: bylawCalcs.id })
        .from(bylawCalcs)
        .where(eq(bylawCalcs.projectId, input.projectId));
      if (existing) {
        const [row] = await ctx.db
          .update(bylawCalcs)
          .set({ input: input.input, result })
          .where(eq(bylawCalcs.id, existing.id))
          .returning();
        return row!;
      }
      const [row] = await ctx.db
        .insert(bylawCalcs)
        .values({ projectId: input.projectId, input: input.input, result })
        .returning();
      return row!;
    }),
});
