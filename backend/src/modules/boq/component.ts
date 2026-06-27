import {
  type BoqSplitter,
  ComponentMasterCreate,
  ComponentMasterUpdate,
  ComponentRelatedCreate,
  type MaterialSplitter,
  RuleSetDeprecateInput,
  RuleSetDuplicateInput,
  RuleSetPublishInput,
  validateExpression,
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

/**
 * Validate the RuleSet formulas against the work item's variable namespace.
 * Quantity formula sees the measurement-field keys; BOQ + material splitters
 * additionally see the derived `quantity`. Throws BAD_REQUEST on a bad
 * expression or an unknown input.
 */
function validateRuleSetFormulas(
  fieldKeys: string[],
  opts: {
    quantityFormula?: string | null;
    boqSplitters?: BoqSplitter[];
    materialSplitters?: MaterialSplitter[];
  },
): void {
  const derived = [...fieldKeys, "quantity"];
  const check = (expr: string | null | undefined, allowed: string[], label: string): void => {
    if (!expr) return;
    const v = validateExpression(expr, allowed);
    if (!v.ok) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: v.error
          ? `${label}: ${v.error}`
          : `${label} references unknown inputs: ${v.unknownVars.join(", ")}`,
      });
    }
  };
  check(opts.quantityFormula, fieldKeys, "Quantity formula");
  (opts.boqSplitters ?? []).forEach((s, i) =>
    check(s.formula, derived, `BOQ split ${i + 1} (${s.outputName})`),
  );
  (opts.materialSplitters ?? []).forEach((s, i) =>
    check(s.formula, derived, `Material split ${i + 1} (${s.materialName})`),
  );
}

const paramKeys = (paramSchema: unknown): string[] =>
  Array.isArray(paramSchema) ? (paramSchema as { key: string }[]).map((f) => f.key) : [];

