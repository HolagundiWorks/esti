import { PoStatus, PurchaseOrderCreate, poLineAmountPaise } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { poItems, purchaseOrders } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
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
      const items = await ctx.db
        .select()
        .from(poItems)
        .where(eq(poItems.poId, input.id))
        .orderBy(asc(poItems.sortOrder));
      return { ...po, items };
    }),

  create: protectedProcedure.input(PurchaseOrderCreate).mutation(async ({ ctx, input }) => {
    const lines = input.items.map((it, i) => ({
      ...it,
      amountPaise: poLineAmountPaise(it.qty, it.ratePaise),
      sortOrder: (i + 1) * 10,
    }));
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
      return { ok: true };
    }),
});
