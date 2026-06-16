import { TenderBidInput, TenderCreate, TenderInvite, TenderStatus, TenderUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { contractors, projectOffices, tenderBids, tenderInvitations, tenders } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const blank = (v: string | undefined) => (v && v.length > 0 ? v : null);
const manage = capabilityProcedure("write");

export const tenderRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional(), status: TenderStatus.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const filters = [
        input?.projectId ? eq(tenders.projectId, input.projectId) : undefined,
        input?.status ? eq(tenders.status, input.status) : undefined,
      ].filter(Boolean);
      return ctx.db
        .select({
          id: tenders.id,
          title: tenders.title,
          category: tenders.category,
          status: tenders.status,
          dueDate: tenders.dueDate,
          projectId: tenders.projectId,
          projectRef: projectOffices.ref,
          projectTitle: projectOffices.title,
          createdAt: tenders.createdAt,
          invitationCount: sql<number>`(select count(*)::int from ${tenderInvitations} where ${tenderInvitations.tenderId} = ${tenders.id})`,
        })
        .from(tenders)
        .innerJoin(projectOffices, eq(projectOffices.id, tenders.projectId))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(tenders.createdAt));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [tender] = await ctx.db
        .select({
          id: tenders.id, title: tenders.title, category: tenders.category, scope: tenders.scope,
          status: tenders.status, dueDate: tenders.dueDate, instructions: tenders.instructions,
          awardedContractorId: tenders.awardedContractorId,
          projectId: tenders.projectId, projectRef: projectOffices.ref, projectTitle: projectOffices.title,
        })
        .from(tenders)
        .innerJoin(projectOffices, eq(projectOffices.id, tenders.projectId))
        .where(eq(tenders.id, input.id));
      if (!tender) throw new TRPCError({ code: "NOT_FOUND" });

      const invitations = await ctx.db
        .select({
          id: tenderInvitations.id,
          contractorId: tenderInvitations.contractorId,
          contractorName: contractors.name,
          contractorCategory: contractors.category,
          status: tenderInvitations.status,
          accessToken: tenderInvitations.accessToken,
          invitedAt: tenderInvitations.invitedAt,
        })
        .from(tenderInvitations)
        .innerJoin(contractors, eq(contractors.id, tenderInvitations.contractorId))
        .where(eq(tenderInvitations.tenderId, input.id))
        .orderBy(desc(tenderInvitations.invitedAt));

      return { ...tender, invitations };
    }),

  create: manage.input(TenderCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(tenders)
      .values({
        projectId: input.projectId,
        title: input.title,
        category: input.category ?? null,
        scope: blank(input.scope),
        dueDate: input.dueDate ?? null,
        instructions: blank(input.instructions),
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "tender", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: manage.input(TenderUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(tenders).where(eq(tenders.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    if (input.awardedContractorId && input.awardedContractorId.length > 0) {
      const [c] = await ctx.db.select({ id: contractors.id }).from(contractors).where(eq(contractors.id, input.awardedContractorId));
      if (!c) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown contractor" });
    }
    const [row] = await ctx.db
      .update(tenders)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.scope !== undefined ? { scope: blank(input.scope) } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate || null } : {}),
        ...(input.instructions !== undefined ? { instructions: blank(input.instructions) } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.awardedContractorId !== undefined ? { awardedContractorId: input.awardedContractorId || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(tenders.id, input.id))
      .returning();
    await writeAudit(ctx.db, { entity: "tender", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, before, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(tenders).where(eq(tenders.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.delete(tenderInvitations).where(eq(tenderInvitations.tenderId, input.id));
    await ctx.db.delete(tenders).where(eq(tenders.id, input.id));
    await writeAudit(ctx.db, { entity: "tender", entityId: input.id, action: "DELETE", actorId: ctx.user.id, before });
    return { ok: true as const };
  }),

  invite: manage.input(TenderInvite).mutation(async ({ ctx, input }) => {
    const [tender] = await ctx.db.select({ id: tenders.id }).from(tenders).where(eq(tenders.id, input.tenderId));
    if (!tender) throw new TRPCError({ code: "NOT_FOUND", message: "Tender not found" });
    const [contractor] = await ctx.db.select({ id: contractors.id }).from(contractors).where(eq(contractors.id, input.contractorId));
    if (!contractor) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown contractor" });

    const [existing] = await ctx.db
      .select({ id: tenderInvitations.id })
      .from(tenderInvitations)
      .where(and(eq(tenderInvitations.tenderId, input.tenderId), eq(tenderInvitations.contractorId, input.contractorId)));
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "Contractor already invited" });

    const [row] = await ctx.db
      .insert(tenderInvitations)
      .values({ tenderId: input.tenderId, contractorId: input.contractorId, accessToken: randomBytes(24).toString("hex") })
      .returning({ id: tenderInvitations.id });
    await writeAudit(ctx.db, { entity: "tender_invitation", entityId: row!.id, action: "INVITE", actorId: ctx.user.id, after: { tenderId: input.tenderId, contractorId: input.contractorId } });
    return { ok: true as const, id: row!.id };
  }),

  removeInvitation: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(tenderInvitations).where(eq(tenderInvitations.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.delete(tenderBids).where(eq(tenderBids.invitationId, input.id));
    await ctx.db.delete(tenderInvitations).where(eq(tenderInvitations.id, input.id));
    await writeAudit(ctx.db, { entity: "tender_invitation", entityId: input.id, action: "DELETE", actorId: ctx.user.id, before });
    return { ok: true as const };
  }),

  /** Record (or update) a sealed bid against an invitation; marks it SUBMITTED. */
  recordBid: manage.input(TenderBidInput).mutation(async ({ ctx, input }) => {
    const [inv] = await ctx.db
      .select({ id: tenderInvitations.id })
      .from(tenderInvitations)
      .where(eq(tenderInvitations.id, input.invitationId));
    if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });

    const [existing] = await ctx.db.select({ id: tenderBids.id }).from(tenderBids).where(eq(tenderBids.invitationId, input.invitationId));
    if (existing) {
      await ctx.db
        .update(tenderBids)
        .set({
          amountPaise: input.amountPaise,
          completionWeeks: input.completionWeeks ?? null,
          technicalScore: input.technicalScore ?? null,
          notes: input.notes ?? null,
          submittedById: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(tenderBids.id, existing.id));
    } else {
      await ctx.db.insert(tenderBids).values({
        invitationId: input.invitationId,
        amountPaise: input.amountPaise,
        completionWeeks: input.completionWeeks ?? null,
        technicalScore: input.technicalScore ?? null,
        notes: input.notes ?? null,
        submittedById: ctx.user.id,
      });
    }
    await ctx.db.update(tenderInvitations).set({ status: "SUBMITTED" }).where(eq(tenderInvitations.id, input.invitationId));
    await writeAudit(ctx.db, { entity: "tender_bid", entityId: input.invitationId, action: existing ? "UPDATE" : "CREATE", actorId: ctx.user.id, after: { amountPaise: input.amountPaise } });
    return { ok: true as const };
  }),

  /** All bids for a tender, joined to the contractor — ordered cheapest first. */
  bids: protectedProcedure.input(z.object({ tenderId: z.string().uuid() })).query(async ({ ctx, input }) => {
    return ctx.db
      .select({
        id: tenderBids.id,
        invitationId: tenderBids.invitationId,
        contractorId: tenderInvitations.contractorId,
        contractorName: contractors.name,
        amountPaise: tenderBids.amountPaise,
        completionWeeks: tenderBids.completionWeeks,
        technicalScore: tenderBids.technicalScore,
        notes: tenderBids.notes,
      })
      .from(tenderBids)
      .innerJoin(tenderInvitations, eq(tenderInvitations.id, tenderBids.invitationId))
      .innerJoin(contractors, eq(contractors.id, tenderInvitations.contractorId))
      .where(eq(tenderInvitations.tenderId, input.tenderId))
      .orderBy(asc(tenderBids.amountPaise));
  }),

  removeBid: manage.input(z.object({ invitationId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(tenderBids).where(eq(tenderBids.invitationId, input.invitationId));
    await ctx.db.update(tenderInvitations).set({ status: "INVITED" }).where(eq(tenderInvitations.id, input.invitationId));
    await writeAudit(ctx.db, { entity: "tender_bid", entityId: input.invitationId, action: "DELETE", actorId: ctx.user.id });
    return { ok: true as const };
  }),
});
