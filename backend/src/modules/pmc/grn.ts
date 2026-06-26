import {
  GrnCreate,
  GrnItemCreate,
  GrnItemUpdate,
  GrnUpdate,
  GrnVerify,
  summarizeMaterialRecon,
  type MaterialReconItemLike,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { grnItems, grns, workPackages } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const writer  = capabilityProcedure("write");
const approver = capabilityProcedure("cost:approve");

export const grnRouter = router({

  /** List all GRNs for a project, newest first, with item count. */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      return ctx.db
        .select({
          id: grns.id,
          workPackageId: grns.workPackageId,
          deliveryDate: grns.deliveryDate,
          vendorName: grns.vendorName,
          deliveryNoteRef: grns.deliveryNoteRef,
          status: grns.status,
          notes: grns.notes,
          verifiedAt: grns.verifiedAt,
          createdAt: grns.createdAt,
          updatedAt: grns.updatedAt,
          workPackageName: workPackages.name,
          workPackageRef: workPackages.ref,
          itemCount: sql<number>`(
            select count(*) from esti_grn_item gi where gi.grn_id = ${grns.id}
          )`.as("item_count"),
        })
        .from(grns)
        .leftJoin(workPackages, eq(workPackages.id, grns.workPackageId))
        .where(eq(grns.projectId, input.projectId))
        .orderBy(desc(grns.deliveryDate), desc(grns.createdAt));
    }),

  /** Line items for a single GRN. */
  listItems: protectedProcedure
    .input(z.object({ grnId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      return ctx.db
        .select()
        .from(grnItems)
        .where(eq(grnItems.grnId, input.grnId))
        .orderBy(grnItems.createdAt);
    }),

  create: writer.input(GrnCreate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const [row] = await ctx.db
      .insert(grns)
      .values({
        projectId: input.projectId,
        workPackageId: input.workPackageId ?? null,
        deliveryDate: input.deliveryDate,
        vendorName: input.vendorName,
        deliveryNoteRef: input.deliveryNoteRef ?? null,
        notes: input.notes ?? null,
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "grn", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: writer.input(GrnUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(grns).where(eq(grns.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    if (before.status === "VERIFIED") throw new TRPCError({ code: "FORBIDDEN", message: "Verified GRN cannot be edited" });

    const [row] = await ctx.db
      .update(grns)
      .set({
        ...(input.workPackageId !== undefined ? { workPackageId: input.workPackageId } : {}),
        ...(input.deliveryDate !== undefined ? { deliveryDate: input.deliveryDate } : {}),
        ...(input.vendorName !== undefined ? { vendorName: input.vendorName } : {}),
        ...(input.deliveryNoteRef !== undefined ? { deliveryNoteRef: input.deliveryNoteRef } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(grns.id, input.id))
      .returning();
    await writeAudit(ctx.db, { entity: "grn", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, before, after: row });
    return row!;
  }),

  addItem: writer.input(GrnItemCreate).mutation(async ({ ctx, input }) => {
    const [grn] = await ctx.db.select().from(grns).where(eq(grns.id, input.grnId));
    if (!grn) throw new TRPCError({ code: "NOT_FOUND" });
    if (grn.status === "VERIFIED") throw new TRPCError({ code: "FORBIDDEN", message: "Verified GRN cannot be edited" });

    const [item] = await ctx.db
      .insert(grnItems)
      .values({
        grnId: input.grnId,
        workPackageItemId: input.workPackageItemId ?? null,
        description: input.description,
        unit: input.unit,
        qtyReceived: String(input.qtyReceived),
        unitRatePaise: input.unitRatePaise ?? null,
      })
      .returning();
    return item!;
  }),

  updateItem: writer.input(GrnItemUpdate).mutation(async ({ ctx, input }) => {
    const [grn] = await ctx.db.select({ status: grns.status }).from(grns).where(eq(grns.id, input.grnId));
    if (!grn) throw new TRPCError({ code: "NOT_FOUND" });
    if (grn.status === "VERIFIED") throw new TRPCError({ code: "FORBIDDEN", message: "Verified GRN cannot be edited" });

    const [item] = await ctx.db
      .update(grnItems)
      .set({
        ...(input.workPackageItemId !== undefined ? { workPackageItemId: input.workPackageItemId } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.qtyReceived !== undefined ? { qtyReceived: String(input.qtyReceived) } : {}),
        ...(input.unitRatePaise !== undefined ? { unitRatePaise: input.unitRatePaise } : {}),
      })
      .where(and(eq(grnItems.id, input.id), eq(grnItems.grnId, input.grnId)))
      .returning();
    return item!;
  }),

  removeItem: writer
    .input(z.object({ id: z.string().uuid(), grnId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [grn] = await ctx.db.select({ status: grns.status }).from(grns).where(eq(grns.id, input.grnId));
      if (!grn) throw new TRPCError({ code: "NOT_FOUND" });
      if (grn.status === "VERIFIED") throw new TRPCError({ code: "FORBIDDEN", message: "Verified GRN cannot be edited" });
      await ctx.db.delete(grnItems).where(and(eq(grnItems.id, input.id), eq(grnItems.grnId, input.grnId)));
      return { ok: true };
    }),

  /** Verify a DRAFT GRN — locks it from further edits. Gated by cost:approve. */
  verify: approver.input(GrnVerify).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const [before] = await ctx.db.select().from(grns).where(eq(grns.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    if (before.status === "VERIFIED") throw new TRPCError({ code: "BAD_REQUEST", message: "Already verified" });

    const [row] = await ctx.db
      .update(grns)
      .set({ status: "VERIFIED", verifiedById: ctx.user.id, verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(grns.id, input.id))
      .returning();
    await writeAudit(ctx.db, { entity: "grn", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, before, after: row });
    return row!;
  }),

  /**
   * Material reconciliation (3.17) — per work-package item: contracted qty,
   * received qty (Σ GRN items linked to that WP item), billed qty (Σ measurement
   * records). On-site = received − billed; pending delivery = contracted − received.
   */
  materialReconciliation: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");

      const rows = (await ctx.db.execute(sql`
        select
          wpi.id   as work_package_item_id,
          wp.id    as work_package_id,
          wp.ref   as work_package_ref,
          wp.name  as work_package_name,
          c.name   as contractor,
          wpi.description,
          wpi.unit,
          ei.cost_head as cost_head,
          (wpi.approved_qty + wpi.variation_qty) as contracted_qty,
          wpi.rate_paise,
          coalesce((
            select sum(gi.qty_received::float8)
            from esti_grn_item gi
            join esti_grn g on g.id = gi.grn_id
            where g.project_id = ${input.projectId}
              and gi.work_package_item_id = wpi.id
              and g.status = 'VERIFIED'
          ), 0) as received_qty,
          coalesce((
            select sum(mr.qty)
            from esti_measurement_record mr
            where mr.project_id = ${input.projectId}
              and mr.work_package_item_id = wpi.id
              and mr.status = 'APPROVED'
          ), 0) as billed_qty
        from esti_work_package_item wpi
        join esti_work_package wp on wp.id = wpi.work_package_id
        left join esti_contractor c on c.id = wp.contractor_id
        left join esti_estimate_item ei on ei.id = wpi.boq_item_id
        where wp.project_id = ${input.projectId}
      `)) as unknown as {
        work_package_item_id: string;
        work_package_id: string;
        work_package_ref: string;
        work_package_name: string;
        contractor: string | null;
        description: string;
        unit: string;
        cost_head: string | null;
        contracted_qty: number;
        rate_paise: number;
        received_qty: number;
        billed_qty: number;
      }[];

      const items: MaterialReconItemLike[] = rows.map((r) => ({
        workPackageItemId: r.work_package_item_id,
        workPackageId: r.work_package_id,
        workPackageRef: r.work_package_ref,
        workPackageName: r.work_package_name,
        contractor: r.contractor,
        description: r.description,
        unit: r.unit,
        costHead: r.cost_head,
        contractedQty: Number(r.contracted_qty),
        receivedQty: Number(r.received_qty),
        billedQty: Number(r.billed_qty),
        ratePaise: Number(r.rate_paise),
      }));

      return {
        ...summarizeMaterialRecon(items),
        generatedAt: new Date().toISOString(),
      };
    }),
});
