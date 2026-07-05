/**
 * Estimates namespace — import (via /upload/estimate), view, and RE-COST an
 * imported `.aormsest` snapshot against the office rate book. Quantities are
 * frozen inside the stored pack; costing is computed live here (never stored),
 * so a rate-book edit is a pure recompute. Plus a bridge that seeds the global
 * rate book from an ESE Rate Library Pack, so DSR rates exist to re-cost against.
 */
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import {
  EstimateFile,
  RateLibraryPack,
  recostEstimate,
  type RateBookRates,
} from "@esti/contracts";
import { z } from "zod";
import { estimates, rateBook } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { removeObject } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

/** Build the re-cost rate maps from the flat office rate book (active rows).
 *  Items and materials both look up by `code`; steel by diameter parsed from a
 *  code/description like "STEEL-12" or "12 mm TMT". */
function buildRateBookRates(
  rows: { code: string; description: string; ratePaise: number }[],
  meta: { code: string; name: string },
): RateBookRates {
  const itemRatePaise: Record<string, number> = {};
  const materialRatePaise: Record<string, number> = {};
  const steelRatePaiseByDia: Record<string, number> = {};
  for (const r of rows) {
    itemRatePaise[r.code] = r.ratePaise;
    materialRatePaise[r.code] = r.ratePaise;
    const dia =
      r.code.match(/steel\D*(\d{1,2})/i)?.[1] ??
      r.description.match(/(\d{1,2})\s*mm\b.*\b(?:tmt|tor|steel|bar|reinf)/i)?.[1];
    if (dia) steelRatePaiseByDia[dia] = r.ratePaise;
  }
  return { code: meta.code, name: meta.name, itemRatePaise, materialRatePaise, steelRatePaiseByDia };
}

export const estimateRouter = router({
  /** Imported estimates (light — no pack payload). */
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        id: estimates.id,
        title: estimates.title,
        projectId: estimates.projectId,
        sourceRateBookName: estimates.sourceRateBookName,
        checksum: estimates.checksum,
        createdAt: estimates.createdAt,
      })
      .from(estimates)
      .orderBy(desc(estimates.createdAt))
      .limit(200),
  ),

  /** One estimate with its full parsed pack. */
  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id)).limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "estimate not found" });
    return row;
  }),

  /**
   * Re-cost an estimate against the current office rate book. Returns the four
   * costed views (Abstract · BOQ · Materials · Steel) with as-estimated vs
   * as-costed and the variance. Pure recompute — nothing persisted.
   */
  recost: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id)).limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "estimate not found" });

    const parsed = EstimateFile.safeParse(row.pack);
    if (!parsed.success) throw new TRPCError({ code: "BAD_REQUEST", message: "stored pack is not a valid .aormsest" });

    const book = await ctx.db
      .select({ code: rateBook.code, description: rateBook.description, ratePaise: rateBook.ratePaise })
      .from(rateBook)
      .where(eq(rateBook.active, true));

    const rates = buildRateBookRates(book, { code: "OFFICE", name: "Office rate book" });
    return {
      estimate: { id: row.id, title: row.title, projectId: row.projectId, importedAt: row.createdAt },
      rateBook: { code: rates.code, name: rates.name, entryCount: book.length },
      costed: recostEstimate(parsed.data, rates),
    };
  }),

  remove: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id)).limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "estimate not found" });
    if (row.sourceFileKey) await removeObject(row.sourceFileKey).catch(() => undefined);
    await ctx.db.delete(estimates).where(eq(estimates.id, input.id));
    await writeAudit(ctx.db, { entity: "estimate", entityId: row.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),

  /**
   * Seed the office rate book from an ESE Rate Library Pack (the ESE→AORMS
   * bridge). Inserts a rate entry per pack rate item and priced material, keyed
   * by the same code the estimate uses. Idempotent by code — existing codes are
   * skipped, so re-seeding a newer edition only adds what is missing.
   */
  importRateBookPack: protectedProcedure
    .input(z.object({ pack: RateLibraryPack }))
    .mutation(async ({ ctx, input }) => {
      const pack = input.pack;
      const existing = new Set(
        (await ctx.db.select({ code: rateBook.code }).from(rateBook)).map((r) => r.code),
      );
      const rows: { code: string; description: string; unit: string; ratePaise: number; notes: string }[] = [];
      const push = (code: string, description: string, unit: string, ratePaise: number) => {
        if (!code || existing.has(code)) return;
        existing.add(code);
        rows.push({ code, description: description.slice(0, 400), unit, ratePaise, notes: `${pack.edition}` });
      };
      for (const it of pack.rateItems) push(it.code, it.shortName, it.uom, it.ratePaise);
      for (const m of pack.materials) if (m.ratePaise != null) push(m.code, m.name, m.unit, m.ratePaise);

      if (rows.length) await ctx.db.insert(rateBook).values(rows);
      await writeAudit(ctx.db, {
        entity: "rate_book",
        action: "IMPORT_PACK",
        actorId: ctx.user.id,
        after: { edition: pack.edition, inserted: rows.length },
      });
      return { inserted: rows.length, edition: pack.edition };
    }),
});
