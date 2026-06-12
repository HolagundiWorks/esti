import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { approvals, drawings, invoices, phases, projectOffices } from "../../db/schema.js";
import { clientProcedure, router } from "../../trpc/trpc.js";

/**
 * Read-only client portal. Every procedure is scoped to the logged-in client
 * user's clientId — a portal user can only ever see their own projects.
 */
export const portalRouter = router({
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
        .select({ ref: drawings.ref, title: drawings.title, status: drawings.status })
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
});
