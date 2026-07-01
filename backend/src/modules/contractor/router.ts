import { ContractorCategory, ContractorCreate, ContractorRating, ContractorUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { contractors } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { newPublicId } from "../../licensing-platform/lib/ids.js";
import { assertNotFixedPlan, assertQuota } from "../../lib/plan.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const blank = (v: string | undefined) => (v && v.length > 0 ? v : null);
const manage = capabilityProcedure("write");

export const contractorRouter = router({
  list: protectedProcedure
    .input(
      z.object({ category: ContractorCategory.optional(), activeOnly: z.boolean().optional() }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters = [
        input?.category ? eq(contractors.category, input.category) : undefined,
        input?.activeOnly ? eq(contractors.active, true) : undefined,
      ].filter(Boolean);
      return ctx.db
        .select()
        .from(contractors)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(asc(contractors.name));
    }),

  create: manage.input(ContractorCreate).mutation(async ({ ctx, input }) => {
    await assertNotFixedPlan(ctx.db);
    const rows = await ctx.db.select({ count: sql<number>`count(*)::int` }).from(contractors);
    const currentCount = rows[0] ? rows[0].count : 0;
    await assertQuota(ctx.db, "contractors", currentCount);
    const [row] = await ctx.db
      .insert(contractors)
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
    await writeAudit(ctx.db, { entity: "contractor", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: manage.input(ContractorUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const [before] = await ctx.db.select().from(contractors).where(eq(contractors.id, id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .update(contractors)
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
      .where(eq(contractors.id, id))
      .returning();
    await writeAudit(ctx.db, { entity: "contractor", entityId: id, action: "UPDATE", actorId: ctx.user.id, before, after: row });
    return row!;
  }),

  setRating: manage.input(ContractorRating).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(contractors).where(eq(contractors.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .update(contractors)
      .set({
        qualityRating: input.qualityRating ?? null,
        timelinessRating: input.timelinessRating ?? null,
        safetyRating: input.safetyRating ?? null,
        notes: blank(input.notes),
        updatedAt: new Date(),
      })
      .where(eq(contractors.id, input.id))
      .returning();
    await writeAudit(ctx.db, { entity: "contractor", entityId: input.id, action: "RATE", actorId: ctx.user.id, before, after: row });
    return row!;
  }),

  remove: capabilityProcedure("write").input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(contractors).where(eq(contractors.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.delete(contractors).where(eq(contractors.id, input.id));
    await writeAudit(ctx.db, { entity: "contractor", entityId: input.id, action: "DELETE", actorId: ctx.user.id, before });
    return { ok: true as const };
  }),
});
