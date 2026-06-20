import { DsrItemCreate, DsrVersionCreate } from "@esti/contracts";
import { DsrImportCsv } from "@hcw/master-dsr-kit/schemas";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { dsrItems, dsrVersions } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import {
  assertDsrVersionWritable,
  dsrItemsToCsv,
  getDsrVersionOrThrow,
  resolveDsrItemsForVersion,
} from "../../lib/dsrCatalog.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { applyDsrImport, copyDsrItems } from "./dsrImport.js";

export async function assertPublishedDsrVersion(
  db: Parameters<typeof copyDsrItems>[0],
  versionId: string,
): Promise<void> {
  const [version] = await db.select().from(dsrVersions).where(eq(dsrVersions.id, versionId));
  if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "DSR version not found" });
  if (version.status === "DRAFT") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Draft DSR versions cannot be used on estimates until published",
    });
  }
}

export const dsrRouter = router({
  listVersions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(dsrVersions).orderBy(desc(dsrVersions.label));
  }),

  createVersion: protectedProcedure.input(DsrVersionCreate).mutation(async ({ ctx, input }) => {
    if (input.copyFromVersionId) {
      const source = await getDsrVersionOrThrow(ctx.db, input.copyFromVersionId);
      if (source.origin === "HCW_OFFICIAL") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Copy official HCW seed into a new custom version via CSV export from a custom copy instead",
        });
      }
    }

    const [row] = await ctx.db
      .insert(dsrVersions)
      .values({
        label: input.label,
        description: input.description ?? null,
        status: input.status,
        active: false,
        origin: "CUSTOM",
        readOnly: false,
      })
      .returning();

    let copied = 0;
    if (input.copyFromVersionId) {
      copied = await copyDsrItems(ctx.db, input.copyFromVersionId, row!.id);
    }
    let imported = 0;
    if (input.importRows?.length) {
      imported = await applyDsrImport(ctx.db, row!.id, input.importRows, false);
    }

    await writeAudit(ctx.db, {
      entity: "dsrversion",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { ...row, copied, imported },
    });
    return row!;
  }),

  publishVersion: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const before = await getDsrVersionOrThrow(ctx.db, input.id);
      if (before.status === "PUBLISHED") return before;
      const [row] = await ctx.db
        .update(dsrVersions)
        .set({ status: "PUBLISHED" })
        .where(eq(dsrVersions.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "dsrversion",
        entityId: input.id,
        action: "PUBLISH",
        actorId: ctx.user.id,
        before: { status: before.status },
        after: { status: row!.status },
      });
      return row!;
    }),

  importCsv: protectedProcedure.input(DsrImportCsv).mutation(async ({ ctx, input }) => {
    const version = await getDsrVersionOrThrow(ctx.db, input.versionId);
    assertDsrVersionWritable(version);
    const count = await applyDsrImport(ctx.db, input.versionId, input.rows, input.replace);
    await writeAudit(ctx.db, {
      entity: "dsrversion",
      entityId: input.versionId,
      action: "IMPORT",
      actorId: ctx.user.id,
      after: { rows: count, replace: input.replace },
    });
    return { imported: count };
  }),

  exportCsv: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const version = await getDsrVersionOrThrow(ctx.db, input.versionId);
      if (version.origin === "HCW_OFFICIAL") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Official HCW seed cannot be exported. Create a custom version to export editable data.",
        });
      }
      const items = await resolveDsrItemsForVersion(ctx.db, version);
      return {
        filename: `${version.label.replace(/[^\w.-]+/g, "_")}.csv`,
        csv: dsrItemsToCsv(items),
        rowCount: items.length,
      };
    }),

  setActiveVersion: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const before = await getDsrVersionOrThrow(ctx.db, input.id);
      if (before.status === "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Publish the DSR version before setting it active",
        });
      }
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
      const version = await getDsrVersionOrThrow(ctx.db, input.versionId);
      return resolveDsrItemsForVersion(ctx.db, version);
    }),

  createItem: protectedProcedure.input(DsrItemCreate).mutation(async ({ ctx, input }) => {
    const version = await getDsrVersionOrThrow(ctx.db, input.versionId);
    assertDsrVersionWritable(version);
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
      const version = await getDsrVersionOrThrow(ctx.db, before.versionId);
      assertDsrVersionWritable(version);
      await ctx.db.delete(dsrItems).where(eq(dsrItems.id, input.id));
      await writeAudit(ctx.db, { entity: "dsritem", entityId: input.id, action: "DELETE", actorId: ctx.user.id, before });
      return { ok: true };
    }),
});
