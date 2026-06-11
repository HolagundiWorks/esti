import { DsrItemCreate, DsrVersionCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { dsrItems, dsrVersions } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
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
    await writeAudit(ctx.db, { entity: "dsrversion", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  setActiveVersion: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(dsrVersions).where(eq(dsrVersions.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.update(dsrVersions).set({ active: false });
      const [row] = await ctx.db
        .update(dsrVersions)
        .set({ active: true })
        .where(eq(dsrVersions.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "dsrversion",
        entityId: input.id,
        action: "ACTIVATE",
        actorId: ctx.user.id,
        before: { active: before.active },
        after: { active: row!.active },
      });
      return row!;
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
    await writeAudit(ctx.db, { entity: "dsritem", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  removeItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(dsrItems).where(eq(dsrItems.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(dsrItems).where(eq(dsrItems.id, input.id));
      await writeAudit(ctx.db, { entity: "dsritem", entityId: input.id, action: "DELETE", actorId: ctx.user.id, before });
      return { ok: true };
    }),
});
