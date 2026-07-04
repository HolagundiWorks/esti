import {
  KbBrandCreate,
  KbBrandUpdate,
  KbByItemInput,
  KbByMaterialInput,
  KbByParentItemInput,
  KbBySpecInput,
  KbIdInput,
  KbItemDependencyCreate,
  KbItemDependencyUpdate,
  KbItemCreate,
  KbItemUpdate,
  KbLaborCreate,
  KbLaborUpdate,
  KbMaterialBrandAdd,
  KbMaterialBrandUpdate,
  KbMaterialCreate,
  KbMaterialUpdate,
  KbSpecificationCreate,
  KbSpecificationUpdate,
  KbSpecLaborAdd,
  KbSpecLaborUpdate,
  KbSpecMaterialAdd,
  KbSpecMaterialUpdate,
  specLaborCostPaise,
  specMaterialCostPaise,
  ImportCommitItems,
  ImportCommitLabour,
  ImportCommitMaterials,
  canonicalUnit,
  normName,
  type ImportCommitResult,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  kbBrands,
  kbItemDependencies,
  kbItems,
  kbLabor,
  kbMaterialBrands,
  kbMaterials,
  kbSpecifications,
  kbSpecLabor,
  kbSpecMaterials,
} from "../../db/schema.js";
import { alias } from "drizzle-orm/pg-core";
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

