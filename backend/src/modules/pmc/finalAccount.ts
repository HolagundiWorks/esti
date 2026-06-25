/**
 * Construction Cost OS Phase F — final account + closure.
 *
 * The closing act of one work package (one contract): a final account reconciles
 * what the contractor was owed against what was paid, then governs a formal
 * closure. Its financial position is never re-keyed — it is rolled up live off
 * the spine: the package's items give the original contract value + the approved
 * variation/extra-item value, and the package's running bills give the gross
 * billed, the deduction block, and the net paid. The office adds only the closing
 * adjustments (final certified amount, retention released) and the attestations
 * (no-claim cert, client final approval).
 *
 * Closure is a two-state machine (DRAFT → CLOSED) gated by `cost:approve`. The
 * gate re-evaluates the checklist server-side, so Rule 6 — "no closure with open
 * variations/deviations" — is enforced in code, not just hidden in the UI: an
 * open deviation, a non-terminal variation, or a missing attestation all refuse
 * the close. Closing stamps the final snapshot + checklist, sets the parent work
 * package to CLOSED, and locks the record. Money is integer paise; all mutations
 * require the Core+ `costing` plan feature.
 */
import {
  FinalAccountClose,
  FinalAccountCreate,
  FinalAccountPdf,
  FinalAccountUpdate,
  defaultFinalCertified,
  finalAccountBalance,
  finalAccountChecklist,
  finalAccountFinancials,
  type FinalAccountFinancials,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import {
  deviations,
  finalAccounts,
  measurementRecords,
  runningBills,
  steelReconciliations,
  variations,
  workPackageItems,
  workPackages,
} from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { enqueueJob } from "../../lib/redis.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const author = capabilityProcedure("write");
const approver = capabilityProcedure("cost:approve");

async function loadFaOr404(db: DB, id: string) {
  const [row] = await db.select().from(finalAccounts).where(eq(finalAccounts.id, id));
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
}

/** A draft can still be adjusted; a closed account is locked. */
function assertDraft(status: string) {
  if (status !== "DRAFT") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A closed final account can no longer be changed.",
    });
  }
}

/** Roll up the package's items + running bills into the reconciliation figures. */
async function computeFinancials(db: DB, workPackageId: string | null): Promise<FinalAccountFinancials> {
  if (!workPackageId) return finalAccountFinancials({ items: [], bills: [] });
  const items = await db
    .select({
      approvedQty: workPackageItems.approvedQty,
      variationQty: workPackageItems.variationQty,
      ratePaise: workPackageItems.ratePaise,
    })
    .from(workPackageItems)
    .where(eq(workPackageItems.workPackageId, workPackageId));
  const bills = await db
    .select({
      totalPaise: runningBills.totalPaise,
      retentionPaise: runningBills.retentionPaise,
      advanceRecoveryPaise: runningBills.advanceRecoveryPaise,
      taxTdsPaise: runningBills.taxTdsPaise,
      otherRecoveryPaise: runningBills.otherRecoveryPaise,
      netPayablePaise: runningBills.netPayablePaise,
    })
    .from(runningBills)
    .where(eq(runningBills.workPackageId, workPackageId));
  return finalAccountFinancials({ items, bills });
}

