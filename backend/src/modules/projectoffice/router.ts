import {
  ListParams,
  ProjectOfficeActivate,
  ProjectOfficeCreate,
  ProjectSetStatus,
  ProjectSiteUpdate,
  ProjectStatus,
  ProjectWorkType,
  DEFAULT_PHASE_PLAN,
  canTransition,
  evaluateActivationGate,
  can,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  clientOnboardings,
  criticalNotes,
  decisions,
  drawings,
  feeProposals,
  invoices,
  phases,
  preProjectAssessments,
  projectDnas,
  projectLogs,
  projectOffices,
  tasks,
  users,
} from "../../db/schema.js";
import { verifyPassword } from "../../auth/session.js";
import type { DB } from "../../db/index.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { assertNotFixedPlan, assertQuota } from "../../lib/plan.js";
import { getOrgSettings } from "../../lib/settings.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import {
  getProjectById,
  listArchivedProjects,
  listProjectLogs,
  listProjects,
  projectByIdInput,
  projectLogsInput,
} from "./queries.js";

/** Gather the activation-gate booleans off the spine and evaluate them (Slice K). */
async function gatherActivationGate(db: DB, projectId: string, status: ProjectStatus) {
  const [dna] = await db
    .select({ id: projectDnas.id })
    .from(projectDnas)
    .where(eq(projectDnas.projectId, projectId));
  const [assessment] = await db
    .select({ id: preProjectAssessments.id })
    .from(preProjectAssessments)
    .where(eq(preProjectAssessments.projectId, projectId));
  const [fee] = await db
    .select({ id: feeProposals.id })
    .from(feeProposals)
    .where(and(eq(feeProposals.projectId, projectId), eq(feeProposals.clientApprovalStatus, "APPROVED")))
    .limit(1);
  const [onboarding] = await db
    .select({ status: clientOnboardings.status })
    .from(clientOnboardings)
    .where(eq(clientOnboardings.projectId, projectId));
  const [advance] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.projectId, projectId), eq(invoices.isAdvance, true), eq(invoices.status, "PAID")))
    .limit(1);

  return evaluateActivationGate({
    status,
    hasDna: !!dna,
    hasAssessment: !!assessment,
    feeApproved: !!fee,
    onboardingComplete: onboarding?.status === "COMPLETE",
    advancePaid: !!advance,
  });
}

