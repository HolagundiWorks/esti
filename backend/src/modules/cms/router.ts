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
  CmsBillByProjectInput,
  CmsBillCertifyInput,
  CmsBillCreate,
  CmsBillLineCreate,
  CmsBillLineUpdate,
  type CmsCostDashboard,
  type CmsMaterialForecastLine,
  CmsWoByProjectInput,
  CmsWoIssueInput,
  CmsWoItemCreate,
  CmsWoItemUpdate,
  CmsWorkOrderCreate,
  CmsWorkOrderUpdate,
  cmsAmountPaise,
  computeQuantity,
  type CmsElementMeasurementSummary,
  type CmsFinalSetSnapshot,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, max, sql, sum } from "drizzle-orm";
import { z } from "zod";
import {
  cmsBillLines,
  cmsBills,
  cmsElements,
  cmsFinalSets,
  cmsLocations,
  cmsMeasurements,
  cmsWoItems,
  cmsWorkOrders,
  contractors,
  kbItems,
  kbLabor,
  kbMaterials,
  kbSpecLabor,
  kbSpecMaterials,
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

// ── Work Orders (CMS-5) ─────────────────────────────────────────────────────
const workOrders = router({
  listByProject: protectedProcedure
    .input(CmsWoByProjectInput)
    .query(async ({ ctx, input }) => {
      const wos = await ctx.db
        .select({
          id: cmsWorkOrders.id,
          ref: cmsWorkOrders.ref,
          date: cmsWorkOrders.date,
          scope: cmsWorkOrders.scope,
          status: cmsWorkOrders.status,
          createdAt: cmsWorkOrders.createdAt,
          contractorId: cmsWorkOrders.contractorId,
          contractorName: contractors.name,
        })
        .from(cmsWorkOrders)
        .leftJoin(contractors, eq(cmsWorkOrders.contractorId, contractors.id))
        .where(eq(cmsWorkOrders.projectId, input.projectId))
        .orderBy(desc(cmsWorkOrders.createdAt));
      return wos;
    }),

  byId: protectedProcedure
    .input(CmsIdInput)
    .query(async ({ ctx, input }) => {
      const [wo] = await ctx.db
        .select({
          id: cmsWorkOrders.id,
          projectId: cmsWorkOrders.projectId,
          ref: cmsWorkOrders.ref,
          date: cmsWorkOrders.date,
          scope: cmsWorkOrders.scope,
          status: cmsWorkOrders.status,
          createdAt: cmsWorkOrders.createdAt,
          contractorId: cmsWorkOrders.contractorId,
          contractorName: contractors.name,
        })
        .from(cmsWorkOrders)
        .leftJoin(contractors, eq(cmsWorkOrders.contractorId, contractors.id))
        .where(eq(cmsWorkOrders.id, input.id));
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });

      const items = await ctx.db
        .select()
        .from(cmsWoItems)
        .where(eq(cmsWoItems.workOrderId, input.id))
        .orderBy(asc(cmsWoItems.sortOrder), asc(cmsWoItems.createdAt));

      return { ...wo, items };
    }),

  create: protectedProcedure
    .input(CmsWorkOrderCreate)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(cmsWorkOrders)
        .values({
          projectId: input.projectId,
          contractorId: input.contractorId,
          ref: input.ref,
          date: input.date,
          scope: input.scope ?? null,
          status: "DRAFT",
        })
        .returning();
      return row!;
    }),

  update: protectedProcedure
    .input(CmsWorkOrderUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [wo] = await ctx.db
        .select({ status: cmsWorkOrders.status })
        .from(cmsWorkOrders)
        .where(eq(cmsWorkOrders.id, id));
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });
      if (wo.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only DRAFT work orders can be edited." });
      }
      const [row] = await ctx.db
        .update(cmsWorkOrders)
        .set(definedOnly(rest))
        .where(eq(cmsWorkOrders.id, id))
        .returning();
      return row!;
    }),

  issue: protectedProcedure
    .input(CmsWoIssueInput)
    .mutation(async ({ ctx, input }) => {
      const [wo] = await ctx.db
        .select({ status: cmsWorkOrders.status })
        .from(cmsWorkOrders)
        .where(eq(cmsWorkOrders.id, input.id));
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });
      if (wo.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only DRAFT work orders can be issued." });
      }
      await ctx.db
        .update(cmsWorkOrders)
        .set({ status: "ISSUED" })
        .where(eq(cmsWorkOrders.id, input.id));
      return { ok: true };
    }),

  remove: protectedProcedure
    .input(CmsIdInput)
    .mutation(async ({ ctx, input }) => {
      const [wo] = await ctx.db
        .select({ status: cmsWorkOrders.status })
        .from(cmsWorkOrders)
        .where(eq(cmsWorkOrders.id, input.id));
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });
      if (wo.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only DRAFT work orders can be removed." });
      }
      await ctx.db.delete(cmsWorkOrders).where(eq(cmsWorkOrders.id, input.id));
      return { ok: true };
    }),

  // ── WO items ──────────────────────────────────────────────────────────────
  addItem: protectedProcedure
    .input(CmsWoItemCreate)
    .mutation(async ({ ctx, input }) => {
      const [wo] = await ctx.db
        .select({ status: cmsWorkOrders.status })
        .from(cmsWorkOrders)
        .where(eq(cmsWorkOrders.id, input.workOrderId));
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });
      if (wo.status === "CLOSED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot add items to a CLOSED work order." });
      }
      const [row] = await ctx.db
        .insert(cmsWoItems)
        .values({
          workOrderId: input.workOrderId,
          specificationId: input.specificationId ?? null,
          description: input.description,
          unit: input.unit,
          agreedRatePaise: input.agreedRatePaise,
        })
        .returning();
      return row!;
    }),

  updateItem: protectedProcedure
    .input(CmsWoItemUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [item] = await ctx.db
        .select({ workOrderId: cmsWoItems.workOrderId })
        .from(cmsWoItems)
        .where(eq(cmsWoItems.id, id));
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      // Guard: WO must not be CLOSED
      const [wo] = await ctx.db
        .select({ status: cmsWorkOrders.status })
        .from(cmsWorkOrders)
        .where(eq(cmsWorkOrders.id, item.workOrderId));
      if (wo?.status === "CLOSED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot edit items of a CLOSED work order." });
      }
      const [row] = await ctx.db
        .update(cmsWoItems)
        .set(definedOnly(rest))
        .where(eq(cmsWoItems.id, id))
        .returning();
      return row!;
    }),

  removeItem: protectedProcedure
    .input(CmsIdInput)
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select({ workOrderId: cmsWoItems.workOrderId })
        .from(cmsWoItems)
        .where(eq(cmsWoItems.id, input.id));
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      const [wo] = await ctx.db
        .select({ status: cmsWorkOrders.status })
        .from(cmsWorkOrders)
        .where(eq(cmsWorkOrders.id, item.workOrderId));
      if (wo?.status === "CLOSED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove items from a CLOSED work order." });
      }
      await ctx.db.delete(cmsWoItems).where(eq(cmsWoItems.id, input.id));
      return { ok: true };
    }),
});

