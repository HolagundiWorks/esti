import {
  DEFAULT_PHASE_PLAN,
  LEAD_TERMINAL_STATUSES,
  LeadConvert,
  LeadCreate,
  LeadSetStatus,
  LeadUpdate,
  type LeadStatus,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { clients, leads, phases, projectOffices } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { newPublicId } from "../../licensing-platform/lib/ids.js";
import { assertNotFixedPlan, assertQuota } from "../../lib/plan.js";
import { getOrgSettings } from "../../lib/settings.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const clean = (v: string | null | undefined): string | null =>
  v && v.trim() ? v.trim() : null;

export const leadsRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: leads.id,
          ref: leads.ref,
          clientName: leads.clientName,
          phone: leads.phone,
          email: leads.email,
          leadSource: leads.leadSource,
          projectType: leads.projectType,
          siteLocation: leads.siteLocation,
          city: leads.city,
          status: leads.status,
          assignedToId: leads.assignedToId,
          convertedProjectId: leads.convertedProjectId,
          convertedClientId: leads.convertedClientId,
          notes: leads.notes,
          createdAt: leads.createdAt,
          updatedAt: leads.updatedAt,
        })
        .from(leads)
        .orderBy(desc(leads.createdAt));
      return input?.status ? rows.filter((r) => r.status === input.status) : rows;
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(leads).where(eq(leads.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure.input(LeadCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "lead", "LDR");
    const [row] = await ctx.db
      .insert(leads)
      .values({
        ref,
        clientName: input.clientName,
        phone: clean(input.phone),
        email: clean(input.email),
        leadSource: input.leadSource,
        projectType: clean(input.projectType),
        siteLocation: clean(input.siteLocation),
        city: clean(input.city),
        assignedToId: input.assignedToId ?? null,
        notes: clean(input.notes),
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "lead", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: protectedProcedure.input(LeadUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(leads).where(eq(leads.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .update(leads)
      .set({
        ...(input.clientName !== undefined ? { clientName: input.clientName } : {}),
        ...(input.phone !== undefined ? { phone: clean(input.phone) } : {}),
        ...(input.email !== undefined ? { email: clean(input.email) } : {}),
        ...(input.leadSource !== undefined ? { leadSource: input.leadSource } : {}),
        ...(input.projectType !== undefined ? { projectType: clean(input.projectType) } : {}),
        ...(input.siteLocation !== undefined ? { siteLocation: clean(input.siteLocation) } : {}),
        ...(input.city !== undefined ? { city: clean(input.city) } : {}),
        ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
        ...(input.notes !== undefined ? { notes: clean(input.notes) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, input.id))
      .returning();
    await writeAudit(ctx.db, { entity: "lead", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, before, after: row });
    return row!;
  }),

  setStatus: protectedProcedure.input(LeadSetStatus).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(leads).where(eq(leads.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    if (before.convertedProjectId)
      throw new TRPCError({ code: "BAD_REQUEST", message: "A converted lead cannot change status." });
    const [row] = await ctx.db
      .update(leads)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(leads.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "lead",
      entityId: input.id,
      action: "STATUS",
      actorId: ctx.user.id,
      before: { status: before.status },
      after: { status: input.status },
    });
    return row!;
  }),

  /**
   * Convert a lead into a client (new or existing) + a draft project (ENQUIRY),
   * atomically. Stamps the lead QUALIFIED with the new ids. The project counts
   * against the plan quota; the fixed Lite plan blocks new projects entirely.
   */
  convert: protectedProcedure.input(LeadConvert).mutation(async ({ ctx, input }) => {
    const [lead] = await ctx.db.select().from(leads).where(eq(leads.id, input.id));
    if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
    if (lead.convertedProjectId)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Lead is already converted." });
    if (LEAD_TERMINAL_STATUSES.has(lead.status as LeadStatus) && lead.status !== "QUALIFIED")
      throw new TRPCError({ code: "BAD_REQUEST", message: `A ${lead.status} lead cannot be converted.` });

    await assertNotFixedPlan(ctx.db);
    await getOrgSettings(ctx.db);

    // Project quota (live projects only).
    const cRows = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(projectOffices)
      .where(sql`${projectOffices.archivedAt} is null`);
    await assertQuota(ctx.db, "projects", cRows[0] ? cRows[0].count : 0);

    const { ref } = await nextRef(ctx.db, "projectoffice", "PRJ");

    const result = await ctx.db.transaction(async (tx) => {
      // Resolve the client — reuse an existing one or mint from lead contact.
      let clientId = input.clientId ?? null;
      let createdClient = false;
      if (!clientId) {
        const [c] = await tx
          .insert(clients)
          .values({
            publicId: newPublicId("X"),
            name: lead.clientName,
            kind: "INDIVIDUAL",
            email: lead.email,
            phone: lead.phone,
            city: lead.city,
          })
          .returning();
        clientId = c!.id;
        createdClient = true;
      }

      const [p] = await tx
        .insert(projectOffices)
        .values({
          ref,
          title: input.projectTitle,
          projectType: input.projectType,
          workType: input.workType,
          clientId,
          city: lead.city,
          siteAddress: lead.siteLocation,
          status: "ENQUIRY",
          leadId: lead.id,
          pmcEnabled: false,
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

      const [updatedLead] = await tx
        .update(leads)
        .set({
          status: "QUALIFIED",
          convertedClientId: clientId,
          convertedProjectId: p!.id,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, lead.id))
        .returning();

      await writeActivity(tx, {
        projectId: p!.id,
        objectType: "projectoffice",
        objectId: p!.id,
        eventType: "project.created",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "STAFF",
        summary: `Project ${p!.ref} created from lead ${lead.ref}`,
        metadata: { ref, leadRef: lead.ref, createdClient },
      });
      await writeAudit(tx, {
        entity: "lead",
        entityId: lead.id,
        action: "CONVERT",
        actorId: ctx.user.id,
        before: { status: lead.status },
        after: { status: "QUALIFIED", convertedProjectId: p!.id, convertedClientId: clientId },
      });

      return { lead: updatedLead!, projectId: p!.id, clientId, createdClient };
    });

    return result;
  }),
});
