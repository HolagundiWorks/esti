import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { invoices, reconciliations } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

type ReconcileLine = {
  matchType: string;
  matchedInvoiceId: string | null;
};

export const reconcileRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(reconciliations).orderBy(desc(reconciliations.createdAt));
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(reconciliations)
        .where(eq(reconciliations.id, input.id));
      return row ?? null;
    }),

  /**
   * Close the loop: mark the invoices matched by this batch as PAID. Only
   * ISSUED invoices transition (idempotent — re-running settles the rest);
   * everything else is counted as skipped.
   */
  settle: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [batch] = await ctx.db
        .select()
        .from(reconciliations)
        .where(eq(reconciliations.id, input.id));
      if (!batch) throw new TRPCError({ code: "NOT_FOUND" });

      const lines = (batch.lines as ReconcileLine[] | null) ?? [];
      const ids = [
        ...new Set(
          lines
            .filter((l) => l.matchType !== "none" && l.matchedInvoiceId)
            .map((l) => l.matchedInvoiceId as string),
        ),
      ];

      let settled = 0;
      let skipped = 0;
      for (const invId of ids) {
        const [inv] = await ctx.db.select().from(invoices).where(eq(invoices.id, invId));
        if (!inv || inv.status !== "ISSUED") {
          skipped += 1;
          continue;
        }
        await ctx.db.update(invoices).set({ status: "PAID" }).where(eq(invoices.id, invId));
        await writeAudit(ctx.db, {
          entity: "invoice",
          entityId: invId,
          action: "STATUS",
          actorId: ctx.user.id,
          before: { status: "ISSUED" },
          after: { status: "PAID", via: "reconcile", batch: batch.ref },
        });
        settled += 1;
      }
      return { settled, skipped, matched: ids.length };
    }),
});
