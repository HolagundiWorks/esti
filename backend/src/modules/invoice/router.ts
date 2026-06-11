import { GstSystem, InvoiceCreate, InvoiceStatus, computeGst, computeTds194j } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { invoices, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload, getFirm } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { requireInvoiceScope } from "../../lib/projectScope.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manageInvoice = capabilityProcedure("invoice:manage");

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

  /** All invoices across projects (office-wide Accounting view). */
  listAll: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).default(200) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: invoices.id,
          ref: invoices.ref,
          projectId: invoices.projectId,
          projectRef: projectOffices.ref,
          projectTitle: projectOffices.title,
          documentKind: invoices.documentKind,
          status: invoices.status,
          taxablePaise: invoices.taxablePaise,
          gstTotalPaise: invoices.gstTotalPaise,
          tdsPaise: invoices.tdsPaise,
          netReceivablePaise: invoices.netReceivablePaise,
          dateInvoice: invoices.dateInvoice,
          pdfStatus: invoices.pdfStatus,
        })
        .from(invoices)
        .innerJoin(projectOffices, eq(projectOffices.id, invoices.projectId))
        .orderBy(desc(invoices.createdAt))
        .limit(input?.limit ?? 200);
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(invoices).where(eq(invoices.id, input.id));
      if (!row) return null;
      const pdfUrl = row.pdfKey ? await presignedGet(row.pdfKey).catch(() => null) : null;
      return { ...row, pdfUrl };
    }),

  generatePdf: manageInvoice
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
      }, ctx.requestId);
      await writeAudit(ctx.db, {
        entity: "invoice",
        entityId: input.id,
        action: "PDF_REQUEST",
        actorId: ctx.user.id,
        before: { pdfStatus: row.pdfStatus },
        after: { pdfStatus: "PENDING" },
      });
      return { ok: true };
    }),

  updateStatus: manageInvoice
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

  /**
   * Delete an invoice. Only DRAFT or CANCELLED invoices may be removed — an
   * ISSUED/PAID invoice is a statutory record and must be cancelled, not
   * deleted. Owner/Partner only (audit-sensitive).
   */
  remove: capabilityProcedure("invoice:delete")
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(invoices).where(eq(invoices.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status !== "DRAFT" && row.status !== "CANCELLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete a ${row.status} invoice — cancel it instead.`,
        });
      }
      if (row.pdfKey) await removeObject(row.pdfKey);
      await ctx.db.delete(invoices).where(eq(invoices.id, input.id));
      await writeAudit(ctx.db, {
        entity: "invoice",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before: { ref: row.ref, status: row.status },
      });
      return { ok: true };
    }),

  create: manageInvoice.input(InvoiceCreate).mutation(async ({ ctx, input }) => {
    await requireInvoiceScope(ctx.db, input);
    const firm = await getFirm(ctx.db);
    const system = input.gstSystem ?? (firm.gstType as GstSystem);
    // SAC applies only to a regular GST tax invoice; drop it otherwise.
    const sac = system === GstSystem.REGULAR ? (input.sac ?? null) : null;
    // TDS u/s 194J defaults to the firm's declaration (Company settings).
    const tdsApplicable = input.tdsApplicable ?? firm.tdsApplicableDefault;
    const g = computeGst(system, input.taxablePaise, input.interState);
    const tdsPaise = tdsApplicable ? computeTds194j(input.taxablePaise) : 0;
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
        sac,
        interState: input.interState,
        tdsApplicable,
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
