import { MoodBoardCreate, SpecSheetCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { moodBoards, moodImages, specItems, specSheets } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { recordDocumentIssue } from "../../lib/documentIssue.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { requireUnissuedDocument } from "../../lib/retention.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { resolveSpecSheetItems } from "../../lib/specCatalogResolve.js";
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
    const resolved = await resolveSpecSheetItems(ctx.db, input.items);
    const { ref } = await nextRef(ctx.db, "specsheet", "SPC");
    const row = await ctx.db.transaction(async (tx) => {
      const [s] = await tx
        .insert(specSheets)
        .values({ ref, projectId: input.projectId, title: input.title })
        .returning();
      await tx.insert(specItems).values(
        resolved.map((it) => ({
          specSheetId: s!.id,
          catalogItemId: it.catalogItemId,
          category: it.category,
          item: it.item,
          make: it.make,
          specification: it.specification,
          finish: it.finish,
          remarks: it.remarks,
          sortOrder: it.sortOrder,
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
    await ctx.db.update(specSheets).set({ pdfStatus: "PENDING", status: "ISSUED" }).where(eq(specSheets.id, input.id));
    await enqueueJob("render_pdf", { target: "specsheet", id: row.id, firm: await firmPayload(ctx.db) }, ctx.requestId);
    await recordDocumentIssue(ctx.db, {
      entityType: "SPEC_SHEET",
      entityId: row.id,
      projectId: row.projectId,
      ref: row.ref,
      versionNo: row.versionNo ?? 1,
      issuedById: ctx.user.id,
    });
    await writeAudit(ctx.db, {
      entity: "specsheet",
      entityId: input.id,
      action: "PDF_REQUEST",
      actorId: ctx.user.id,
      before: { pdfStatus: row.pdfStatus },
      after: { pdfStatus: "PENDING" },
    });
    return { ok: true };
  }),

  remove: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(specSheets).where(eq(specSheets.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    requireUnissuedDocument(row, "Specification sheet");
    if (row?.pdfKey) await removeObject(row.pdfKey);
    await ctx.db.transaction(async (tx) => {
      await tx.delete(specItems).where(eq(specItems.specSheetId, input.id));
      await tx.delete(specSheets).where(eq(specSheets.id, input.id));
    });
    await writeAudit(ctx.db, {
      entity: "specsheet",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
      before: row,
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
    const { ref } = await nextRef(ctx.db, "moodboard", "MOOD");
    const [row] = await ctx.db
      .insert(moodBoards)
      .values({ ref, projectId: input.projectId, title: input.title })
      .returning();
    await writeAudit(ctx.db, {
      entity: "moodboard",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  setCaption: protectedProcedure
    .input(z.object({ imageId: z.string().uuid(), caption: z.string().max(300) }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(moodImages).where(eq(moodImages.id, input.imageId));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      const [after] = await ctx.db
        .update(moodImages)
        .set({ caption: input.caption })
        .where(eq(moodImages.id, input.imageId))
        .returning();
      await writeAudit(ctx.db, {
        entity: "moodimage",
        entityId: input.imageId,
        action: "CAPTION_UPDATE",
        actorId: ctx.user.id,
        before: { caption: before.caption },
        after: { caption: after!.caption },
      });
      return { ok: true };
    }),

  removeImage: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [im] = await ctx.db.select().from(moodImages).where(eq(moodImages.id, input.id));
    if (!im) throw new TRPCError({ code: "NOT_FOUND" });
    if (im?.storageKey) await removeObject(im.storageKey);
    await ctx.db.delete(moodImages).where(eq(moodImages.id, input.id));
    await writeAudit(ctx.db, {
      entity: "moodimage",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
      before: im,
    });
    return { ok: true };
  }),

  issueBoard: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(moodBoards).where(eq(moodBoards.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    const [updated] = await ctx.db
      .update(moodBoards)
      .set({ status: "ISSUED" })
      .where(eq(moodBoards.id, input.id))
      .returning();
    await recordDocumentIssue(ctx.db, {
      entityType: "MOOD_BOARD",
      entityId: row.id,
      projectId: row.projectId,
      ref: row.ref ?? row.id.slice(0, 8),
      versionNo: row.versionNo ?? 1,
      issuedById: ctx.user.id,
    });
    await writeAudit(ctx.db, {
      entity: "moodboard",
      entityId: input.id,
      action: "ISSUE",
      actorId: ctx.user.id,
      before: { status: row.status },
      after: { status: updated!.status },
    });
    return updated!;
  }),

  removeBoard: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [board] = await ctx.db.select().from(moodBoards).where(eq(moodBoards.id, input.id));
    if (!board) throw new TRPCError({ code: "NOT_FOUND" });
    if (board.status === "ISSUED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Issued mood board cannot be deleted" });
    }
    const imgs = await ctx.db.select().from(moodImages).where(eq(moodImages.moodBoardId, input.id));
    for (const im of imgs) if (im.storageKey) await removeObject(im.storageKey);
    await ctx.db.transaction(async (tx) => {
      await tx.delete(moodImages).where(eq(moodImages.moodBoardId, input.id));
      await tx.delete(moodBoards).where(eq(moodBoards.id, input.id));
    });
    await writeAudit(ctx.db, {
      entity: "moodboard",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
      before: { ...board, imageCount: imgs.length },
    });
    return { ok: true };
  }),
});
