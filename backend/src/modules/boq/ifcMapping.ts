import { IfcMappingCreate } from "@esti/contracts";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { components, ifcMappings } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

/**
 * IFC entity → AORMS component reference catalog. Lets a takeoff/IFC import
 * resolve a modeled entity (e.g. IfcFooting / PAD_FOOTING) to the component
 * master that drives its quantity + rate. See docs/esti/IFC-COMPONENT-MAPPING.md.
 */
export const ifcMappingRouter = router({
  /** All mappings joined to their target component. */
  list: protectedProcedure.query(async ({ ctx }) => {
    await assertPlanFeature(ctx.db, "costing");
    return ctx.db
      .select({
        id: ifcMappings.id,
        ifcEntity: ifcMappings.ifcEntity,
        predefinedType: ifcMappings.predefinedType,
        componentId: ifcMappings.componentId,
        notes: ifcMappings.notes,
        componentCode: components.code,
        componentName: components.name,
      })
      .from(ifcMappings)
      .leftJoin(components, eq(components.id, ifcMappings.componentId))
      .orderBy(asc(ifcMappings.ifcEntity));
  }),

  /** Resolve an IFC entity (+ optional predefined type) to its component. */
  lookup: protectedProcedure
    .input(z.object({ ifcEntity: z.string().min(1), predefinedType: z.string().nullable().optional() }))
    .query(async ({ ctx, input }) => {
      const matches = await ctx.db
        .select()
        .from(ifcMappings)
        .where(eq(ifcMappings.ifcEntity, input.ifcEntity));
      // Prefer an exact predefined-type match, else the entity-level default.
      const exact = input.predefinedType
        ? matches.find((m) => m.predefinedType === input.predefinedType)
        : undefined;
      const chosen = exact ?? matches.find((m) => !m.predefinedType) ?? matches[0];
      if (!chosen) return null;
      const [component] = await ctx.db
        .select()
        .from(components)
        .where(eq(components.id, chosen.componentId));
      return { mapping: chosen, component: component ?? null };
    }),

  create: protectedProcedure.input(IfcMappingCreate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    // One mapping per (entity, predefinedType) — replace any prior target.
    const dupe = await ctx.db
      .select({ id: ifcMappings.id })
      .from(ifcMappings)
      .where(
        and(
          eq(ifcMappings.ifcEntity, input.ifcEntity),
          input.predefinedType
            ? eq(ifcMappings.predefinedType, input.predefinedType)
            : eq(ifcMappings.componentId, input.componentId),
        ),
      );
    const [row] = await ctx.db
      .insert(ifcMappings)
      .values({
        ifcEntity: input.ifcEntity,
        predefinedType: input.predefinedType ?? null,
        componentId: input.componentId,
        notes: input.notes ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "ifc_mapping",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { ifcEntity: input.ifcEntity, predefinedType: input.predefinedType ?? null },
    });
    return { ...row!, replacedCount: dupe.length };
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      await ctx.db.delete(ifcMappings).where(eq(ifcMappings.id, input.id));
      return { ok: true };
    }),
});