export const projectOfficeRouter = router({
  list: protectedProcedure.input(ListParams).query(async ({ ctx, input }) => listProjects(ctx.db, input, ctx.user)),

  byId: protectedProcedure.input(projectByIdInput).query(async ({ ctx, input }) => getProjectById(ctx.db, input.id)),

  listArchived: protectedProcedure.query(async ({ ctx }) => listArchivedProjects(ctx.db, ctx.user)),

  create: protectedProcedure.input(ProjectOfficeCreate).mutation(async ({ ctx, input }) => {
    // Lite ships 5 fixed projects — no new projects, only fill in the existing.
    await assertNotFixedPlan(ctx.db);
    const org = await getOrgSettings(ctx.db);
    // Plan quota: count only live projects (archived ones don't take a slot).
    const cRows = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(projectOffices)
      .where(isNull(projectOffices.archivedAt));
    const liveProjectCount = cRows[0] ? cRows[0].count : 0;
    await assertQuota(ctx.db, "projects", liveProjectCount);
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
          pmcEnabled: org.pmcEnabled && (input.pmcEnabled ?? false),
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
        pmcEnabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(projectOffices).where(eq(projectOffices.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      const org = await getOrgSettings(ctx.db);
      if (input.pmcEnabled !== undefined && input.pmcEnabled && !org.pmcEnabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Enable the PMC module in Company settings first",
        });
      }
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
            ...(input.pmcEnabled !== undefined ? { pmcEnabled: input.pmcEnabled } : {}),
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

  /**
   * Project OS — draft-project state machine (Slice G). Enforces the legal
   * transition graph; ENQUIRY → PROPOSAL additionally requires a DNA record.
   * PROPOSAL → ACTIVE is intentionally not allowed here — use `activate`.
   */
  updateStatus: protectedProcedure.input(ProjectSetStatus).mutation(async ({ ctx, input }) => {
    if (!can(ctx.user.role, "write"))
      throw new TRPCError({ code: "FORBIDDEN", message: "Your role has read-only access" });
    const [before] = await ctx.db.select().from(projectOffices).where(eq(projectOffices.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const from = before.status as ProjectStatus;
    if (from === input.status) return before;
    if (input.status === "ACTIVE")
      throw new TRPCError({ code: "BAD_REQUEST", message: "Use the activation gate to make a project ACTIVE." });
    if (!canTransition(from, input.status))
      throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot move a ${from} project to ${input.status}.` });
    if (from === "ENQUIRY" && input.status === "PROPOSAL") {
      const [dna] = await ctx.db
        .select({ id: projectDnas.id })
        .from(projectDnas)
        .where(eq(projectDnas.projectId, input.id));
      if (!dna)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Capture the Project DNA before moving to Proposal." });
    }
    const row = await ctx.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(projectOffices)
        .set({ status: input.status })
        .where(eq(projectOffices.id, input.id))
        .returning();
      await writeActivity(tx, {
        projectId: input.id,
        objectType: "projectoffice",
        objectId: input.id,
        eventType: "project.status_changed",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `Project status ${from} → ${input.status}`,
        metadata: { from, to: input.status },
      });
      await writeAudit(tx, {
        entity: "projectoffice",
        entityId: input.id,
        action: "STATUS",
        actorId: ctx.user.id,
        before: { status: from },
        after: { status: input.status },
      });
      return updated!;
    });
    return row;
  }),

  /**
   * Project OS — activation gate readout (Slice K). Read-only: returns the
   * pre-flight checklist so the UI can show what is still blocking activation.
   */
  activationStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db.select().from(projectOffices).where(eq(projectOffices.id, input.id));
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const gate = await gatherActivationGate(ctx.db, input.id, project.status as ProjectStatus);
      return gate;
    }),

  /**
   * Project OS — Project Activation Engine (Slice K). Runs the pre-flight gate
   * (DNA + assessment + fee approval + onboarding + paid advance), flips the
   * project to ACTIVE, and seeds a kick-off task — all atomically.
   */
  activate: protectedProcedure.input(ProjectOfficeActivate).mutation(async ({ ctx, input }) => {
    if (!can(ctx.user.role, "write"))
      throw new TRPCError({ code: "FORBIDDEN", message: "Your role has read-only access" });
    const [project] = await ctx.db.select().from(projectOffices).where(eq(projectOffices.id, input.id));
    if (!project) throw new TRPCError({ code: "NOT_FOUND" });

    const gate = await gatherActivationGate(ctx.db, input.id, project.status as ProjectStatus);
    if (!gate.ok)
      throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot activate: ${gate.blockingReason}` });

    const row = await ctx.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(projectOffices)
        .set({ status: "ACTIVE", dateStart: project.dateStart ?? new Date().toISOString().slice(0, 10) })
        .where(eq(projectOffices.id, input.id))
        .returning();
      await tx.insert(tasks).values({
        title: "Kick-off meeting",
        description: `Project ${project.ref} activated — schedule the kick-off and confirm the brief.`,
        projectId: input.id,
        classification: "BILLABLE",
        workType: "DESIGN_COMMUNICATION",
        status: "TODO",
        priority: "HIGH",
        priorityScore: 50,
        createdById: ctx.user.id,
      });
      await writeActivity(tx, {
        projectId: input.id,
        objectType: "projectoffice",
        objectId: input.id,
        eventType: "project.activated",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `Project ${project.ref} activated`,
        metadata: { ref: project.ref },
      });
      await writeAudit(tx, {
        entity: "projectoffice",
        entityId: input.id,
        action: "PROJECT_ACTIVATED",
        actorId: ctx.user.id,
        before: { status: project.status },
        after: { status: "ACTIVE" },
      });
      return updated!;
    });
    return { ok: true as const, projectId: row.id };
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
    .input(projectLogsInput)
    .query(async ({ ctx, input }) => listProjectLogs(ctx.db, input.projectId, input.limit)),

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
