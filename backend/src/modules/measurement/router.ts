import {
  buildingLevelCode,
  computeLevelElevations,
  ConfigureBuildingFloorsInput,
  DEFAULT_BEAM_DEPTH_MM,
  DEFAULT_LINTEL_HEIGHT_MM,
  DEFAULT_SLAB_THICKNESS_MM,
  deriveElementHeightMm,
  deriveMeasurementQuantity,
  resolveHeightRecipe,
  resolveStructuralDeductions,
  UpsertBuildingLevelInput,
  UpsertMeasurementRowInput,
  UpsertProjectStructuralDefaultsInput,
  type HeightFrom,
  type MeasureKind,
  type MeasurementUom,
  type PlanMarkerKind,
  type StructuralDeductionOverrides,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  buildingLevels,
  itemLibraryItems,
  itemLibraryVersions,
  measurementBooks,
  measurementRows,
  planMarkupItems,
  projectOffices,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

async function getOrCreateBook(db: Parameters<typeof writeAudit>[0], projectId: string) {
  const [existing] = await db
    .select()
    .from(measurementBooks)
    .where(eq(measurementBooks.projectId, projectId))
    .orderBy(desc(measurementBooks.createdAt))
    .limit(1);
  if (existing) return existing;

  const [activeVersion] = await db
    .select()
    .from(itemLibraryVersions)
    .where(eq(itemLibraryVersions.active, true))
    .limit(1);

  const [book] = await db
    .insert(measurementBooks)
    .values({
      projectId,
      libraryVersionId: activeVersion?.id ?? null,
    })
    .returning();
  return book!;
}

async function projectDeductions(db: Parameters<typeof writeAudit>[0], projectId: string) {
  const [project] = await db
    .select({
      slabThicknessMm: projectOffices.slabThicknessMm,
      beamDepthMm: projectOffices.beamDepthMm,
      lintelHeightMm: projectOffices.lintelHeightMm,
    })
    .from(projectOffices)
    .where(eq(projectOffices.id, projectId))
    .limit(1);
  return {
    slabThicknessMm: project?.slabThicknessMm ?? DEFAULT_SLAB_THICKNESS_MM,
    beamDepthMm: project?.beamDepthMm ?? DEFAULT_BEAM_DEPTH_MM,
    lintelHeightMm: project?.lintelHeightMm ?? DEFAULT_LINTEL_HEIGHT_MM,
  };
}

async function resolveAutoHeightMm(
  db: Parameters<typeof writeAudit>[0],
  opts: {
    projectId: string;
    levelId: string | null | undefined;
    heightMm: number | null | undefined;
    recipe: HeightFrom;
    /** When true, ignore a supplied heightMm and always recompute from the level. */
    forceFromLevel?: boolean;
    rowOverrides?: StructuralDeductionOverrides | null;
  },
): Promise<number | null> {
  if (!opts.forceFromLevel && opts.heightMm != null) return opts.heightMm;
  if (!opts.levelId) return null;
  const [level] = await db
    .select({
      storeyHeightMm: buildingLevels.storeyHeightMm,
      beamDepthMm: buildingLevels.beamDepthMm,
      lintelHeightMm: buildingLevels.lintelHeightMm,
    })
    .from(buildingLevels)
    .where(eq(buildingLevels.id, opts.levelId))
    .limit(1);
  if (!level) return null;
  const project = await projectDeductions(db, opts.projectId);
  const deductions = resolveStructuralDeductions(project, level, opts.rowOverrides);
  return deriveElementHeightMm({
    storeyHeightMm: level.storeyHeightMm,
    recipe: opts.recipe,
    deductions,
  });
}

/** Recompute height + qty for every non-OVERRIDE row that is linked to a level. */
async function resyncLinkedHeights(
  db: Parameters<typeof writeAudit>[0],
  projectId: string,
): Promise<number> {
  const books = await db
    .select({ id: measurementBooks.id })
    .from(measurementBooks)
    .where(eq(measurementBooks.projectId, projectId));
  if (books.length === 0) return 0;

  const bookIds = books.map((b) => b.id);
  const rows = await db
    .select()
    .from(measurementRows)
    .where(inArray(measurementRows.bookId, bookIds));

  let updated = 0;
  for (const row of rows) {
    if (!row.levelId) continue;
    if (row.derivation === "OVERRIDE") continue;

    let recipe: HeightFrom = "STOREY";
    let measureKind = row.uom === "CUM" ? ("LBH" as MeasureKind) : ("LB" as MeasureKind);
    if (row.libraryItemId) {
      const [lib] = await db
        .select({
          measureKind: itemLibraryItems.measureKind,
          defaultHeightFrom: itemLibraryItems.defaultHeightFrom,
          markerKinds: itemLibraryItems.markerKinds,
        })
        .from(itemLibraryItems)
        .where(eq(itemLibraryItems.id, row.libraryItemId))
        .limit(1);
      if (lib) {
        measureKind = lib.measureKind as MeasureKind;
        recipe = resolveHeightRecipe({
          defaultHeightFrom: lib.defaultHeightFrom as HeightFrom,
          markerKinds: (lib.markerKinds as PlanMarkerKind[]) ?? [],
        });
      }
    }

    const heightMm = await resolveAutoHeightMm(db, {
      projectId,
      levelId: row.levelId,
      heightMm: null,
      recipe,
      forceFromLevel: true,
      rowOverrides: {
        beamDepthMm: row.beamDepthMm,
        lintelHeightMm: row.lintelHeightMm,
      },
    });
    if (heightMm == null) continue;

    const quantity = deriveMeasurementQuantity({
      measureKind,
      uom: row.uom as MeasurementUom,
      lengthMm: row.lengthMm,
      breadthMm: row.breadthMm,
      heightMm,
    });

    await db
      .update(measurementRows)
      .set({ heightMm, quantity, derivation: "AUTO" })
      .where(eq(measurementRows.id, row.id));
    updated += 1;
  }
  return updated;
}

export const measurementRouter = router({
  getBook: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const book = await getOrCreateBook(ctx.db, input.projectId);
      const rows = await ctx.db
        .select()
        .from(measurementRows)
        .where(eq(measurementRows.bookId, book.id))
        .orderBy(asc(measurementRows.sortOrder), asc(measurementRows.createdAt));
      return { book, rows };
    }),

  listLevels: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(buildingLevels)
        .where(eq(buildingLevels.projectId, input.projectId))
        .orderBy(asc(buildingLevels.levelIndex), asc(buildingLevels.sortOrder)),
    ),

  getStructuralDefaults: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => projectDeductions(ctx.db, input.projectId)),

  upsertStructuralDefaults: protectedProcedure
    .input(UpsertProjectStructuralDefaultsInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(projectOffices)
        .set({
          slabThicknessMm: input.slabThicknessMm,
          beamDepthMm: input.beamDepthMm,
          lintelHeightMm: input.lintelHeightMm,
        })
        .where(eq(projectOffices.id, input.projectId))
        .returning({
          id: projectOffices.id,
          slabThicknessMm: projectOffices.slabThicknessMm,
          beamDepthMm: projectOffices.beamDepthMm,
          lintelHeightMm: projectOffices.lintelHeightMm,
        });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const synced = await resyncLinkedHeights(ctx.db, input.projectId);
      await writeAudit(ctx.db, {
        entity: "project_office",
        entityId: input.projectId,
        action: "STRUCTURAL_DEFAULTS",
        actorId: ctx.user.id,
        after: { ...row, syncedRows: synced },
      });
      return { ...row, syncedRows: synced };
    }),

  /**
   * Replace the project's LVL 0…N stack: floor-name mapping + FFL-to-FFL heights.
   * Elevations are recomputed from LVL 0 datum. Levels dropped from the stack are
   * removed only when no measurement rows still reference them.
   */
  configureFloors: protectedProcedure
    .input(ConfigureBuildingFloorsInput)
    .mutation(async ({ ctx, input }) => {
      const elevations = computeLevelElevations(input.levels);
      const existing = await ctx.db
        .select()
        .from(buildingLevels)
        .where(eq(buildingLevels.projectId, input.projectId));
      const byIndex = new Map(existing.map((r) => [r.levelIndex, r]));
      const keepIndexes = new Set(input.levels.map((l) => l.levelIndex));

      const result: (typeof buildingLevels.$inferSelect)[] = [];

      for (const draft of input.levels) {
        const code = buildingLevelCode(draft.levelIndex);
        const elevationMm = elevations.get(draft.levelIndex) ?? 0;
        const prev = byIndex.get(draft.levelIndex);
        const values = {
          projectId: input.projectId,
          levelIndex: draft.levelIndex,
          code,
          name: draft.floorName.trim(),
          elevationMm,
          storeyHeightMm: draft.storeyHeightMm,
          beamDepthMm: draft.beamDepthMm ?? null,
          lintelHeightMm: draft.lintelHeightMm ?? null,
          sortOrder: draft.levelIndex * 10,
        };
        if (prev) {
          const [row] = await ctx.db
            .update(buildingLevels)
            .set(values)
            .where(eq(buildingLevels.id, prev.id))
            .returning();
          result.push(row!);
        } else {
          const [row] = await ctx.db.insert(buildingLevels).values(values).returning();
          result.push(row!);
        }
      }

      const toRemove = existing.filter((r) => !keepIndexes.has(r.levelIndex));
      if (toRemove.length > 0) {
        const removeIds = toRemove.map((r) => r.id);
        const referenced = await ctx.db
          .select({ levelId: measurementRows.levelId })
          .from(measurementRows)
          .where(inArray(measurementRows.levelId, removeIds));
        const blocked = new Set(
          referenced.map((r) => r.levelId).filter((id): id is string => !!id),
        );
        if (blocked.size > 0) {
          const names = toRemove
            .filter((r) => blocked.has(r.id))
            .map((r) => `${r.code} (${r.name})`)
            .join(", ");
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Cannot remove levels still used on the measurement sheet: ${names}. Clear those rows first, or keep the levels.`,
          });
        }
        await ctx.db
          .delete(buildingLevels)
          .where(
            and(
              eq(buildingLevels.projectId, input.projectId),
              gt(buildingLevels.levelIndex, Math.max(...keepIndexes)),
            ),
          );
        // Also delete any non-contiguous leftovers (shouldn't happen, but safe).
        const leftoverIds = toRemove.filter((r) => !blocked.has(r.id)).map((r) => r.id);
        if (leftoverIds.length > 0) {
          await ctx.db.delete(buildingLevels).where(inArray(buildingLevels.id, leftoverIds));
        }
      }

      await writeAudit(ctx.db, {
        entity: "building_level",
        entityId: input.projectId,
        action: "CONFIGURE_FLOORS",
        actorId: ctx.user.id,
        after: { count: result.length, levels: result.map((r) => ({ code: r.code, name: r.name })) },
      });

      const syncedRows = await resyncLinkedHeights(ctx.db, input.projectId);
      return {
        levels: result.sort((a, b) => a.levelIndex - b.levelIndex),
        syncedRows,
      };
    }),

  upsertLevel: protectedProcedure
    .input(UpsertBuildingLevelInput)
    .mutation(async ({ ctx, input }) => {
      const levelIndex = input.levelIndex ?? 0;
      const values = {
        projectId: input.projectId,
        levelIndex,
        code: input.code || buildingLevelCode(levelIndex),
        name: input.name,
        elevationMm: input.elevationMm,
        storeyHeightMm: input.storeyHeightMm ?? 3000,
        sortOrder: input.sortOrder ?? levelIndex * 10,
      };
      if (input.id) {
        const [row] = await ctx.db
          .update(buildingLevels)
          .set(values)
          .where(eq(buildingLevels.id, input.id))
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }
      const [row] = await ctx.db.insert(buildingLevels).values(values).returning();
      return row!;
    }),

  removeLevel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(buildingLevels).where(eq(buildingLevels.id, input.id));
      return { ok: true };
    }),

  upsertRow: protectedProcedure
    .input(UpsertMeasurementRowInput)
    .mutation(async ({ ctx, input }) => {
      const [book] = await ctx.db
        .select()
        .from(measurementBooks)
        .where(eq(measurementBooks.id, input.bookId));
      if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Measurement book not found" });
      if (book.status === "ISSUED") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Book is issued — create a new revision first" });
      }

      let measureKind: MeasureKind = "LBH";
      let heightRecipe: HeightFrom = "STOREY";
      if (input.libraryItemId) {
        const [lib] = await ctx.db
          .select({
            measureKind: itemLibraryItems.measureKind,
            defaultHeightFrom: itemLibraryItems.defaultHeightFrom,
            markerKinds: itemLibraryItems.markerKinds,
          })
          .from(itemLibraryItems)
          .where(eq(itemLibraryItems.id, input.libraryItemId))
          .limit(1);
        if (lib) {
          measureKind = lib.measureKind as MeasureKind;
          heightRecipe = resolveHeightRecipe({
            defaultHeightFrom: lib.defaultHeightFrom as HeightFrom,
            markerKinds: (lib.markerKinds as PlanMarkerKind[]) ?? [],
          });
        }
      }

      const derivation = input.derivation ?? "MANUAL";
      const lengthMm = input.lengthMm ?? null;
      const breadthMm = input.breadthMm ?? null;
      const beamDepthMm =
        input.beamDepthMm !== undefined
          ? input.beamDepthMm
          : input.id
            ? undefined
            : null;
      const lintelHeightMm =
        input.lintelHeightMm !== undefined
          ? input.lintelHeightMm
          : input.id
            ? undefined
            : null;

      // For height calc: use incoming overrides, else existing row values on update.
      let rowOverrides: StructuralDeductionOverrides | null = {
        beamDepthMm: input.beamDepthMm ?? null,
        lintelHeightMm: input.lintelHeightMm ?? null,
      };
      if (input.id && (input.beamDepthMm === undefined || input.lintelHeightMm === undefined)) {
        const [existingRow] = await ctx.db
          .select({
            beamDepthMm: measurementRows.beamDepthMm,
            lintelHeightMm: measurementRows.lintelHeightMm,
          })
          .from(measurementRows)
          .where(eq(measurementRows.id, input.id))
          .limit(1);
        rowOverrides = {
          beamDepthMm:
            input.beamDepthMm !== undefined
              ? input.beamDepthMm
              : (existingRow?.beamDepthMm ?? null),
          lintelHeightMm:
            input.lintelHeightMm !== undefined
              ? input.lintelHeightMm
              : (existingRow?.lintelHeightMm ?? null),
        };
      }

      // Linked to a level: height always comes from the level stack (+ structural
      // deductions for WALL/COLUMN) unless the row is an explicit OVERRIDE.
      const linkedToLevel = !!input.levelId && derivation !== "OVERRIDE";
      const heightMm = await resolveAutoHeightMm(ctx.db, {
        projectId: book.projectId,
        levelId: input.levelId,
        heightMm: linkedToLevel ? null : input.heightMm,
        recipe: heightRecipe,
        forceFromLevel: linkedToLevel,
        rowOverrides,
      });
      const quantity =
        derivation === "OVERRIDE" && input.quantity != null
          ? input.quantity
          : deriveMeasurementQuantity({
              measureKind,
              uom: input.uom,
              lengthMm,
              breadthMm,
              heightMm,
            });

      const existing = await ctx.db
        .select({ sortOrder: measurementRows.sortOrder })
        .from(measurementRows)
        .where(eq(measurementRows.bookId, input.bookId))
        .orderBy(desc(measurementRows.sortOrder))
        .limit(1);
      const sortOrder = input.sortOrder ?? (existing[0]?.sortOrder ?? 0) + 10;

      const values = {
        bookId: input.bookId,
        levelId: input.levelId ?? null,
        libraryItemId: input.libraryItemId ?? null,
        libraryItemCode: input.libraryItemCode ?? null,
        particulars: input.particulars,
        lengthMm,
        breadthMm,
        heightMm,
        beamDepthMm: beamDepthMm ?? null,
        lintelHeightMm: lintelHeightMm ?? null,
        quantity,
        uom: input.uom,
        ratePaise: input.ratePaise ?? null,
        derivation: linkedToLevel ? ("AUTO" as const) : derivation,
        specCatalogItemId: input.specCatalogItemId ?? null,
        sortOrder,
      };

      if (input.id) {
        const [row] = await ctx.db
          .update(measurementRows)
          .set(values)
          .where(eq(measurementRows.id, input.id))
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }

      const [row] = await ctx.db.insert(measurementRows).values(values).returning();
      return row!;
    }),

  addFromLibrary: protectedProcedure
    .input(
      z.object({
        bookId: z.string().uuid(),
        libraryItemId: z.string().uuid(),
        levelId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(itemLibraryItems)
        .where(eq(itemLibraryItems.id, input.libraryItemId));
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Library item not found" });

      const breadthMm = item.defaultBreadthMm ?? null;
      const heightRecipe = resolveHeightRecipe({
        defaultHeightFrom: item.defaultHeightFrom as HeightFrom,
        markerKinds: (item.markerKinds as PlanMarkerKind[]) ?? [],
      });
      const [book] = await ctx.db
        .select()
        .from(measurementBooks)
        .where(eq(measurementBooks.id, input.bookId))
        .limit(1);
      if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Measurement book not found" });

      const heightMm = await resolveAutoHeightMm(ctx.db, {
        projectId: book.projectId,
        levelId: input.levelId,
        heightMm: null,
        recipe: heightRecipe,
      });
      const quantity = deriveMeasurementQuantity({
        measureKind: item.measureKind as MeasureKind,
        uom: item.uom as MeasurementUom,
        lengthMm: null,
        breadthMm,
        heightMm,
      });

      const existing = await ctx.db
        .select({ sortOrder: measurementRows.sortOrder })
        .from(measurementRows)
        .where(eq(measurementRows.bookId, input.bookId))
        .orderBy(desc(measurementRows.sortOrder))
        .limit(1);
      const sortOrder = (existing[0]?.sortOrder ?? 0) + 10;

      const [row] = await ctx.db
        .insert(measurementRows)
        .values({
          bookId: input.bookId,
          levelId: input.levelId ?? null,
          libraryItemId: item.id,
          libraryItemCode: item.code,
          particulars: item.particulars,
          lengthMm: null,
          breadthMm,
          heightMm,
          quantity,
          uom: item.uom,
          derivation: "AUTO",
          sortOrder,
        })
        .returning();
      return row!;
    }),

  removeRow: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(measurementRows).where(eq(measurementRows.id, input.id));
      return { ok: true };
    }),

  /** Re-apply level storey heights (+ slab/beam/lintel) to all linked AUTO rows. */
  syncHeightsFromLevels: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const syncedRows = await resyncLinkedHeights(ctx.db, input.projectId);
      return { syncedRows };
    }),

  /** Push selected plan markup items into the measurement book as AUTO rows. */
  deriveFromMarkup: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        markupItemIds: z.array(z.string().uuid()).min(1),
        levelId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const book = await getOrCreateBook(ctx.db, input.projectId);
      if (book.status === "ISSUED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Book is issued — create a new revision first",
        });
      }

      const created: (typeof measurementRows.$inferSelect)[] = [];
      let sortCursor = (
        await ctx.db
          .select({ sortOrder: measurementRows.sortOrder })
          .from(measurementRows)
          .where(eq(measurementRows.bookId, book.id))
          .orderBy(desc(measurementRows.sortOrder))
          .limit(1)
      )[0]?.sortOrder ?? 0;

      for (const markupId of input.markupItemIds) {
        const [markup] = await ctx.db
          .select()
          .from(planMarkupItems)
          .where(eq(planMarkupItems.id, markupId))
          .limit(1);
        if (!markup) continue;

        let particulars = markup.label;
        let uom: MeasurementUom = "RMT";
        let measureKind: MeasureKind = "L";
        let libraryItemCode: string | null = null;
        let breadthMm = markup.breadthMm;
        let heightMm = markup.heightMm;
        let heightRecipe: HeightFrom = resolveHeightRecipe({
          markerKinds: [markup.markerKind as PlanMarkerKind],
        });

        if (markup.libraryItemId) {
          const [item] = await ctx.db
            .select()
            .from(itemLibraryItems)
            .where(eq(itemLibraryItems.id, markup.libraryItemId))
            .limit(1);
          if (item) {
            particulars = item.particulars;
            uom = item.uom as MeasurementUom;
            measureKind = item.measureKind as MeasureKind;
            libraryItemCode = item.code;
            if (breadthMm == null) breadthMm = item.defaultBreadthMm;
            heightRecipe = resolveHeightRecipe({
              defaultHeightFrom: item.defaultHeightFrom as HeightFrom,
              markerKinds: (item.markerKinds as PlanMarkerKind[]) ?? [
                markup.markerKind as PlanMarkerKind,
              ],
            });
          }
        } else if (markup.markerKind === "DOOR" || markup.markerKind === "WINDOW") {
          uom = "NOS";
          measureKind = "COUNT";
        } else if (markup.markerKind === "WALL") {
          uom = "SQM";
          measureKind = "LB";
        } else if (markup.markerKind === "COLUMN") {
          uom = "CUM";
          measureKind = "LBH";
        }

        if (heightMm == null) {
          heightMm = await resolveAutoHeightMm(ctx.db, {
            projectId: input.projectId,
            levelId: input.levelId,
            heightMm: null,
            recipe: heightRecipe,
          });
        }

        const quantity = deriveMeasurementQuantity({
          measureKind,
          uom,
          lengthMm: markup.lengthMm,
          breadthMm,
          heightMm,
          count: markup.count,
        });

        sortCursor += 10;
        const [row] = await ctx.db
          .insert(measurementRows)
          .values({
            bookId: book.id,
            levelId: input.levelId ?? null,
            libraryItemId: markup.libraryItemId,
            libraryItemCode,
            particulars,
            lengthMm: markup.lengthMm,
            breadthMm,
            heightMm,
            quantity,
            uom,
            derivation: "AUTO",
            sourceMarkupIds: [markup.id],
            sortOrder: sortCursor,
          })
          .returning();

        if (row) {
          await ctx.db
            .update(planMarkupItems)
            .set({ measurementRowId: row.id })
            .where(eq(planMarkupItems.id, markup.id));
          created.push(row);
        }
      }

      return { bookId: book.id, rows: created };
    }),
});
