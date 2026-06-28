import {
  KbByItemInput,
  KbBySpecInput,
  KbIdInput,
  KbItemCreate,
  KbItemUpdate,
  KbLaborCreate,
  KbLaborUpdate,
  KbMaterialCreate,
  KbMaterialUpdate,
  KbSpecificationCreate,
  KbSpecificationUpdate,
  KbSpecLaborAdd,
  KbSpecLaborUpdate,
  KbSpecMaterialAdd,
  KbSpecMaterialUpdate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  kbItems,
  kbLabor,
  kbMaterials,
  kbSpecifications,
  kbSpecLabor,
  kbSpecMaterials,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

/** Keep only the keys the caller actually provided (so a partial update never
 *  nulls a column the form didn't touch). */
function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

// ── Material library ────────────────────────────────────────────────────────
const materials = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(kbMaterials)
      .orderBy(desc(kbMaterials.active), asc(kbMaterials.name)),
  ),
  create: protectedProcedure
    .input(KbMaterialCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(kbMaterials)
        .values({
          name: input.name,
          unit: input.unit,
          category: input.category ?? null,
          wastageFactor: input.wastageFactor,
          density: input.density ?? null,
          defaultRatePaise: input.defaultRatePaise,
          notes: input.notes ?? null,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "kb_material",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),
  bulkCreate: protectedProcedure
    .input(z.array(KbMaterialCreate).max(5000))
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return { inserted: 0 };
      await ctx.db.insert(kbMaterials).values(
        input.map((m) => ({
          name: m.name,
          unit: m.unit,
          category: m.category ?? null,
          wastageFactor: m.wastageFactor,
          density: m.density ?? null,
          defaultRatePaise: m.defaultRatePaise,
          notes: m.notes ?? null,
        })),
      );
      return { inserted: input.length };
    }),
  update: protectedProcedure
    .input(KbMaterialUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(kbMaterials)
        .set(definedOnly(rest))
        .where(eq(kbMaterials.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "kb_material",
        entityId: id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row;
    }),
  remove: protectedProcedure
    .input(KbIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(kbMaterials).where(eq(kbMaterials.id, input.id));
      await writeAudit(ctx.db, {
        entity: "kb_material",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),
});

// ── Labor library ───────────────────────────────────────────────────────────
const labor = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(kbLabor)
      .orderBy(desc(kbLabor.active), asc(kbLabor.name)),
  ),
  create: protectedProcedure
    .input(KbLaborCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(kbLabor)
        .values({
          name: input.name,
          unit: input.unit,
          rateType: input.rateType ?? null,
          productivityFactor: input.productivityFactor ?? null,
          defaultRatePaise: input.defaultRatePaise,
          notes: input.notes ?? null,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "kb_labor",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),
  bulkCreate: protectedProcedure
    .input(z.array(KbLaborCreate).max(5000))
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return { inserted: 0 };
      await ctx.db.insert(kbLabor).values(
        input.map((m) => ({
          name: m.name,
          unit: m.unit,
          rateType: m.rateType ?? null,
          productivityFactor: m.productivityFactor ?? null,
          defaultRatePaise: m.defaultRatePaise,
          notes: m.notes ?? null,
        })),
      );
      return { inserted: input.length };
    }),
  update: protectedProcedure
    .input(KbLaborUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(kbLabor)
        .set(definedOnly(rest))
        .where(eq(kbLabor.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "kb_labor",
        entityId: id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row;
    }),
  remove: protectedProcedure
    .input(KbIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(kbLabor).where(eq(kbLabor.id, input.id));
      await writeAudit(ctx.db, {
        entity: "kb_labor",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),
});

// ── Item library ────────────────────────────────────────────────────────────
const items = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(kbItems)
      .orderBy(desc(kbItems.active), asc(kbItems.name)),
  ),
  create: protectedProcedure
    .input(KbItemCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(kbItems)
        .values({
          name: input.name,
          category: input.category ?? null,
          unit: input.unit,
          description: input.description ?? null,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "kb_item",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),
  bulkCreate: protectedProcedure
    .input(z.array(KbItemCreate).max(5000))
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return { inserted: 0 };
      await ctx.db.insert(kbItems).values(
        input.map((m) => ({
          name: m.name,
          category: m.category ?? null,
          unit: m.unit,
          description: m.description ?? null,
        })),
      );
      return { inserted: input.length };
    }),
  update: protectedProcedure
    .input(KbItemUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(kbItems)
        .set(definedOnly(rest))
        .where(eq(kbItems.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "kb_item",
        entityId: id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row;
    }),
  remove: protectedProcedure
    .input(KbIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(kbItems).where(eq(kbItems.id, input.id));
      await writeAudit(ctx.db, {
        entity: "kb_item",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),
});

// ── Specification library (method/mix variants mapped to an item) ───────────
const specifications = router({
  listByItem: protectedProcedure
    .input(KbByItemInput)
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(kbSpecifications)
        .where(eq(kbSpecifications.itemId, input.itemId))
        .orderBy(desc(kbSpecifications.isDefault), asc(kbSpecifications.name)),
    ),
  create: protectedProcedure
    .input(KbSpecificationCreate)
    .mutation(async ({ ctx, input }) => {
      // Only one default per item.
      if (input.isDefault) {
        await ctx.db
          .update(kbSpecifications)
          .set({ isDefault: false })
          .where(eq(kbSpecifications.itemId, input.itemId));
      }
      const [row] = await ctx.db
        .insert(kbSpecifications)
        .values({
          itemId: input.itemId,
          name: input.name,
          description: input.description ?? null,
          isDefault: input.isDefault,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "kb_specification",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),
  bulkCreate: protectedProcedure
    .input(z.array(KbSpecificationCreate).max(5000))
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return { inserted: 0 };
      await ctx.db.insert(kbSpecifications).values(
        input.map((s) => ({
          itemId: s.itemId,
          name: s.name,
          description: s.description ?? null,
          isDefault: s.isDefault,
        })),
      );
      return { inserted: input.length };
    }),
  update: protectedProcedure
    .input(KbSpecificationUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [existing] = await ctx.db
        .select()
        .from(kbSpecifications)
        .where(eq(kbSpecifications.id, id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (rest.isDefault === true) {
        await ctx.db
          .update(kbSpecifications)
          .set({ isDefault: false })
          .where(eq(kbSpecifications.itemId, existing.itemId));
      }
      const [row] = await ctx.db
        .update(kbSpecifications)
        .set(definedOnly(rest))
        .where(eq(kbSpecifications.id, id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "kb_specification",
        entityId: id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),
  remove: protectedProcedure
    .input(KbIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(kbSpecifications).where(eq(kbSpecifications.id, input.id));
      await writeAudit(ctx.db, {
        entity: "kb_specification",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),
});

// ── Recipes (data mapper: specification → material / labour consumption) ─────
const recipeMaterials = router({
  listBySpec: protectedProcedure.input(KbBySpecInput).query(({ ctx, input }) =>
    ctx.db
      .select({
        id: kbSpecMaterials.id,
        materialId: kbSpecMaterials.materialId,
        quantityPerUnit: kbSpecMaterials.quantityPerUnit,
        wastageFactor: kbSpecMaterials.wastageFactor,
        materialName: kbMaterials.name,
        materialUnit: kbMaterials.unit,
      })
      .from(kbSpecMaterials)
      .innerJoin(kbMaterials, eq(kbSpecMaterials.materialId, kbMaterials.id))
      .where(eq(kbSpecMaterials.specificationId, input.specificationId))
      .orderBy(asc(kbMaterials.name)),
  ),
  add: protectedProcedure.input(KbSpecMaterialAdd).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(kbSpecMaterials)
      .values({
        specificationId: input.specificationId,
        materialId: input.materialId,
        quantityPerUnit: input.quantityPerUnit,
        wastageFactor: input.wastageFactor,
      })
      .returning();
    return row!;
  }),
  update: protectedProcedure
    .input(KbSpecMaterialUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(kbSpecMaterials)
        .set(definedOnly(rest))
        .where(eq(kbSpecMaterials.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
  remove: protectedProcedure.input(KbIdInput).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(kbSpecMaterials).where(eq(kbSpecMaterials.id, input.id));
    return { ok: true };
  }),
});

const recipeLabor = router({
  listBySpec: protectedProcedure.input(KbBySpecInput).query(({ ctx, input }) =>
    ctx.db
      .select({
        id: kbSpecLabor.id,
        laborId: kbSpecLabor.laborId,
        quantityPerUnit: kbSpecLabor.quantityPerUnit,
        laborName: kbLabor.name,
        laborUnit: kbLabor.unit,
      })
      .from(kbSpecLabor)
      .innerJoin(kbLabor, eq(kbSpecLabor.laborId, kbLabor.id))
      .where(eq(kbSpecLabor.specificationId, input.specificationId))
      .orderBy(asc(kbLabor.name)),
  ),
  add: protectedProcedure.input(KbSpecLaborAdd).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(kbSpecLabor)
      .values({
        specificationId: input.specificationId,
        laborId: input.laborId,
        quantityPerUnit: input.quantityPerUnit,
      })
      .returning();
    return row!;
  }),
  update: protectedProcedure
    .input(KbSpecLaborUpdate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(kbSpecLabor)
        .set({ quantityPerUnit: input.quantityPerUnit })
        .where(eq(kbSpecLabor.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
  remove: protectedProcedure.input(KbIdInput).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(kbSpecLabor).where(eq(kbSpecLabor.id, input.id));
    return { ok: true };
  }),
});

const recipes = router({ materials: recipeMaterials, labor: recipeLabor });

/** Construction Knowledge Bank router — libraries + specifications + recipes. */
export const kbRouter = router({
  materials,
  labor,
  items,
  specifications,
  recipes,
});
