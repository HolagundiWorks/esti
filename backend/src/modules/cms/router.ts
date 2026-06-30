import {
  CmsByProjectInput,
  CmsDimensions,
  CmsElementCreate,
  CmsElementUpdate,
  CmsFinalSetCreate,
  CmsIdInput,
  CmsLocationCreate,
  CmsLocationUpdate,
  CmsMeasurementByElement,
  CmsMeasurementCreate,
  CmsMeasurementType,
  cmsAmountPaise,
  computeQuantity,
  type CmsElementMeasurementSummary,
  type CmsFinalSetSnapshot,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, max, sql, sum } from "drizzle-orm";
import { z } from "zod";
import {
  cmsElements,
  cmsFinalSets,
  cmsLocations,
  cmsMeasurements,
  kbItems,
  kbSpecifications,
} from "../../db/schema.js";
import { enqueueJob } from "../../lib/redis.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

// ── Locations (spatial tree) ────────────────────────────────────────────────
const locations = router({
  listByProject: protectedProcedure
    .input(CmsByProjectInput)
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(cmsLocations)
        .where(eq(cmsLocations.projectId, input.projectId))
        .orderBy(asc(cmsLocations.sortOrder), asc(cmsLocations.name)),
    ),
  create: protectedProcedure
    .input(CmsLocationCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(cmsLocations)
        .values({
          projectId: input.projectId,
          parentId: input.parentId ?? null,
          kind: input.kind,
          name: input.name,
        })
        .returning();
      return row!;
    }),
  update: protectedProcedure
    .input(CmsLocationUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(cmsLocations)
        .set(definedOnly(rest))
        .where(eq(cmsLocations.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
  remove: protectedProcedure
    .input(CmsIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(cmsLocations).where(eq(cmsLocations.id, input.id));
      return { ok: true };
    }),
});

