/**
 * Construction Cost OS Phase E — steel reconciliation.
 *
 * A Bar Bending Schedule, now linked into the cost spine, feeds a governed steel
 * reconciliation: per diameter we compare steel SCHEDULED (auto-seeded from the
 * linked BBS), ISSUED (store → site) and CONSUMED (measured / placed). The gap
 * `issued − consumed` is wastage; a small cutting/lap loss is routine, more needs
 * explaining. A two-state record (DRAFT → FINALIZED): anyone with `write` can
 * build a draft, but FINALIZE — the wastage sign-off — is gated by `cost:approve`
 * (a controls concern, same gate as the Phase-D variation approvals). Quantities
 * are kilograms. All mutations require the Core+ `costing` plan feature.
 */
import {
  SteelReconCreate,
  SteelReconFinalize,
  SteelReconLineInput,
  SteelReconLineRemove,
  SteelReconLineUpdate,
  SteelReconSeedFromBbs,
  bbsDiameterSummary,
  steelReconTotals,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import {
  bbsItems,
  steelReconciliationItems,
  steelReconciliations,
} from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const author = capabilityProcedure("write");
const approver = capabilityProcedure("cost:approve");

const round2 = (n: number) => Number(n.toFixed(2));

async function loadReconOr404(db: DB, id: string) {
  const [row] = await db.select().from(steelReconciliations).where(eq(steelReconciliations.id, id));
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
}

/** A draft can still be edited; a finalized reconciliation is locked. */
function assertDraft(status: string) {
  if (status !== "DRAFT") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A finalized steel reconciliation can no longer be changed.",
    });
  }
}

async function loadLines(db: DB, reconciliationId: string) {
  return db
    .select()
    .from(steelReconciliationItems)
    .where(eq(steelReconciliationItems.reconciliationId, reconciliationId))
    .orderBy(asc(steelReconciliationItems.diaMm));
}

/** Re-stamp the header totals from the current line set. */
async function recomputeTotals(db: DB, reconciliationId: string) {
  const lines = await loadLines(db, reconciliationId);
  const totals = steelReconTotals(lines);
  await db
    .update(steelReconciliations)
    .set({
      scheduledKg: totals.scheduledKg,
      issuedKg: totals.issuedKg,
      consumedKg: totals.consumedKg,
      wastageKg: totals.wastageKg,
      updatedAt: new Date(),
    })
    .where(eq(steelReconciliations.id, reconciliationId));
  return totals;
}

