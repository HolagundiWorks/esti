import {
  BILL_TYPE_LABEL,
  RUNNING_BILL_STATUS_LABEL,
  RunningBillAdvance,
  RunningBillCreate,
  billableBalance,
  isWithinBalance,
  netPayable,
  type RunningBillStatus,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { measurementRecords, runningBillItems, runningBills, workPackageItems } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { enqueueJob } from "../../lib/redis.js";
import { previouslyBilledQty } from "../boq/workPackage.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";
import { z } from "zod";

const manage = capabilityProcedure("write");

const NEXT_STATUS: Record<RunningBillStatus, RunningBillStatus[]> = {
  MEASURED: ["SENT_TO_CONTRACTOR"],
  SENT_TO_CONTRACTOR: ["CONTRACTOR_VERIFIED"],
  CONTRACTOR_VERIFIED: ["SENT_TO_OFFICE"],
  SENT_TO_OFFICE: ["MEASUREMENT_VERIFIED"],
  MEASUREMENT_VERIFIED: ["APPROVED_MEASUREMENT_SENT"],
  APPROVED_MEASUREMENT_SENT: ["CONTRACTOR_INVOICED"],
  CONTRACTOR_INVOICED: ["OFFICE_APPROVED"],
  OFFICE_APPROVED: ["SENT_TO_CLIENT"],
  SENT_TO_CLIENT: [],
};

function amount(qty: number, ratePaise: number) {
  return Math.round(qty * ratePaise);
}

function historyEntry(status: RunningBillStatus, actorId: string, note?: string) {
  return {
    status,
    label: RUNNING_BILL_STATUS_LABEL[status],
    actorId,
    note: note ?? null,
    at: new Date().toISOString(),
  };
}

export const runningBillsRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(runningBills)
        .where(eq(runningBills.projectId, input.projectId))
        .orderBy(desc(runningBills.createdAt)),
    ),

  items: protectedProcedure
    .input(z.object({ runningBillId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(runningBillItems)
        .where(eq(runningBillItems.runningBillId, input.runningBillId))
        .orderBy(asc(runningBillItems.sortOrder), asc(runningBillItems.createdAt)),
    ),

  create: manage.input(RunningBillCreate).mutation(async ({ ctx, input }) => {
    // --- Phase C (strict): BOQ lines are billed ONLY via approved measurements -
    // Work-package/BOQ quantities come from APPROVED measurement records (the
    // double-billing guard already ran at approval time). We resolve each record's
    // qty / rate / BOQ link here, re-checking the ledger defensively, then stamp
    // the records BILLED so they leave the approved-unbilled bucket. Free-text
    // `items` (extras with no BOQ link) are billed directly and skip the ledger.
    const recordIds = [...new Set(input.measurementRecordIds ?? [])];
    const records =
      recordIds.length > 0
        ? await ctx.db
            .select()
            .from(measurementRecords)
            .where(inArray(measurementRecords.id, recordIds))
        : [];
    for (const id of recordIds) {
      const rec = records.find((r) => r.id === id);
      if (!rec || rec.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Measurement record not found." });
      }
      if (rec.status !== "APPROVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Only approved measurements can be billed (${rec.ref} is ${rec.status}).`,
        });
      }
    }

    // Rates come from each record's work-package line; the project-wide ledger is
    // re-derived for a defensive over-billing re-check.
    const wpItemIds = [
      ...new Set(records.map((r) => r.workPackageItemId).filter((x): x is string => Boolean(x))),
    ];
    const wpItems = wpItemIds.length
      ? await ctx.db.select().from(workPackageItems).where(inArray(workPackageItems.id, wpItemIds))
      : [];
    const wpById = new Map(wpItems.map((w) => [w.id, w]));
    const boqIds = [...new Set(records.map((r) => r.boqItemId).filter((x): x is string => Boolean(x)))];
    const billedByBoq = await previouslyBilledQty(ctx.db, input.projectId, boqIds);

    const consumed = new Map<string, number>();
    const recordLines = records.map((rec) => {
      const wp = rec.workPackageItemId ? wpById.get(rec.workPackageItemId) : undefined;
      const ratePaise = wp?.ratePaise ?? 0;
      const key = rec.boqItemId ?? `rec:${rec.id}`;
      const prior = (rec.boqItemId ? (billedByBoq.get(rec.boqItemId) ?? 0) : 0) + (consumed.get(key) ?? 0);
      const balanceQty = billableBalance({
        approvedQty: wp?.approvedQty ?? 0,
        variationQty: wp?.variationQty ?? 0,
        previousBilledQty: prior,
      });
      if (rec.boqItemId && !isWithinBalance(rec.qty, balanceQty)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Over-billing blocked for "${rec.description}": ${rec.qty} ${rec.unit} exceeds the remaining balance of ${balanceQty} ${rec.unit}.`,
        });
      }
      consumed.set(key, (consumed.get(key) ?? 0) + rec.qty);
      return {
        description: rec.description,
        unit: rec.unit,
        qty: rec.qty,
        ratePaise,
        workPackageItemId: rec.workPackageItemId,
        boqItemId: rec.boqItemId,
        componentId: rec.componentId,
        measurementRecordId: rec.id,
        previousBilledQty: prior,
        cumulativeBilledQty: prior + rec.qty,
        balanceQty: Number((balanceQty - rec.qty).toFixed(4)),
      };
    });

    const freeLines = (input.items ?? []).map((item) => ({
      description: item.description,
      unit: item.unit,
      qty: item.qty,
      ratePaise: item.ratePaise,
      workPackageItemId: null as string | null,
      boqItemId: null as string | null,
      componentId: null as string | null,
      measurementRecordId: null as string | null,
      previousBilledQty: 0,
      cumulativeBilledQty: 0,
      balanceQty: 0,
    }));

    const lines = [...recordLines, ...freeLines];
    const d = input.deductions;
    const totalPaise = lines.reduce((sum, l) => sum + amount(l.qty, l.ratePaise), 0);
    const netPayablePaise = netPayable(totalPaise, d);
    const { ref } = await nextRef(ctx.db, "running_bill", "RB");
    const initialHistory = [historyEntry("MEASURED", ctx.user.id, input.notes)];
    const [row] = await ctx.db
      .insert(runningBills)
      .values({
        ref,
        projectId: input.projectId,
        contractorId: input.contractorId ?? null,
        workPackageId: input.workPackageId ?? null,
        title: input.title,
        billType: input.billType,
        measurementDate: input.measurementDate ?? null,
        notes: input.notes ?? null,
        totalPaise,
        retentionPaise: d?.retentionPaise ?? 0,
        advanceRecoveryPaise: d?.advanceRecoveryPaise ?? 0,
        taxTdsPaise: d?.taxTdsPaise ?? 0,
        otherRecoveryPaise: d?.otherRecoveryPaise ?? 0,
        netPayablePaise,
        statusHistory: initialHistory,
        createdById: ctx.user.id,
      })
      .returning();

    for (const [idx, l] of lines.entries()) {
      await ctx.db.insert(runningBillItems).values({
        runningBillId: row!.id,
        description: l.description,
        unit: l.unit,
        qty: l.qty,
        ratePaise: l.ratePaise,
        amountPaise: amount(l.qty, l.ratePaise),
        workPackageItemId: l.workPackageItemId,
        boqItemId: l.boqItemId,
        componentId: l.componentId,
        measurementRecordId: l.measurementRecordId,
        previousBilledQty: l.previousBilledQty,
        cumulativeBilledQty: l.cumulativeBilledQty,
        balanceQty: l.balanceQty,
        sortOrder: idx,
      });
    }

    // Approved → BILLED: the records now sit in the billed ledger, not the
    // approved-unbilled one (no double count across the two buckets).
    if (recordIds.length > 0) {
      await ctx.db
        .update(measurementRecords)
        .set({ status: "BILLED", runningBillId: row!.id, updatedAt: new Date() })
        .where(inArray(measurementRecords.id, recordIds));
    }

    await writeAudit(ctx.db, {
      entity: "running_bill",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    await writeActivity(ctx.db, {
      projectId: input.projectId,
      objectType: "running_bill",
      objectId: row!.id,
      eventType: "pmc.running_bill.measured",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${row!.ref} (${BILL_TYPE_LABEL[input.billType]}) raised — net ${netPayablePaise} paise`,
      metadata: { status: "MEASURED", billType: input.billType, totalPaise, netPayablePaise },
    });
    return row!;
  }),

  generatePdf: manage
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(runningBills).where(eq(runningBills.id, input.id));
      if (!row || row.projectId !== input.projectId) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .update(runningBills)
        .set({ pdfStatus: "PENDING", updatedAt: new Date() })
        .where(eq(runningBills.id, input.id));
      await enqueueJob(
        "render_pdf",
        { target: "running_bill", id: row.id, firm: await firmPayload(ctx.db) },
        ctx.requestId,
      );
      await writeAudit(ctx.db, {
        entity: "running_bill",
        entityId: input.id,
        action: "GENERATE_PDF",
        actorId: ctx.user.id,
      });
      return { ok: true as const };
    }),

  advance: protectedProcedure.input(RunningBillAdvance).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db
      .select()
      .from(runningBills)
      .where(eq(runningBills.id, input.id));
    if (!before || before.projectId !== input.projectId) throw new TRPCError({ code: "NOT_FOUND" });
    const current = before.status as RunningBillStatus;
    if (!NEXT_STATUS[current]?.includes(input.status)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot move running bill from ${current} to ${input.status}`,
      });
    }
    const statusHistory = [
      ...((before.statusHistory as unknown[]) ?? []),
      historyEntry(input.status, ctx.user.id, input.note),
    ];
    const [after] = await ctx.db
      .update(runningBills)
      .set({ status: input.status, statusHistory, updatedAt: new Date() })
      .where(eq(runningBills.id, input.id))
      .returning();

    await writeAudit(ctx.db, {
      entity: "running_bill",
      entityId: input.id,
      action: "STATUS_UPDATE",
      actorId: ctx.user.id,
      before: { status: before.status },
      after: { status: input.status },
    });
    await writeActivity(ctx.db, {
      projectId: input.projectId,
      objectType: "running_bill",
      objectId: input.id,
      eventType: "pmc.running_bill.status",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      summary: `${before.ref} → ${RUNNING_BILL_STATUS_LABEL[input.status]}`,
      metadata: { status: input.status },
    });
    return after!;
  }),
});

