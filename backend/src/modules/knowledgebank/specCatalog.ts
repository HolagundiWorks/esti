import { SpecCatalogItemCreate, SpecCatalogVersionCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { specCatalogItems, specCatalogVersions } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const specCatalogRouter = router({
  listVersions: protectedProcedure.query(async ({ ctx }) =>
    ctx.db
      .select()
      .from(specCatalogVersions)
      .orderBy(desc(specCatalogVersions.label)),
  ),

  createVersion: protectedProcedure
    .input(SpecCatalogVersionCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(specCatalogVersions)
        .values({
          label: input.label,
          description: input.description ?? null,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "spec_catalog_version",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),

  setActiveVersion: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select()
        .from(specCatalogVersions)
        .where(eq(specCatalogVersions.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.update(specCatalogVersions).set({ active: false });
      const [row] = await ctx.db
        .update(specCatalogVersions)
        .set({ active: true })
        .where(eq(specCatalogVersions.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "spec_catalog_version",
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
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(specCatalogItems)
        .where(eq(specCatalogItems.versionId, input.versionId))
        .orderBy(asc(specCatalogItems.sortOrder), asc(specCatalogItems.item)),
    ),

  createItem: protectedProcedure
    .input(SpecCatalogItemCreate)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ sortOrder: specCatalogItems.sortOrder })
        .from(specCatalogItems)
        .where(eq(specCatalogItems.versionId, input.versionId))
        .orderBy(desc(specCatalogItems.sortOrder))
        .limit(1);
      const sortOrder = (existing[0]?.sortOrder ?? 0) + 10;
      const [row] = await ctx.db
        .insert(specCatalogItems)
        .values({
          versionId: input.versionId,
          category: input.category ?? null,
          item: input.item,
          make: input.make ?? null,
          specification: input.specification ?? null,
          finish: input.finish ?? null,
          remarks: input.remarks ?? null,
          sortOrder,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "spec_catalog_item",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),

  removeItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select()
        .from(specCatalogItems)
        .where(eq(specCatalogItems.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(specCatalogItems).where(eq(specCatalogItems.id, input.id));
      await writeAudit(ctx.db, {
        entity: "spec_catalog_item",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before,
      });
      return { ok: true };
    }),

  /** Active catalogue version and rows for project spec sheet pickers. */
  activeCatalog: protectedProcedure.query(async ({ ctx }) => {
    const [version] = await ctx.db
      .select()
      .from(specCatalogVersions)
      .where(eq(specCatalogVersions.active, true))
      .limit(1);
    if (!version) return { version: null, items: [] as typeof specCatalogItems.$inferSelect[] };
    const items = await ctx.db
      .select()
      .from(specCatalogItems)
      .where(eq(specCatalogItems.versionId, version.id))
      .orderBy(asc(specCatalogItems.sortOrder), asc(specCatalogItems.item));
    return { version, items };
  }),
});
