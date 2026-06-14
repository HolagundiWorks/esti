import {
  PortalAcknowledgeInput,
  PortalApprovalRespondInput,
  PortalChangeRequestInput,
  PortalFeedbackInput,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { activities, approvals, drawings, invoices, phases, portalSubmissions, projectOffices } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { getFirm } from "../../lib/firm.js";
import { presignedGet } from "../../lib/storage.js";
import { addMessage, listMessages } from "../../lib/submissionThread.js";
import { clientProcedure, router } from "../../trpc/trpc.js";

/** Today as an ISO date string (YYYY-MM-DD). */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Read-only client portal. Every procedure is scoped to the logged-in client
 * user's clientId — a portal user can only ever see their own projects.
 */
export const portalRouter = router({
  /** Firm name + logo for portal header branding. */
  branding: clientProcedure.query(async ({ ctx }) => {
    const f = await getFirm(ctx.db);
    const logoUrl = f.logoKey ? await presignedGet(f.logoKey).catch(() => null) : null;
    return { companyName: f.companyName, logoUrl };
  }),

  myProjects: clientProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: projectOffices.id,
        ref: projectOffices.ref,
        title: projectOffices.title,
        status: projectOffices.status,
        projectType: projectOffices.projectType,
      })
      .from(projectOffices)
      .where(eq(projectOffices.clientId, ctx.user.clientId))
      .orderBy(desc(projectOffices.createdAt));
  }),

  projectDetail: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projectOffices)
        .where(
          and(
            eq(projectOffices.id, input.projectId),
            eq(projectOffices.clientId, ctx.user.clientId),
          ),
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const phaseRows = await ctx.db
        .select({
          id: phases.id,
          code: phases.code,
          label: phases.label,
          billingPct: phases.billingPct,
          sortOrder: phases.sortOrder,
        })
        .from(phases)
        .where(eq(phases.projectId, input.projectId))
        .orderBy(asc(phases.sortOrder));
      const currentSortOrder = phaseRows.find((p) => p.id === project.currentPhaseId)?.sortOrder ?? -1;

      // Only issued/paid invoices are visible to the client.
      const invoiceRows = await ctx.db
        .select({
          ref: invoices.ref,
          documentKind: invoices.documentKind,
          status: invoices.status,
          grandTotalPaise: invoices.grandTotalPaise,
          dateInvoice: invoices.dateInvoice,
        })
        .from(invoices)
        .where(
          and(eq(invoices.projectId, input.projectId), inArray(invoices.status, ["ISSUED", "PAID"])),
        )
        .orderBy(desc(invoices.createdAt));

      // Approvals that have actually been sent (no drafts).
      const approvalRows = await ctx.db
        .select({
          id: approvals.id,
          title: approvals.title,
          entityType: approvals.entityType,
          status: approvals.status,
          sentDate: approvals.sentDate,
          responseDate: approvals.responseDate,
        })
        .from(approvals)
        .where(and(eq(approvals.projectId, input.projectId), ne(approvals.status, "DRAFT")))
        .orderBy(desc(approvals.createdAt));

      // Only drawings the worker has finished processing.
      const drawingRows = await ctx.db
        .select({ id: drawings.id, ref: drawings.ref, title: drawings.title, status: drawings.status })
        .from(drawings)
        .where(and(eq(drawings.projectId, input.projectId), eq(drawings.status, "READY")))
        .orderBy(desc(drawings.createdAt));

      return {
        project: {
          ref: project.ref,
          title: project.title,
          status: project.status,
          projectType: project.projectType,
          jurisdiction: project.jurisdiction,
        },
        phases: phaseRows.map((ph) => ({
          code: ph.code,
          label: ph.label,
          billingPct: ph.billingPct,
          status: ph.sortOrder < currentSortOrder ? "Complete"
            : ph.id === project.currentPhaseId ? "Active"
            : "Pending",
        })),
        invoices: invoiceRows,
        approvals: approvalRows,
        drawings: drawingRows,
      };
    }),

  /** This client's own submissions for a project (read-back of their writes). */
  mySubmissions: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      return ctx.db
        .select({
          id: portalSubmissions.id,
          kind: portalSubmissions.kind,
          subject: portalSubmissions.subject,
          body: portalSubmissions.body,
          rating: portalSubmissions.rating,
          status: portalSubmissions.status,
          responseNote: portalSubmissions.responseNote,
          createdAt: portalSubmissions.createdAt,
        })
        .from(portalSubmissions)
        .where(eq(portalSubmissions.projectId, input.projectId))
        .orderBy(desc(portalSubmissions.createdAt));
    }),

  /** Read the firm↔client conversation thread on one of the client's submissions. */
  submissionThread: clientProcedure
    .input(z.object({ submissionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedSubmission(ctx, input.submissionId);
      return listMessages(ctx.db, { portalSubmissionId: input.submissionId });
    }),

  /** Post a reply on one of the client's own submissions. */
  replySubmission: clientProcedure
    .input(z.object({ submissionId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const sub = await assertOwnedSubmission(ctx, input.submissionId);
      await addMessage(ctx.db, { portalSubmissionId: input.submissionId },
        { id: ctx.user.id, name: ctx.user.fullName, side: "CLIENT" }, input.body);
      await writeActivity(ctx.db, {
        projectId: sub.projectId,
        objectType: "portal_submission",
        objectId: input.submissionId,
        eventType: "portal.reply",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "ALL",
        summary: `Client replied on: ${sub.subject}`,
      });
      return { ok: true as const };
    }),

  /** Project activity timeline — only records explicitly shared with the client. */
  activityFeed: clientProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      return ctx.db
        .select({
          id: activities.id,
          eventType: activities.eventType,
          summary: activities.summary,
          actorName: activities.actorName,
          createdAt: activities.createdAt,
        })
        .from(activities)
        .where(and(eq(activities.projectId, input.projectId), eq(activities.visibility, "ALL")))
        .orderBy(desc(activities.createdAt))
        .limit(50);
    }),

  /** Record an approve / request-revisions / reject decision on a sent approval. */
  respondApproval: clientProcedure
    .input(PortalApprovalRespondInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          id: approvals.id,
          projectId: approvals.projectId,
          title: approvals.title,
          status: approvals.status,
          clientId: projectOffices.clientId,
        })
        .from(approvals)
        .innerJoin(projectOffices, eq(projectOffices.id, approvals.projectId))
        .where(eq(approvals.id, input.approvalId));
      if (!row || row.clientId !== ctx.user.clientId) throw new TRPCError({ code: "NOT_FOUND" });
      // Only items the firm has actually sent can be responded to.
      if (!["SENT", "REVISIONS"].includes(row.status))
        throw new TRPCError({ code: "BAD_REQUEST", message: "This item is not awaiting your response." });

      await ctx.db
        .update(approvals)
        .set({ status: input.decision, responseDate: today(), remarks: input.remarks ?? null, updatedAt: new Date() })
        .where(eq(approvals.id, input.approvalId));

      await writeActivity(ctx.db, {
        projectId: row.projectId,
        objectType: "approval",
        objectId: input.approvalId,
        eventType: "approval.client_response",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "ALL",
        summary: `Client recorded "${input.decision}" on approval: ${row.title}`,
        metadata: { decision: input.decision, remarks: input.remarks ?? null },
      });
      return { ok: true as const };
    }),

  /** Acknowledge a specific shared object (drawing, approval, phase, etc.). */
  acknowledge: clientProcedure
    .input(PortalAcknowledgeInput)
    .mutation(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      return insertSubmission(ctx, {
        projectId: input.projectId,
        kind: "ACKNOWLEDGEMENT",
        objectType: input.objectType,
        objectId: input.objectId ?? null,
        subject: input.subject,
        eventSummary: `Client acknowledged: ${input.subject}`,
      });
    }),

  /** Submit a change request against the project (optionally a specific object). */
  submitChangeRequest: clientProcedure
    .input(PortalChangeRequestInput)
    .mutation(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      return insertSubmission(ctx, {
        projectId: input.projectId,
        kind: "CHANGE_REQUEST",
        objectType: input.objectType ?? null,
        objectId: input.objectId ?? null,
        subject: input.subject,
        body: input.body,
        eventSummary: `Client raised a change request: ${input.subject}`,
      });
    }),

  /** Submit general feedback (optional 1–5 rating). */
  submitFeedback: clientProcedure
    .input(PortalFeedbackInput)
    .mutation(async ({ ctx, input }) => {
      await assertOwnedProject(ctx, input.projectId);
      return insertSubmission(ctx, {
        projectId: input.projectId,
        kind: "FEEDBACK",
        subject: input.subject,
        body: input.body ?? null,
        rating: input.rating ?? null,
        eventSummary: `Client left feedback: ${input.subject}`,
      });
    }),
});