/** Evaluate the closure checklist against the live spine state for the package. */
async function computeChecklist(
  db: DB,
  workPackageId: string | null,
  attest: { noClaimReceived: boolean; clientFinalApproval: boolean },
) {
  let openDeviations = 0;
  let openVariations = 0;
  let unbilledApprovedMeasurements = 0;
  let steelReconFinalized = false;
  if (workPackageId) {
    const [dev] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(deviations)
      .where(and(eq(deviations.workPackageId, workPackageId), eq(deviations.status, "OPEN")));
    const [vary] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(variations)
      .where(
        and(
          eq(variations.workPackageId, workPackageId),
          notInArray(variations.status, ["CLOSED", "REJECTED"]),
        ),
      );
    const [meas] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(measurementRecords)
      .where(
        and(
          eq(measurementRecords.workPackageId, workPackageId),
          eq(measurementRecords.status, "APPROVED"),
        ),
      );
    const finalizedSteel = await db
      .select({ id: steelReconciliations.id })
      .from(steelReconciliations)
      .where(
        and(
          eq(steelReconciliations.workPackageId, workPackageId),
          eq(steelReconciliations.status, "FINALIZED"),
        ),
      )
      .limit(1);
    openDeviations = Number(dev?.n ?? 0);
    openVariations = Number(vary?.n ?? 0);
    unbilledApprovedMeasurements = Number(meas?.n ?? 0);
    steelReconFinalized = finalizedSteel.length > 0;
  }
  return finalAccountChecklist({
    openDeviations,
    openVariations,
    unbilledApprovedMeasurements,
    steelReconFinalized,
    ...attest,
  });
}

/** Snapshot columns derived from the live financials + the (stored) final certified. */
function snapshotSet(financials: FinalAccountFinancials, finalCertifiedPaise: number) {
  return {
    originalContractPaise: financials.originalContractPaise,
    variationPaise: financials.variationPaise,
    grossBilledPaise: financials.grossBilledPaise,
    retentionHeldPaise: financials.retentionHeldPaise,
    advanceRecoveredPaise: financials.advanceRecoveredPaise,
    taxTdsPaise: financials.taxTdsPaise,
    otherRecoveryPaise: financials.otherRecoveryPaise,
    netPaidPaise: financials.netPaidPaise,
    balanceDuePaise: finalAccountBalance({
      finalCertifiedPaise,
      netPaidPaise: financials.netPaidPaise,
    }),
  };
}