// ── Elements (the spine + the estimate) ─────────────────────────────────────
const elements = router({
  listByProject: protectedProcedure
    .input(CmsByProjectInput)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: cmsElements.id,
          code: cmsElements.code,
          parentElementId: cmsElements.parentElementId,
          isComponent: cmsElements.isComponent,
          dependencyType: cmsElements.dependencyType,
          locationId: cmsElements.locationId,
          locationName: cmsLocations.name,
          gridRef: cmsElements.gridRef,
          itemId: cmsElements.itemId,
          specificationId: cmsElements.specificationId,
          description: cmsElements.description,
          measurementType: cmsElements.measurementType,
          dimensions: cmsElements.dimensions,
          quantity: cmsElements.quantity,
          unit: cmsElements.unit,
          ratePaise: cmsElements.ratePaise,
          amountPaise: cmsElements.amountPaise,
          notes: cmsElements.notes,
          sortOrder: cmsElements.sortOrder,
        })
        .from(cmsElements)
        .leftJoin(cmsLocations, eq(cmsElements.locationId, cmsLocations.id))
        .where(eq(cmsElements.projectId, input.projectId))
        .orderBy(asc(cmsElements.seq), asc(cmsElements.code));
      const totalPaise = rows.reduce((s, r) => s + r.amountPaise, 0);
      return { elements: rows, totalPaise };
    }),

  create: protectedProcedure
    .input(CmsElementCreate)
    .mutation(async ({ ctx, input }) => {
      // Snapshot description / unit / rate from the chosen specification + item.
      let description = input.description ?? "";
      let unit: string | null = null;
      let ratePaise = input.ratePaise ?? 0;
      if (input.specificationId) {
        const [spec] = await ctx.db
          .select()
          .from(kbSpecifications)
          .where(eq(kbSpecifications.id, input.specificationId));
        if (spec) {
          if (input.ratePaise === undefined) ratePaise = spec.ratePaise;
          unit = spec.unit;
          if (!description) {
            const [item] = await ctx.db
              .select({ name: kbItems.name })
              .from(kbItems)
              .where(eq(kbItems.id, input.itemId ?? spec.itemId));
            description = item?.name ? `${item.name} — ${spec.name}` : spec.name;
          }
        }
      }
      if (!description) description = "Element";

      // Element code: EL-001 for a primary, parentCode + letter for a component.
      let code: string;
      let seq: number;
      let isComponent = false;
      if (input.parentElementId) {
        const [parent] = await ctx.db
          .select()
          .from(cmsElements)
          .where(eq(cmsElements.id, input.parentElementId));
        if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent element" });
        const kids = await ctx.db
          .select({ id: cmsElements.id })
          .from(cmsElements)
          .where(eq(cmsElements.parentElementId, parent.id));
        code = `${parent.code}${String.fromCharCode(65 + kids.length)}`;
        seq = parent.seq;
        isComponent = true;
      } else {
        const [top] = await ctx.db
          .select({ seq: cmsElements.seq })
          .from(cmsElements)
          .where(
            and(
              eq(cmsElements.projectId, input.projectId),
              isNull(cmsElements.parentElementId),
            ),
          )
          .orderBy(desc(cmsElements.seq))
          .limit(1);
        seq = (top?.seq ?? 0) + 1;
        code = `EL-${String(seq).padStart(3, "0")}`;
      }

      const quantity = computeQuantity(input.measurementType, input.dimensions);
      const [row] = await ctx.db
        .insert(cmsElements)
        .values({
          projectId: input.projectId,
          code,
          seq,
          parentElementId: input.parentElementId ?? null,
          isComponent,
          locationId: input.locationId ?? null,
          gridRef: input.gridRef ?? null,
          itemId: input.itemId ?? null,
          specificationId: input.specificationId ?? null,
          description,
          measurementType: input.measurementType,
          dimensions: input.dimensions,
          quantity,
          unit,
          ratePaise,
          amountPaise: cmsAmountPaise(quantity, ratePaise),
          sortOrder: seq * 10,
          notes: input.notes ?? null,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "cms_element",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: { code: row!.code, description: row!.description },
      });
      return row!;
    }),

  update: protectedProcedure
    .input(CmsElementUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [existing] = await ctx.db
        .select()
        .from(cmsElements)
        .where(eq(cmsElements.id, id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const measurementType = (rest.measurementType ??
        existing.measurementType) as z.infer<typeof CmsMeasurementType>;
      const dimensions = (rest.dimensions ??
        existing.dimensions) as z.infer<typeof CmsDimensions>;
      const ratePaise = rest.ratePaise ?? existing.ratePaise;
      const quantity = computeQuantity(measurementType, dimensions);
      const [row] = await ctx.db
        .update(cmsElements)
        .set({
          ...definedOnly(rest),
          quantity,
          amountPaise: cmsAmountPaise(quantity, ratePaise),
        })
        .where(eq(cmsElements.id, id))
        .returning();
      return row!;
    }),

  remove: protectedProcedure
    .input(CmsIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(cmsElements).where(eq(cmsElements.id, input.id));
      await writeAudit(ctx.db, {
        entity: "cms_element",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),
});

// ── BOQ (read-model, no table) ───────────────────────────────────────────────
const boq = router({
  /** Grouped BOQ: elements aggregated by description+unit+rate (same spec). */
  byProject: protectedProcedure
    .input(CmsByProjectInput)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          itemId: cmsElements.itemId,
          specificationId: cmsElements.specificationId,
          description: cmsElements.description,
          unit: cmsElements.unit,
          quantity: cmsElements.quantity,
          ratePaise: cmsElements.ratePaise,
          amountPaise: cmsElements.amountPaise,
          locationName: cmsLocations.name,
          code: cmsElements.code,
        })
        .from(cmsElements)
        .leftJoin(cmsLocations, eq(cmsElements.locationId, cmsLocations.id))
        .where(eq(cmsElements.projectId, input.projectId))
        .orderBy(asc(cmsElements.seq), asc(cmsElements.code));

      // Group by description + unit + rate (same specification = same group).
      const groups = new Map<
        string,
        {
          itemId: string | null;
          specificationId: string | null;
          description: string;
          unit: string | null;
          totalQuantity: number;
          ratePaise: number;
          totalAmountPaise: number;
          elementCount: number;
        }
      >();
      for (const r of rows) {
        const key = `${r.description}||${r.unit ?? ""}||${r.ratePaise}`;
        const existing = groups.get(key);
        if (existing) {
          existing.totalQuantity += r.quantity;
          existing.totalAmountPaise += r.amountPaise;
          existing.elementCount += 1;
        } else {
          groups.set(key, {
            itemId: r.itemId ?? null,
            specificationId: r.specificationId ?? null,
            description: r.description,
            unit: r.unit ?? null,
            totalQuantity: r.quantity,
            ratePaise: r.ratePaise,
            totalAmountPaise: r.amountPaise,
            elementCount: 1,
          });
        }
      }
      const boqLines = [...groups.values()];
      const totalPaise = boqLines.reduce((s, b) => s + b.totalAmountPaise, 0);
      return { boq: boqLines, totalPaise, elementRows: rows };
    }),
});

