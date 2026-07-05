import {
  KbIdInput,
  KbItemCreate,
  KbItemUpdate,
  RateBookCreate,
  RateBookIdInput,
  RateBookUpdate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { kbItems, rateBook } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

/** Keep only the keys the caller actually provided (so a partial update never
 *  nulls a column the form didn't touch). */
function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

// ── Item library ────────────────────────────────────────────────────────────
const items = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(kbItems)
      .orderBy(desc(kbItems.active), asc(kbItems.name)),
  ),
  create: protectedProcedure
    .input(KbItemCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(kbItems)
        .values({
          name: input.name,
          category: input.category ?? null,
          unit: input.unit,
          description: input.description ?? null,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "kb_item",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),
  bulkCreate: protectedProcedure
    .input(z.array(KbItemCreate).max(5000))
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return { inserted: 0 };
      await ctx.db.insert(kbItems).values(
        input.map((m) => ({
          name: m.name,
          category: m.category ?? null,
          unit: m.unit,
          description: m.description ?? null,
        })),
      );
      return { inserted: input.length };
    }),
  update: protectedProcedure
    .input(KbItemUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(kbItems)
        .set(definedOnly(rest))
        .where(eq(kbItems.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "kb_item",
        entityId: id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row;
    }),
  remove: protectedProcedure
    .input(KbIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(kbItems).where(eq(kbItems.id, input.id));
      await writeAudit(ctx.db, {
        entity: "kb_item",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),
});

// ── Rate Book ─────────────────────────────────────────────────────────────
// The office schedule of rates (code · description · unit · rate). Standalone
// reference table, independent of the removed estimation engine.
const rates = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(rateBook)
      .orderBy(desc(rateBook.active), asc(rateBook.code)),
  ),
  create: protectedProcedure
    .input(RateBookCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(rateBook)
        .values({
          code: input.code,
          description: input.description,
          unit: input.unit,
          ratePaise: input.ratePaise,
          notes: input.notes ?? null,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "rate_book",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),
  update: protectedProcedure
    .input(RateBookUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(rateBook)
        .set({ ...definedOnly(rest), updatedAt: new Date() })
        .where(eq(rateBook.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "rate_book",
        entityId: id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row;
    }),
  remove: protectedProcedure
    .input(RateBookIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(rateBook).where(eq(rateBook.id, input.id));
      await writeAudit(ctx.db, {
        entity: "rate_book",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),
});

/** Knowledge Bank — office reference libraries (Items + Rate Book; estimation removed). */
export const kbRouter = router({
  items,
  rateBook: rates,
});
