import {
  RUNNING_BILL_STATUS_LABEL,
  RunningBillAdvance,
  RunningBillCreate,
  billableBalance,
  isWithinBalance,
  type RunningBillStatus,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { runningBillItems, runningBills, workPackageItems } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { previouslyBilledQty } from "../boq/workPackage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { z } from "zod";

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

  create: protectedProcedure.input(RunningBillCreate).mutation(async ({ ctx, input }) => {
    // --- Double-billing guard (Estimation OS Phase 4, spec Rule 9) -----------
    // Lines linked to a work-package item are checked against the remaining
    // balance: approved + variation − previously billed. The ledger is keyed by
    // BOQ item and scoped to the project, so the same quantity can't be billed
    // twice — even across two packages sharing one BOQ line. Free-text lines
    // (no link) skip the guard and carry zeroed ledger columns.
    const wpItemIds = [
      ...new Set(input.items.map((i) => i.workPackageItemId).filter((x): x is string => Boolean(x))),
    ];
    const wpItems = wpItemIds.length
      ? await ctx.db.select().from(workPackageItems).where(inArray(workPackageItems.id, wpItemIds))
      : [];
    const wpById = new Map(wpItems.map((w) => [w.id, w]));
    const boqIds = [
      ...new Set(input.items.map((i) => i.boqItemId).filter((x): x is string => Boolean(x))),
    ];
    const billedByBoq = await previouslyBilledQty(ctx.db, input.projectId, boqIds);

    // Validate every linked line up front; consumed tracks repeats inside this
    // same bill so two lines on one BOQ item still respect the shared balance.
    const consumed = new Map<string, number>();
    const planned = input.items.map((item) => {
      const wp = item.workPackageItemId ? wpById.get(item.workPackageItemId) : undefined;
      if (item.workPackageItemId && !wp) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Work-package line not found for a bill item." });
      }
      if (!wp) {
        return { item, previousBilledQty: 0, cumulativeBilledQty: 0, balanceQty: 0 };
      }
      const key = item.boqItemId ?? `wp:${wp.id}`;
      const prior = (item.boqItemId ? (billedByBoq.get(item.boqItemId) ?? 0) : 0) + (consumed.get(key) ?? 0);
      const balanceQty = billableBalance({
        approvedQty: wp.approvedQty,
        variationQty: wp.variationQty,
        previousBilledQty: prior,
      });
      if (!isWithinBalance(item.qty, balanceQty)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Over-billing blocked for "${item.description}": ${item.qty} ${item.unit} exceeds the remaining balance of ${balanceQty} ${item.unit} (approved ${wp.approvedQty} + variation ${wp.variationQty} − billed ${prior}).`,
        });
      }
      consumed.set(key, (consumed.get(key) ?? 0) + item.qty);
      return {
        item,
        previousBilledQty: prior,
        cumulativeBilledQty: prior + item.qty,
        balanceQty: Number((balanceQty - item.qty).toFixed(4)),
      };
    });

    const totalPaise = input.items.reduce((sum, item) => sum + amount(item.qty, item.ratePaise), 0);
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
        measurementDate: input.measurementDate ?? null,
        notes: input.notes ?? null,
        totalPaise,
        statusHistory: initialHistory,
        createdById: ctx.user.id,
      })
      .returning();

    for (const [idx, p] of planned.entries()) {
      await ctx.db.insert(runningBillItems).values({
        runningBillId: row!.id,
        description: p.item.description,
        unit: p.item.unit,
        qty: p.item.qty,
        ratePaise: p.item.ratePaise,
        amountPaise: amount(p.item.qty, p.item.ratePaise),
        workPackageItemId: p.item.workPackageItemId ?? null,
        boqItemId: p.item.boqItemId ?? null,
        componentId: p.item.componentId ?? null,
        previousBilledQty: p.previousBilledQty,
        cumulativeBilledQty: p.cumulativeBilledQty,
        balanceQty: p.balanceQty,
        sortOrder: idx,
      });
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
      summary: `${row!.ref} measured on site`,
      metadata: { status: "MEASURED", totalPaise },
    });
    return row!;
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

