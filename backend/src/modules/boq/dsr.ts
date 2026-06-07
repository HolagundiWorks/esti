import { DsrItemCreate, DsrVersionCreate } from "@esti/contracts";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { dsrItems, dsrVersions } from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const dsrRouter = router({
  listVersions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(dsrVersions).orderBy(desc(dsrVersions.label));
  }),

  createVersion: protectedProcedure.input(DsrVersionCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(dsrVersions)
      .values({ label: input.label, description: input.description ?? null })
      .returning();
    return row!;
  }),

  setActiveVersion: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(dsrVersions).set({ active: false });
      const [row] = await ctx.db
        .update(dsrVersions)
        .set({ active: true })
        .where(eq(dsrVersions.id, input.id))
        .returning();
      return row ?? null;
    }),

  listItems: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(dsrItems)
        .where(eq(dsrItems.versionId, input.versionId))
        .orderBy(asc(dsrItems.code));
    }),

  createItem: protectedProcedure.input(DsrItemCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(dsrItems)
      .values({
        versionId: input.versionId,
        code: input.code,
        description: input.description,
        unit: input.unit,
        ratePaise: input.ratePaise,
      })
      .returning();
    return row!;
  }),

  removeItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(dsrItems).where(eq(dsrItems.id, input.id));
      return { ok: true };
    }),
});