// ── Brand library (manufacturers) ───────────────────────────────────────────
const brands = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(kbBrands)
      .orderBy(desc(kbBrands.active), asc(kbBrands.name)),
  ),
  create: protectedProcedure
    .input(KbBrandCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(kbBrands)
        .values({
          name: input.name,
          category: input.category ?? null,
          website: input.website ?? null,
          notes: input.notes ?? null,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "kb_brand",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),
  bulkCreate: protectedProcedure
    .input(z.array(KbBrandCreate).max(5000))
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return { inserted: 0 };
      await ctx.db.insert(kbBrands).values(
        input.map((b) => ({
          name: b.name,
          category: b.category ?? null,
          website: b.website ?? null,
          notes: b.notes ?? null,
        })),
      );
      return { inserted: input.length };
    }),
  update: protectedProcedure
    .input(KbBrandUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(kbBrands)
        .set(definedOnly(rest))
        .where(eq(kbBrands.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "kb_brand",
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
      await ctx.db.delete(kbBrands).where(eq(kbBrands.id, input.id));
      await writeAudit(ctx.db, {
        entity: "kb_brand",
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
          unit: input.unit ?? null,
          ratePaise: input.ratePaise,
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
          unit: s.unit ?? null,
          ratePaise: s.ratePaise,
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
  /** Rate analysis (approach B) — build the spec's applied rate from its
   *  material + labour recipe × the KB default rates, with the breakdown. */
  analyse: protectedProcedure.input(KbBySpecInput).query(async ({ ctx, input }) => {
    const materials = await ctx.db
      .select({
        materialId: kbSpecMaterials.materialId,
        name: kbMaterials.name,
        unit: kbMaterials.unit,
        quantityPerUnit: kbSpecMaterials.quantityPerUnit,
        wastageFactor: kbSpecMaterials.wastageFactor,
        ratePaise: kbMaterials.defaultRatePaise,
      })
      .from(kbSpecMaterials)
      .innerJoin(kbMaterials, eq(kbSpecMaterials.materialId, kbMaterials.id))
      .where(eq(kbSpecMaterials.specificationId, input.specificationId))
      .orderBy(asc(kbMaterials.name));
    const labor = await ctx.db
      .select({
        laborId: kbSpecLabor.laborId,
        name: kbLabor.name,
        unit: kbLabor.unit,
        quantityPerUnit: kbSpecLabor.quantityPerUnit,
        ratePaise: kbLabor.defaultRatePaise,
      })
      .from(kbSpecLabor)
      .innerJoin(kbLabor, eq(kbSpecLabor.laborId, kbLabor.id))
      .where(eq(kbSpecLabor.specificationId, input.specificationId))
      .orderBy(asc(kbLabor.name));
    const materialPaise = specMaterialCostPaise(materials);
    const laborPaise = specLaborCostPaise(labor);
    return { materials, labor, materialPaise, laborPaise, ratePaise: materialPaise + laborPaise };
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

// ── Material → brand mapping (which branded variants supply a material) ──────
const materialBrands = router({
  listByMaterial: protectedProcedure
    .input(KbByMaterialInput)
    .query(({ ctx, input }) =>
      ctx.db
        .select({
          id: kbMaterialBrands.id,
          brandId: kbMaterialBrands.brandId,
          gradeOrVariant: kbMaterialBrands.gradeOrVariant,
          qualityLevel: kbMaterialBrands.qualityLevel,
          preferred: kbMaterialBrands.preferred,
          brandName: kbBrands.name,
        })
        .from(kbMaterialBrands)
        .innerJoin(kbBrands, eq(kbMaterialBrands.brandId, kbBrands.id))
        .where(eq(kbMaterialBrands.materialId, input.materialId))
        .orderBy(desc(kbMaterialBrands.preferred), asc(kbBrands.name)),
    ),
  add: protectedProcedure
    .input(KbMaterialBrandAdd)
    .mutation(async ({ ctx, input }) => {
      if (input.preferred) {
        await ctx.db
          .update(kbMaterialBrands)
          .set({ preferred: false })
          .where(eq(kbMaterialBrands.materialId, input.materialId));
      }
      const [row] = await ctx.db
        .insert(kbMaterialBrands)
        .values({
          materialId: input.materialId,
          brandId: input.brandId,
          gradeOrVariant: input.gradeOrVariant ?? null,
          qualityLevel: input.qualityLevel ?? null,
          preferred: input.preferred,
        })
        .returning();
      return row!;
    }),
  update: protectedProcedure
    .input(KbMaterialBrandUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [existing] = await ctx.db
        .select()
        .from(kbMaterialBrands)
        .where(eq(kbMaterialBrands.id, id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (rest.preferred === true) {
        await ctx.db
          .update(kbMaterialBrands)
          .set({ preferred: false })
          .where(eq(kbMaterialBrands.materialId, existing.materialId));
      }
      const [row] = await ctx.db
        .update(kbMaterialBrands)
        .set(definedOnly(rest))
        .where(eq(kbMaterialBrands.id, id))
        .returning();
      return row!;
    }),
  remove: protectedProcedure.input(KbIdInput).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(kbMaterialBrands).where(eq(kbMaterialBrands.id, input.id));
    return { ok: true };
  }),
});

// ── Item dependencies (KB Phase 5 / CMS-3) ──────────────────────────────────
const childItem = alias(kbItems, "child_item");
const parentItem = alias(kbItems, "parent_item");
const dependencies = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        id: kbItemDependencies.id,
        parentItemId: kbItemDependencies.parentItemId,
        parentItemName: parentItem.name,
        childItemId: kbItemDependencies.childItemId,
        childItemName: childItem.name,
        childItemUnit: childItem.unit,
        ratio: kbItemDependencies.ratio,
        dependencyType: kbItemDependencies.dependencyType,
        derivation: kbItemDependencies.derivation,
        notes: kbItemDependencies.notes,
      })
      .from(kbItemDependencies)
      .leftJoin(parentItem, eq(kbItemDependencies.parentItemId, parentItem.id))
      .leftJoin(childItem, eq(kbItemDependencies.childItemId, childItem.id))
      .orderBy(asc(parentItem.name), asc(childItem.name)),
  ),
  listByParent: protectedProcedure
    .input(KbByParentItemInput)
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(kbItemDependencies)
        .where(eq(kbItemDependencies.parentItemId, input.parentItemId)),
    ),
  create: protectedProcedure
    .input(KbItemDependencyCreate)
    .mutation(async ({ ctx, input }) => {
      if (input.parentItemId === input.childItemId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "An item cannot depend on itself." });
      }
      const [row] = await ctx.db
        .insert(kbItemDependencies)
        .values({
          parentItemId: input.parentItemId,
          childItemId: input.childItemId,
          ratio: input.ratio,
          dependencyType: input.dependencyType,
          derivation: input.derivation,
          notes: input.notes ?? null,
        })
        .returning();
      return row!;
    }),
  update: protectedProcedure
    .input(KbItemDependencyUpdate)
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = {};
      if (input.ratio !== undefined) patch.ratio = input.ratio;
      if (input.dependencyType !== undefined) patch.dependencyType = input.dependencyType;
      if (input.derivation !== undefined) patch.derivation = input.derivation;
      if (input.notes !== undefined) patch.notes = input.notes ?? null;
      if (Object.keys(patch).length === 0) {
        const [row] = await ctx.db
          .select()
          .from(kbItemDependencies)
          .where(eq(kbItemDependencies.id, input.id));
        return row!;
      }
      const [row] = await ctx.db
        .update(kbItemDependencies)
        .set(patch)
        .where(eq(kbItemDependencies.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
  remove: protectedProcedure.input(KbIdInput).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(kbItemDependencies).where(eq(kbItemDependencies.id, input.id));
    return { ok: true };
  }),
});

// ── Text import — upsert reviewed rows by normName + canonical unit ──────────
// Dedup so re-importing the same schedule refreshes rates in place, never
// duplicates. See docs/esti/IMPORT_SPEC.md. The name portion is additionally
// whitespace-stripped so "6 mm" and "6mm" resolve to the same key.
const nameKey = (name: string): string => normName(name).replace(/\s+/g, "");
const matchKey = (name: string, unit: string | null): string =>
  `${nameKey(name)}|${canonicalUnit(unit) ?? (unit ?? "").toLowerCase().trim()}`;

