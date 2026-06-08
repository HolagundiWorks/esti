import { MoodBoardCreate, SpecSheetCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { moodBoards, moodImages, specItems, specSheets } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const specRouter = router({
  // --- Specification sheets ---
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db.select().from(specSheets).where(eq(specSheets.projectId, input.projectId)).orderBy(desc(specSheets.createdAt)),
    ),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(specSheets).where(eq(specSheets.id, input.id));
    if (!row) return null;
    const items = await ctx.db.select().from(specItems).where(eq(specItems.specSheetId, input.id)).orderBy(asc(specItems.sortOrder));
    const pdfUrl = row.pdfKey ? await presignedGet(row.pdfKey).catch(() => null) : null;
    return { ...row, items, pdfUrl };
  }),

  create: protectedProcedure.input(SpecSheetCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "specsheet", "SPC");
    const row = await ctx.db.transaction(async (tx) => {
      const [s] = await tx
        .insert(specSheets)
        .values({ ref, projectId: input.projectId, title: input.title })
        .returning();
      await tx.insert(specItems).values(
        input.items.map((it, i) => ({
          specSheetId: s!.id,
          category: it.category ?? null,
          item: it.item,
          make: it.make ?? null,
          specification: it.specification ?? null,
          finish: it.finish ?? null,
          remarks: it.remarks ?? null,
          sortOrder: (i + 1) * 10,
        })),
      );
      return s!;
    });
    await writeAudit(ctx.db, { entity: "specsheet", entityId: row.id, action: "CREATE", actorId: ctx.user.id });
    return row;
  }),

  generatePdf: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(specSheets).where(eq(specSheets.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.update(specSheets).set({ pdfStatus: "PENDING" }).where(eq(specSheets.id, input.id));
    await enqueueJob("render_pdf", { target: "specsheet", id: row.id, firm: await firmPayload(ctx.db) }, ctx.requestId);
    return { ok: true };
  }),

  remove: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(specSheets).where(eq(specSheets.id, input.id));
    if (row?.pdfKey) await removeObject(row.pdfKey);
    await ctx.db.transaction(async (tx) => {
      await tx.delete(specItems).where(eq(specItems.specSheetId, input.id));
      await tx.delete(specSheets).where(eq(specSheets.id, input.id));
    });
    return { ok: true };
  }),

  // --- Mood boards ---
  listBoards: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db.select().from(moodBoards).where(eq(moodBoards.projectId, input.projectId)).orderBy(desc(moodBoards.createdAt)),
    ),

  boardImages: protectedProcedure.input(z.object({ boardId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const imgs = await ctx.db.select().from(moodImages).where(eq(moodImages.moodBoardId, input.boardId)).orderBy(asc(moodImages.sortOrder));
    return Promise.all(
      imgs.map(async (im) => ({ ...im, url: await presignedGet(im.storageKey).catch(() => null) })),
    );
  }),

  createBoard: protectedProcedure.input(MoodBoardCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(moodBoards).values({ projectId: input.projectId, title: input.title }).returning();
    return row!;
  }),

  setCaption: protectedProcedure
    .input(z.object({ imageId: z.string().uuid(), caption: z.string().max(300) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(moodImages).set({ caption: input.caption }).where(eq(moodImages.id, input.imageId));
      return { ok: true };
    }),

  removeImage: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [im] = await ctx.db.select().from(moodImages).where(eq(moodImages.id, input.id));
    if (im?.storageKey) await removeObject(im.storageKey);
    await ctx.db.delete(moodImages).where(eq(moodImages.id, input.id));
    return { ok: true };
  }),

  removeBoard: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const imgs = await ctx.db.select().from(moodImages).where(eq(moodImages.moodBoardId, input.id));
    for (const im of imgs) if (im.storageKey) await removeObject(im.storageKey);
    await ctx.db.transaction(async (tx) => {
      await tx.delete(moodImages).where(eq(moodImages.moodBoardId, input.id));
      await tx.delete(moodBoards).where(eq(moodBoards.id, input.id));
    });
    return { ok: true };
  }),
});
