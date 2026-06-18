import { PoStatus, PurchaseOrderCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { poItems, purchaseOrders, specItems, specSheets } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { writeActivity } from "../../lib/activity.js";
import { nextRef } from "../../lib/numbering.js";
import { poItemsWithSpec, resolvePoLines } from "../../lib/poSpecResolve.js";
import { requireDeletableStatus } from "../../lib/retention.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const poRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.projectId, input.projectId))
        .orderBy(desc(purchaseOrders.createdAt));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [po] = await ctx.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      if (!po) return null;
      const items = await poItemsWithSpec(ctx.db, input.id);
      return { ...po, items };
    }),

  /** Project specification rows available for PO line linkage. */
  listSpecLineOptions: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          specItemId: specItems.id,
          catalogItemId: specItems.catalogItemId,
          category: specItems.category,
          item: specItems.item,
          make: specItems.make,
          specification: specItems.specification,
          finish: specItems.finish,
          specRef: specSheets.ref,
          specTitle: specSheets.title,
        })
        .from(specItems)
        .innerJoin(specSheets, eq(specItems.specSheetId, specSheets.id))
        .where(eq(specSheets.projectId, input.projectId))
        .orderBy(asc(specSheets.ref), asc(specItems.sortOrder));
      return rows.map((r) => ({
        specItemId: r.specItemId,
        catalogItemId: r.catalogItemId,
        label: [r.specRef, r.item, r.make].filter(Boolean).join(" · "),
        category: r.category,
        item: r.item,
        make: r.make,
        specification: r.specification,
        finish: r.finish,
        specRef: r.specRef,
        specTitle: r.specTitle,
      }));
    }),

  create: protectedProcedure.input(PurchaseOrderCreate).mutation(async ({ ctx, input }) => {
    const lines = await resolvePoLines(ctx.db, input.projectId, input.items);
    const totalPaise = lines.reduce((s, l) => s + l.amountPaise, 0);
    const { ref } = await nextRef(ctx.db, "purchaseorder", "PO");

    const row = await ctx.db.transaction(async (tx) => {
      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          ref,
          projectId: input.projectId,
          vendor: input.vendor ?? null,
          title: input.title ?? null,
          datePo: input.datePo ?? null,
          notes: input.notes ?? null,
          totalPaise,
        })
        .returning();
      await tx.insert(poItems).values(
        lines.map((l) => ({
          poId: po!.id,
          description: l.description,
          unit: l.unit ?? null,
          qty: l.qty,
          ratePaise: l.ratePaise,
          amountPaise: l.amountPaise,
          sortOrder: l.sortOrder,
          specItemId: l.specItemId,
          catalogItemId: l.catalogItemId,
        })),
      );
      return po!;
    });
    await writeAudit(ctx.db, {
      entity: "purchaseorder",
      entityId: row.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { ref, totalPaise },
    });
    await writeActivity(ctx.db, {
      projectId: row.projectId,
      objectType: "po",
      objectId: row.id,
      eventType: "po.created",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `Purchase order ${ref} created`,
      metadata: { ref, totalPaise },
    });
    return row;
  }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: PoStatus }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      const [row] = await ctx.db
        .update(purchaseOrders)
        .set({ status: input.status })
        .where(eq(purchaseOrders.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "purchaseorder",
        entityId: input.id,
        action: "STATUS_UPDATE",
        actorId: ctx.user.id,
        before: { status: before.status },
        after: { status: row!.status },
      });
      await writeActivity(ctx.db, {
        projectId: before.projectId,
        objectType: "po",
        objectId: input.id,
        eventType: "po.status_changed",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `PO ${before.ref} → ${input.status}`,
        metadata: { from: before.status, to: input.status },
      });
      return row!;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      requireDeletableStatus(before.status, ["DRAFT", "CANCELLED"], "Purchase order");
      await ctx.db.transaction(async (tx) => {
        await tx.delete(poItems).where(eq(poItems.poId, input.id));
        await tx.delete(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      });
      await writeAudit(ctx.db, {
        entity: "purchaseorder",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before,
      });
      await writeActivity(ctx.db, {
        projectId: before.projectId,
        objectType: "po",
        objectId: input.id,
        eventType: "po.deleted",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `PO ${before.ref} deleted`,
      });
      return { ok: true };
    }),
});