export const finalAccountRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(finalAccounts)
        .where(eq(finalAccounts.projectId, input.projectId))
        .orderBy(desc(finalAccounts.createdAt)),
    ),

  /**
   * Header + LIVE financials (re-rolled from the spine each read, so a draft
   * always shows current figures) + the live closure checklist. The stored
   * snapshot columns are the frozen-at-close record; while DRAFT the UI trusts
   * the live block.
   */
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [header] = await ctx.db
        .select()
        .from(finalAccounts)
        .where(eq(finalAccounts.id, input.id));
      if (!header) return null;
      const financials = await computeFinancials(ctx.db, header.workPackageId);
      const checklist = await computeChecklist(ctx.db, header.workPackageId, {
        noClaimReceived: header.noClaimReceived,
        clientFinalApproval: header.clientFinalApproval,
      });
      return {
        ...header,
        financials,
        liveBalanceDuePaise: finalAccountBalance({
          finalCertifiedPaise: header.finalCertifiedPaise,
          netPaidPaise: financials.netPaidPaise,
        }),
        checklist: checklist.items,
        canClose: checklist.canClose,
      };
    }),

  create: author.input(FinalAccountCreate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const [pkg] = await ctx.db
      .select()
      .from(workPackages)
      .where(eq(workPackages.id, input.workPackageId));
    if (!pkg || pkg.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Work package not found on this project." });
    }
    const financials = await computeFinancials(ctx.db, input.workPackageId);
    const finalCertifiedPaise = defaultFinalCertified(financials);
    const { ref } = await nextRef(ctx.db, "final_account", "FA");
    const [row] = await ctx.db
      .insert(finalAccounts)
      .values({
        ref,
        projectId: input.projectId,
        workPackageId: input.workPackageId,
        title: input.title,
        notes: input.notes ?? null,
        status: "DRAFT",
        finalCertifiedPaise,
        ...snapshotSet(financials, finalCertifiedPaise),
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "final_account",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    await writeActivity(ctx.db, {
      projectId: input.projectId,
      objectType: "finalaccount",
      objectId: row!.id,
      eventType: "cost.finalaccount.created",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${row!.ref} — final account "${input.title}" opened for ${pkg.ref}`,
      metadata: { workPackageId: input.workPackageId, finalCertifiedPaise },
    });
    return row!;
  }),

  /** Adjust the manual closing fields (DRAFT only) and re-stamp the snapshot. */
  update: author.input(FinalAccountUpdate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const fa = await loadFaOr404(ctx.db, input.id);
    assertDraft(fa.status);
    const finalCertifiedPaise = input.finalCertifiedPaise ?? fa.finalCertifiedPaise;
    const financials = await computeFinancials(ctx.db, fa.workPackageId);
    const [row] = await ctx.db
      .update(finalAccounts)
      .set({
        finalCertifiedPaise,
        ...(input.retentionReleasedPaise !== undefined
          ? { retentionReleasedPaise: input.retentionReleasedPaise }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.noClaimReceived !== undefined ? { noClaimReceived: input.noClaimReceived } : {}),
        ...(input.clientFinalApproval !== undefined
          ? { clientFinalApproval: input.clientFinalApproval }
          : {}),
        ...snapshotSet(financials, finalCertifiedPaise),
        updatedAt: new Date(),
      })
      .where(eq(finalAccounts.id, input.id))
      .returning();
    return row!;
  }),

  /**
   * Close the account (DRAFT → CLOSED). Re-evaluates the checklist server-side:
   * if any blocking row fails — an open deviation / non-terminal variation
   * (Rule 6), or a missing attestation — the close is refused. On success the
   * final snapshot + checklist are frozen, the parent work package is set CLOSED,
   * and the record locks. Gated by `cost:approve`.
   */
  close: approver.input(FinalAccountClose).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const fa = await loadFaOr404(ctx.db, input.id);
    assertDraft(fa.status);
    const checklist = await computeChecklist(ctx.db, fa.workPackageId, {
      noClaimReceived: fa.noClaimReceived,
      clientFinalApproval: fa.clientFinalApproval,
    });
    if (!checklist.canClose) {
      const blockers = checklist.items.filter((i) => i.blocking && !i.ok).map((i) => i.label);
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot close — unresolved: ${blockers.join("; ")}.`,
      });
    }
    const financials = await computeFinancials(ctx.db, fa.workPackageId);
    const now = new Date();
    const [row] = await ctx.db
      .update(finalAccounts)
      .set({
        status: "CLOSED",
        ...snapshotSet(financials, fa.finalCertifiedPaise),
        checklist: checklist.items,
        closedById: ctx.user.id,
        closedAt: now,
        updatedAt: now,
      })
      .where(eq(finalAccounts.id, input.id))
      .returning();
    if (fa.workPackageId) {
      await ctx.db
        .update(workPackages)
        .set({ status: "CLOSED", updatedAt: now })
        .where(eq(workPackages.id, fa.workPackageId));
    }
    await writeAudit(ctx.db, {
      entity: "final_account",
      entityId: input.id,
      action: "CLOSE",
      actorId: ctx.user.id,
      before: { status: fa.status },
      after: { status: "CLOSED", balanceDuePaise: row!.balanceDuePaise },
    });
    await writeActivity(ctx.db, {
      projectId: fa.projectId,
      objectType: "finalaccount",
      objectId: input.id,
      eventType: "cost.finalaccount.closed",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${fa.ref} closed — final certified ${fa.finalCertifiedPaise} paise, balance ${row!.balanceDuePaise} paise`,
      metadata: { workPackageId: fa.workPackageId, ...financials },
    });
    return row!;
  }),

  generatePdf: author.input(FinalAccountPdf).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const fa = await loadFaOr404(ctx.db, input.id);
    if (fa.projectId !== input.projectId) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db
      .update(finalAccounts)
      .set({ pdfStatus: "PENDING", updatedAt: new Date() })
      .where(eq(finalAccounts.id, input.id));
    await enqueueJob(
      "render_pdf",
      { target: "final_account", id: fa.id, firm: await firmPayload(ctx.db) },
      ctx.requestId,
    );
    await writeAudit(ctx.db, {
      entity: "final_account",
      entityId: input.id,
      action: "GENERATE_PDF",
      actorId: ctx.user.id,
    });
    return { ok: true as const };
  }),
});
