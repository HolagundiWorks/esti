import {
  ComponentMasterCreate,
  ComponentMasterUpdate,
  ComponentRelatedCreate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { componentRelated, components } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { ifcMappingRouter } from "./ifcMapping.js";

/** True for the Postgres unique-violation error. */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export const componentRouter = router({
  /** IFC → component reference catalog. */
  ifc: ifcMappingRouter,

  /**
   * Component master list. With no `projectId`, returns shared library
   * components; with one, returns the library plus that project's components.
   */
  list: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().uuid().nullable().optional(),
          includeArchived: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const scope = input?.projectId
        ? or(isNull(components.projectId), eq(components.projectId, input.projectId))
        : isNull(components.projectId);
      const where = input?.includeArchived
        ? scope
        : and(scope, eq(components.status, "ACTIVE"));
      return ctx.db.select().from(components).where(where).orderBy(asc(components.code));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(components).where(eq(components.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const related = await ctx.db
        .select()
        .from(componentRelated)
        .where(eq(componentRelated.parentComponentId, input.id))
        .orderBy(asc(componentRelated.sequence));
      return { ...row, related };
    }),

  create: protectedProcedure.input(ComponentMasterCreate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    try {
      const [row] = await ctx.db
        .insert(components)
        .values({
          code: input.code.toUpperCase(),
          name: input.name,
          level: input.level,
          discipline: input.discipline,
          componentType: input.componentType,
          uom: input.uom,
          kind: input.kind,
          formulaKey: input.formulaKey,
          paramSchema: input.paramSchema,
          rateSource: input.rateSource,
          dsrItemId: input.dsrItemId ?? null,
          rateAnalysisId: input.rateAnalysisId ?? null,
          projectId: input.projectId ?? null,
          notes: input.notes ?? null,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "component",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: { code: row!.code, name: row!.name },
      });
      return row!;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new TRPCError({ code: "CONFLICT", message: `Component code ${input.code} already exists.` });
      }
      throw err;
    }
  }),

  update: protectedProcedure.input(ComponentMasterUpdate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const { id, code, ...rest } = input;
    const [existing] = await ctx.db.select().from(components).where(eq(components.id, id));
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db
      .update(components)
      .set({
        ...(code !== undefined ? { code: code.toUpperCase() } : {}),
        ...(rest.name !== undefined ? { name: rest.name } : {}),
        ...(rest.level !== undefined ? { level: rest.level } : {}),
        ...(rest.discipline !== undefined ? { discipline: rest.discipline } : {}),
        ...(rest.componentType !== undefined ? { componentType: rest.componentType } : {}),
        ...(rest.uom !== undefined ? { uom: rest.uom } : {}),
        ...(rest.kind !== undefined ? { kind: rest.kind } : {}),
        ...(rest.formulaKey !== undefined ? { formulaKey: rest.formulaKey } : {}),
        ...(rest.paramSchema !== undefined ? { paramSchema: rest.paramSchema } : {}),
        ...(rest.rateSource !== undefined ? { rateSource: rest.rateSource } : {}),
        ...(rest.dsrItemId !== undefined ? { dsrItemId: rest.dsrItemId } : {}),
        ...(rest.rateAnalysisId !== undefined ? { rateAnalysisId: rest.rateAnalysisId } : {}),
        ...(rest.notes !== undefined ? { notes: rest.notes } : {}),
        ...(rest.status !== undefined ? { status: rest.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(components.id, id));
    await writeAudit(ctx.db, {
      entity: "component",
      entityId: id,
      action: "UPDATE",
      actorId: ctx.user.id,
    });
    return { ok: true };
  }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      await ctx.db
        .update(components)
        .set({ status: "ARCHIVED", updatedAt: new Date() })
        .where(eq(components.id, input.id));
      await writeAudit(ctx.db, {
        entity: "component",
        entityId: input.id,
        action: "ARCHIVE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  // --- Related-item dependency templates ------------------------------------

  listRelated: protectedProcedure
    .input(z.object({ parentComponentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(componentRelated)
        .where(eq(componentRelated.parentComponentId, input.parentComponentId))
        .orderBy(asc(componentRelated.sequence));
    }),

  addRelated: protectedProcedure
    .input(ComponentRelatedCreate)
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      if (input.parentComponentId === input.childComponentId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A component cannot relate to itself." });
      }
      const [row] = await ctx.db
        .insert(componentRelated)
        .values({
          parentComponentId: input.parentComponentId,
          childComponentId: input.childComponentId,
          ratioFormulaKey: input.ratioFormulaKey ?? null,
          qtyFactor: input.qtyFactor,
          sequence: input.sequence,
        })
        .returning();
      return row!;
    }),

  removeRelated: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      await ctx.db.delete(componentRelated).where(eq(componentRelated.id, input.id));
      return { ok: true };
    }),
});
