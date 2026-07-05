/**
 * Estimates namespace — import (via /upload/estimate), view, and RE-COST an
 * imported `.aormsest` snapshot against the office rate book. Quantities are
 * frozen inside the stored pack; costing is computed live here (never stored),
 * so a rate-book edit is a pure recompute. Plus a bridge that seeds the global
 * rate book from an ESE Rate Library Pack, so DSR rates exist to re-cost against.
 */
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import {
  EstimateFile,
  RateLibraryPack,
  recostEstimate,
  type RateBookRates,
} from "@esti/contracts";
import { z } from "zod";
import { estimates, projectRates, rateBook } from "../../db/schema.js";
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
  /** Imported estimates (light — no pack payload); optionally scoped to a project. */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(({ ctx, input }) =>
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
        .where(input?.projectId ? eq(estimates.projectId, input.projectId) : undefined)
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
   * Re-cost an estimate against the office rate book, layered with the project's
   * own rate overrides (project rate → office rate → as-estimated). Returns the
   * four costed views with as-estimated vs as-costed and the variance. Pure
   * recompute — nothing persisted.
   */
  recost: protectedProcedure
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "estimate not found" });

      const parsed = EstimateFile.safeParse(row.pack);
      if (!parsed.success) throw new TRPCError({ code: "BAD_REQUEST", message: "stored pack is not a valid .aormsest" });

      const book = await ctx.db
        .select({ code: rateBook.code, description: rateBook.description, ratePaise: rateBook.ratePaise })
        .from(rateBook)
        .where(eq(rateBook.active, true));
      const rates = buildRateBookRates(book, { code: "OFFICE", name: "Office rate book" });

      // Project-level overrides (the project rate book).
      const projectId = input.projectId ?? row.projectId ?? null;
      let projectItemRatePaise: Record<string, number> = {};
      if (projectId) {
        const overrides = await ctx.db
          .select({ code: projectRates.code, ratePaise: projectRates.ratePaise })
          .from(projectRates)
          .where(eq(projectRates.projectId, projectId));
        projectItemRatePaise = Object.fromEntries(overrides.map((o) => [o.code, o.ratePaise]));
      }

      return {
        estimate: { id: row.id, title: row.title, projectId, importedAt: row.createdAt },
        rateBook: {
          code: rates.code,
          name: rates.name,
          entryCount: book.length,
          projectOverrides: Object.keys(projectItemRatePaise).length,
        },
        costed: recostEstimate(parsed.data, rates, { projectItemRatePaise }),
      };
    }),

  /** The project rate book — a project's rate overrides, ordered by code. */
  projectRates: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(projectRates)
        .where(eq(projectRates.projectId, input.projectId))
        .orderBy(asc(projectRates.code)),
    ),

  /** Set (upsert) one project rate override, keyed by (projectId, code). */
  setProjectRate: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        code: z.string().min(1).max(60),
        description: z.string().max(400).default(""),
        unit: z.string().max(40).default(""),
        ratePaise: z.number().int().nonnegative(),
        note: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(projectRates)
        .values({ ...input, note: input.note ?? null })
        .onConflictDoUpdate({
          target: [projectRates.projectId, projectRates.code],
          set: {
            description: input.description,
            unit: input.unit,
            ratePaise: input.ratePaise,
            note: input.note ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();
      await writeAudit(ctx.db, { entity: "project_rate", entityId: row!.id, action: "UPSERT", actorId: ctx.user.id });
      return row;
    }),

  removeProjectRate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.delete(projectRates).where(eq(projectRates.id, input.id)).returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "project rate not found" });
      await writeAudit(ctx.db, { entity: "project_rate", entityId: row.id, action: "DELETE", actorId: ctx.user.id });
      return { ok: true };
    }),

  /** Seed a project's rate book from the active office rate book (copy rates the
   *  project can then edit). Idempotent by (projectId, code). */
  seedProjectRatesFromOffice: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const book = await ctx.db.select().from(rateBook).where(eq(rateBook.active, true));
      if (!book.length) return { inserted: 0 };
      const values = book.map((b) => ({
        projectId: input.projectId,
        code: b.code,
        description: b.description,
        unit: b.unit,
        ratePaise: b.ratePaise,
      }));
      const before = await ctx.db
        .select({ code: projectRates.code })
        .from(projectRates)
        .where(eq(projectRates.projectId, input.projectId));
      const existing = new Set(before.map((r) => r.code));
      const fresh = values.filter((v) => !existing.has(v.code));
      if (fresh.length) await ctx.db.insert(projectRates).values(fresh);
      await writeAudit(ctx.db, {
        entity: "project_rate",
        action: "SEED",
        actorId: ctx.user.id,
        after: { projectId: input.projectId, inserted: fresh.length },
      });
      return { inserted: fresh.length };
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
