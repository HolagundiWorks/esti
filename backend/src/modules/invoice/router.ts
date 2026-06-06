import { InvoiceCreate, computeGst, computeTds194j } from "@esti/contracts";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { invoices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { ACTIVE_GST_SYSTEM } from "../../lib/tax.js";
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

  create: protectedProcedure.input(InvoiceCreate).mutation(async ({ ctx, input }) => {
    const system = input.gstSystem ?? ACTIVE_GST_SYSTEM;
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
