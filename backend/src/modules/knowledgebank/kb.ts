import {
  KbIdInput,
  KbItemCreate,
  KbItemUpdate,
  KbLaborCreate,
  KbLaborUpdate,
  KbMaterialCreate,
  KbMaterialUpdate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { kbItems, kbLabor, kbMaterials } from "../../db/schema.js";
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

/** Construction Knowledge Bank router — foundation libraries (Phase 1). */
export const kbRouter = router({
  materials,
  labor,
  items,
});