const importRouter = router({
  commitMaterials: protectedProcedure
    .input(ImportCommitMaterials)
    .mutation(async ({ ctx, input }): Promise<ImportCommitResult> => {
      const existing = await ctx.db
        .select({
          id: kbMaterials.id,
          name: kbMaterials.name,
          unit: kbMaterials.unit,
          rate: kbMaterials.defaultRatePaise,
        })
        .from(kbMaterials);
      const seen = new Map(existing.map((m) => [matchKey(m.name, m.unit), { id: m.id, rate: m.rate }]));
      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      for (const r of input.rows) {
        const name = r.name.trim();
        const unit = canonicalUnit(r.unit) ?? (r.unit?.trim() || null);
        if (!name || !unit) {
          skipped++;
          continue;
        }
        const k = matchKey(name, unit);
        const hit = seen.get(k);
        if (hit) {
          if (r.ratePaise != null && r.ratePaise !== hit.rate) {
            await ctx.db
              .update(kbMaterials)
              .set({ defaultRatePaise: r.ratePaise })
              .where(eq(kbMaterials.id, hit.id));
            updated++;
          } else skipped++;
        } else {
          const [row] = await ctx.db
            .insert(kbMaterials)
            .values({ name, unit, category: r.category ?? null, defaultRatePaise: r.ratePaise ?? 0 })
            .returning({ id: kbMaterials.id });
          seen.set(k, { id: row!.id, rate: r.ratePaise ?? 0 });
          inserted++;
        }
      }
      return { inserted, updated, skipped };
    }),

  commitLabour: protectedProcedure
    .input(ImportCommitLabour)
    .mutation(async ({ ctx, input }): Promise<ImportCommitResult> => {
      const existing = await ctx.db
        .select({ id: kbLabor.id, name: kbLabor.name, unit: kbLabor.unit, rate: kbLabor.defaultRatePaise })
        .from(kbLabor);
      const seen = new Map(existing.map((m) => [matchKey(m.name, m.unit), { id: m.id, rate: m.rate }]));
      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      for (const r of input.rows) {
        const name = r.name.trim();
        const unit = canonicalUnit(r.unit) ?? (r.unit?.trim() || null);
        if (!name || !unit) {
          skipped++;
          continue;
        }
        const k = matchKey(name, unit);
        const hit = seen.get(k);
        if (hit) {
          if (r.ratePaise != null && r.ratePaise !== hit.rate) {
            await ctx.db.update(kbLabor).set({ defaultRatePaise: r.ratePaise }).where(eq(kbLabor.id, hit.id));
            updated++;
          } else skipped++;
        } else {
          const [row] = await ctx.db
            .insert(kbLabor)
            .values({ name, unit, defaultRatePaise: r.ratePaise ?? 0 })
            .returning({ id: kbLabor.id });
          seen.set(k, { id: row!.id, rate: r.ratePaise ?? 0 });
          inserted++;
        }
      }
      return { inserted, updated, skipped };
    }),

  commitItems: protectedProcedure
    .input(ImportCommitItems)
    .mutation(async ({ ctx, input }): Promise<ImportCommitResult> => {
      const existingItems = await ctx.db
        .select({ id: kbItems.id, name: kbItems.name, unit: kbItems.unit })
        .from(kbItems);
      const itemMap = new Map(existingItems.map((i) => [matchKey(i.name, i.unit), i.id]));
      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const r of input.rows) {
        const name = r.name.trim();
        const unit = canonicalUnit(r.unit) ?? (r.unit?.trim() || null);
        if (!name || !unit) {
          skipped++;
          continue;
        }
        const ik = matchKey(name, unit);
        let itemId = itemMap.get(ik);
        if (!itemId) {
          const [row] = await ctx.db
            .insert(kbItems)
            .values({ name, unit, category: r.category ?? null })
            .returning({ id: kbItems.id });
          itemId = row!.id;
          itemMap.set(ik, itemId);
          inserted++;
        }
        // Attach / refresh a specification when a rate is present.
        if (r.ratePaise != null) {
          const specName = r.specName?.trim() || name;
          const specs = await ctx.db
            .select({ id: kbSpecifications.id, name: kbSpecifications.name, rate: kbSpecifications.ratePaise })
            .from(kbSpecifications)
            .where(eq(kbSpecifications.itemId, itemId));
          const hit = specs.find((s) => nameKey(s.name) === nameKey(specName));
          if (hit) {
            if (r.ratePaise !== hit.rate) {
              await ctx.db
                .update(kbSpecifications)
                .set({ ratePaise: r.ratePaise, unit })
                .where(eq(kbSpecifications.id, hit.id));
              updated++;
            } else skipped++;
          } else {
            await ctx.db.insert(kbSpecifications).values({
              itemId,
              name: specName,
              unit,
              ratePaise: r.ratePaise,
              isDefault: specs.length === 0,
            });
            inserted++;
          }
        }
      }
      return { inserted, updated, skipped };
    }),
});

/** Construction Knowledge Bank router — libraries + specifications + recipes + text import. */
export const kbRouter = router({
  materials,
  labor,
  items,
  brands,
  materialBrands,
  specifications,
  recipes,
  dependencies,
  import: importRouter,
});