// ── Contractor Bills + Certification (CMS-6) ─────────────────────────────────
const costApproveProcedure2 = capabilityProcedure("cost:approve");

const bills = router({
  listByProject: protectedProcedure
    .input(CmsBillByProjectInput)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: cmsBills.id,
          billNo: cmsBills.billNo,
          periodFrom: cmsBills.periodFrom,
          periodTo: cmsBills.periodTo,
          status: cmsBills.status,
          claimedAmountPaise: cmsBills.claimedAmountPaise,
          certifiedAmountPaise: cmsBills.certifiedAmountPaise,
          remarks: cmsBills.remarks,
          createdAt: cmsBills.createdAt,
          workOrderId: cmsBills.workOrderId,
          contractorId: cmsBills.contractorId,
          contractorName: contractors.name,
        })
        .from(cmsBills)
        .leftJoin(contractors, eq(cmsBills.contractorId, contractors.id))
        .where(eq(cmsBills.projectId, input.projectId))
        .orderBy(desc(cmsBills.createdAt));
      return rows;
    }),

  byId: protectedProcedure
    .input(CmsIdInput)
    .query(async ({ ctx, input }) => {
      const [bill] = await ctx.db
        .select({
          id: cmsBills.id,
          projectId: cmsBills.projectId,
          billNo: cmsBills.billNo,
          periodFrom: cmsBills.periodFrom,
          periodTo: cmsBills.periodTo,
          status: cmsBills.status,
          claimedAmountPaise: cmsBills.claimedAmountPaise,
          certifiedAmountPaise: cmsBills.certifiedAmountPaise,
          remarks: cmsBills.remarks,
          workOrderId: cmsBills.workOrderId,
          contractorId: cmsBills.contractorId,
          contractorName: contractors.name,
        })
        .from(cmsBills)
        .leftJoin(contractors, eq(cmsBills.contractorId, contractors.id))
        .where(eq(cmsBills.id, input.id));
      if (!bill) throw new TRPCError({ code: "NOT_FOUND" });

      const lines = await ctx.db
        .select({
          id: cmsBillLines.id,
          elementId: cmsBillLines.elementId,
          elementCode: cmsElements.code,
          elementDescription: cmsElements.description,
          woItemId: cmsBillLines.woItemId,
          woItemDescription: cmsWoItems.description,
          woItemUnit: cmsWoItems.unit,
          claimedQty: cmsBillLines.claimedQty,
          ratePaise: cmsBillLines.ratePaise,
          claimedAmountPaise: cmsBillLines.claimedAmountPaise,
          certifiedQty: cmsBillLines.certifiedQty,
          certifiedAmountPaise: cmsBillLines.certifiedAmountPaise,
          holdReason: cmsBillLines.holdReason,
        })
        .from(cmsBillLines)
        .leftJoin(cmsElements, eq(cmsBillLines.elementId, cmsElements.id))
        .leftJoin(cmsWoItems, eq(cmsBillLines.woItemId, cmsWoItems.id))
        .where(eq(cmsBillLines.billId, input.id))
        .orderBy(asc(cmsBillLines.createdAt));

      return { ...bill, lines };
    }),

  create: protectedProcedure
    .input(CmsBillCreate)
    .mutation(async ({ ctx, input }) => {
      // Derive contractorId from WO
      const [wo] = await ctx.db
        .select({ contractorId: cmsWorkOrders.contractorId, status: cmsWorkOrders.status })
        .from(cmsWorkOrders)
        .where(eq(cmsWorkOrders.id, input.workOrderId));
      if (!wo) throw new TRPCError({ code: "NOT_FOUND", message: "Work order not found." });
      if (wo.status === "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Work order must be ISSUED before billing." });
      }
      const [row] = await ctx.db
        .insert(cmsBills)
        .values({
          projectId: input.projectId,
          workOrderId: input.workOrderId,
          contractorId: wo.contractorId,
          billNo: input.billNo,
          periodFrom: input.periodFrom,
          periodTo: input.periodTo,
          remarks: input.remarks ?? null,
          status: "DRAFT",
        })
        .returning();
      return row!;
    }),

  addLine: protectedProcedure
    .input(CmsBillLineCreate)
    .mutation(async ({ ctx, input }) => {
      const [bill] = await ctx.db
        .select({ status: cmsBills.status, workOrderId: cmsBills.workOrderId })
        .from(cmsBills)
        .where(eq(cmsBills.id, input.billId));
      if (!bill) throw new TRPCError({ code: "NOT_FOUND" });
      if (bill.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only add lines to a DRAFT bill." });
      }
      // Fetch WO item to snapshot rate
      const [woItem] = await ctx.db
        .select({ agreedRatePaise: cmsWoItems.agreedRatePaise, workOrderId: cmsWoItems.workOrderId })
        .from(cmsWoItems)
        .where(eq(cmsWoItems.id, input.woItemId));
      if (!woItem) throw new TRPCError({ code: "NOT_FOUND", message: "WO item not found." });
      if (woItem.workOrderId !== bill.workOrderId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "WO item does not belong to the bill's work order." });
      }
      const rate = woItem.agreedRatePaise;
      const claimedAmt = Math.round(input.claimedQty * rate);
      const [line] = await ctx.db
        .insert(cmsBillLines)
        .values({
          billId: input.billId,
          elementId: input.elementId,
          woItemId: input.woItemId,
          claimedQty: input.claimedQty,
          ratePaise: rate,
          claimedAmountPaise: claimedAmt,
        })
        .returning();
      // Update bill claimed total
      await ctx.db
        .update(cmsBills)
        .set({ claimedAmountPaise: sql`claimed_amount_paise + ${claimedAmt}` })
        .where(eq(cmsBills.id, input.billId));
      return line!;
    }),

  updateLine: costApproveProcedure2
    .input(CmsBillLineUpdate)
    .mutation(async ({ ctx, input }) => {
      const [line] = await ctx.db
        .select({ billId: cmsBillLines.billId, certifiedQty: cmsBillLines.certifiedQty, ratePaise: cmsBillLines.ratePaise })
        .from(cmsBillLines)
        .where(eq(cmsBillLines.id, input.id));
      if (!line) throw new TRPCError({ code: "NOT_FOUND" });

      const updates: Record<string, unknown> = {};
      if (input.certifiedQty !== undefined) {
        updates.certifiedQty = input.certifiedQty;
        updates.certifiedAmountPaise = Math.round(input.certifiedQty * line.ratePaise);
      }
      if (input.holdReason !== undefined) updates.holdReason = input.holdReason;

      await ctx.db.update(cmsBillLines).set(updates).where(eq(cmsBillLines.id, input.id));
      return { ok: true };
    }),

  submit: protectedProcedure
    .input(CmsIdInput)
    .mutation(async ({ ctx, input }) => {
      const [bill] = await ctx.db
        .select({ status: cmsBills.status })
        .from(cmsBills)
        .where(eq(cmsBills.id, input.id));
      if (!bill) throw new TRPCError({ code: "NOT_FOUND" });
      if (bill.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only DRAFT bills can be submitted." });
      }
      await ctx.db.update(cmsBills).set({ status: "SUBMITTED" }).where(eq(cmsBills.id, input.id));
      return { ok: true };
    }),

  certify: costApproveProcedure2
    .input(CmsBillCertifyInput)
    .mutation(async ({ ctx, input }) => {
      const [bill] = await ctx.db
        .select({ status: cmsBills.status })
        .from(cmsBills)
        .where(eq(cmsBills.id, input.id));
      if (!bill) throw new TRPCError({ code: "NOT_FOUND" });
      if (bill.status !== "SUBMITTED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only SUBMITTED bills can be certified." });
      }
      // Sum certified amounts from lines
      const lineAmts = await ctx.db
        .select({ certAmt: cmsBillLines.certifiedAmountPaise })
        .from(cmsBillLines)
        .where(eq(cmsBillLines.billId, input.id));
      const certTotal = lineAmts.reduce((s, l) => s + (l.certAmt ?? 0), 0);
      await ctx.db
        .update(cmsBills)
        .set({
          status: "CERTIFIED",
          certifiedAmountPaise: certTotal,
          certifiedById: ctx.user.id,
          certifiedAt: new Date(),
          ...(input.remarks ? { remarks: input.remarks } : {}),
        })
        .where(eq(cmsBills.id, input.id));
      return { ok: true, certifiedAmountPaise: certTotal };
    }),

  hold: costApproveProcedure2
    .input(CmsBillCertifyInput)
    .mutation(async ({ ctx, input }) => {
      const [bill] = await ctx.db
        .select({ status: cmsBills.status })
        .from(cmsBills)
        .where(eq(cmsBills.id, input.id));
      if (!bill) throw new TRPCError({ code: "NOT_FOUND" });
      if (bill.status !== "SUBMITTED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only SUBMITTED bills can be held." });
      }
      await ctx.db
        .update(cmsBills)
        .set({ status: "HELD", certifiedById: ctx.user.id, certifiedAt: new Date(),
          ...(input.remarks ? { remarks: input.remarks } : {}) })
        .where(eq(cmsBills.id, input.id));
      return { ok: true };
    }),

  reject: costApproveProcedure2
    .input(CmsBillCertifyInput)
    .mutation(async ({ ctx, input }) => {
      const [bill] = await ctx.db
        .select({ status: cmsBills.status })
        .from(cmsBills)
        .where(eq(cmsBills.id, input.id));
      if (!bill) throw new TRPCError({ code: "NOT_FOUND" });
      if (bill.status !== "SUBMITTED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only SUBMITTED bills can be rejected." });
      }
      await ctx.db
        .update(cmsBills)
        .set({ status: "REJECTED", certifiedById: ctx.user.id, certifiedAt: new Date(),
          ...(input.remarks ? { remarks: input.remarks } : {}) })
        .where(eq(cmsBills.id, input.id));
      return { ok: true };
    }),

  remove: protectedProcedure
    .input(CmsIdInput)
    .mutation(async ({ ctx, input }) => {
      const [bill] = await ctx.db
        .select({ status: cmsBills.status })
        .from(cmsBills)
        .where(eq(cmsBills.id, input.id));
      if (!bill) throw new TRPCError({ code: "NOT_FOUND" });
      if (bill.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only DRAFT bills can be removed." });
      }
      await ctx.db.delete(cmsBills).where(eq(cmsBills.id, input.id));
      return { ok: true };
    }),
});

