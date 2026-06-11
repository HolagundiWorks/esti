import {
  ListParams,
  ProjectOfficeCreate,
  ProjectSiteUpdate,
  ProjectStatus,
  ProjectWorkType,
  can,
  coaStagePlan,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  phases,
  projectLogs,
  projectOffices,
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
      .where(isNotNull(projectOffices.archivedAt))
      .orderBy(desc(projectOffices.archivedAt));
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
        coaStagePlan().map((s, i) => ({
          projectId: p!.id,
          code: s.code,
          label: s.label,
          billingPct: s.stagePct,
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
    const [row] = await ctx.db
      .update(projectOffices)
      .set({
        siteAddress: input.siteAddress ?? null,
        siteAreaSqm: input.siteAreaSqm ?? null,
      })
      .where(eq(projectOffices.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "projectoffice",
      entityId: input.id,
      action: "SITE_UPDATE",
      actorId: ctx.user.id,
      before: { siteAddress: before.siteAddress, siteAreaSqm: before.siteAreaSqm },
      after: { siteAddress: row!.siteAddress, siteAreaSqm: row!.siteAreaSqm },
    });
    return row!;
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
      const [row] = await ctx.db
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
      await writeAudit(ctx.db, {
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
          title: row!.title,
          status: row!.status,
          projectType: row!.projectType,
          workType: row!.workType,
          jurisdiction: row!.jurisdiction,
          dateStart: row!.dateStart,
        },
      });
      return row!;
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
      await ctx.db
        .update(projectOffices)
        .set({ archivedAt, archivedById: ctx.user.id })
        .where(eq(projectOffices.id, input.id));
      await writeAudit(ctx.db, {
        entity: "projectoffice",
        entityId: input.id,
        action: "ARCHIVE",
        actorId: ctx.user.id,
        before: { archivedAt: before.archivedAt, archivedById: before.archivedById },
        after: { archivedAt, archivedById: ctx.user.id },
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
      const [row] = await ctx.db
        .update(projectOffices)
        .set({ archivedAt: null, archivedById: null })
        .where(eq(projectOffices.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "projectoffice",
        entityId: input.id,
        action: "RESTORE",
        actorId: ctx.user.id,
        before: { archivedAt: before.archivedAt, archivedById: before.archivedById },
        after: { archivedAt: null, archivedById: null },
      });
      return row!;
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
