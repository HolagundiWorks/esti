import {
  SpecificationProcurementStandardCreate,
  SteelFlowCatalogEntryCreate,
  StructuralElementTemplateCreate,
  parseSteelFlowCatalogRow,
  steelFlowCatalogToPersisted,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  specificationStandards,
  structuralElementTemplates,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const IdInput = z.object({ id: z.string().uuid() });

export const knowledgeBankRouter = router({
  listSpecifications: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(specificationStandards)
      .orderBy(desc(specificationStandards.createdAt)),
  ),

  createSpecification: protectedProcedure
    .input(SpecificationProcurementStandardCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(specificationStandards)
        .values({
          ...input,
          dsrItemCode: input.dsrItemCode ?? null,
          sourceCitation: input.sourceCitation ?? null,
          createdById: ctx.user.id,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "specification_standard",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),

  submitSpecification: protectedProcedure
    .input(IdInput)
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select()
        .from(specificationStandards)
        .where(eq(specificationStandards.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      if (before.status !== "DRAFT")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only drafts can be submitted",
        });
      const [row] = await ctx.db
        .update(specificationStandards)
        .set({ status: "REVIEW" })
        .where(eq(specificationStandards.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "specification_standard",
        entityId: input.id,
        action: "SUBMIT",
        actorId: ctx.user.id,
        before,
        after: row,
      });
      return row!;
    }),

  publishSpecification: protectedProcedure
    .input(IdInput)
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select()
        .from(specificationStandards)
        .where(eq(specificationStandards.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      if (!["DRAFT", "REVIEW"].includes(before.status))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft or review versions can be published",
        });
      const existing = await ctx.db
        .select({ id: specificationStandards.id })
        .from(specificationStandards)
        .where(
          and(
            eq(specificationStandards.code, before.code),
            eq(specificationStandards.status, "PUBLISHED"),
          ),
        );
      if (existing.length)
        await ctx.db
          .update(specificationStandards)
          .set({ status: "SUPERSEDED", supersededById: input.id })
          .where(
            inArray(
              specificationStandards.id,
              existing.map((row) => row.id),
            ),
          );
      const [row] = await ctx.db
        .update(specificationStandards)
        .set({
          status: "PUBLISHED",
          reviewedById: ctx.user.id,
          publishedAt: new Date(),
        })
        .where(eq(specificationStandards.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "specification_standard",
        entityId: input.id,
        action: "PUBLISH",
        actorId: ctx.user.id,
        before,
        after: row,
      });
      return row!;
    }),

  listPublishedSteelFlowCatalog: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(structuralElementTemplates)
      .where(eq(structuralElementTemplates.status, "PUBLISHED"))
      .orderBy(desc(structuralElementTemplates.createdAt));
    return rows
      .map((row) => {
        const entry = parseSteelFlowCatalogRow(row);
        return entry ? { id: row.id, ...entry } : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }),

  createSteelFlowCatalog: protectedProcedure
    .input(SteelFlowCatalogEntryCreate)
    .mutation(async ({ ctx, input }) => {
      const persisted = steelFlowCatalogToPersisted(input);
      const [row] = await ctx.db
        .insert(structuralElementTemplates)
        .values({
          code: input.code,
          name: input.name,
          family: input.elementType,
          type: `${input.widthMm}x${input.depthMm}`,
          version: input.version,
          description: input.description ?? null,
          geometry: persisted.geometry,
          reinforcement: persisted.reinforcement,
          sourceCitation: input.sourceCitation ?? null,
          createdById: ctx.user.id,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "steelflow_catalog",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),

  listStructuralTemplates: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(structuralElementTemplates)
      .orderBy(desc(structuralElementTemplates.createdAt)),
  ),

  createStructuralTemplate: protectedProcedure
    .input(StructuralElementTemplateCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(structuralElementTemplates)
        .values({
          ...input,
          description: input.description ?? null,
          sourceCitation: input.sourceCitation ?? null,
          createdById: ctx.user.id,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "structural_element_template",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),

  submitStructuralTemplate: protectedProcedure
    .input(IdInput)
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select()
        .from(structuralElementTemplates)
        .where(eq(structuralElementTemplates.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      if (before.status !== "DRAFT")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only drafts can be submitted",
        });
      const [row] = await ctx.db
        .update(structuralElementTemplates)
        .set({ status: "REVIEW" })
        .where(eq(structuralElementTemplates.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "structural_element_template",
        entityId: input.id,
        action: "SUBMIT",
        actorId: ctx.user.id,
        before,
        after: row,
      });
      return row!;
    }),

  publishStructuralTemplate: protectedProcedure
    .input(IdInput)
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select()
        .from(structuralElementTemplates)
        .where(eq(structuralElementTemplates.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      if (!["DRAFT", "REVIEW"].includes(before.status))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft or review versions can be published",
        });
      const existing = await ctx.db
        .select({ id: structuralElementTemplates.id })
        .from(structuralElementTemplates)
        .where(
          and(
            eq(structuralElementTemplates.code, before.code),
            eq(structuralElementTemplates.status, "PUBLISHED"),
          ),
        );
      if (existing.length)
        await ctx.db
          .update(structuralElementTemplates)
          .set({ status: "SUPERSEDED", supersededById: input.id })
          .where(
            inArray(
              structuralElementTemplates.id,
              existing.map((row) => row.id),
            ),
          );
      const [row] = await ctx.db
        .update(structuralElementTemplates)
        .set({
          status: "PUBLISHED",
          reviewedById: ctx.user.id,
          publishedAt: new Date(),
        })
        .where(eq(structuralElementTemplates.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "structural_element_template",
        entityId: input.id,
        action: "PUBLISH",
        actorId: ctx.user.id,
        before,
        after: row,
      });
      return row!;
    }),
});