export const componentRouter = router({
  /** IFC → component reference catalog. */
  ifc: ifcMappingRouter,

  /**
   * Component master / RuleSet list. With no `projectId`, returns shared library
   * RuleSets; with one, returns the library plus that project's RuleSets.
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
    validateRuleSetFormulas(paramKeys(input.paramSchema), input);
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
          quantityFormula: input.quantityFormula ?? null,
          paramSchema: input.paramSchema,
          boqSplitters: input.boqSplitters,
          materialSplitters: input.materialSplitters,
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
    // Validate formulas against the effective field set (new paramSchema or existing).
    validateRuleSetFormulas(paramKeys(rest.paramSchema ?? existing.paramSchema), {
      quantityFormula: rest.quantityFormula,
      boqSplitters: rest.boqSplitters,
      materialSplitters: rest.materialSplitters,
    });
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
        ...(rest.quantityFormula !== undefined ? { quantityFormula: rest.quantityFormula } : {}),
        ...(rest.paramSchema !== undefined ? { paramSchema: rest.paramSchema } : {}),
        ...(rest.boqSplitters !== undefined ? { boqSplitters: rest.boqSplitters } : {}),
        ...(rest.materialSplitters !== undefined ? { materialSplitters: rest.materialSplitters } : {}),
        ...(rest.rateSource !== undefined ? { rateSource: rest.rateSource } : {}),
        ...(rest.dsrItemId !== undefined ? { dsrItemId: rest.dsrItemId } : {}),
        ...(rest.rateAnalysisId !== undefined ? { rateAnalysisId: rest.rateAnalysisId } : {}),
        ...(rest.notes !== undefined ? { notes: rest.notes } : {}),
        ...(rest.status !== undefined ? { status: rest.status } : {}),
        ...(rest.lifecycle !== undefined ? { lifecycle: rest.lifecycle } : {}),
        ...(rest.version !== undefined ? { version: rest.version } : {}),
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
        .set({ status: "ARCHIVED", lifecycle: "ARCHIVED", updatedAt: new Date() })
        .where(eq(components.id, input.id));
      await writeAudit(ctx.db, {
        entity: "component",
        entityId: input.id,
        action: "ARCHIVE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  // --- RuleSet versioning ----------------------------------------------------

  /** Move a DRAFT RuleSet to PUBLISHED (execution loads only PUBLISHED). */
  publishVersion: protectedProcedure
    .input(RuleSetPublishInput)
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const [row] = await ctx.db.select().from(components).where(eq(components.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (!row.quantityFormula && !row.formulaKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A RuleSet needs a quantity formula before it can be published.",
        });
      }
      await ctx.db
        .update(components)
        .set({ lifecycle: "PUBLISHED", status: "ACTIVE", updatedAt: new Date() })
        .where(eq(components.id, input.id));
      await writeAudit(ctx.db, {
        entity: "component",
        entityId: input.id,
        action: "PUBLISH",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  deprecate: protectedProcedure
    .input(RuleSetDeprecateInput)
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      await ctx.db
        .update(components)
        .set({ lifecycle: "DEPRECATED", updatedAt: new Date() })
        .where(eq(components.id, input.id));
      await writeAudit(ctx.db, {
        entity: "component",
        entityId: input.id,
        action: "DEPRECATE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  /** Duplicate a RuleSet (and its dependency edges) into a new DRAFT version —
   *  never edits a published one (non-negotiable: don't overwrite history). */
  duplicate: protectedProcedure
    .input(RuleSetDuplicateInput)
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const [src] = await ctx.db.select().from(components).where(eq(components.id, input.id));
      if (!src) throw new TRPCError({ code: "NOT_FOUND" });
      const versionSuffix = input.version.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      const newCode = `${src.code}-V${versionSuffix}`;
      try {
        const [copy] = await ctx.db
          .insert(components)
          .values({
            code: newCode,
            name: input.name ?? src.name,
            level: src.level,
            discipline: src.discipline,
            componentType: src.componentType,
            uom: src.uom,
            kind: src.kind,
            formulaKey: src.formulaKey,
            quantityFormula: src.quantityFormula,
            paramSchema: src.paramSchema,
            boqSplitters: src.boqSplitters,
            materialSplitters: src.materialSplitters,
            rateSource: src.rateSource,
            dsrItemId: src.dsrItemId,
            rateAnalysisId: src.rateAnalysisId,
            projectId: src.projectId,
            notes: src.notes,
            version: input.version,
            lifecycle: "DRAFT",
            parentVersionId: src.id,
            status: "ACTIVE",
          })
          .returning();
        const rels = await ctx.db
          .select()
          .from(componentRelated)
          .where(eq(componentRelated.parentComponentId, src.id));
        for (const r of rels) {
          await ctx.db.insert(componentRelated).values({
            parentComponentId: copy!.id,
            childComponentId: r.childComponentId,
            ratioFormulaKey: r.ratioFormulaKey,
            quantityFormula: r.quantityFormula,
            qtyFactor: r.qtyFactor,
            sequence: r.sequence,
          });
        }
        await writeAudit(ctx.db, {
          entity: "component",
          entityId: copy!.id,
          action: "DUPLICATE",
          actorId: ctx.user.id,
          after: { code: copy!.code, version: copy!.version, from: src.id },
        });
        return copy!;
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new TRPCError({ code: "CONFLICT", message: `Version code ${newCode} already exists.` });
        }
        throw err;
      }
    }),

  // --- Dependency edges (dependency engine + free-form mappings) -------------

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
      // Validate the dependency-mapping formula against the parent's exposed
      // variables: its measurement fields, the derived `quantity`, and its BOQ
      // splitter output names.
      if (input.quantityFormula) {
        const [parent] = await ctx.db
          .select()
          .from(components)
          .where(eq(components.id, input.parentComponentId));
        if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent RuleSet not found." });
        const boqOuts = Array.isArray(parent.boqSplitters)
          ? (parent.boqSplitters as { outputName: string }[]).map((o) => o.outputName)
          : [];
        const allowed = [...paramKeys(parent.paramSchema), "quantity", ...boqOuts];
        const v = validateExpression(input.quantityFormula, allowed);
        if (!v.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: v.error
              ? `Dependency formula: ${v.error}`
              : `Dependency formula references inputs the parent does not expose: ${v.unknownVars.join(", ")}`,
          });
        }
      }
      const [row] = await ctx.db
        .insert(componentRelated)
        .values({
          parentComponentId: input.parentComponentId,
          childComponentId: input.childComponentId,
          ratioFormulaKey: input.ratioFormulaKey ?? null,
          quantityFormula: input.quantityFormula ?? null,
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
