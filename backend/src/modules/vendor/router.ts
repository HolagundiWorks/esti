import {
  VendorByIdInput,
  VendorCategory,
  VendorCreate,
  VendorPriceCreate,
  VendorPriceHistoryInput,
  VendorPricesByVendorInput,
  VendorRating,
  VendorUpdate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { vendorPrices, vendors } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
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
});