// ── Intelligence: Material Forecast (CMS-7) + Cost Dashboard (CMS-8) ─────────
const intelligence = router({
  /** CMS-7 — material + labour forecast per project (read-model, no writes).
   *  For each element with a specification, Σ(element.quantity × recipe.quantityPerUnit × wastage). */
  materialForecast: protectedProcedure
    .input(CmsByProjectInput)
    .query(async ({ ctx, input }): Promise<CmsMaterialForecastLine[]> => {
      // All elements with a spec in this project
      const elements = await ctx.db
        .select({
          quantity: cmsElements.quantity,
          specificationId: cmsElements.specificationId,
        })
        .from(cmsElements)
        .where(eq(cmsElements.projectId, input.projectId));

      if (elements.length === 0) return [];

      const specIds = [...new Set(elements.map((e) => e.specificationId).filter(Boolean))] as string[];
      if (specIds.length === 0) return [];

      // Build element qty by spec
      const qtyBySpec: Record<string, number> = {};
      for (const el of elements) {
        if (el.specificationId) {
          qtyBySpec[el.specificationId] = (qtyBySpec[el.specificationId] ?? 0) + el.quantity;
        }
      }

      // Fetch material recipes
      const matRecipes = await ctx.db
        .select({
          specificationId: kbSpecMaterials.specificationId,
          materialId: kbSpecMaterials.materialId,
          quantityPerUnit: kbSpecMaterials.quantityPerUnit,
          wastageFactor: kbSpecMaterials.wastageFactor,
          materialName: kbMaterials.name,
          materialUnit: kbMaterials.unit,
        })
        .from(kbSpecMaterials)
        .leftJoin(kbMaterials, eq(kbSpecMaterials.materialId, kbMaterials.id))
        .where(sql`${kbSpecMaterials.specificationId} = ANY(${specIds})`);

      // Fetch labour recipes
      const labRecipes = await ctx.db
        .select({
          specificationId: kbSpecLabor.specificationId,
          laborId: kbSpecLabor.laborId,
          quantityPerUnit: kbSpecLabor.quantityPerUnit,
          laborName: kbLabor.name,
          laborUnit: kbLabor.unit,
        })
        .from(kbSpecLabor)
        .leftJoin(kbLabor, eq(kbSpecLabor.laborId, kbLabor.id))
        .where(sql`${kbSpecLabor.specificationId} = ANY(${specIds})`);

      // Roll up material forecast
      const matMap = new Map<string, CmsMaterialForecastLine>();
      for (const r of matRecipes) {
        const elQty = qtyBySpec[r.specificationId] ?? 0;
        const forecast = elQty * r.quantityPerUnit * (1 + r.wastageFactor);
        const key = r.materialId;
        const existing = matMap.get(key);
        if (existing) {
          existing.forecastQty += forecast;
        } else {
          matMap.set(key, {
            itemId: r.materialId,
            itemCode: null,
            itemName: r.materialName ?? r.materialId,
            unit: r.materialUnit ?? null,
            forecastQty: forecast,
            type: "MATERIAL",
          });
        }
      }

      // Roll up labour forecast
      const labMap = new Map<string, CmsMaterialForecastLine>();
      for (const r of labRecipes) {
        const elQty = qtyBySpec[r.specificationId] ?? 0;
        const forecast = elQty * r.quantityPerUnit;
        const key = r.laborId;
        const existing = labMap.get(key);
        if (existing) {
          existing.forecastQty += forecast;
        } else {
          labMap.set(key, {
            itemId: r.laborId,
            itemCode: null,
            itemName: r.laborName ?? r.laborId,
            unit: r.laborUnit ?? null,
            forecastQty: forecast,
            type: "LABOUR",
          });
        }
      }

      const lines = [
        ...[...matMap.values()].sort((a, b) => a.itemName.localeCompare(b.itemName)),
        ...[...labMap.values()].sort((a, b) => a.itemName.localeCompare(b.itemName)),
      ];
      return lines.map((l) => ({ ...l, forecastQty: Math.round(l.forecastQty * 1000) / 1000 }));
    }),

  /** CMS-8 — cost dashboard: Estimated vs Executed vs Certified (read-model, no writes). */
  costDashboard: protectedProcedure
    .input(CmsByProjectInput)
    .query(async ({ ctx, input }): Promise<CmsCostDashboard> => {
      // 1. Estimated total (sum of element amounts)
      const [estRow] = await ctx.db
        .select({
          total: sql<number>`COALESCE(SUM(amount_paise), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(cmsElements)
        .where(eq(cmsElements.projectId, input.projectId));

      const estimatedTotal = Number(estRow?.total ?? 0);
      const elementCount = Number(estRow?.count ?? 0);

      // 2. Executed estimate: Σ(verifiedQty × element.ratePaise) per element
      const verifiedQtyRows = await ctx.db
        .select({
          elementId: cmsMeasurements.elementId,
          verifiedQty: sum(cmsMeasurements.executedQty),
        })
        .from(cmsMeasurements)
        .where(
          and(
            eq(cmsMeasurements.projectId, input.projectId),
            sql`${cmsMeasurements.status} = 'VERIFIED'`,
          ),
        )
        .groupBy(cmsMeasurements.elementId);

      let executedEstimatedPaise = 0;
      if (verifiedQtyRows.length > 0) {
        const elementIds = verifiedQtyRows.map((r) => r.elementId);
        const rates = await ctx.db
          .select({ id: cmsElements.id, ratePaise: cmsElements.ratePaise })
          .from(cmsElements)
          .where(sql`${cmsElements.id} = ANY(${elementIds})`);
        const rateById = new Map(rates.map((r) => [r.id, r.ratePaise]));
        for (const row of verifiedQtyRows) {
          const rate = rateById.get(row.elementId) ?? 0;
          executedEstimatedPaise += Math.round(Number(row.verifiedQty ?? 0) * rate);
        }
      }

      // 3. Certified total (from CERTIFIED bills)
      const [certRow] = await ctx.db
        .select({ total: sql<number>`COALESCE(SUM(certified_amount_paise), 0)` })
        .from(cmsBills)
        .where(
          and(
            eq(cmsBills.projectId, input.projectId),
            sql`${cmsBills.status} = 'CERTIFIED'`,
          ),
        );

      const certifiedTotal = Number(certRow?.total ?? 0);

      return {
        estimatedTotalPaise: estimatedTotal,
        executedEstimatedPaise,
        certifiedTotalPaise: certifiedTotal,
        percentExecuted: estimatedTotal > 0 ? Math.round((executedEstimatedPaise / estimatedTotal) * 1000) / 10 : 0,
        percentCertified: estimatedTotal > 0 ? Math.round((certifiedTotal / estimatedTotal) * 1000) / 10 : 0,
        elementCount,
      };
    }),
});

/** Cost Management System router — CMS-1 through CMS-8. */
export const cmsRouter = router({ locations, elements, boq, finalSet, measurements, workOrders, bills, intelligence });
