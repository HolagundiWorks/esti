import { ContractCreate, ContractStatus, LetterCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { contracts, letters } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const letterRouter = router({
  list: protectedProcedure.query(async ({ ctx }) =>
    ctx.db.select().from(letters).orderBy(desc(letters.createdAt)).limit(200),
  ),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(letters).where(eq(letters.id, input.id));
    if (!row) return null;
    const pdfUrl = row.pdfKey ? await presignedGet(row.pdfKey).catch(() => null) : null;
    return { ...row, pdfUrl };
  }),

  create: protectedProcedure.input(LetterCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "letter", "LTR");
    const [row] = await ctx.db
      .insert(letters)
      .values({
        ref,
        projectId: input.projectId ?? null,
        recipient: input.recipient,
        subject: input.subject,
        body: input.body,
        dateLetter: input.dateLetter ?? null,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "letter", entityId: row!.id, action: "CREATE", actorId: ctx.user.id });
    return row!;
  }),

  generatePdf: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(letters).where(eq(letters.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.update(letters).set({ pdfStatus: "PENDING" }).where(eq(letters.id, input.id));
    await enqueueJob("render_pdf", { target: "letter", id: row.id, firm: await firmPayload(ctx.db) }, ctx.requestId);
    await writeAudit(ctx.db, {
      entity: "letter",
      entityId: input.id,
      action: "PDF_REQUEST",
      actorId: ctx.user.id,
      before: { pdfStatus: row.pdfStatus },
      after: { pdfStatus: "PENDING" },
    });
    return { ok: true };
  }),

  remove: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(letters).where(eq(letters.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    if (row?.pdfKey) await removeObject(row.pdfKey);
    await ctx.db.delete(letters).where(eq(letters.id, input.id));
    await writeAudit(ctx.db, {
      entity: "letter",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
      before: row,
    });
    return { ok: true };
  }),
});

export const contractRouter = router({
  list: protectedProcedure.query(async ({ ctx }) =>
    ctx.db.select().from(contracts).orderBy(desc(contracts.createdAt)).limit(300),
  ),

  create: protectedProcedure.input(ContractCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "contract", "CTR");
    const [row] = await ctx.db
      .insert(contracts)
      .values({
        ref,
        projectId: input.projectId ?? null,
        title: input.title,
        party: input.party,
        contractType: input.contractType,
        valuePaise: input.valuePaise,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        notes: input.notes ?? null,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "contract", entityId: row!.id, action: "CREATE", actorId: ctx.user.id });
    return row!;
  }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: ContractStatus }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(contracts).where(eq(contracts.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      const [row] = await ctx.db
        .update(contracts)
        .set({ status: input.status })
        .where(eq(contracts.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "contract",
        entityId: input.id,
        action: "STATUS_UPDATE",
        actorId: ctx.user.id,
        before: { status: before.status },
        after: { status: row.status },
      });
      return row;
    }),

  remove: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(contracts).where(eq(contracts.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.delete(contracts).where(eq(contracts.id, input.id));
    await writeAudit(ctx.db, {
      entity: "contract",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
      before,
    });
    return { ok: true };
  }),
});