// ── Final Estimation Set ─────────────────────────────────────────────────────
const finalSet = router({
  listByProject: protectedProcedure
    .input(CmsByProjectInput)
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(cmsFinalSets)
        .where(eq(cmsFinalSets.projectId, input.projectId))
        .orderBy(desc(cmsFinalSets.revisionNo)),
    ),

  /** Freeze the current element list + BOQ into a new revision snapshot. */
  markFinal: protectedProcedure
    .input(CmsFinalSetCreate)
    .mutation(async ({ ctx, input }) => {
      // Fetch all elements (the current active estimate).
      const elRows = await ctx.db
        .select({
          code: cmsElements.code,
          description: cmsElements.description,
          quantity: cmsElements.quantity,
          unit: cmsElements.unit,
          ratePaise: cmsElements.ratePaise,
          amountPaise: cmsElements.amountPaise,
          locationName: cmsLocations.name,
          specificationId: cmsElements.specificationId,
          itemId: cmsElements.itemId,
        })
        .from(cmsElements)
        .leftJoin(cmsLocations, eq(cmsElements.locationId, cmsLocations.id))
        .where(eq(cmsElements.projectId, input.projectId))
        .orderBy(asc(cmsElements.seq), asc(cmsElements.code));

      if (elRows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No elements — add elements before freezing the estimate.",
        });
      }

      // Build BOQ grouping.
      const groups = new Map<string, { description: string; unit: string | null; totalQuantity: number; ratePaise: number; totalAmountPaise: number; elementCount: number; itemId: string | null; specificationId: string | null }>();
      for (const r of elRows) {
        const key = `${r.description}||${r.unit ?? ""}||${r.ratePaise}`;
        const ex = groups.get(key);
        if (ex) { ex.totalQuantity += r.quantity; ex.totalAmountPaise += r.amountPaise; ex.elementCount++; }
        else groups.set(key, { description: r.description, unit: r.unit ?? null, totalQuantity: r.quantity, ratePaise: r.ratePaise, totalAmountPaise: r.amountPaise, elementCount: 1, itemId: r.itemId ?? null, specificationId: r.specificationId ?? null });
      }
      const boqLines = [...groups.values()];
      const totalPaise = elRows.reduce((s, r) => s + r.amountPaise, 0);

      const snapshot: CmsFinalSetSnapshot = {
        elements: elRows.map((r) => ({
          code: r.code,
          description: r.description,
          quantity: r.quantity,
          unit: r.unit ?? null,
          ratePaise: r.ratePaise,
          amountPaise: r.amountPaise,
          locationName: r.locationName ?? null,
        })),
        boq: boqLines,
        totalPaise,
      };

      // Auto-assign next revision number.
      const [top] = await ctx.db
        .select({ rev: max(cmsFinalSets.revisionNo) })
        .from(cmsFinalSets)
        .where(eq(cmsFinalSets.projectId, input.projectId));
      const revisionNo = (top?.rev ?? 0) + 1;

      const [row] = await ctx.db
        .insert(cmsFinalSets)
        .values({
          projectId: input.projectId,
          revisionNo,
          title: input.title,
          status: "FINAL",
          snapshotJson: snapshot,
          totalPaise,
          pdfStatus: "PENDING",
          createdBy: ctx.user.email,
        })
        .returning();

      // Enqueue PDF generation.
      await enqueueJob("render_pdf", {
        target: "estimation_set",
        id: row!.id,
        projectId: input.projectId,
      });

      await writeAudit(ctx.db, {
        entity: "cms_final_set",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: { revisionNo, title: input.title, totalPaise },
      });
      return row!;
    }),

  byId: protectedProcedure
    .input(CmsIdInput)
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(cmsFinalSets)
        .where(eq(cmsFinalSets.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
});

