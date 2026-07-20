import { RateBookCreate, RateBookItemUpsert } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { estimateItems, estimates, rateBookItems, rateBooks } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, router } from "../../trpc/trpc.js";

// Rate books drive estimate pricing firm-wide — same gate as fee proposals.
const manage = capabilityProcedure("fees:manage");

export const rateBookRouter = router({
  list: manage.query(async ({ ctx }) =>
    ctx.db.select().from(rateBooks).orderBy(desc(rateBooks.createdAt)),
  ),

  create: manage.input(RateBookCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(rateBooks)
      .values({
        name: input.name,
        versionLabel: input.versionLabel ?? null,
        effectiveDate: input.effectiveDate ?? null,
        description: input.description ?? null,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "ratebook", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  setLocked: manage
    .input(z.object({ id: z.string().uuid(), locked: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(rateBooks)
        .set({ locked: input.locked, updatedAt: new Date() })
        .where(eq(rateBooks.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "ratebook",
        entityId: input.id,
        action: "SET_LOCKED",
        actorId: ctx.user.id,
        after: { locked: input.locked },
      });
      return row;
    }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [inUse] = await ctx.db
      .select({ id: estimates.id })
      .from(estimates)
      .where(eq(estimates.rateBookId, input.id))
      .limit(1);
    if (inUse) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This rate book is used by at least one estimate — remove or repoint those first.",
      });
    }
    await ctx.db.delete(rateBookItems).where(eq(rateBookItems.rateBookId, input.id));
    await ctx.db.delete(rateBooks).where(eq(rateBooks.id, input.id));
    await writeAudit(ctx.db, { entity: "ratebook", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),

  listItems: manage
    .input(z.object({ rateBookId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(rateBookItems)
        .where(eq(rateBookItems.rateBookId, input.rateBookId))
        .orderBy(asc(rateBookItems.sortOrder), asc(rateBookItems.createdAt)),
    ),

  upsertItem: manage.input(RateBookItemUpsert).mutation(async ({ ctx, input }) => {
    const [book] = await ctx.db.select().from(rateBooks).where(eq(rateBooks.id, input.rateBookId));
    if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Rate book not found" });
    if (book.locked) throw new TRPCError({ code: "BAD_REQUEST", message: "This rate book is locked." });

    if (input.id) {
      const [row] = await ctx.db
        .update(rateBookItems)
        .set({
          itemCode: input.itemCode ?? null,
          description: input.description,
          specification: input.specification ?? null,
          unit: input.unit,
          ratePaise: input.ratePaise,
          updatedAt: new Date(),
        })
        .where(and(eq(rateBookItems.id, input.id), eq(rateBookItems.rateBookId, input.rateBookId)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }

    const maxSort = await ctx.db
      .select({ n: rateBookItems.sortOrder })
      .from(rateBookItems)
      .where(eq(rateBookItems.rateBookId, input.rateBookId))
      .orderBy(desc(rateBookItems.sortOrder))
      .limit(1);
    const [row] = await ctx.db
      .insert(rateBookItems)
      .values({
        rateBookId: input.rateBookId,
        sortOrder: (maxSort[0]?.n ?? 0) + 10,
        itemCode: input.itemCode ?? null,
        description: input.description,
        specification: input.specification ?? null,
        unit: input.unit,
        ratePaise: input.ratePaise,
      })
      .returning();
    return row!;
  }),

  removeItem: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [item] = await ctx.db
      .select({ id: rateBookItems.id, rateBookId: rateBookItems.rateBookId })
      .from(rateBookItems)
      .where(eq(rateBookItems.id, input.id));
    if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Rate book item not found" });

    // `upsertItem` refuses to write into a locked book; deleting out of one has
    // to be refused for the same reason, or "locked" means very little.
    const [book] = await ctx.db
      .select({ locked: rateBooks.locked, name: rateBooks.name })
      .from(rateBooks)
      .where(eq(rateBooks.id, item.rateBookId));
    if (book?.locked) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `"${book.name}" is locked — unlock it before removing items.`,
      });
    }

    // esti_estimate_item.rate_book_item_id has no ON DELETE action, so deleting
    // a referenced item raised a raw 23503 and surfaced as a 500. Say what is
    // actually wrong instead.
    const [used] = await ctx.db
      .select({ n: sql<number>`count(*)::int` })
      .from(estimateItems)
      .where(eq(estimateItems.rateBookItemId, input.id));
    if (used?.n) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `This item is priced into ${used.n} estimate line${used.n === 1 ? "" : "s"} and cannot be deleted. Edit its rate instead, or remove those lines first.`,
      });
    }

    await ctx.db.delete(rateBookItems).where(eq(rateBookItems.id, input.id));
    return { ok: true };
  }),
});
