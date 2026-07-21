import { PeriodFilterInput, ProjectListParams, clampListLimit } from "@esti/contracts";
import {
  InvoiceCreate,
  InvoiceStatus,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { invoices, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { writeActivity } from "../../lib/activity.js";
import { createStudioInvoice } from "../../lib/createInvoice.js";
import { firmPayload } from "../../lib/firm.js";
import { enqueueJob } from "../../lib/redis.js";
import { publishEntity } from "../../lib/sync/publish.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { capabilityProcedure, router } from "../../trpc/trpc.js";
import { invoicePeriodWhere } from "../../lib/periodFilter.js";

const manageInvoice = capabilityProcedure("invoice:manage");

/**
 * Invoices are financial instruments — permissions.ts scopes `invoice:manage`
 * to partner and above, and the search module already filters financial hits
 * on it. Reads were left on bare `protectedProcedure`, so a VIEWER could pull
 * firm-wide revenue, GST, TDS and a presigned PDF of any invoice by id.
 */
const readInvoice = capabilityProcedure("invoice:manage");

export const invoiceRouter = router({
  listByProject: readInvoice
    .input(ProjectListParams)
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(invoices)
        .where(eq(invoices.projectId, input.projectId))
        .orderBy(desc(invoices.createdAt))
        .limit(clampListLimit(input.limit));
    }),

  /** All invoices across projects (office-wide Accounting view). */
  listAll: readInvoice
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(500).default(200),
          period: PeriodFilterInput.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const periodWhere = invoicePeriodWhere(input?.period);
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
        .where(periodWhere)
        .orderBy(desc(invoices.createdAt))
        .limit(input?.limit ?? 200);
    }),

  byId: readInvoice
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
      await writeActivity(ctx.db, {
        projectId: row.projectId,
        objectType: "invoice",
        objectId: row.id,
        eventType: "invoice.pdf_requested",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `PDF generation requested for invoice ${row.ref}`,
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
          // On first issue, mark the PDF pending so the client portal shows
          // "Preparing…" until the worker renders the downloadable invoice.
          ...(input.status === "ISSUED" && current.status !== "ISSUED"
            ? { pdfStatus: "PENDING" as const }
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
      await writeActivity(ctx.db, {
        projectId: current.projectId,
        objectType: "invoice",
        objectId: input.id,
        eventType: "invoice.status_changed",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `Invoice ${current.ref} → ${input.status}`,
        metadata: { from: current.status, to: input.status },
      });
      // On first issue, enqueue the PDF render so the client can download the
      // invoice from the portal without the firm having to generate it manually.
      if (input.status === "ISSUED" && current.status !== "ISSUED") {
        await enqueueJob("render_pdf", {
          documentKind: row!.documentKind,
          id: row!.id,
          firm: await firmPayload(ctx.db),
        }, ctx.requestId);
      }
      // Hybrid sync (Phase B): an issued/paid invoice is finalized client-facing
      // data — publish it outward to the hub for the client portal.
      if (input.status === "ISSUED" || input.status === "PAID") {
        await publishEntity(ctx.db, "invoice", row!.id);
      }
      return row!;
    }),

  /**
   * Delete an invoice. DRAFT only.
   *
   * A CANCELLED invoice used to be deletable too, but a cancelled tax invoice
   * is still a statutory record: it has consumed a serial in the financial
   * year's series and has to be reported in GSTR-1 as cancelled. Deleting it
   * destroys the record and leaves an unexplainable gap in the series, since
   * `esti_sequence` never rewinds. A draft has no serial yet, so it is safe.
   */
  remove: capabilityProcedure("invoice:delete")
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(invoices).where(eq(invoices.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            row.status === "CANCELLED"
              ? "A cancelled invoice is a statutory record and must be kept — it holds a number in this year's series and is reported in GSTR-1."
              : `Cannot delete a ${row.status} invoice — cancel it instead.`,
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
      await writeActivity(ctx.db, {
        projectId: row.projectId,
        objectType: "invoice",
        objectId: input.id,
        eventType: "invoice.deleted",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `Invoice ${row.ref} deleted`,
      });
      return { ok: true };
    }),

  create: manageInvoice.input(InvoiceCreate).mutation(async ({ ctx, input }) => {
    return createStudioInvoice(ctx.db, {
      input,
      actor: { id: ctx.user.id, fullName: ctx.user.fullName },
      requestId: ctx.requestId,
    });
  }),
});
