/**
 * Estimation OS Phase 4 — contractor work packages carved from a frozen
 * estimate, plus the cumulative-billed ledger that powers double-billing
 * prevention (spec §19–20, Rule 9: "one spine, never parallel").
 *
 * A work package groups approved (frozen) BOQ items into a contractor scope.
 * Running bills then measure against package items; `previouslyBilledQty` is the
 * project-wide ledger keyed by BOQ item, so a quantity can never be billed twice
 * — even across two packages that share the same BOQ line.
 */
import {
  billableBalance,
  variationItemAmountPaise,
  WorkPackageFromEstimate,
  WorkPackageItemAdd,
  WorkPackageStatus,
  WorkPackageUpdate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import {
  estimateItems,
  estimateVersions,
  measurementRecords,
  runningBillItems,
  runningBills,
  variationItems,
  variations,
  workPackageItems,
  workPackages,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

function amount(qty: number, ratePaise: number) {
  return Math.round(qty * ratePaise);
}

/**
 * Project-wide billed quantity per BOQ item (the double-billing ledger). Sums
 * every running-bill line that targets each `boqItemId` across the project — the
 * 9-state bill machine never rejects, so every measured line consumes balance.
 */
export async function previouslyBilledQty(
  db: DB,
  projectId: string,
  boqItemIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const ids = boqItemIds.filter(Boolean);
  if (ids.length === 0) return map;
  const rows = await db
    .select({
      boqItemId: runningBillItems.boqItemId,
      qty: sql<number>`coalesce(sum(${runningBillItems.qty}), 0)`,
    })
    .from(runningBillItems)
    .innerJoin(runningBills, eq(runningBillItems.runningBillId, runningBills.id))
    .where(and(eq(runningBills.projectId, projectId), inArray(runningBillItems.boqItemId, ids)))
    .groupBy(runningBillItems.boqItemId);
  for (const r of rows) if (r.boqItemId) map.set(r.boqItemId, Number(r.qty));
  return map;
}

/**
 * Project-wide approved-but-unbilled quantity per BOQ item (Construction Cost OS
 * Phase C). Sums every APPROVED measurement record against each `boqItemId` —
 * these have passed the double-billing guard at approval time but haven't yet
 * been pulled into a running bill, so they reserve balance just like billed qty.
 * A record moves out of this bucket (→ a `runningBillItem`) the moment it's
 * billed, so it's never counted twice.
 */
export async function approvedUnbilledQty(
  db: DB,
  projectId: string,
  boqItemIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const ids = boqItemIds.filter(Boolean);
  if (ids.length === 0) return map;
  const rows = await db
    .select({
      boqItemId: measurementRecords.boqItemId,
      qty: sql<number>`coalesce(sum(${measurementRecords.qty}), 0)`,
    })
    .from(measurementRecords)
    .where(
      and(
        eq(measurementRecords.projectId, projectId),
        eq(measurementRecords.status, "APPROVED"),
        inArray(measurementRecords.boqItemId, ids),
      ),
    )
    .groupBy(measurementRecords.boqItemId);
  for (const r of rows) if (r.boqItemId) map.set(r.boqItemId, Number(r.qty));
  return map;
}

async function recomputeContractValue(db: DB, workPackageId: string) {
  const [agg] = await db
    .select({ total: sql<number>`coalesce(sum(${workPackageItems.amountPaise}), 0)` })
    .from(workPackageItems)
    .where(eq(workPackageItems.workPackageId, workPackageId));
  await db
    .update(workPackages)
    .set({ contractValuePaise: Number(agg?.total ?? 0), updatedAt: new Date() })
    .where(eq(workPackages.id, workPackageId));
}

async function loadPackageOr404(db: DB, id: string) {
  const [pkg] = await db.select().from(workPackages).where(eq(workPackages.id, id));
  if (!pkg) throw new TRPCError({ code: "NOT_FOUND" });
  return pkg;
}

/**
 * Apply an approved variation order into the billable ledger (Construction Cost
 * OS Phase D). This is the ONLY mutation of `workPackageItems.variationQty` in
 * the system, and it only ever *adds*:
 *   • an addition to an existing line bumps that line's `variationQty`; the added
 *     qty bills at the line's original contract rate, so the contract rate is
 *     never overwritten (Rule 5);
 *   • an extra item inserts a brand-new package line, self-keying its `boqItemId`
 *     to its own variation-item id, so the existing project-wide bill guard
 *     immediately makes the new scope billable with no change to Phase C billing.
 * Returns the signed total cost impact (paise) added to the package.
 */
export async function applyVariation(db: DB, variationId: string): Promise<number> {
  const [variation] = await db.select().from(variations).where(eq(variations.id, variationId));
  if (!variation) throw new TRPCError({ code: "NOT_FOUND" });
  const items = await db
    .select()
    .from(variationItems)
    .where(eq(variationItems.variationId, variationId))
    .orderBy(asc(variationItems.sortOrder), asc(variationItems.createdAt));

  let costImpactPaise = 0;
  for (const line of items) {
    if (line.workPackageItemId) {
      // Addition to an existing line — bump variationQty, keep the contract rate.
      const [wpItem] = await db
        .select()
        .from(workPackageItems)
        .where(eq(workPackageItems.id, line.workPackageItemId));
      if (!wpItem) continue;
      const newVariationQty = wpItem.variationQty + line.qty;
      const lineImpact = amount(line.qty, wpItem.ratePaise);
      await db
        .update(workPackageItems)
        .set({
          variationQty: newVariationQty,
          amountPaise: amount(wpItem.approvedQty + newVariationQty, wpItem.ratePaise),
        })
        .where(eq(workPackageItems.id, wpItem.id));
      await db
        .update(variationItems)
        .set({ boqItemId: wpItem.boqItemId, amountPaise: lineImpact })
        .where(eq(variationItems.id, line.id));
      costImpactPaise += lineImpact;
    } else if (variation.workPackageId) {
      // Extra item — a new ledger-keyed package line (self-keyed boqItemId).
      const lineImpact = variationItemAmountPaise(line.qty, line.ratePaise);
      const [created] = await db
        .insert(workPackageItems)
        .values({
          workPackageId: variation.workPackageId,
          boqItemId: line.id,
          description: line.description,
          unit: line.unit,
          approvedQty: 0,
          variationQty: line.qty,
          ratePaise: line.ratePaise,
          amountPaise: lineImpact,
          sortOrder: line.sortOrder,
        })
        .returning();
      await db
        .update(variationItems)
        .set({ workPackageItemId: created!.id, boqItemId: line.id, amountPaise: lineImpact })
        .where(eq(variationItems.id, line.id));
      costImpactPaise += lineImpact;
    }
  }

  if (variation.workPackageId) await recomputeContractValue(db, variation.workPackageId);
  return costImpactPaise;
}

export const workPackageRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(workPackages)
        .where(eq(workPackages.projectId, input.projectId))
        .orderBy(desc(workPackages.createdAt)),
    ),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const pkg = await loadPackageOr404(ctx.db, input.id);
      const items = await ctx.db
        .select()
        .from(workPackageItems)
        .where(eq(workPackageItems.workPackageId, input.id))
        .orderBy(asc(workPackageItems.sortOrder), asc(workPackageItems.createdAt));
      return { package: pkg, items };
    }),

  /** Seed a package from a frozen estimate version's measurable BOQ lines. */
  createFromEstimate: protectedProcedure
    .input(WorkPackageFromEstimate)
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const [version] = await ctx.db
        .select()
        .from(estimateVersions)
        .where(eq(estimateVersions.id, input.estimateVersionId));
      if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Frozen estimate version not found." });

      // Frozen estimates are immutable, so the live items equal the baseline.
      const rows = await ctx.db
        .select()
        .from(estimateItems)
        .where(eq(estimateItems.estimateId, version.estimateId))
        .orderBy(asc(estimateItems.sortOrder), asc(estimateItems.createdAt));

      const headFilter = input.costHeads && input.costHeads.length > 0 ? new Set(input.costHeads) : null;
      // Only measurable lines become contractor scope (qty > 0 drops percentage
      // preliminaries / contingency, which aren't site-measured).
      const source = rows.filter(
        (r) => r.qty > 0 && (!headFilter || (r.costHead != null && headFilter.has(r.costHead as never))),
      );
      if (source.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No measurable BOQ lines in this frozen version for the chosen cost heads.",
        });
      }

      const { ref } = await nextRef(ctx.db, "work_package", "WP");
      const contractValuePaise = source.reduce((sum, r) => sum + amount(r.qty, r.ratePaise), 0);
      const [pkg] = await ctx.db
        .insert(workPackages)
        .values({
          ref,
          projectId: input.projectId,
          estimateId: version.estimateId,
          estimateVersionId: version.id,
          contractorId: input.contractorId ?? null,
          name: input.name,
          packageType: input.packageType,
          status: "DRAFT",
          contractValuePaise,
          notes: input.notes ?? null,
          createdById: ctx.user.id,
        })
        .returning();

      for (const [idx, r] of source.entries()) {
        await ctx.db.insert(workPackageItems).values({
          workPackageId: pkg!.id,
          boqItemId: r.id,
          componentId: r.componentId ?? null,
          description: r.description,
          unit: r.unit,
          approvedQty: r.qty,
          variationQty: 0,
          ratePaise: r.ratePaise,
          amountPaise: amount(r.qty, r.ratePaise),
          sortOrder: idx,
        });
      }

      await writeAudit(ctx.db, {
        entity: "work_package",
        entityId: pkg!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: { ref, estimateVersionId: version.id, itemCount: source.length, contractValuePaise },
      });
      return { ...pkg!, itemCount: source.length };
    }),

  /** Add a manual line to a package (e.g. a non-BOQ contractor item). */
  addItem: protectedProcedure.input(WorkPackageItemAdd).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    await loadPackageOr404(ctx.db, input.workPackageId);
    const [row] = await ctx.db
      .insert(workPackageItems)
      .values({
        workPackageId: input.workPackageId,
        boqItemId: input.boqItemId ?? null,
        componentId: input.componentId ?? null,
        description: input.description,
        unit: input.unit,
        approvedQty: input.approvedQty,
        variationQty: input.variationQty,
        ratePaise: input.ratePaise,
        amountPaise: amount(input.approvedQty + input.variationQty, input.ratePaise),
        sortOrder: input.sortOrder,
      })
      .returning();
    await recomputeContractValue(ctx.db, input.workPackageId);
    await writeAudit(ctx.db, {
      entity: "work_package",
      entityId: input.workPackageId,
      action: "ITEM_ADD",
      actorId: ctx.user.id,
      after: { itemId: row!.id, description: input.description },
    });
    return row!;
  }),

  /** Edit a package line's approved / variation qty or rate. */
  updateItem: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        description: z.string().min(1).max(400).optional(),
        unit: z.string().min(1).max(20).optional(),
        approvedQty: z.number().nonnegative().optional(),
        variationQty: z.number().optional(),
        ratePaise: z.number().int().nonnegative().optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const [item] = await ctx.db
        .select()
        .from(workPackageItems)
        .where(eq(workPackageItems.id, input.id));
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      const approvedQty = input.approvedQty ?? item.approvedQty;
      const variationQty = input.variationQty ?? item.variationQty;
      const ratePaise = input.ratePaise ?? item.ratePaise;
      await ctx.db
        .update(workPackageItems)
        .set({
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.unit !== undefined ? { unit: input.unit } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          approvedQty,
          variationQty,
          ratePaise,
          amountPaise: amount(approvedQty + variationQty, ratePaise),
        })
        .where(eq(workPackageItems.id, input.id));
      await recomputeContractValue(ctx.db, item.workPackageId);
      return { ok: true };
    }),

  removeItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const [item] = await ctx.db
        .select({ workPackageId: workPackageItems.workPackageId })
        .from(workPackageItems)
        .where(eq(workPackageItems.id, input.id));
      if (!item) return { ok: true };
      await ctx.db.delete(workPackageItems).where(eq(workPackageItems.id, input.id));
      await recomputeContractValue(ctx.db, item.workPackageId);
      return { ok: true };
    }),

  /** General package edit (name / type / contractor / status / notes). */
  update: protectedProcedure.input(WorkPackageUpdate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const before = await loadPackageOr404(ctx.db, input.id);
    const [after] = await ctx.db
      .update(workPackages)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.packageType !== undefined ? { packageType: input.packageType } : {}),
        ...(input.contractorId !== undefined ? { contractorId: input.contractorId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(workPackages.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "work_package",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before: { status: before.status, contractorId: before.contractorId },
      after: { status: after!.status, contractorId: after!.contractorId },
    });
    return after!;
  }),

  setStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: WorkPackageStatus }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const before = await loadPackageOr404(ctx.db, input.id);
      const [after] = await ctx.db
        .update(workPackages)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(workPackages.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "work_package",
        entityId: input.id,
        action: "STATUS_UPDATE",
        actorId: ctx.user.id,
        before: { status: before.status },
        after: { status: input.status },
      });
      return after!;
    }),

  assignContractor: protectedProcedure
    .input(z.object({ id: z.string().uuid(), contractorId: z.string().uuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      await loadPackageOr404(ctx.db, input.id);
      const [after] = await ctx.db
        .update(workPackages)
        .set({ contractorId: input.contractorId, updatedAt: new Date() })
        .where(eq(workPackages.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "work_package",
        entityId: input.id,
        action: "ASSIGN_CONTRACTOR",
        actorId: ctx.user.id,
        after: { contractorId: input.contractorId },
      });
      return after!;
    }),

  /**
   * Per-item ledger: approved / variation / billed / balance. Drives the office
   * package view and the contractor portal; billed qty is the project-wide BOQ
   * ledger so cross-package double billing is visible.
   */
  billedSummary: protectedProcedure
    .input(z.object({ workPackageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const pkg = await loadPackageOr404(ctx.db, input.workPackageId);
      const items = await ctx.db
        .select()
        .from(workPackageItems)
        .where(eq(workPackageItems.workPackageId, input.workPackageId))
        .orderBy(asc(workPackageItems.sortOrder), asc(workPackageItems.createdAt));
      const boqIds = items.map((i) => i.boqItemId).filter((x): x is string => Boolean(x));
      const billed = await previouslyBilledQty(ctx.db, pkg.projectId, boqIds);
      // Phase C: approved-but-unbilled measurements also reserve balance, so the
      // remaining balance subtracts both billed and committed-pending quantities.
      const committed = await approvedUnbilledQty(ctx.db, pkg.projectId, boqIds);
      return items.map((i) => {
        const billedQty = i.boqItemId ? (billed.get(i.boqItemId) ?? 0) : 0;
        const approvedUnbilled = i.boqItemId ? (committed.get(i.boqItemId) ?? 0) : 0;
        const balanceQty = billableBalance({
          approvedQty: i.approvedQty,
          variationQty: i.variationQty,
          previousBilledQty: billedQty + approvedUnbilled,
        });
        return {
          id: i.id,
          boqItemId: i.boqItemId,
          description: i.description,
          unit: i.unit,
          approvedQty: i.approvedQty,
          variationQty: i.variationQty,
          ratePaise: i.ratePaise,
          billedQty,
          /** APPROVED measurements not yet pulled into a bill (reserves balance). */
          approvedUnbilledQty: approvedUnbilled,
          balanceQty,
        };
      });
    }),
});
