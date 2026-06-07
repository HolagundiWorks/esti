import { InvoiceCreate, InvoiceStatus, computeGst, computeTds194j } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { invoices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmGstSystem, firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const invoiceRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(invoices)
        .where(eq(invoices.projectId, input.projectId))
        .orderBy(desc(invoices.createdAt));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(invoices).where(eq(invoices.id, input.id));
      if (!row) return null;
      const pdfUrl = row.pdfKey ? await presignedGet(row.pdfKey).catch(() => null) : null;
      return { ...row, pdfUrl };
    }),

  generatePdf: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(invoices).where(eq(invoices.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .update(invoices)
        .set({ pdfStatus: "PENDING" })
        .where(eq(invoices.id, input.id));
      // The firm profile is fixed single-firm config — pass it so the Python
      // worker needs no duplicate copy.
      await enqueueJob("render_pdf", {
        documentKind: row.documentKind,
        id: row.id,
        firm: await firmPayload(ctx.db),
      });
      return { ok: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: InvoiceStatus }))
    .mutation(async ({ ctx, input }) => {
      const [current] = await ctx.db.select().from(invoices).where(eq(invoices.id, input.id));
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });

      // Forward-only lifecycle; cancel allowed from any non-terminal state.
      const allowed: Record<string, string[]> = {
        DRAFT: ["ISSUED", "CANCELLED"],
        ISSUED: ["PAID", "CANCELLED"],
        PAID: [],
        CANCELLED: [],
      };
      if (current.status !== input.status && !allowed[current.status]?.includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot move invoice from ${current.status} to ${input.status}`,
        });
      }

      const [row] = await ctx.db
        .update(invoices)
        .set({
          status: input.status,
          // Stamp the invoice date when first issued, if not already set.
          ...(input.status === "ISSUED" && !current.dateInvoice
            ? { dateInvoice: new Date().toISOString().slice(0, 10) }
            : {}),
        })
        .where(eq(invoices.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "invoice",
        entityId: input.id,
        action: "STATUS",
        actorId: ctx.user.id,
        before: { status: current.status },
        after: { status: input.status },
      });
      return row!;
    }),

  create: protectedProcedure.input(InvoiceCreate).mutation(async ({ ctx, input }) => {
    const system = input.gstSystem ?? (await firmGstSystem(ctx.db));
    const g = computeGst(system, input.taxablePaise, input.interState);
    const tdsPaise = input.tdsApplicable ? computeTds194j(input.taxablePaise) : 0;
    const netReceivablePaise = g.grandTotal - tdsPaise;
    const { ref } = await nextRef(ctx.db, "invoice", "INV");

    const [row] = await ctx.db
      .insert(invoices)
      .values({
        ref,
        projectId: input.projectId,
        phaseId: input.phaseId ?? null,
        clientId: input.clientId ?? null,
        gstSystem: system,
        documentKind: g.documentKind,
        sac: input.sac,
        interState: input.interState,
        tdsApplicable: input.tdsApplicable,
        taxablePaise: g.taxable,
        cgstPaise: g.cgst,
        sgstPaise: g.sgst,
        igstPaise: g.igst,
        gstTotalPaise: g.gstTotal,
        compositionLevyPaise: g.compositionLevy,
        tdsPaise,
        grandTotalPaise: g.grandTotal,
        netReceivablePaise,
        dateInvoice: input.dateInvoice ?? null,
        notes: input.notes ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "invoice",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),
});
