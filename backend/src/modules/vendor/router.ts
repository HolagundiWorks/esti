import {
  VendorByIdInput,
  VendorCategory,
  VendorCreate,
  VendorPriceCreate,
  VendorPriceHistoryInput,
  VendorPricesByVendorInput,
  VendorQuoteCompareInput,
  VendorQuoteCreate,
  VendorQuotesByVendorInput,
  VendorRating,
  VendorUpdate,
  type VendorQuoteComparisonRow,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { vendorPrices, vendorQuoteLines, vendorQuotes, vendors } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { newPublicId } from "../../licensing-platform/lib/ids.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const blank = (v: string | undefined) => (v && v.length > 0 ? v : null);
const manage = capabilityProcedure("write");

export const vendorRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({ category: VendorCategory.optional(), activeOnly: z.boolean().optional() })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters = [
        input?.category ? eq(vendors.category, input.category) : undefined,
        input?.activeOnly ? eq(vendors.active, true) : undefined,
      ].filter(Boolean);
      return ctx.db
        .select()
        .from(vendors)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(asc(vendors.name));
    }),

  create: manage.input(VendorCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(vendors)
      .values({
        publicId: newPublicId("X"),
        name: input.name,
        category: input.category,
        companyName: blank(input.companyName),
        contactPerson: blank(input.contactPerson),
        gstin: blank(input.gstin),
        pan: blank(input.pan),
        email: blank(input.email),
        phone: blank(input.phone),
        city: blank(input.city),
        state: blank(input.state),
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "vendor", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: manage.input(VendorUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const [before] = await ctx.db.select().from(vendors).where(eq(vendors.id, id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .update(vendors)
      .set({
        ...(rest.name !== undefined ? { name: rest.name } : {}),
        ...(rest.category !== undefined ? { category: rest.category } : {}),
        ...(rest.companyName !== undefined ? { companyName: blank(rest.companyName) } : {}),
        ...(rest.contactPerson !== undefined ? { contactPerson: blank(rest.contactPerson) } : {}),
        ...(rest.gstin !== undefined ? { gstin: blank(rest.gstin) } : {}),
        ...(rest.pan !== undefined ? { pan: blank(rest.pan) } : {}),
        ...(rest.email !== undefined ? { email: blank(rest.email) } : {}),
        ...(rest.phone !== undefined ? { phone: blank(rest.phone) } : {}),
        ...(rest.city !== undefined ? { city: blank(rest.city) } : {}),
        ...(rest.state !== undefined ? { state: blank(rest.state) } : {}),
        ...(rest.active !== undefined ? { active: rest.active } : {}),
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, id))
      .returning();
    await writeAudit(ctx.db, { entity: "vendor", entityId: id, action: "UPDATE", actorId: ctx.user.id, before, after: row });
    return row!;
  }),

  setRating: manage.input(VendorRating).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(vendors).where(eq(vendors.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .update(vendors)
      .set({
        qualityRating: input.qualityRating ?? null,
        reliabilityRating: input.reliabilityRating ?? null,
        pricingRating: input.pricingRating ?? null,
        notes: blank(input.notes),
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, input.id))
      .returning();
    await writeAudit(ctx.db, { entity: "vendor", entityId: input.id, action: "RATE", actorId: ctx.user.id, before, after: row });
    return row!;
  }),

  remove: manage.input(VendorByIdInput).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(vendors).where(eq(vendors.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.delete(vendors).where(eq(vendors.id, input.id));
    await writeAudit(ctx.db, { entity: "vendor", entityId: input.id, action: "DELETE", actorId: ctx.user.id, before });
    return { ok: true as const };
  }),

  // ── Pricing history ─────────────────────────────────────────────────────────
  pricesByVendor: protectedProcedure
    .input(VendorPricesByVendorInput)
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(vendorPrices)
        .where(eq(vendorPrices.vendorId, input.vendorId))
        .orderBy(desc(vendorPrices.effectiveDate), desc(vendorPrices.createdAt)),
    ),

  addPrice: manage.input(VendorPriceCreate).mutation(async ({ ctx, input }) => {
    const [vendor] = await ctx.db.select({ id: vendors.id }).from(vendors).where(eq(vendors.id, input.vendorId));
    if (!vendor) throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found." });
    const [row] = await ctx.db
      .insert(vendorPrices)
      .values({
        vendorId: input.vendorId,
        materialId: input.materialId ?? null,
        materialName: input.materialName,
        unit: input.unit,
        ratePaise: input.ratePaise,
        effectiveDate: input.effectiveDate,
        source: input.source,
        notes: blank(input.notes),
        createdById: ctx.user.id,
      })
      .returning();
    return row!;
  }),

  removePrice: manage.input(VendorByIdInput).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select({ id: vendorPrices.id }).from(vendorPrices).where(eq(vendorPrices.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.delete(vendorPrices).where(eq(vendorPrices.id, input.id));
    return { ok: true as const };
  }),

  /** Price history for a material across all vendors — latest first. Filter by
   *  a KB materialId (preferred) or a free-text materialName match. */
  priceHistory: protectedProcedure
    .input(VendorPriceHistoryInput)
    .query(async ({ ctx, input }) => {
      if (!input.materialId && !input.materialName) return [];
      const filter = input.materialId
        ? eq(vendorPrices.materialId, input.materialId)
        : eq(vendorPrices.materialName, input.materialName!);
      return ctx.db
        .select({
          id: vendorPrices.id,
          vendorId: vendorPrices.vendorId,
          vendorName: vendors.name,
          materialName: vendorPrices.materialName,
          unit: vendorPrices.unit,
          ratePaise: vendorPrices.ratePaise,
          effectiveDate: vendorPrices.effectiveDate,
          source: vendorPrices.source,
        })
        .from(vendorPrices)
        .leftJoin(vendors, eq(vendorPrices.vendorId, vendors.id))
        .where(filter)
        .orderBy(desc(vendorPrices.effectiveDate));
    }),

  // ── Quotations ──────────────────────────────────────────────────────────────
  quotes: router({
    listByVendor: protectedProcedure
      .input(VendorQuotesByVendorInput)
      .query(async ({ ctx, input }) => {
        const quotes = await ctx.db
          .select()
          .from(vendorQuotes)
          .where(eq(vendorQuotes.vendorId, input.vendorId))
          .orderBy(desc(vendorQuotes.quoteDate), desc(vendorQuotes.createdAt));
        // line count + total per quote
        const counts = await ctx.db
          .select({
            quoteId: vendorQuoteLines.quoteId,
            lineCount: sql<number>`count(*)::int`,
            totalPaise: sql<number>`coalesce(sum(${vendorQuoteLines.ratePaise}), 0)::int`,
          })
          .from(vendorQuoteLines)
          .groupBy(vendorQuoteLines.quoteId);
        const byId = new Map(counts.map((c) => [c.quoteId, c]));
        return quotes.map((q) => ({
          ...q,
          lineCount: byId.get(q.id)?.lineCount ?? 0,
          totalPaise: byId.get(q.id)?.totalPaise ?? 0,
        }));
      }),

    byId: protectedProcedure.input(VendorByIdInput).query(async ({ ctx, input }) => {
      const [quote] = await ctx.db.select().from(vendorQuotes).where(eq(vendorQuotes.id, input.id));
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
      const lines = await ctx.db
        .select()
        .from(vendorQuoteLines)
        .where(eq(vendorQuoteLines.quoteId, input.id))
        .orderBy(asc(vendorQuoteLines.createdAt));
      return { ...quote, lines };
    }),

    create: manage.input(VendorQuoteCreate).mutation(async ({ ctx, input }) => {
      const [vendor] = await ctx.db.select({ id: vendors.id }).from(vendors).where(eq(vendors.id, input.vendorId));
      if (!vendor) throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found." });
      const [quote] = await ctx.db
        .insert(vendorQuotes)
        .values({
          vendorId: input.vendorId,
          ref: input.ref,
          quoteDate: input.quoteDate,
          validUntil: input.validUntil ?? null,
          notes: blank(input.notes),
          status: "RECEIVED",
          createdById: ctx.user.id,
        })
        .returning();
      await ctx.db.insert(vendorQuoteLines).values(
        input.lines.map((l) => ({
          quoteId: quote!.id,
          materialId: l.materialId ?? null,
          materialName: l.materialName,
          unit: l.unit,
          ratePaise: l.ratePaise,
        })),
      );
      return quote!;
    }),

    /** Accept a quote → snapshot every line into the vendor pricing history. */
    accept: manage.input(VendorByIdInput).mutation(async ({ ctx, input }) => {
      const [quote] = await ctx.db.select().from(vendorQuotes).where(eq(vendorQuotes.id, input.id));
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
      if (quote.status === "ACCEPTED") return { ok: true as const, priced: 0 };
      const lines = await ctx.db.select().from(vendorQuoteLines).where(eq(vendorQuoteLines.quoteId, input.id));
      if (lines.length > 0) {
        await ctx.db.insert(vendorPrices).values(
          lines.map((l) => ({
            vendorId: quote.vendorId,
            materialId: l.materialId ?? null,
            materialName: l.materialName,
            unit: l.unit,
            ratePaise: l.ratePaise,
            effectiveDate: quote.quoteDate,
            source: "QUOTE",
            notes: `From quote ${quote.ref}`,
            createdById: ctx.user.id,
          })),
        );
      }
      await ctx.db.update(vendorQuotes).set({ status: "ACCEPTED" }).where(eq(vendorQuotes.id, input.id));
      return { ok: true as const, priced: lines.length };
    }),

    reject: manage.input(VendorByIdInput).mutation(async ({ ctx, input }) => {
      const [quote] = await ctx.db.select({ id: vendorQuotes.id }).from(vendorQuotes).where(eq(vendorQuotes.id, input.id));
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.update(vendorQuotes).set({ status: "REJECTED" }).where(eq(vendorQuotes.id, input.id));
      return { ok: true as const };
    }),

    remove: manage.input(VendorByIdInput).mutation(async ({ ctx, input }) => {
      const [quote] = await ctx.db.select({ id: vendorQuotes.id }).from(vendorQuotes).where(eq(vendorQuotes.id, input.id));
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(vendorQuotes).where(eq(vendorQuotes.id, input.id));
      return { ok: true as const };
    }),

    /** Cross-vendor comparison for one material — latest quoted rate per vendor, cheapest first. */
    compare: protectedProcedure
      .input(VendorQuoteCompareInput)
      .query(async ({ ctx, input }): Promise<VendorQuoteComparisonRow[]> => {
        if (!input.materialId && !input.materialName) return [];
        const filter = input.materialId
          ? eq(vendorQuoteLines.materialId, input.materialId)
          : eq(vendorQuoteLines.materialName, input.materialName!);
        const rows = await ctx.db
          .select({
            vendorId: vendorQuotes.vendorId,
            vendorName: vendors.name,
            quoteId: vendorQuotes.id,
            quoteRef: vendorQuotes.ref,
            quoteDate: vendorQuotes.quoteDate,
            unit: vendorQuoteLines.unit,
            ratePaise: vendorQuoteLines.ratePaise,
          })
          .from(vendorQuoteLines)
          .innerJoin(vendorQuotes, eq(vendorQuoteLines.quoteId, vendorQuotes.id))
          .leftJoin(vendors, eq(vendorQuotes.vendorId, vendors.id))
          .where(filter);
        // keep the latest quote per vendor
        const latestByVendor = new Map<string, (typeof rows)[number]>();
        for (const r of rows) {
          const cur = latestByVendor.get(r.vendorId);
          if (!cur || r.quoteDate > cur.quoteDate) latestByVendor.set(r.vendorId, r);
        }
        const result = [...latestByVendor.values()].sort((a, b) => a.ratePaise - b.ratePaise);
        const min = result.length ? result[0]!.ratePaise : 0;
        return result.map((r) => ({
          vendorId: r.vendorId,
          vendorName: r.vendorName ?? "—",
          quoteId: r.quoteId,
          quoteRef: r.quoteRef,
          quoteDate: r.quoteDate,
          unit: r.unit,
          ratePaise: r.ratePaise,
          isLowest: r.ratePaise === min,
        }));
      }),
  }),
});