export const steelReconciliationRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(steelReconciliations)
        .where(eq(steelReconciliations.projectId, input.projectId))
        .orderBy(desc(steelReconciliations.createdAt)),
    ),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [header] = await ctx.db
        .select()
        .from(steelReconciliations)
        .where(eq(steelReconciliations.id, input.id));
      if (!header) return null;
      const lines = await loadLines(ctx.db, input.id);
      return { ...header, lines, totals: steelReconTotals(lines) };
    }),

  create: author.input(SteelReconCreate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const { ref } = await nextRef(ctx.db, "steelrecon", "SREC");
    const [row] = await ctx.db
      .insert(steelReconciliations)
      .values({
        ref,
        projectId: input.projectId,
        workPackageId: input.workPackageId ?? null,
        bbsId: input.bbsId ?? null,
        title: input.title,
        notes: input.notes ?? null,
        status: "DRAFT",
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "steelrecon",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    await writeActivity(ctx.db, {
      projectId: input.projectId,
      objectType: "steelrecon",
      objectId: row!.id,
      eventType: "cost.steelrecon.created",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${row!.ref} — steel reconciliation "${input.title}" started`,
      metadata: { workPackageId: input.workPackageId ?? null, bbsId: input.bbsId ?? null },
    });
    return row!;
  }),

  /**
   * Seed (or refresh) the per-diameter scheduled steel from a BBS. The diameter
   * roll-up is upserted: existing rows keep their entered issued/consumed and only
   * have `scheduledKg` refreshed; new diameters are inserted scheduled-only.
   */
  seedFromBbs: author.input(SteelReconSeedFromBbs).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const recon = await loadReconOr404(ctx.db, input.reconciliationId);
    assertDraft(recon.status);

    const items = await ctx.db
      .select()
      .from(bbsItems)
      .where(eq(bbsItems.bbsId, input.bbsId));
    if (items.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "That schedule has no bars to seed from." });
    }
    const summary = bbsDiameterSummary(items);
    const existing = await loadLines(ctx.db, input.reconciliationId);
    const byDia = new Map(existing.map((l) => [l.diaMm, l]));

    for (const [i, s] of summary.entries()) {
      const current = byDia.get(s.diaMm);
      if (current) {
        await ctx.db
          .update(steelReconciliationItems)
          .set({ scheduledKg: s.weightKg })
          .where(eq(steelReconciliationItems.id, current.id));
      } else {
        await ctx.db.insert(steelReconciliationItems).values({
          reconciliationId: input.reconciliationId,
          diaMm: s.diaMm,
          scheduledKg: s.weightKg,
          sortOrder: existing.length + i,
        });
      }
    }

    // Keep the BBS link current so the source is traceable.
    if (recon.bbsId !== input.bbsId) {
      await ctx.db
        .update(steelReconciliations)
        .set({ bbsId: input.bbsId })
        .where(eq(steelReconciliations.id, input.reconciliationId));
    }
    const totals = await recomputeTotals(ctx.db, input.reconciliationId);
    await writeAudit(ctx.db, {
      entity: "steelrecon",
      entityId: input.reconciliationId,
      action: "SEED",
      actorId: ctx.user.id,
      after: { bbsId: input.bbsId, diameters: summary.length, scheduledKg: totals.scheduledKg },
    });
    return { ok: true, diameters: summary.length };
  }),

  addLine: author.input(SteelReconLineInput).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const recon = await loadReconOr404(ctx.db, input.reconciliationId);
    assertDraft(recon.status);
    const existing = await loadLines(ctx.db, input.reconciliationId);
    if (existing.some((l) => l.diaMm === input.diaMm)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Diameter ${input.diaMm} mm is already a row on this reconciliation.`,
      });
    }
    await ctx.db.insert(steelReconciliationItems).values({
      reconciliationId: input.reconciliationId,
      diaMm: input.diaMm,
      scheduledKg: input.scheduledKg,
      issuedKg: input.issuedKg,
      consumedKg: input.consumedKg,
      wastageKg: round2(input.issuedKg - input.consumedKg),
      sortOrder: existing.length,
    });
    await recomputeTotals(ctx.db, input.reconciliationId);
    return { ok: true };
  }),

  updateLine: author.input(SteelReconLineUpdate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const recon = await loadReconOr404(ctx.db, input.reconciliationId);
    assertDraft(recon.status);
    const [line] = await ctx.db
      .select()
      .from(steelReconciliationItems)
      .where(eq(steelReconciliationItems.id, input.id));
    if (!line || line.reconciliationId !== input.reconciliationId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const scheduledKg = input.scheduledKg ?? line.scheduledKg;
    const issuedKg = input.issuedKg ?? line.issuedKg;
    const consumedKg = input.consumedKg ?? line.consumedKg;
    await ctx.db
      .update(steelReconciliationItems)
      .set({ scheduledKg, issuedKg, consumedKg, wastageKg: round2(issuedKg - consumedKg) })
      .where(eq(steelReconciliationItems.id, input.id));
    await recomputeTotals(ctx.db, input.reconciliationId);
    return { ok: true };
  }),

  removeLine: author.input(SteelReconLineRemove).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const recon = await loadReconOr404(ctx.db, input.reconciliationId);
    assertDraft(recon.status);
    const [line] = await ctx.db
      .select()
      .from(steelReconciliationItems)
      .where(eq(steelReconciliationItems.id, input.id));
    if (!line || line.reconciliationId !== input.reconciliationId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    await ctx.db.delete(steelReconciliationItems).where(eq(steelReconciliationItems.id, input.id));
    await recomputeTotals(ctx.db, input.reconciliationId);
    return { ok: true };
  }),

  finalize: approver.input(SteelReconFinalize).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const recon = await loadReconOr404(ctx.db, input.id);
    assertDraft(recon.status);
    const lines = await loadLines(ctx.db, input.id);
    if (lines.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Add at least one diameter before finalizing.",
      });
    }
    const totals = await recomputeTotals(ctx.db, input.id);
    const [row] = await ctx.db
      .update(steelReconciliations)
      .set({ status: "FINALIZED", finalizedById: ctx.user.id, finalizedAt: new Date(), updatedAt: new Date() })
      .where(eq(steelReconciliations.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "steelrecon",
      entityId: input.id,
      action: "FINALIZE",
      actorId: ctx.user.id,
      before: { status: recon.status },
      after: { status: "FINALIZED", wastageKg: totals.wastageKg },
    });
    await writeActivity(ctx.db, {
      projectId: recon.projectId,
      objectType: "steelrecon",
      objectId: input.id,
      eventType: "cost.steelrecon.finalized",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${recon.ref} finalized — ${totals.wastageKg} kg wastage on ${totals.issuedKg} kg issued`,
      metadata: { ...totals },
    });
    return row!;
  }),
});
