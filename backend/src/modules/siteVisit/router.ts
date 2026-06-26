import { can } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { siteVisits } from "../../db/schema.js";
import { publishEntity } from "../../lib/sync/publish.js";
import { contractorProcedure, protectedProcedure, router } from "../../trpc/trpc.js";
import { siteProcedure } from "../inspection/siteProcedure.js";

const writeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!can(ctx.user.role, "write")) throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});

export const siteVisitRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Auto-cancel stale PLANNED visits whose auto_cancel_after date has passed.
      await ctx.db
        .update(siteVisits)
        .set({ status: "CANCELLED", cancelReason: "Auto-cancelled: confirmation deadline passed", updatedAt: new Date() })
        .where(
          and(
            eq(siteVisits.projectId, input.projectId),
            eq(siteVisits.status, "PLANNED"),
            lte(siteVisits.autoCancelAfter, sql`CURRENT_DATE`),
          ),
        );

      return ctx.db
        .select()
        .from(siteVisits)
        .where(eq(siteVisits.projectId, input.projectId))
        .orderBy(desc(siteVisits.plannedDate));
    }),

  create: writeProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        plannedDate: z.string(),
        supervisorUserId: z.string().uuid().optional(),
        contractorId: z.string().uuid().optional(),
        notes: z.string().max(2000).optional(),
        autoCancelAfter: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(siteVisits)
        .values({
          projectId: input.projectId,
          plannedDate: input.plannedDate,
          supervisorUserId: input.supervisorUserId ?? null,
          contractorId: input.contractorId ?? null,
          notes: input.notes ?? null,
          autoCancelAfter: input.autoCancelAfter ?? null,
          createdById: ctx.user.id,
        })
        .returning();
      return row!;
    }),

  confirm: writeProcedure
    .input(z.object({ id: z.string().uuid(), side: z.enum(["SUPERVISOR", "CONTRACTOR"]) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(siteVisits).where(eq(siteVisits.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status === "CANCELLED") throw new TRPCError({ code: "BAD_REQUEST", message: "Visit is cancelled" });
      const now = new Date();
      const update =
        input.side === "SUPERVISOR"
          ? { supervisorConfirmedAt: now }
          : { contractorConfirmedAt: now };
      const afterSupervisor = input.side === "SUPERVISOR" ? now : row.supervisorConfirmedAt;
      const afterContractor = input.side === "CONTRACTOR" ? now : row.contractorConfirmedAt;
      const newStatus = afterSupervisor && afterContractor ? "CONFIRMED" : row.status;
      await ctx.db
        .update(siteVisits)
        .set({ ...update, status: newStatus, updatedAt: now })
        .where(eq(siteVisits.id, input.id));
      return { ok: true };
    }),

  cancel: writeProcedure
    .input(z.object({ id: z.string().uuid(), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(siteVisits).where(eq(siteVisits.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status === "CANCELLED") throw new TRPCError({ code: "BAD_REQUEST", message: "Already cancelled" });
      await ctx.db
        .update(siteVisits)
        .set({ status: "CANCELLED", cancelReason: input.reason ?? null, updatedAt: new Date() })
        .where(eq(siteVisits.id, input.id));
      return { ok: true };
    }),

  /** Site supervisor portal — confirm their attendance. */
  confirmBySupervisor: siteProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(siteVisits).where(eq(siteVisits.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status === "CANCELLED") throw new TRPCError({ code: "BAD_REQUEST", message: "Visit is cancelled" });
      const now = new Date();
      const newStatus = row.contractorConfirmedAt ? "CONFIRMED" : row.status;
      await ctx.db
        .update(siteVisits)
        .set({ supervisorConfirmedAt: now, status: newStatus, updatedAt: now })
        .where(eq(siteVisits.id, input.id));
      if (newStatus === "CONFIRMED") await publishEntity(ctx.db, "siteVisit", input.id);
      return { ok: true };
    }),

  /** Contractor portal — confirm contractor availability. */
  confirmByContractor: contractorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(siteVisits).where(eq(siteVisits.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status === "CANCELLED") throw new TRPCError({ code: "BAD_REQUEST", message: "Visit is cancelled" });
      const now = new Date();
      const newStatus = row.supervisorConfirmedAt ? "CONFIRMED" : row.status;
      await ctx.db
        .update(siteVisits)
        .set({ contractorConfirmedAt: now, status: newStatus, updatedAt: now })
        .where(eq(siteVisits.id, input.id));
      if (newStatus === "CONFIRMED") await publishEntity(ctx.db, "siteVisit", input.id);
      return { ok: true };
    }),

  /** Site portal: list for a project (supervisor view). */
  listForSite: siteProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(siteVisits)
        .where(eq(siteVisits.projectId, input.projectId))
        .orderBy(desc(siteVisits.plannedDate)),
    ),

  /** Contractor portal: list for the contractor's current project. */
  listForContractor: contractorProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(siteVisits)
        .where(and(eq(siteVisits.projectId, input.projectId), eq(siteVisits.contractorId, ctx.user.contractorId)))
        .orderBy(desc(siteVisits.plannedDate)),
    ),
});
