import {
  ListParams,
  ProjectOfficeCreate,
  ProjectSiteUpdate,
  ProjectStatus,
  ProjectWorkType,
  DEFAULT_PHASE_PLAN,
  can,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  criticalNotes,
  decisions,
  drawings,
  invoices,
  phases,
  projectLogs,
  projectOffices,
  tasks,
  users,
} from "../../db/schema.js";
import { verifyPassword } from "../../auth/session.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const projectOfficeRouter = router({
  list: protectedProcedure.input(ListParams).query(async ({ ctx, input }) => {
    const where = and(
      isNull(projectOffices.archivedAt),
      input.search ? ilike(projectOffices.title, `%${input.search}%`) : undefined,
      input.status ? eq(projectOffices.status, input.status) : undefined,
    );
    return ctx.db
      .select()
      .from(projectOffices)
      .where(where)
      .orderBy(desc(projectOffices.createdAt))
      .limit(input.limit)
      .offset(input.offset);
  }),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select()
      .from(projectOffices)
      .where(and(eq(projectOffices.id, input.id), isNull(projectOffices.archivedAt)))
      .limit(1);
    return rows[0] ?? null;
  }),

  listArchived: protectedProcedure.query(async ({ ctx }) => {
    if (!can(ctx.user.role, "project:delete")) throw new TRPCError({ code: "FORBIDDEN" });
    return ctx.db
      .select()
      .from(projectOffices)
      .where(and(isNotNull(projectOffices.archivedAt), isNull(projectOffices.purgedAt)))
      .orderBy(desc(projectOffices.archivedAt));
  }),

  create: protectedProcedure.input(ProjectOfficeCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "projectoffice", "PRJ");
    // Project + its general delivery stage plan are created atomically.
    const row = await ctx.db.transaction(async (tx) => {
      const [p] = await tx
        .insert(projectOffices)
        .values({
          ref,
          title: input.title,
          projectType: input.projectType,
          workType: input.workType,
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
        DEFAULT_PHASE_PLAN.map((s, i) => ({
          projectId: p!.id,
          code: s.code,
          label: s.label,
          billingPct: s.billingPct,
          sortOrder: (i + 1) * 10,
        })),
      );
      await writeActivity(tx, {
        projectId: p!.id,
        objectType: "projectoffice",
        objectId: p!.id,
        eventType: "project.created",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "STAFF",
        summary: `Project ${p!.ref} created`,
        metadata: { ref, title: input.title, projectType: input.projectType, workType: input.workType },
      });
      return p!;
    });
    await writeAudit(ctx.db, { entity: "projectoffice", entityId: row.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row;
  }),

  updateSite: protectedProcedure.input(ProjectSiteUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(projectOffices).where(eq(projectOffices.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const row = await ctx.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(projectOffices)
        .set({
          siteAddress: input.siteAddress ?? null,
          siteAreaSqm: input.siteAreaSqm ?? null,
        })
        .where(eq(projectOffices.id, input.id))
        .returning();
      await writeActivity(tx, {
        projectId: input.id,
        objectType: "projectoffice",
        objectId: input.id,
        eventType: "project.site_updated",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: "Project site details updated",
        metadata: { siteAddress: updated!.siteAddress, siteAreaSqm: updated!.siteAreaSqm },
      });
      await writeAudit(tx, {
        entity: "projectoffice",
        entityId: input.id,
        action: "SITE_UPDATE",
        actorId: ctx.user.id,
        before: { siteAddress: before.siteAddress, siteAreaSqm: before.siteAreaSqm },
        after: { siteAddress: updated!.siteAddress, siteAreaSqm: updated!.siteAreaSqm },
      });
      return updated!;
    });
    return row;
  }),

  /** Edit core project details (project settings). */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(2).max(200),
        status: ProjectStatus,
        projectType: z.string().min(1),
        workType: ProjectWorkType.optional(),
        jurisdiction: z.string().min(1),
        dateStart: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(projectOffices).where(eq(projectOffices.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const row = await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(projectOffices)
          .set({
            title: input.title,
            status: input.status,
            projectType: input.projectType,
            ...(input.workType ? { workType: input.workType } : {}),
            jurisdiction: input.jurisdiction,
            dateStart: input.dateStart ?? null,
          })
          .where(eq(projectOffices.id, input.id))
          .returning();
        await writeActivity(tx, {
          projectId: input.id,
          objectType: "projectoffice",
          objectId: input.id,
          eventType: "project.updated",
          actorId: ctx.user.id,
          actorName: ctx.user.fullName,
          summary: `Project details updated: ${updated!.title}`,
          metadata: {
            title: updated!.title,
            status: updated!.status,
            projectType: updated!.projectType,
            workType: updated!.workType,
            jurisdiction: updated!.jurisdiction,
            dateStart: updated!.dateStart,
          },
        });
        await writeAudit(tx, {
          entity: "projectoffice",
          entityId: input.id,
          action: "UPDATE",
          actorId: ctx.user.id,
          before: {
            title: before.title,
            status: before.status,
            projectType: before.projectType,
            workType: before.workType,
            jurisdiction: before.jurisdiction,
            dateStart: before.dateStart,
          },
          after: {
            title: updated!.title,
            status: updated!.status,
            projectType: updated!.projectType,
            workType: updated!.workType,
            jurisdiction: updated!.jurisdiction,
            dateStart: updated!.dateStart,
          },
        });
        return updated!;
      });
      return row;
    }),

  /** Archive a project while retaining every child record and audit entry. */
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!can(ctx.user.role, "project:delete"))
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot archive projects" });
      // Re-authenticate before hiding an entire project from active operations.
      const [me] = await ctx.db.select().from(users).where(eq(users.id, ctx.user.id));
      if (!me?.passwordHash || !(await verifyPassword(me.passwordHash, input.password))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect admin password" });
      }
      const [before] = await ctx.db
        .select()
        .from(projectOffices)
        .where(and(eq(projectOffices.id, input.id), isNull(projectOffices.archivedAt)));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      const archivedAt = new Date();
      const purgeAfter = new Date(archivedAt);
      purgeAfter.setDate(purgeAfter.getDate() + 90);
      const purgeAfterStr = purgeAfter.toISOString().slice(0, 10);
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(projectOffices)
          .set({ archivedAt, archivedById: ctx.user.id, purgeAfter: purgeAfterStr })
          .where(eq(projectOffices.id, input.id));
        await writeActivity(tx, {
          projectId: input.id,
          objectType: "projectoffice",
          objectId: input.id,
          eventType: "project.archived",
          actorId: ctx.user.id,
          actorName: ctx.user.fullName,
          summary: `Project ${before.ref} archived`,
          metadata: { archivedAt, archivedById: ctx.user.id },
        });
        await writeAudit(tx, {
          entity: "projectoffice",
          entityId: input.id,
          action: "ARCHIVE",
          actorId: ctx.user.id,
          before: { archivedAt: before.archivedAt, archivedById: before.archivedById },
          after: { archivedAt, archivedById: ctx.user.id },
        });
      });
      return { ok: true };
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!can(ctx.user.role, "project:delete")) throw new TRPCError({ code: "FORBIDDEN" });
      const [before] = await ctx.db
        .select()
        .from(projectOffices)
        .where(and(eq(projectOffices.id, input.id), isNotNull(projectOffices.archivedAt)));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      const row = await ctx.db.transaction(async (tx) => {
          const [updated] = await tx
            .update(projectOffices)
            .set({ archivedAt: null, archivedById: null })
            .where(eq(projectOffices.id, input.id))
            .returning();
          await writeActivity(tx, {
            projectId: input.id,
            objectType: "projectoffice",
            objectId: input.id,
            eventType: "project.restored",
            actorId: ctx.user.id,
            actorName: ctx.user.fullName,
            summary: `Project ${before.ref} restored`,
            metadata: { archivedAt: null, archivedById: null },
          });
          await writeAudit(tx, {
            entity: "projectoffice",
            entityId: input.id,
            action: "RESTORE",
            actorId: ctx.user.id,
            before: { archivedAt: before.archivedAt, archivedById: before.archivedById },
            after: { archivedAt: null, archivedById: null },
          });
          return updated!;
        });
      return row;
    }),

  /** Export a structured JSON bundle of all project data for archival. */
  exportData: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!can(ctx.user.role, "project:delete")) throw new TRPCError({ code: "FORBIDDEN" });
      const [project] = await ctx.db
        .select()
        .from(projectOffices)
        .where(eq(projectOffices.id, input.id));
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const [
        projectPhases,
        projectTasks,
        projectNotes,
        projectDecisions,
        projectDrawings,
        projectInvoices,
      ] = await Promise.all([
        ctx.db.select().from(phases).where(eq(phases.projectId, input.id)),
        ctx.db.select().from(tasks).where(eq(tasks.projectId, input.id)).limit(200),
        ctx.db.select().from(criticalNotes).where(eq(criticalNotes.projectId, input.id)),
        ctx.db.select().from(decisions).where(eq(decisions.projectId, input.id)),
        ctx.db
          .select()
          .from(drawings)
          .where(and(eq(drawings.projectId, input.id), eq(drawings.isCurrent, true))),
        ctx.db.select().from(invoices).where(eq(invoices.projectId, input.id)),
      ]);

      return {
        exportedAt: new Date().toISOString(),
        exportVersion: "1",
        project,
        phases: projectPhases,
        tasks: projectTasks,
        criticalNotes: projectNotes,
        decisions: projectDecisions,
        drawings: projectDrawings,
        invoices: projectInvoices,
      };
    }),

  /** Mark an archived project as purged (data scheduled for permanent deletion). */
  purge: protectedProcedure
    .input(z.object({ id: z.string().uuid(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!can(ctx.user.role, "project:delete"))
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot purge projects" });

      const [me] = await ctx.db.select().from(users).where(eq(users.id, ctx.user.id));
      if (!me?.passwordHash || !(await verifyPassword(me.passwordHash, input.password))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect admin password" });
      }

      const [project] = await ctx.db
        .select()
        .from(projectOffices)
        .where(and(eq(projectOffices.id, input.id), isNotNull(projectOffices.archivedAt), isNull(projectOffices.purgedAt)));
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Archived project not found" });

      const today = new Date().toISOString().slice(0, 10);
      if (project.purgeAfter && project.purgeAfter > today) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Retention period has not expired. Purge allowed on or after ${project.purgeAfter}.`,
        });
      }

      const purgedAt = new Date();
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(projectOffices)
          .set({ purgedAt })
          .where(eq(projectOffices.id, input.id));
        await writeAudit(tx, {
          entity: "projectoffice",
          entityId: input.id,
          action: "PURGE",
          actorId: ctx.user.id,
          before: { purgedAt: null },
          after: { purgedAt },
        });
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
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(projectLogs)
          .values({
            projectId: input.projectId,
            note: input.note,
            authorId: ctx.user.id,
            authorName: ctx.user.fullName,
          })
          .returning();
        await writeActivity(tx, {
          projectId: input.projectId,
          objectType: "projectlog",
          objectId: row!.id,
          eventType: "note.created",
          actorId: ctx.user.id,
          actorName: ctx.user.fullName,
          visibility: "STAFF",
          summary: input.note.slice(0, 140),
          metadata: { note: input.note },
        });
        await writeAudit(tx, {
          entity: "projectlog",
          entityId: row!.id,
          action: "CREATE",
          actorId: ctx.user.id,
          after: row,
        });
        return row!;
      });
    }),
});
