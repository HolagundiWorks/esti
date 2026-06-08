import {
  ListParams,
  ProjectOfficeCreate,
  ProjectSiteUpdate,
  ProjectStatus,
  can,
  coaStagePlan,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq, inArray, ilike } from "drizzle-orm";
import { z } from "zod";
import {
  approvals,
  assignments,
  bbsItems,
  bbsSchedules,
  bylawCalcs,
  bylaws,
  clientLogs,
  drawings,
  engagements,
  estimateItems,
  estimates,
  feeProposals,
  invoices,
  measurements,
  permits,
  phases,
  projectLogs,
  projectOffices,
  users,
} from "../../db/schema.js";
import { verifyPassword } from "../../auth/session.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const projectOfficeRouter = router({
  list: protectedProcedure.input(ListParams).query(async ({ ctx, input }) => {
    const where = input.search ? ilike(projectOffices.title, `%${input.search}%`) : undefined;
    return ctx.db
      .select()
      .from(projectOffices)
      .where(where)
      .orderBy(desc(projectOffices.createdAt))
      .limit(input.limit)
      .offset(input.offset);
  }),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const rows = await ctx.db.select().from(projectOffices).where(eq(projectOffices.id, input.id)).limit(1);
    return rows[0] ?? null;
  }),

  create: protectedProcedure.input(ProjectOfficeCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "projectoffice", "PRJ");
    // Project + its COA phase plan are created atomically.
    const row = await ctx.db.transaction(async (tx) => {
      const [p] = await tx
        .insert(projectOffices)
        .values({
          ref,
          title: input.title,
          projectType: input.projectType,
          jurisdiction: input.jurisdiction,
          clientId: input.clientId ?? null,
          state: input.state ?? null,
          district: input.district ?? null,
          city: input.city ?? null,
          pin: input.pin ?? null,
          siteAddress: input.siteAddress ?? null,
          siteAreaSqm: input.siteAreaSqm ?? null,
          contractValuePaise: input.contractValuePaise,
          dateStart: input.dateStart ?? null,
          createdById: ctx.user.id,
        })
        .returning();
      await tx.insert(phases).values(
        coaStagePlan().map((s, i) => ({
          projectId: p!.id,
          code: s.code,
          label: s.label,
          billingPct: s.stagePct,
          sortOrder: (i + 1) * 10,
        })),
      );
      return p!;
    });
    await writeAudit(ctx.db, { entity: "projectoffice", entityId: row.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row;
  }),

  updateSite: protectedProcedure.input(ProjectSiteUpdate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(projectOffices)
      .set({
        siteAddress: input.siteAddress ?? null,
        siteAreaSqm: input.siteAreaSqm ?? null,
      })
      .where(eq(projectOffices.id, input.id))
      .returning();
    return row ?? null;
  }),

  /** Edit core project details (project settings). */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(2).max(200),
        status: ProjectStatus,
        projectType: z.string().min(1),
        jurisdiction: z.string().min(1),
        dateStart: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(projectOffices)
        .set({
          title: input.title,
          status: input.status,
          projectType: input.projectType,
          jurisdiction: input.jurisdiction,
          dateStart: input.dateStart ?? null,
        })
        .where(eq(projectOffices.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "projectoffice",
        entityId: input.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: { title: input.title, status: input.status },
      });
      return row;
    }),

  /** Delete a project and all of its child records (owner). */
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!can(ctx.user.role, "project:delete"))
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot delete projects" });
      // Re-authenticate before this irreversible cascade delete.
      const [me] = await ctx.db.select().from(users).where(eq(users.id, ctx.user.id));
      if (!me?.passwordHash || !(await verifyPassword(me.passwordHash, input.password))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect admin password" });
      }
      const pid = input.id;
      await ctx.db.transaction(async (tx) => {
        const estIds = (
          await tx.select({ id: estimates.id }).from(estimates).where(eq(estimates.projectId, pid))
        ).map((r) => r.id);
        const bbsIds = (
          await tx.select({ id: bbsSchedules.id }).from(bbsSchedules).where(eq(bbsSchedules.projectId, pid))
        ).map((r) => r.id);
        if (estIds.length) await tx.delete(estimateItems).where(inArray(estimateItems.estimateId, estIds));
        if (bbsIds.length) await tx.delete(bbsItems).where(inArray(bbsItems.bbsId, bbsIds));
        await tx.delete(measurements).where(eq(measurements.projectId, pid));
        await tx.delete(estimates).where(eq(estimates.projectId, pid));
        await tx.delete(bbsSchedules).where(eq(bbsSchedules.projectId, pid));
        await tx.delete(drawings).where(eq(drawings.projectId, pid));
        await tx.delete(approvals).where(eq(approvals.projectId, pid));
        await tx.delete(clientLogs).where(eq(clientLogs.projectId, pid));
        await tx.delete(permits).where(eq(permits.projectId, pid));
        await tx.delete(bylaws).where(eq(bylaws.projectId, pid));
        await tx.delete(bylawCalcs).where(eq(bylawCalcs.projectId, pid));
        await tx.delete(engagements).where(eq(engagements.projectId, pid));
        await tx.delete(assignments).where(eq(assignments.projectId, pid));
        await tx.delete(invoices).where(eq(invoices.projectId, pid));
        await tx.delete(feeProposals).where(eq(feeProposals.projectId, pid));
        await tx.delete(phases).where(eq(phases.projectId, pid));
        await tx.delete(projectLogs).where(eq(projectLogs.projectId, pid));
        await tx.delete(projectOffices).where(eq(projectOffices.id, pid));
      });
      await writeAudit(ctx.db, {
        entity: "projectoffice",
        entityId: pid,
        action: "DELETE",
        actorId: ctx.user.id,
      });
      return { ok: true };
    }),

  // --- Internal project log (audit notes) ---
  logs: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(projectLogs)
        .where(eq(projectLogs.projectId, input.projectId))
        .orderBy(desc(projectLogs.createdAt));
    }),

  addLog: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), note: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(projectLogs)
        .values({
          projectId: input.projectId,
          note: input.note,
          authorId: ctx.user.id,
          authorName: ctx.user.fullName,
        })
        .returning();
      return row!;
    }),
});
