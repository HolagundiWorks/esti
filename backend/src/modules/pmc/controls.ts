/**
 * Construction Cost OS Phase D — Controls (deviations + variation orders).
 *
 * Deviations make scope/rate drift against the contract visible and governed:
 *   • QTY — executed vs the BOQ baseline qty on a work-package line;
 *   • RATE — a *proposed* revised rate vs the awarded contract rate.
 * A deviation is a document-and-approve record only. Approving a RATE deviation
 * records the revised rate but NEVER writes `workPackageItems.ratePaise` — the
 * contract rate is never overwritten (non-negotiable Rule 5).
 *
 * A variation order (the "addition") is the ONLY thing that legitimately mutates
 * the billable ledger (`workPackageItems.variationQty`), and only after a recorded
 * two-step internal + client sign-off (Draft → Submitted → Internal-approved →
 * Client-approved → Applied → Closed, plus Rejected). On Apply, `applyVariation`
 * adds qty to existing lines or inserts ledger-keyed extra items, so the existing
 * Phase-C bill guard immediately makes the new scope billable. Approve/apply steps
 * are gated by the `cost:approve` capability (L2+); anyone with `write` can author.
 */
import {
  canTransitionVariation,
  DeviationApprove,
  DeviationConvert,
  DeviationCreate,
  DeviationReject,
  type DeviationStatus,
  deviationCostImpactPaise,
  quantityDeviation,
  rateDeviation,
  rateLadderHops,
  VARIATION_STATUS_LABEL,
  VariationApply,
  VariationApproveClient,
  VariationApproveInternal,
  VariationClose,
  VariationCreate,
  VariationItemInput,
  VariationItemRemove,
  VariationItemUpsert,
  VariationReject,
  VariationSubmit,
  variationItemAmountPaise,
  type RateLadderRow,
  type VariationStatus,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { deviations, variationItems, variations, workPackageItems } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { applyVariation } from "../boq/workPackage.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const author = capabilityProcedure("write");
const approver = capabilityProcedure("cost:approve");

async function loadVariationOr404(db: DB, id: string, projectId: string) {
  const [v] = await db.select().from(variations).where(eq(variations.id, id));
  if (!v || v.projectId !== projectId) throw new TRPCError({ code: "NOT_FOUND" });
  return v;
}

function assertTransition(from: VariationStatus, to: VariationStatus) {
  if (!canTransitionVariation(from, to)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot move a ${VARIATION_STATUS_LABEL[from]} variation to ${VARIATION_STATUS_LABEL[to]}.`,
    });
  }
}

/** Editable only while the scope isn't yet locked by an internal sign-off. */
function assertEditable(status: string) {
  if (status !== "DRAFT" && status !== "SUBMITTED") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A variation's lines can only be changed while it is a draft or submitted.",
    });
  }
}

/**
 * Normalise one variation line. An addition to an existing package line always
 * prices at that line's contract rate (Rule 5 — the rate is never overwritten);
 * anything else is an extra item priced at its own entered rate.
 */
async function buildItemValues(db: DB, line: z.infer<typeof VariationItemInput>) {
  if (line.workPackageItemId && !line.isExtraItem) {
    const [wp] = await db
      .select()
      .from(workPackageItems)
      .where(eq(workPackageItems.id, line.workPackageItemId));
    if (!wp) throw new TRPCError({ code: "NOT_FOUND", message: "Work-package line not found." });
    return {
      workPackageItemId: wp.id,
      boqItemId: wp.boqItemId ?? null,
      isExtraItem: false,
      description: wp.description,
      unit: wp.unit,
      qty: line.qty,
      ratePaise: wp.ratePaise,
      amountPaise: variationItemAmountPaise(line.qty, wp.ratePaise),
    };
  }
  return {
    workPackageItemId: null,
    boqItemId: null,
    isExtraItem: true,
    description: line.description,
    unit: line.unit,
    qty: line.qty,
    ratePaise: line.ratePaise,
    amountPaise: variationItemAmountPaise(line.qty, line.ratePaise),
  };
}

/** Refresh a variation's headline cost impact from the sum of its lines. */
async function recomputeVariationCost(db: DB, variationId: string) {
  const [agg] = await db
    .select({ total: sql<number>`coalesce(sum(${variationItems.amountPaise}), 0)` })
    .from(variationItems)
    .where(eq(variationItems.variationId, variationId));
  await db
    .update(variations)
    .set({ costImpactPaise: Number(agg?.total ?? 0), updatedAt: new Date() })
    .where(eq(variations.id, variationId));
}

export const deviationRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(deviations)
        .where(eq(deviations.projectId, input.projectId))
        .orderBy(desc(deviations.createdAt)),
    ),

  listByWorkPackage: protectedProcedure
    .input(z.object({ workPackageId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(deviations)
        .where(eq(deviations.workPackageId, input.workPackageId))
        .orderBy(desc(deviations.createdAt)),
    ),

  /**
   * Rate-deviation ladder (3.4) — every work-package line's rate journey across
   * the spine: estimated (design estimate) → tendered (office BOQ baseline) →
   * awarded (winning bid) → revised (latest non-rejected RATE deviation). Computed
   * live from the spine by the Rule-9 boqItemId ledger key, so it is correct for
   * pre-existing deviations too. Read-only; advisory — a revised rate reaches bills
   * only via a variation (Rule 5).
   */
  rateLadder: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const rows = (await ctx.db.execute(sql`
        select
          wpi.id                 as work_package_item_id,
          wp.id                  as work_package_id,
          wp.ref                 as ref,
          wpi.description        as description,
          wpi.unit               as unit,
          ei.rate_paise          as estimated_paise,
          (
            select ti.est_rate_paise
            from esti_tender_item ti
            join esti_tender t on t.id = ti.tender_id
            where t.project_id = ${input.projectId} and ti.boq_item_id = wpi.boq_item_id
            order by t.created_at desc
            limit 1
          )                      as tendered_paise,
          wpi.rate_paise         as awarded_paise,
          d.id                   as dev_id,
          d.ref                  as dev_ref,
          d.status               as dev_status,
          d.reason               as dev_reason,
          d.revised_rate_paise   as revised_paise
        from esti_work_package_item wpi
        join esti_work_package wp on wp.id = wpi.work_package_id
        left join esti_estimate_item ei on ei.id = wpi.boq_item_id
        left join lateral (
          select id, ref, status, reason, revised_rate_paise
          from esti_deviation dd
          where dd.work_package_item_id = wpi.id
            and dd.deviation_type = 'RATE'
            and dd.status <> 'REJECTED'
          order by dd.created_at desc
          limit 1
        ) d on true
        where wp.project_id = ${input.projectId}
        order by wp.ref, wpi.sort_order, wpi.description
      `)) as unknown as {
        work_package_item_id: string;
        work_package_id: string;
        ref: string;
        description: string;
        unit: string;
        estimated_paise: number | string | null;
        tendered_paise: number | string | null;
        awarded_paise: number | string | null;
        dev_id: string | null;
        dev_ref: string | null;
        dev_status: string | null;
        dev_reason: string | null;
        revised_paise: number | string | null;
      }[];

      const ladder: RateLadderRow[] = rows.map((r) => {
        const estimatedPaise = r.estimated_paise == null ? null : Number(r.estimated_paise);
        const tenderedPaise = r.tendered_paise == null ? null : Number(r.tendered_paise);
        const awardedPaise = r.awarded_paise == null ? null : Number(r.awarded_paise);
        const revisedPaise = r.dev_id == null ? null : Number(r.revised_paise);
        return {
          workPackageId: r.work_package_id,
          workPackageItemId: r.work_package_item_id,
          ref: r.ref,
          description: r.description,
          unit: r.unit,
          estimatedPaise,
          tenderedPaise,
          awardedPaise,
          revisedPaise,
          hops: rateLadderHops({ estimatedPaise, tenderedPaise, awardedPaise, revisedPaise }),
          deviation: r.dev_id
            ? {
                id: r.dev_id,
                ref: r.dev_ref!,
                status: (r.dev_status ?? "OPEN") as DeviationStatus,
                reason: r.dev_reason,
              }
            : null,
        };
      });
      return { rows: ladder, generatedAt: new Date().toISOString() };
    }),

  create: author.input(DeviationCreate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const [wpItem] = await ctx.db
      .select()
      .from(workPackageItems)
      .where(eq(workPackageItems.id, input.workPackageItemId));
    if (!wpItem || wpItem.workPackageId !== input.workPackageId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Work-package line not found." });
    }

    // Baseline derived from the live contract line: current qty = approved +
    // already-applied variations; awarded rate = the line's contract rate.
    const boqQty = wpItem.approvedQty + wpItem.variationQty;
    const awardedRatePaise = wpItem.ratePaise;

    let deviationQty = 0;
    let deviationPct = 0;
    let executedQty = 0;
    let revisedRatePaise = 0;
    let costImpactPaise = 0;

    if (input.type === "QTY") {
      if (input.executedQty == null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "An executed quantity is required for a quantity deviation." });
      }
      executedQty = input.executedQty;
      const d = quantityDeviation({ boqQty, executedQty });
      deviationQty = d.deviationQty;
      deviationPct = d.deviationPct;
      costImpactPaise = deviationCostImpactPaise({ type: "QTY", deviationQty, ratePaise: awardedRatePaise });
    } else {
      if (input.revisedRatePaise == null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A revised rate is required for a rate deviation." });
      }
      revisedRatePaise = input.revisedRatePaise;
      deviationPct = rateDeviation({ awardedRatePaise, revisedRatePaise }).deviationPct;
      costImpactPaise = deviationCostImpactPaise({
        type: "RATE",
        qty: boqQty,
        awardedRatePaise,
        revisedRatePaise,
      });
    }

    // Rate-ladder rungs (3.4): the estimate baseline and the tender office-baseline
    // for this line, linked by the Rule-9 boqItemId ledger key. Persisted so the
    // stored deviation carries the full estimated → tendered → awarded → revised
    // ladder (the read view recomputes them live, but the row keeps them for audit).
    let estimatedRatePaise = 0;
    let tenderedRatePaise = 0;
    if (wpItem.boqItemId) {
      const [est] = (await ctx.db.execute(sql`
        select coalesce(rate_paise, 0)::bigint as rate_paise
        from esti_estimate_item where id = ${wpItem.boqItemId}
      `)) as unknown as [{ rate_paise: number } | undefined];
      estimatedRatePaise = Number(est?.rate_paise ?? 0);
      const [ten] = (await ctx.db.execute(sql`
        select coalesce(ti.est_rate_paise, 0)::bigint as rate_paise
        from esti_tender_item ti
        join esti_tender t on t.id = ti.tender_id
        where t.project_id = ${input.projectId} and ti.boq_item_id = ${wpItem.boqItemId}
        order by t.created_at desc
        limit 1
      `)) as unknown as [{ rate_paise: number } | undefined];
      tenderedRatePaise = Number(ten?.rate_paise ?? 0);
    }

    const { ref } = await nextRef(ctx.db, "deviation", "DEV");
    const [row] = await ctx.db
      .insert(deviations)
      .values({
        ref,
        projectId: input.projectId,
        workPackageId: input.workPackageId,
        workPackageItemId: wpItem.id,
        boqItemId: wpItem.boqItemId ?? null,
        deviationType: input.type,
        description: wpItem.description,
        unit: wpItem.unit,
        boqQty,
        executedQty,
        deviationQty,
        deviationPct,
        estimatedRatePaise,
        tenderedRatePaise,
        awardedRatePaise,
        revisedRatePaise,
        costImpactPaise,
        reason: input.reason,
        reasonSource: input.reasonSource,
        status: "OPEN",
        createdById: ctx.user.id,
      })
      .returning();

    await writeAudit(ctx.db, {
      entity: "deviation",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    await writeActivity(ctx.db, {
      projectId: input.projectId,
      objectType: "deviation",
      objectId: row!.id,
      eventType: "cost.deviation.created",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${row!.ref} — ${input.type === "QTY" ? "quantity" : "rate"} deviation on ${wpItem.description} (${deviationPct}%)`,
      metadata: { type: input.type, deviationPct, costImpactPaise },
    });
    return row!;
  }),

  approve: approver.input(DeviationApprove).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const [dev] = await ctx.db.select().from(deviations).where(eq(deviations.id, input.id));
    if (!dev || dev.projectId !== input.projectId) throw new TRPCError({ code: "NOT_FOUND" });
    if (dev.status !== "OPEN") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Only an open deviation can be approved (this one is ${dev.status}).` });
    }
    // Approval records the revised rate only — it does NOT touch the contract
    // rate on the work-package line (Rule 5). A rate change reaches bills via a
    // variation order line, never by mutating the original rate.
    const [row] = await ctx.db
      .update(deviations)
      .set({ status: "APPROVED", approvedById: ctx.user.id, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(deviations.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "deviation",
      entityId: input.id,
      action: "APPROVE",
      actorId: ctx.user.id,
      before: { status: dev.status },
      after: { status: "APPROVED" },
    });
    await writeActivity(ctx.db, {
      projectId: dev.projectId,
      objectType: "deviation",
      objectId: input.id,
      eventType: "cost.deviation.approved",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${dev.ref} approved`,
      metadata: { status: "APPROVED" },
    });
    return row!;
  }),

  reject: approver.input(DeviationReject).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const [dev] = await ctx.db.select().from(deviations).where(eq(deviations.id, input.id));
    if (!dev || dev.projectId !== input.projectId) throw new TRPCError({ code: "NOT_FOUND" });
    if (dev.status !== "OPEN") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Only an open deviation can be rejected (this one is ${dev.status}).` });
    }
    const [row] = await ctx.db
      .update(deviations)
      .set({ status: "REJECTED", rejectionReason: input.reason, updatedAt: new Date() })
      .where(eq(deviations.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "deviation",
      entityId: input.id,
      action: "REJECT",
      actorId: ctx.user.id,
      before: { status: dev.status },
      after: { status: "REJECTED", reason: input.reason },
    });
    await writeActivity(ctx.db, {
      projectId: dev.projectId,
      objectType: "deviation",
      objectId: input.id,
      eventType: "cost.deviation.rejected",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${dev.ref} rejected — ${input.reason}`,
      metadata: { status: "REJECTED" },
    });
    return row!;
  }),

  /** Roll an open/approved deviation into a DRAFT variation order, pre-filled. */
  convertToVariation: author.input(DeviationConvert).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const [dev] = await ctx.db.select().from(deviations).where(eq(deviations.id, input.id));
    if (!dev || dev.projectId !== input.projectId) throw new TRPCError({ code: "NOT_FOUND" });
    if (dev.variationId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This deviation is already linked to a variation." });
    }

    const { ref } = await nextRef(ctx.db, "variation", "VO");
    const [variation] = await ctx.db
      .insert(variations)
      .values({
        ref,
        projectId: dev.projectId,
        workPackageId: dev.workPackageId,
        title: input.title ?? `From ${dev.ref} — ${dev.description}`,
        reason: dev.reason,
        originator: "CLIENT",
        status: "DRAFT",
        createdById: ctx.user.id,
      })
      .returning();

    // A quantity deviation seeds an addition on the same line; a rate deviation
    // leaves the lines for the author to fill (a rate change becomes a new line).
    if (dev.deviationType === "QTY" && dev.workPackageItemId && dev.deviationQty !== 0) {
      await ctx.db.insert(variationItems).values({
        variationId: variation!.id,
        workPackageItemId: dev.workPackageItemId,
        boqItemId: dev.boqItemId,
        isExtraItem: false,
        description: dev.description,
        unit: dev.unit,
        qty: dev.deviationQty,
        ratePaise: dev.awardedRatePaise,
        amountPaise: variationItemAmountPaise(dev.deviationQty, dev.awardedRatePaise),
        sortOrder: 0,
      });
      await recomputeVariationCost(ctx.db, variation!.id);
    }

    await ctx.db
      .update(deviations)
      .set({ variationId: variation!.id, updatedAt: new Date() })
      .where(eq(deviations.id, dev.id));

    await writeAudit(ctx.db, {
      entity: "variation",
      entityId: variation!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { ref: variation!.ref, fromDeviation: dev.ref },
    });
    await writeActivity(ctx.db, {
      projectId: dev.projectId,
      objectType: "variation",
      objectId: variation!.id,
      eventType: "cost.variation.created",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${variation!.ref} drafted from deviation ${dev.ref}`,
      metadata: { fromDeviation: dev.ref },
    });
    return variation!;
  }),
});

export const variationRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(variations)
        .where(eq(variations.projectId, input.projectId))
        .orderBy(desc(variations.createdAt)),
    ),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [variation] = await ctx.db.select().from(variations).where(eq(variations.id, input.id));
      if (!variation) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await ctx.db
        .select()
        .from(variationItems)
        .where(eq(variationItems.variationId, input.id))
        .orderBy(asc(variationItems.sortOrder), asc(variationItems.createdAt));
      return { variation, items };
    }),

  create: author.input(VariationCreate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const { ref } = await nextRef(ctx.db, "variation", "VO");
    const [variation] = await ctx.db
      .insert(variations)
      .values({
        ref,
        projectId: input.projectId,
        workPackageId: input.workPackageId,
        title: input.title,
        reason: input.reason ?? null,
        originator: input.originator,
        timeImpactDays: input.timeImpactDays,
        billable: input.billable,
        status: "DRAFT",
        createdById: ctx.user.id,
      })
      .returning();

    if (input.items && input.items.length > 0) {
      for (const [idx, line] of input.items.entries()) {
        const values = await buildItemValues(ctx.db, line);
        await ctx.db.insert(variationItems).values({ variationId: variation!.id, ...values, sortOrder: idx });
      }
      await recomputeVariationCost(ctx.db, variation!.id);
    }

    await writeAudit(ctx.db, {
      entity: "variation",
      entityId: variation!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { ref: variation!.ref, title: input.title, itemCount: input.items?.length ?? 0 },
    });
    await writeActivity(ctx.db, {
      projectId: input.projectId,
      objectType: "variation",
      objectId: variation!.id,
      eventType: "cost.variation.created",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${variation!.ref} created — ${input.title}`,
      metadata: { itemCount: input.items?.length ?? 0 },
    });
    return variation!;
  }),

  addItem: author
    .input(VariationItemInput.extend({ variationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const [variation] = await ctx.db.select().from(variations).where(eq(variations.id, input.variationId));
      if (!variation) throw new TRPCError({ code: "NOT_FOUND" });
      assertEditable(variation.status);
      const [agg] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(variationItems)
        .where(eq(variationItems.variationId, input.variationId));
      const values = await buildItemValues(ctx.db, input);
      const [row] = await ctx.db
        .insert(variationItems)
        .values({ variationId: input.variationId, ...values, sortOrder: Number(agg?.count ?? 0) })
        .returning();
      await recomputeVariationCost(ctx.db, input.variationId);
      return row!;
    }),

  updateItem: author.input(VariationItemUpsert).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    if (!input.id) throw new TRPCError({ code: "BAD_REQUEST", message: "An item id is required." });
    const [variation] = await ctx.db.select().from(variations).where(eq(variations.id, input.variationId));
    if (!variation) throw new TRPCError({ code: "NOT_FOUND" });
    assertEditable(variation.status);
    const values = await buildItemValues(ctx.db, input);
    await ctx.db
      .update(variationItems)
      .set(values)
      .where(eq(variationItems.id, input.id));
    await recomputeVariationCost(ctx.db, input.variationId);
    return { ok: true as const };
  }),

  removeItem: author.input(VariationItemRemove).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const [variation] = await ctx.db.select().from(variations).where(eq(variations.id, input.variationId));
    if (!variation) throw new TRPCError({ code: "NOT_FOUND" });
    assertEditable(variation.status);
    await ctx.db.delete(variationItems).where(eq(variationItems.id, input.id));
    await recomputeVariationCost(ctx.db, input.variationId);
    return { ok: true as const };
  }),

  submit: author.input(VariationSubmit).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const v = await loadVariationOr404(ctx.db, input.id, input.projectId);
    assertTransition(v.status as VariationStatus, "SUBMITTED");
    const [row] = await ctx.db
      .update(variations)
      .set({ status: "SUBMITTED", updatedAt: new Date() })
      .where(eq(variations.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "variation",
      entityId: input.id,
      action: "SUBMIT",
      actorId: ctx.user.id,
      before: { status: v.status },
      after: { status: "SUBMITTED" },
    });
    await writeActivity(ctx.db, {
      projectId: v.projectId,
      objectType: "variation",
      objectId: input.id,
      eventType: "cost.variation.submitted",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${v.ref} submitted for approval`,
      metadata: { status: "SUBMITTED" },
    });
    return row!;
  }),

  approveInternal: approver.input(VariationApproveInternal).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const v = await loadVariationOr404(ctx.db, input.id, input.projectId);
    assertTransition(v.status as VariationStatus, "INTERNAL_APPROVED");
    const [row] = await ctx.db
      .update(variations)
      .set({
        status: "INTERNAL_APPROVED",
        internalApprovedById: ctx.user.id,
        internalApprovedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(variations.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "variation",
      entityId: input.id,
      action: "INTERNAL_APPROVE",
      actorId: ctx.user.id,
      before: { status: v.status },
      after: { status: "INTERNAL_APPROVED" },
    });
    await writeActivity(ctx.db, {
      projectId: v.projectId,
      objectType: "variation",
      objectId: input.id,
      eventType: "cost.variation.internal_approved",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${v.ref} internally approved`,
      metadata: { status: "INTERNAL_APPROVED" },
    });
    return row!;
  }),

  approveClient: approver.input(VariationApproveClient).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const v = await loadVariationOr404(ctx.db, input.id, input.projectId);
    assertTransition(v.status as VariationStatus, "CLIENT_APPROVED");
    const [row] = await ctx.db
      .update(variations)
      .set({
        status: "CLIENT_APPROVED",
        clientApprovedById: ctx.user.id,
        clientApprovedByName: input.clientApprovedByName ?? null,
        clientApprovedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(variations.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "variation",
      entityId: input.id,
      action: "CLIENT_APPROVE",
      actorId: ctx.user.id,
      before: { status: v.status },
      after: { status: "CLIENT_APPROVED", clientApprovedByName: input.clientApprovedByName },
    });
    await writeActivity(ctx.db, {
      projectId: v.projectId,
      objectType: "variation",
      objectId: input.id,
      eventType: "cost.variation.client_approved",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${v.ref} approved by client${input.clientApprovedByName ? ` (${input.clientApprovedByName})` : ""}`,
      metadata: { status: "CLIENT_APPROVED" },
    });
    return row!;
  }),

  applyToLedger: approver.input(VariationApply).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const v = await loadVariationOr404(ctx.db, input.id, input.projectId);
    assertTransition(v.status as VariationStatus, "APPLIED");
    // The only mutation of the billable ledger — adds variationQty / extra lines.
    const costImpactPaise = await applyVariation(ctx.db, input.id);
    const [row] = await ctx.db
      .update(variations)
      .set({
        status: "APPLIED",
        costImpactPaise,
        appliedById: ctx.user.id,
        appliedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(variations.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "variation",
      entityId: input.id,
      action: "APPLY",
      actorId: ctx.user.id,
      before: { status: v.status },
      after: { status: "APPLIED", costImpactPaise },
    });
    await writeActivity(ctx.db, {
      projectId: v.projectId,
      objectType: "variation",
      objectId: input.id,
      eventType: "cost.variation.applied",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${v.ref} applied to the work package`,
      metadata: { status: "APPLIED", costImpactPaise },
    });
    return row!;
  }),

  reject: approver.input(VariationReject).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const v = await loadVariationOr404(ctx.db, input.id, input.projectId);
    assertTransition(v.status as VariationStatus, "REJECTED");
    const [row] = await ctx.db
      .update(variations)
      .set({ status: "REJECTED", rejectionReason: input.reason, updatedAt: new Date() })
      .where(eq(variations.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "variation",
      entityId: input.id,
      action: "REJECT",
      actorId: ctx.user.id,
      before: { status: v.status },
      after: { status: "REJECTED", reason: input.reason },
    });
    await writeActivity(ctx.db, {
      projectId: v.projectId,
      objectType: "variation",
      objectId: input.id,
      eventType: "cost.variation.rejected",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${v.ref} rejected — ${input.reason}`,
      metadata: { status: "REJECTED" },
    });
    return row!;
  }),

  close: author.input(VariationClose).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const v = await loadVariationOr404(ctx.db, input.id, input.projectId);
    assertTransition(v.status as VariationStatus, "CLOSED");
    const [row] = await ctx.db
      .update(variations)
      .set({ status: "CLOSED", updatedAt: new Date() })
      .where(eq(variations.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "variation",
      entityId: input.id,
      action: "CLOSE",
      actorId: ctx.user.id,
      before: { status: v.status },
      after: { status: "CLOSED" },
    });
    return row!;
  }),
});
