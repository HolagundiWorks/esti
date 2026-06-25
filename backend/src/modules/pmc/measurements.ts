/**
 * Construction Cost OS Phase C — site Measurement Book.
 *
 * A measurement is recorded against a work-package BOQ line (location / floor /
 * zone + photo evidence + measured-by / checked-by), then approved before it can
 * be billed. The double-billing guard (spec Rule 9) runs at **approval** time, so
 * approved measurement records — not raw bill lines — are the unit of billable
 * balance: a running bill consumes approved records, which then leave the
 * approved-unbilled ledger and enter the billed ledger.
 */
import {
  MEASUREMENT_STATUS_LABEL,
  MeasurementRecordApprove,
  MeasurementRecordCreate,
  MeasurementRecordReject,
  billableBalance,
  isWithinBalance,
  measurementLocationKey,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { measurementRecords, workPackageItems } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { approvedUnbilledQty, previouslyBilledQty } from "../boq/workPackage.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

async function loadRecordOr404(db: DB, id: string, projectId: string) {
  const [rec] = await db.select().from(measurementRecords).where(eq(measurementRecords.id, id));
  if (!rec || rec.projectId !== projectId) throw new TRPCError({ code: "NOT_FOUND" });
  return rec;
}

export const measurementBookRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(measurementRecords)
        .where(eq(measurementRecords.projectId, input.projectId))
        .orderBy(desc(measurementRecords.createdAt)),
    ),

  listByWorkPackage: protectedProcedure
    .input(z.object({ workPackageId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(measurementRecords)
        .where(eq(measurementRecords.workPackageId, input.workPackageId))
        .orderBy(desc(measurementRecords.createdAt)),
    ),

  create: manage.input(MeasurementRecordCreate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    // The BOQ line being measured — derives description / unit / ledger keys.
    const [wpItem] = await ctx.db
      .select()
      .from(workPackageItems)
      .where(eq(workPackageItems.id, input.workPackageItemId));
    if (!wpItem || wpItem.workPackageId !== input.workPackageId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Work-package line not found." });
    }

    // --- Duplicate-location guard ------------------------------------------
    // The same physical spot can't be measured twice on one BOQ line. Compare a
    // normalised floor|zone|location key against every still-active (non-rejected)
    // record on this work-package item.
    const key = measurementLocationKey(input);
    const siblings = await ctx.db
      .select()
      .from(measurementRecords)
      .where(
        and(
          eq(measurementRecords.workPackageItemId, input.workPackageItemId),
          ne(measurementRecords.status, "REJECTED"),
        ),
      );
    if (siblings.some((s) => measurementLocationKey(s) === key)) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "A measurement for this location already exists on this BOQ line. Edit or reject it instead of re-measuring.",
      });
    }

    const { ref } = await nextRef(ctx.db, "measurement_record", "MR");
    const [row] = await ctx.db
      .insert(measurementRecords)
      .values({
        ref,
        projectId: input.projectId,
        workPackageId: input.workPackageId,
        workPackageItemId: wpItem.id,
        boqItemId: wpItem.boqItemId ?? null,
        componentId: wpItem.componentId ?? null,
        description: wpItem.description,
        unit: wpItem.unit,
        qty: input.qty,
        location: input.location ?? null,
        floor: input.floor ?? null,
        zone: input.zone ?? null,
        photoKey: input.photoKey ?? null,
        measuredById: ctx.user.id,
        measuredByName: input.measuredByName ?? ctx.user.fullName,
        status: "MEASURED",
        notes: input.notes ?? null,
        createdById: ctx.user.id,
      })
      .returning();

    await writeAudit(ctx.db, {
      entity: "measurement_record",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    await writeActivity(ctx.db, {
      projectId: input.projectId,
      objectType: "measurement_record",
      objectId: row!.id,
      eventType: "pmc.measurement.recorded",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${row!.ref} measured — ${wpItem.description} (${input.qty} ${wpItem.unit})`,
      metadata: { status: "MEASURED", qty: input.qty },
    });
    return row!;
  }),

  approve: manage.input(MeasurementRecordApprove).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const rec = await loadRecordOr404(ctx.db, input.id, input.projectId);
    if (rec.status !== "MEASURED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Only a measured record can be approved (this one is ${rec.status}).`,
      });
    }

    // --- Double-billing guard (spec Rule 9) — runs HERE, at approval ---------
    // consumed = already-billed + already-approved-but-unbilled for this BOQ
    // line, project-wide. The current record is still MEASURED, so it isn't in
    // either bucket yet — approving it must keep the running total within
    // approved + variation. Records without a BOQ link (manual lines) skip the
    // ledger entirely.
    if (rec.boqItemId) {
      const [wpItem] = rec.workPackageItemId
        ? await ctx.db
            .select()
            .from(workPackageItems)
            .where(eq(workPackageItems.id, rec.workPackageItemId))
        : [];
      const approvedQty = wpItem?.approvedQty ?? 0;
      const variationQty = wpItem?.variationQty ?? 0;
      const billed = await previouslyBilledQty(ctx.db, input.projectId, [rec.boqItemId]);
      const committed = await approvedUnbilledQty(ctx.db, input.projectId, [rec.boqItemId]);
      const consumed = (billed.get(rec.boqItemId) ?? 0) + (committed.get(rec.boqItemId) ?? 0);
      const balanceQty = billableBalance({ approvedQty, variationQty, previousBilledQty: consumed });
      if (!isWithinBalance(rec.qty, balanceQty)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Approving "${rec.description}" would over-commit: ${rec.qty} ${rec.unit} exceeds the remaining balance of ${balanceQty} ${rec.unit} (approved ${approvedQty} + variation ${variationQty} − billed/approved ${consumed}).`,
        });
      }
    }

    const [row] = await ctx.db
      .update(measurementRecords)
      .set({
        status: "APPROVED",
        approvedById: ctx.user.id,
        approvedAt: new Date(),
        checkedByName: input.checkedByName ?? ctx.user.fullName,
        updatedAt: new Date(),
      })
      .where(eq(measurementRecords.id, input.id))
      .returning();

    await writeAudit(ctx.db, {
      entity: "measurement_record",
      entityId: input.id,
      action: "APPROVE",
      actorId: ctx.user.id,
      before: { status: rec.status },
      after: { status: "APPROVED" },
    });
    await writeActivity(ctx.db, {
      projectId: input.projectId,
      objectType: "measurement_record",
      objectId: input.id,
      eventType: "pmc.measurement.approved",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${rec.ref} approved for billing`,
      metadata: { status: "APPROVED", qty: rec.qty },
    });
    return row!;
  }),

  reject: manage.input(MeasurementRecordReject).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const rec = await loadRecordOr404(ctx.db, input.id, input.projectId);
    if (rec.status !== "MEASURED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Only a measured record can be rejected (this one is ${rec.status}).`,
      });
    }
    const [row] = await ctx.db
      .update(measurementRecords)
      .set({ status: "REJECTED", rejectionReason: input.reason, updatedAt: new Date() })
      .where(eq(measurementRecords.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "measurement_record",
      entityId: input.id,
      action: "REJECT",
      actorId: ctx.user.id,
      before: { status: rec.status },
      after: { status: "REJECTED", reason: input.reason },
    });
    await writeActivity(ctx.db, {
      projectId: input.projectId,
      objectType: "measurement_record",
      objectId: input.id,
      eventType: "pmc.measurement.rejected",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${rec.ref} rejected — ${input.reason}`,
      metadata: { status: "REJECTED" },
    });
    return row!;
  }),

  remove: manage
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const rec = await loadRecordOr404(ctx.db, input.id, input.projectId);
      if (rec.status === "APPROVED" || rec.status === "BILLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete an ${MEASUREMENT_STATUS_LABEL[rec.status]} measurement; reject it first.`,
        });
      }
      await ctx.db.delete(measurementRecords).where(eq(measurementRecords.id, input.id));
      await writeAudit(ctx.db, {
        entity: "measurement_record",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before: { ref: rec.ref, status: rec.status },
      });
      return { ok: true as const };
    }),
});