/** Throw NOT_FOUND unless the project belongs to the logged-in client. */
async function assertOwnedProject(
  ctx: { db: DB; user: { clientId: string } },
  projectId: string,
): Promise<void> {
  const [project] = await ctx.db
    .select({ id: projectOffices.id })
    .from(projectOffices)
    .where(and(eq(projectOffices.id, projectId), eq(projectOffices.clientId, ctx.user.clientId)));
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });
}

/** Load a submission and confirm it belongs to the logged-in client, or throw. */
async function assertOwnedSubmission(
  ctx: { db: DB; user: { clientId: string } },
  submissionId: string,
): Promise<{ projectId: string; subject: string }> {
  const [row] = await ctx.db
    .select({ projectId: portalSubmissions.projectId, subject: portalSubmissions.subject, clientId: portalSubmissions.clientId })
    .from(portalSubmissions)
    .where(eq(portalSubmissions.id, submissionId));
  if (!row || row.clientId !== ctx.user.clientId) throw new TRPCError({ code: "NOT_FOUND" });
  return { projectId: row.projectId, subject: row.subject };
}

/** Insert a portal submission scoped to the client and log it to the activity feed. */
async function insertSubmission(
  ctx: { db: DB; user: { id: string; fullName: string; clientId: string } },
  entry: {
    projectId: string;
    kind: "ACKNOWLEDGEMENT" | "CHANGE_REQUEST" | "FEEDBACK";
    objectType?: string | null;
    objectId?: string | null;
    subject: string;
    body?: string | null;
    rating?: number | null;
    eventSummary: string;
  },
): Promise<{ ok: true; id: string }> {
  const [created] = await ctx.db
    .insert(portalSubmissions)
    .values({
      projectId: entry.projectId,
      clientId: ctx.user.clientId,
      kind: entry.kind,
      objectType: entry.objectType ?? null,
      objectId: entry.objectId ?? null,
      subject: entry.subject,
      body: entry.body ?? null,
      rating: entry.rating ?? null,
      submittedById: ctx.user.id,
    })
    .returning({ id: portalSubmissions.id });

  await writeActivity(ctx.db, {
    projectId: entry.projectId,
    objectType: "portal_submission",
    objectId: created!.id,
    eventType: `portal.${entry.kind.toLowerCase()}`,
    actorId: ctx.user.id,
    actorName: ctx.user.fullName,
    visibility: "ALL",
    summary: entry.eventSummary,
    metadata: { kind: entry.kind, rating: entry.rating ?? null },
  });
  return { ok: true as const, id: created!.id };
}
