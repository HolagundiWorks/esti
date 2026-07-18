import {
  CreateItemLibraryVersionInput,
  UpsertItemLibraryItemInput,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { itemLibraryItems, itemLibraryVersions } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const itemLibraryRouter = router({
  listVersions: protectedProcedure.query(async ({ ctx }) =>
    ctx.db
      .select()
      .from(itemLibraryVersions)
      .orderBy(desc(itemLibraryVersions.label)),
  ),

  createVersion: protectedProcedure
    .input(CreateItemLibraryVersionInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(itemLibraryVersions)
        .values({ label: input.label })
        .returning();
      await writeAudit(ctx.db, {
        entity: "item_library_version",
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
        .from(itemLibraryVersions)
        .where(eq(itemLibraryVersions.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.update(itemLibraryVersions).set({ active: false });
      const [row] = await ctx.db
        .update(itemLibraryVersions)
        .set({ active: true, publishedAt: new Date() })
        .where(eq(itemLibraryVersions.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "item_library_version",
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
        .from(itemLibraryItems)
        .where(eq(itemLibraryItems.versionId, input.versionId))
        .orderBy(asc(itemLibraryItems.sortOrder), asc(itemLibraryItems.code)),
    ),

  upsertItem: protectedProcedure
    .input(UpsertItemLibraryItemInput)
    .mutation(async ({ ctx, input }) => {
      const values = {
        versionId: input.versionId,
        code: input.code,
        chapter: input.chapter,
        particulars: input.particulars,
        uom: input.uom,
        measureKind: input.measureKind,
        markerKinds: input.markerKinds ?? [],
        defaultBreadthMm: input.defaultBreadthMm ?? null,
        defaultHeightFrom: input.defaultHeightFrom ?? "MANUAL",
        specCatalogItemId: input.specCatalogItemId ?? null,
        sortOrder: input.sortOrder ?? 0,
      };

      if (input.id) {
        const [row] = await ctx.db
          .update(itemLibraryItems)
          .set(values)
          .where(eq(itemLibraryItems.id, input.id))
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        await writeAudit(ctx.db, {
          entity: "item_library_item",
          entityId: row.id,
          action: "UPDATE",
          actorId: ctx.user.id,
          after: row,
        });
        return row;
      }

      const existing = await ctx.db
        .select({ sortOrder: itemLibraryItems.sortOrder })
        .from(itemLibraryItems)
        .where(eq(itemLibraryItems.versionId, input.versionId))
        .orderBy(desc(itemLibraryItems.sortOrder))
        .limit(1);
      const sortOrder = input.sortOrder ?? (existing[0]?.sortOrder ?? 0) + 10;

      const [row] = await ctx.db
        .insert(itemLibraryItems)
        .values({ ...values, sortOrder })
        .returning();
      await writeAudit(ctx.db, {
        entity: "item_library_item",
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
        .from(itemLibraryItems)
        .where(eq(itemLibraryItems.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(itemLibraryItems).where(eq(itemLibraryItems.id, input.id));
      await writeAudit(ctx.db, {
        entity: "item_library_item",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before,
      });
      return { ok: true };
    }),

  activeCatalog: protectedProcedure.query(async ({ ctx }) => {
    const [version] = await ctx.db
      .select()
      .from(itemLibraryVersions)
      .where(eq(itemLibraryVersions.active, true))
      .limit(1);
    if (!version)
      return { version: null, items: [] as (typeof itemLibraryItems.$inferSelect)[] };
    const items = await ctx.db
      .select()
      .from(itemLibraryItems)
      .where(eq(itemLibraryItems.versionId, version.id))
      .orderBy(asc(itemLibraryItems.sortOrder), asc(itemLibraryItems.code));
    return { version, items };
  }),
});
