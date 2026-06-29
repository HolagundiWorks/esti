import { SpecSheetCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { specItems, specSheets } from "../../db/schema.js";
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
});
