import { OfficeListParams, ReconcileColumnMapping, ReconcileLine, clampListLimit } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { invoices, reconciliations } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { enqueueJob } from "../../lib/redis.js";
import { BUCKET } from "../../lib/storage.js";
import { capabilityProcedure, router } from "../../trpc/trpc.js";

// Bank statement reconciliation is L2 (finance:ops) and above.
const financeOps = capabilityProcedure("finance:ops");

export const reconcileRouter = router({
  list: financeOps.input(OfficeListParams.optional()).query(async ({ ctx, input }) => {
    return ctx.db
      .select()
      .from(reconciliations)
      .orderBy(desc(reconciliations.createdAt))
      .limit(clampListLimit(input?.limit));
  }),

  byId: financeOps
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(reconciliations)
        .where(eq(reconciliations.id, input.id));
      return row ?? null;
    }),

  /**
   * Close the loop: apply this batch's matched receipts to their invoices.
   *
   * Settlement is amount-aware. Each matched line adds its actual received
   * amount to the invoice's paid total, and the invoice becomes PAID only when
   * that total reaches its net receivable. A partial receipt therefore leaves
   * the invoice ISSUED and partly paid, with the balance still in receivables —
   * previously any reference match flipped the whole invoice to PAID and the
   * shortfall silently disappeared.
   *
   * Idempotent per line: each applied line is stamped `settledAt`, so
   * re-running the batch skips it rather than adding the receipt again.
   */
  settle: financeOps
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [batch] = await tx
          .select()
          .from(reconciliations)
          .where(eq(reconciliations.id, input.id));
        if (!batch) throw new TRPCError({ code: "NOT_FOUND" });

        const lines = (batch.lines as ReconcileLine[] | null) ?? [];
        const now = new Date().toISOString();
        let applied = 0;
        let settled = 0;
        let skipped = 0;
        let alreadyDone = 0;

        for (const line of lines) {
          if (line.matchType === "none" || !line.matchedInvoiceId) continue;
          if (line.settledAt) {
            alreadyDone += 1;
            continue;
          }
          const [inv] = await tx
            .select()
            .from(invoices)
            .where(eq(invoices.id, line.matchedInvoiceId));
          // Only ISSUED invoices receive payment. A DRAFT has not been sent, and
          // CANCELLED/PAID are closed — count those as skipped, and do NOT stamp
          // the line, so a later re-issue can still be reconciled against it.
          if (!inv || inv.status !== "ISSUED") {
            skipped += 1;
            continue;
          }

          const paid = inv.paidPaise + line.amountPaise;
          const fullyPaid = paid >= inv.netReceivablePaise;
          await tx
            .update(invoices)
            .set({
              paidPaise: paid,
              ...(fullyPaid ? { status: "PAID" as const } : {}),
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, inv.id));
          await writeAudit(tx, {
            entity: "invoice",
            entityId: inv.id,
            action: fullyPaid ? "STATUS" : "PART_PAYMENT",
            actorId: ctx.user.id,
            before: { status: inv.status, paidPaise: inv.paidPaise },
            after: {
              status: fullyPaid ? "PAID" : "ISSUED",
              paidPaise: paid,
              appliedPaise: line.amountPaise,
              via: "reconcile",
              batch: batch.ref,
            },
          });

          line.settledAt = now;
          applied += 1;
          if (fullyPaid) settled += 1;
        }

        // Persist the settledAt stamps so the applied lines are not re-applied.
        await tx
          .update(reconciliations)
          .set({ lines })
          .where(eq(reconciliations.id, batch.id));

        return { applied, settled, skipped, alreadyApplied: alreadyDone };
      });
    }),

  setColumnMapping: financeOps
    .input(z.object({ id: z.string().uuid(), mapping: ReconcileColumnMapping }))
    .mutation(async ({ ctx, input }) => {
      const [batch] = await ctx.db.select().from(reconciliations).where(eq(reconciliations.id, input.id));
      if (!batch) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .update(reconciliations)
        .set({ columnMapping: input.mapping, status: "PENDING" })
        .where(eq(reconciliations.id, input.id));
      await enqueueJob("reconcile_import", {
        reconcileId: input.id,
        bucket: BUCKET,
        storageKey: batch.storageKey,
        fileName: batch.fileName,
        columnMapping: input.mapping,
      }, ctx.requestId);
      return { ok: true };
    }),

  exportRows: financeOps
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [batch] = await ctx.db.select().from(reconciliations).where(eq(reconciliations.id, input.id));
      if (!batch) throw new TRPCError({ code: "NOT_FOUND" });
      const lines = (batch.lines as ReconcileLine[] | null) ?? [];
      return {
        ref: batch.ref,
        label: batch.label,
        rows: lines.map((l) => ({
          Row: l.row,
          Date: l.date ?? "",
          Description: l.description,
          Amount: (l.amountPaise / 100).toFixed(2),
          Match: l.matchType,
          Invoice: l.matchedInvoiceRef ?? "",
        })),
      };
    }),
});