// ── Site Measurement Book (CMS-4) ────────────────────────────────────────────
const costApproveProcedure = capabilityProcedure("cost:approve");

const measurements = router({
  /** All measurement records for one element, newest first. */
  listByElement: protectedProcedure
    .input(CmsMeasurementByElement)
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(cmsMeasurements)
        .where(eq(cmsMeasurements.elementId, input.elementId))
        .orderBy(desc(cmsMeasurements.date), desc(cmsMeasurements.createdAt)),
    ),

  /** Per-element cumulative verified qty for every element in the project. */
  summaryByProject: protectedProcedure
    .input(CmsByProjectInput)
    .query(async ({ ctx, input }): Promise<CmsElementMeasurementSummary[]> => {
      const elements = await ctx.db
        .select({
          id: cmsElements.id,
          code: cmsElements.code,
          description: cmsElements.description,
          quantity: cmsElements.quantity,
          unit: cmsElements.unit,
        })
        .from(cmsElements)
        .where(eq(cmsElements.projectId, input.projectId))
        .orderBy(asc(cmsElements.seq), asc(cmsElements.code));

      if (elements.length === 0) return [];

      const verified = await ctx.db
        .select({
          elementId: cmsMeasurements.elementId,
          total: sum(cmsMeasurements.executedQty),
        })
        .from(cmsMeasurements)
        .where(
          and(
            eq(cmsMeasurements.projectId, input.projectId),
            eq(cmsMeasurements.status, "VERIFIED"),
          ),
        )
        .groupBy(cmsMeasurements.elementId);

      const verifiedMap = new Map(verified.map((r) => [r.elementId, Number(r.total ?? 0)]));

      return elements.map((el) => {
        const cumQty = verifiedMap.get(el.id) ?? 0;
        const pct = el.quantity > 0 ? Math.min(100, (cumQty / el.quantity) * 100) : 0;
        return {
          elementId: el.id,
          elementCode: el.code,
          elementDescription: el.description,
          estimatedQty: el.quantity,
          unit: el.unit ?? null,
          cumulativeVerifiedQty: cumQty,
          percentComplete: Math.round(pct * 10) / 10,
        };
      });
    }),

  create: protectedProcedure
    .input(CmsMeasurementCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(cmsMeasurements)
        .values({
          projectId: input.projectId,
          elementId: input.elementId,
          date: input.date,
          description: input.description ?? null,
          executedQty: input.executedQty,
          measuredById: ctx.user.id,
          remarks: input.remarks ?? null,
          status: "DRAFT",
        })
        .returning();
      return row!;
    }),

  verify: costApproveProcedure
    .input(CmsIdInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ status: cmsMeasurements.status })
        .from(cmsMeasurements)
        .where(eq(cmsMeasurements.id, input.id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status === "VERIFIED") return { ok: true };

      await ctx.db
        .update(cmsMeasurements)
        .set({
          status: "VERIFIED",
          verifiedById: ctx.user.id,
          verifiedAt: new Date(),
        })
        .where(eq(cmsMeasurements.id, input.id));
      return { ok: true };
    }),

  remove: protectedProcedure
    .input(CmsIdInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ status: cmsMeasurements.status })
        .from(cmsMeasurements)
        .where(eq(cmsMeasurements.id, input.id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only DRAFT measurements can be removed." });
      }
      await ctx.db.delete(cmsMeasurements).where(eq(cmsMeasurements.id, input.id));
      return { ok: true };
    }),
});

/** Cost Management System router — CMS-1 through CMS-4. */
export const cmsRouter = router({ locations, elements, boq, finalSet, measurements });
