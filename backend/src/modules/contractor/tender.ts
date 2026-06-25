import {
  rankBids,
  TenderBidInput,
  TenderCreate,
  TenderInvite,
  TenderItemAdd,
  TenderItemBidInput,
  TenderItemsFromEstimate,
  TenderItemUpdate,
  tenderItemAmount,
  TenderStatus,
  TenderUpdate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import {
  contractors,
  estimateItems,
  estimateVersions,
  projectOffices,
  tenderBidItems,
  tenderBids,
  tenderDocumentAcks,
  tenderDocuments,
  tenderInvitations,
  tenderItems,
  tenders,
  workPackageItems,
  workPackages,
} from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const blank = (v: string | undefined) => (v && v.length > 0 ? v : null);
const manage = capabilityProcedure("write");

/** Upsert a contractor's item rates against a tender, computing line amounts
 *  from the tender item qty (shared by office `recordItemBid` + portal submit). */
async function upsertItemBidLines(
  db: DB,
  invitationId: string,
  tenderId: string,
  lines: { tenderItemId: string; ratePaise: number }[],
): Promise<number> {
  const items = await db
    .select({ id: tenderItems.id, qty: tenderItems.qty })
    .from(tenderItems)
    .where(eq(tenderItems.tenderId, tenderId));
  const qtyById = new Map(items.map((i) => [i.id, i.qty]));
  for (const line of lines) {
    const qty = qtyById.get(line.tenderItemId);
    if (qty === undefined)
      throw new TRPCError({ code: "BAD_REQUEST", message: "A quoted line is not part of this tender." });
    const amountPaise = tenderItemAmount(qty, line.ratePaise);
    const [existing] = await db
      .select({ id: tenderBidItems.id })
      .from(tenderBidItems)
      .where(and(eq(tenderBidItems.invitationId, invitationId), eq(tenderBidItems.tenderItemId, line.tenderItemId)));
    if (existing) {
      await db.update(tenderBidItems).set({ ratePaise: line.ratePaise, amountPaise }).where(eq(tenderBidItems.id, existing.id));
    } else {
      await db.insert(tenderBidItems).values({ invitationId, tenderItemId: line.tenderItemId, ratePaise: line.ratePaise, amountPaise });
    }
  }
  // Header bid amount = Σ line amounts.
  const [agg] = await db
    .select({ total: sql<number>`coalesce(sum(${tenderBidItems.amountPaise}), 0)` })
    .from(tenderBidItems)
    .where(eq(tenderBidItems.invitationId, invitationId));
  return Number(agg?.total ?? 0);
}

/** Upsert the sealed-bid header row for an invitation to a rolled-up total. */
async function upsertBidHeader(db: DB, invitationId: string, totalPaise: number, submittedById: string | null): Promise<void> {
  const [existing] = await db.select({ id: tenderBids.id }).from(tenderBids).where(eq(tenderBids.invitationId, invitationId));
  if (existing) {
    await db
      .update(tenderBids)
      .set({ amountPaise: totalPaise, ...(submittedById ? { submittedById } : {}), updatedAt: new Date() })
      .where(eq(tenderBids.id, existing.id));
  } else {
    await db.insert(tenderBids).values({ invitationId, amountPaise: totalPaise, submittedById });
  }
}

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

      const documents = await ctx.db
        .select()
        .from(tenderDocuments)
        .where(eq(tenderDocuments.tenderId, input.id))
        .orderBy(desc(tenderDocuments.createdAt));

      return { ...tender, invitations, documents };
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

  /** All bids for a tender — amounts hidden while tender is OPEN (sealed bids). */
  bids: protectedProcedure.input(z.object({ tenderId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [tender] = await ctx.db
      .select({ status: tenders.status })
      .from(tenders)
      .where(eq(tenders.id, input.tenderId));
    if (!tender) throw new TRPCError({ code: "NOT_FOUND" });
    const sealed = tender.status === "OPEN" || tender.status === "DRAFT";

    const rows = await ctx.db
      .select({
        id: tenderBids.id,
        invitationId: tenderBids.invitationId,
        contractorId: tenderInvitations.contractorId,
        contractorName: contractors.name,
        invitationStatus: tenderInvitations.status,
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

    if (sealed) {
      return rows.map((r) => ({
        id: r.id,
        invitationId: r.invitationId,
        contractorId: r.contractorId,
        contractorName: r.contractorName,
        invitationStatus: r.invitationStatus,
        sealed: true as const,
        amountPaise: null,
        completionWeeks: null,
        technicalScore: null,
        notes: null,
      }));
    }
    return rows.map((r) => ({ ...r, sealed: false as const }));
  }),

  removeBid: manage.input(z.object({ invitationId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(tenderBids).where(eq(tenderBids.invitationId, input.invitationId));
    await ctx.db.update(tenderInvitations).set({ status: "INVITED" }).where(eq(tenderInvitations.id, input.invitationId));
    await writeAudit(ctx.db, { entity: "tender_bid", entityId: input.invitationId, action: "DELETE", actorId: ctx.user.id });
    return { ok: true as const };
  }),

  exportComparison: protectedProcedure
    .input(z.object({ tenderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [tender] = await ctx.db.select().from(tenders).where(eq(tenders.id, input.tenderId));
      if (!tender) throw new TRPCError({ code: "NOT_FOUND" });
      if (tender.status === "OPEN" || tender.status === "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Close the tender before exporting bid comparison.",
        });
      }
      const bids = await ctx.db
        .select({
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
      return {
        title: tender.title,
        ref: tender.id.slice(0, 8),
        rows: bids.map((b, i) => ({
          Rank: i + 1,
          Contractor: b.contractorName,
          "Amount (₹)": (b.amountPaise / 100).toFixed(2),
          "Weeks": b.completionWeeks ?? "",
          "Technical": b.technicalScore ?? "",
          Notes: b.notes ?? "",
        })),
      };
    }),

  listDocuments: protectedProcedure
    .input(z.object({ tenderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(tenderDocuments)
        .where(eq(tenderDocuments.tenderId, input.tenderId))
        .orderBy(desc(tenderDocuments.createdAt));
      return Promise.all(
        rows.map(async (d) => ({
          ...d,
          downloadUrl: await presignedGet(d.storageKey).catch(() => null),
        })),
      );
    }),

  removeDocument: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [doc] = await ctx.db.select().from(tenderDocuments).where(eq(tenderDocuments.id, input.id));
    if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.delete(tenderDocumentAcks).where(eq(tenderDocumentAcks.documentId, input.id));
    await ctx.db.delete(tenderDocuments).where(eq(tenderDocuments.id, input.id));
    await removeObject(doc.storageKey).catch(() => undefined);
    await writeAudit(ctx.db, { entity: "tender_document", entityId: input.id, action: "DELETE", actorId: ctx.user.id, before: doc });
    return { ok: true as const };
  }),

  // --- Item-wise (BOQ-line) tendering — Construction Cost OS Phase A+B --------

  /** Carve item-wise BOQ lines for a tender from a frozen estimate version
   *  (measurable lines only). DRAFT only; rebuilds any existing carved lines. */
  createItemsFromEstimate: manage.input(TenderItemsFromEstimate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "pmc");
    const [tender] = await ctx.db.select().from(tenders).where(eq(tenders.id, input.tenderId));
    if (!tender) throw new TRPCError({ code: "NOT_FOUND" });
    if (tender.status !== "DRAFT")
      throw new TRPCError({ code: "BAD_REQUEST", message: "Build the BOQ while the tender is a draft." });

    const [version] = await ctx.db
      .select()
      .from(estimateVersions)
      .where(eq(estimateVersions.id, input.estimateVersionId));
    if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Frozen estimate version not found." });

    // Frozen estimates are immutable, so the live items equal the baseline.
    const rows = await ctx.db
      .select()
      .from(estimateItems)
      .where(eq(estimateItems.estimateId, version.estimateId))
      .orderBy(asc(estimateItems.sortOrder), asc(estimateItems.createdAt));

    const headFilter = input.costHeads && input.costHeads.length > 0 ? new Set(input.costHeads) : null;
    // Only measurable lines become tender scope (qty > 0 drops percentage
    // preliminaries / contingency, which aren't tendered by quantity).
    const source = rows.filter(
      (r) => r.qty > 0 && (!headFilter || (r.costHead != null && headFilter.has(r.costHead as never))),
    );
    if (source.length === 0)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No measurable BOQ lines in this frozen version for the chosen cost heads.",
      });

    // A draft has no bids yet, so wipe prior carved lines (cascades any stray
    // bid items) and re-seed from the version.
    await ctx.db.delete(tenderItems).where(eq(tenderItems.tenderId, input.tenderId));
    for (const [idx, r] of source.entries()) {
      await ctx.db.insert(tenderItems).values({
        tenderId: input.tenderId,
        boqItemId: r.id,
        componentId: r.componentId ?? null,
        description: r.description,
        unit: r.unit,
        qty: r.qty,
        estRatePaise: r.ratePaise,
        sortOrder: idx,
      });
    }
    await ctx.db
      .update(tenders)
      .set({ estimateVersionId: version.id, updatedAt: new Date() })
      .where(eq(tenders.id, input.tenderId));
    await writeAudit(ctx.db, {
      entity: "tender",
      entityId: input.tenderId,
      action: "ITEMS_FROM_ESTIMATE",
      actorId: ctx.user.id,
      after: { estimateVersionId: version.id, itemCount: source.length },
    });
    return { ok: true as const, itemCount: source.length };
  }),

  /** Tender BOQ lines (office view — includes the hidden est-rate baseline). */
  items: protectedProcedure.input(z.object({ tenderId: z.string().uuid() })).query(async ({ ctx, input }) =>
    ctx.db
      .select()
      .from(tenderItems)
      .where(eq(tenderItems.tenderId, input.tenderId))
      .orderBy(asc(tenderItems.sortOrder), asc(tenderItems.createdAt)),
  ),

  addItem: manage.input(TenderItemAdd).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "pmc");
    const [tender] = await ctx.db.select({ status: tenders.status }).from(tenders).where(eq(tenders.id, input.tenderId));
    if (!tender) throw new TRPCError({ code: "NOT_FOUND" });
    if (tender.status !== "DRAFT")
      throw new TRPCError({ code: "BAD_REQUEST", message: "Edit BOQ lines while the tender is a draft." });
    const [row] = await ctx.db
      .insert(tenderItems)
      .values({
        tenderId: input.tenderId,
        description: input.description,
        unit: input.unit,
        qty: input.qty,
        estRatePaise: input.estRatePaise,
        sortOrder: input.sortOrder,
      })
      .returning();
    return row!;
  }),

  updateItem: manage.input(TenderItemUpdate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "pmc");
    const [item] = await ctx.db.select({ tenderId: tenderItems.tenderId }).from(tenderItems).where(eq(tenderItems.id, input.id));
    if (!item) throw new TRPCError({ code: "NOT_FOUND" });
    const [tender] = await ctx.db.select({ status: tenders.status }).from(tenders).where(eq(tenders.id, item.tenderId));
    if (tender && tender.status !== "DRAFT")
      throw new TRPCError({ code: "BAD_REQUEST", message: "Edit BOQ lines while the tender is a draft." });
    await ctx.db
      .update(tenderItems)
      .set({
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.qty !== undefined ? { qty: input.qty } : {}),
        ...(input.estRatePaise !== undefined ? { estRatePaise: input.estRatePaise } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      })
      .where(eq(tenderItems.id, input.id));
    return { ok: true as const };
  }),

  removeItem: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "pmc");
    const [item] = await ctx.db.select({ tenderId: tenderItems.tenderId }).from(tenderItems).where(eq(tenderItems.id, input.id));
    if (!item) return { ok: true as const };
    const [tender] = await ctx.db.select({ status: tenders.status }).from(tenders).where(eq(tenders.id, item.tenderId));
    if (tender && tender.status !== "DRAFT")
      throw new TRPCError({ code: "BAD_REQUEST", message: "Edit BOQ lines while the tender is a draft." });
    await ctx.db.delete(tenderItems).where(eq(tenderItems.id, input.id));
    return { ok: true as const };
  }),

  /** Record (or update) a contractor's item-wise bid; marks it SUBMITTED. */
  recordItemBid: manage.input(TenderItemBidInput).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "pmc");
    const [inv] = await ctx.db
      .select({ id: tenderInvitations.id, tenderId: tenderInvitations.tenderId })
      .from(tenderInvitations)
      .where(eq(tenderInvitations.id, input.invitationId));
    if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
    const total = await upsertItemBidLines(ctx.db, inv.id, inv.tenderId, input.items);
    await upsertBidHeader(ctx.db, inv.id, total, ctx.user.id);
    await ctx.db.update(tenderInvitations).set({ status: "SUBMITTED" }).where(eq(tenderInvitations.id, inv.id));
    await writeAudit(ctx.db, {
      entity: "tender_bid",
      entityId: inv.id,
      action: "ITEM_BID",
      actorId: ctx.user.id,
      after: { amountPaise: total, lines: input.items.length },
    });
    return { ok: true as const, amountPaise: total };
  }),

  /** Item-wise comparison grid. Rates stay sealed while DRAFT|OPEN; once CLOSED
   *  the matrix reveals each contractor's rate per line + ranked totals. */
  compareItems: protectedProcedure.input(z.object({ tenderId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [tender] = await ctx.db.select({ status: tenders.status }).from(tenders).where(eq(tenders.id, input.tenderId));
    if (!tender) throw new TRPCError({ code: "NOT_FOUND" });
    const sealed = tender.status === "OPEN" || tender.status === "DRAFT";

    const rows = await ctx.db
      .select()
      .from(tenderItems)
      .where(eq(tenderItems.tenderId, input.tenderId))
      .orderBy(asc(tenderItems.sortOrder), asc(tenderItems.createdAt));
    const items = rows.map((i) => ({
      id: i.id,
      description: i.description,
      unit: i.unit,
      qty: i.qty,
      estRatePaise: i.estRatePaise,
      sortOrder: i.sortOrder,
    }));

    const invitations = await ctx.db
      .select({
        invitationId: tenderInvitations.id,
        contractorId: tenderInvitations.contractorId,
        contractorName: contractors.name,
        status: tenderInvitations.status,
      })
      .from(tenderInvitations)
      .innerJoin(contractors, eq(contractors.id, tenderInvitations.contractorId))
      .where(eq(tenderInvitations.tenderId, input.tenderId))
      .orderBy(asc(contractors.name));

    if (sealed) {
      return {
        sealed: true as const,
        items,
        contractors: invitations.map((c) => ({ invitationId: c.invitationId, contractorId: c.contractorId, contractorName: c.contractorName, hasBid: false })),
        lines: [] as ItemComparisonLine[],
        totals: [] as ItemComparisonTotal[],
      };
    }

    const bidRows = await ctx.db
      .select({
        invitationId: tenderBidItems.invitationId,
        tenderItemId: tenderBidItems.tenderItemId,
        ratePaise: tenderBidItems.ratePaise,
        amountPaise: tenderBidItems.amountPaise,
      })
      .from(tenderBidItems)
      .innerJoin(tenderInvitations, eq(tenderInvitations.id, tenderBidItems.invitationId))
      .where(eq(tenderInvitations.tenderId, input.tenderId));

    const cellByKey = new Map<string, { ratePaise: number; amountPaise: number }>();
    const totalByInv = new Map<string, number>();
    const hasBid = new Set<string>();
    for (const b of bidRows) {
      cellByKey.set(`${b.tenderItemId}|${b.invitationId}`, { ratePaise: b.ratePaise, amountPaise: b.amountPaise });
      totalByInv.set(b.invitationId, (totalByInv.get(b.invitationId) ?? 0) + b.amountPaise);
      hasBid.add(b.invitationId);
    }

    const lines: ItemComparisonLine[] = items.map((it) => {
      const cells = invitations.map((c) => {
        const cell = cellByKey.get(`${it.id}|${c.invitationId}`);
        return {
          invitationId: c.invitationId,
          contractorId: c.contractorId,
          ratePaise: cell?.ratePaise ?? null,
          amountPaise: cell?.amountPaise ?? null,
        };
      });
      const present = cells.filter((c) => c.amountPaise != null).map((c) => c.amountPaise as number);
      const minAmount = present.length ? Math.min(...present) : null;
      const lowestInvitationIds = minAmount == null ? [] : cells.filter((c) => c.amountPaise === minAmount).map((c) => c.invitationId);
      return { tenderItemId: it.id, description: it.description, unit: it.unit, qty: it.qty, estRatePaise: it.estRatePaise, cells, lowestInvitationIds };
    });

    const totals: ItemComparisonTotal[] = rankBids(
      invitations
        .filter((c) => hasBid.has(c.invitationId))
        .map((c) => ({
          invitationId: c.invitationId,
          contractorId: c.contractorId,
          contractorName: c.contractorName,
          totalPaise: totalByInv.get(c.invitationId) ?? 0,
        })),
    );

    return {
      sealed: false as const,
      items,
      contractors: invitations.map((c) => ({
        invitationId: c.invitationId,
        contractorId: c.contractorId,
        contractorName: c.contractorName,
        hasBid: hasBid.has(c.invitationId),
      })),
      lines,
      totals,
    };
  }),

  /** Award an item-wise tender → seed a work package with the winner's rates
   *  (Construction Cost OS Phase B bridge). Lump-sum tenders with no estimate
   *  version keep the status-only award via `update`. */
  award: manage.input(z.object({ tenderId: z.string().uuid(), contractorId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "pmc");
    const [tender] = await ctx.db.select().from(tenders).where(eq(tenders.id, input.tenderId));
    if (!tender) throw new TRPCError({ code: "NOT_FOUND" });
    if (tender.status !== "CLOSED")
      throw new TRPCError({ code: "BAD_REQUEST", message: "Close the tender before awarding." });
    if (!tender.estimateVersionId)
      throw new TRPCError({ code: "BAD_REQUEST", message: "This tender has no BOQ from an estimate; award it as lump-sum instead." });

    const [inv] = await ctx.db
      .select({ id: tenderInvitations.id })
      .from(tenderInvitations)
      .where(and(eq(tenderInvitations.tenderId, input.tenderId), eq(tenderInvitations.contractorId, input.contractorId)));
    if (!inv) throw new TRPCError({ code: "BAD_REQUEST", message: "That contractor was not invited to this tender." });

    // The bridge is one-shot per tender — block a second work package.
    const [existingWp] = await ctx.db.select({ id: workPackages.id }).from(workPackages).where(eq(workPackages.tenderId, input.tenderId));
    if (existingWp) throw new TRPCError({ code: "CONFLICT", message: "This tender has already been awarded into a work package." });

    // Creating the work-package artifact is a costing feature.
    await assertPlanFeature(ctx.db, "costing");

    const lineRows = await ctx.db
      .select()
      .from(tenderItems)
      .where(eq(tenderItems.tenderId, input.tenderId))
      .orderBy(asc(tenderItems.sortOrder), asc(tenderItems.createdAt));
    if (lineRows.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "This tender has no BOQ lines to award." });

    const [version] = await ctx.db
      .select({ estimateId: estimateVersions.estimateId })
      .from(estimateVersions)
      .where(eq(estimateVersions.id, tender.estimateVersionId));
    if (!version) throw new TRPCError({ code: "BAD_REQUEST", message: "The tender's estimate version no longer exists." });

    const winnerBids = await ctx.db
      .select({ tenderItemId: tenderBidItems.tenderItemId, ratePaise: tenderBidItems.ratePaise })
      .from(tenderBidItems)
      .where(eq(tenderBidItems.invitationId, inv.id));
    const rateByItem = new Map(winnerBids.map((b) => [b.tenderItemId, b.ratePaise]));

    // Winning rate per line, falling back to the office est-rate where the
    // winner left a line unpriced.
    const seeded = lineRows.map((it) => {
      const rate = rateByItem.get(it.id) ?? it.estRatePaise;
      return { it, rate, amount: tenderItemAmount(it.qty, rate) };
    });
    const contractValuePaise = seeded.reduce((sum, s) => sum + s.amount, 0);

    const { ref } = await nextRef(ctx.db, "work_package", "WP");
    const [pkg] = await ctx.db
      .insert(workPackages)
      .values({
        ref,
        projectId: tender.projectId,
        estimateId: version.estimateId,
        estimateVersionId: tender.estimateVersionId,
        tenderId: tender.id,
        contractorId: input.contractorId,
        name: tender.title,
        packageType: tender.category ?? "CIVIL",
        status: "AWARDED",
        contractValuePaise,
        createdById: ctx.user.id,
      })
      .returning();

    for (const [idx, s] of seeded.entries()) {
      await ctx.db.insert(workPackageItems).values({
        workPackageId: pkg!.id,
        boqItemId: s.it.boqItemId,
        componentId: s.it.componentId,
        description: s.it.description,
        unit: s.it.unit,
        approvedQty: s.it.qty,
        variationQty: 0,
        ratePaise: s.rate,
        amountPaise: s.amount,
        sortOrder: idx,
      });
    }

    await ctx.db
      .update(tenders)
      .set({ status: "AWARDED", awardedContractorId: input.contractorId, updatedAt: new Date() })
      .where(eq(tenders.id, input.tenderId));

    await writeAudit(ctx.db, {
      entity: "tender",
      entityId: input.tenderId,
      action: "AWARD",
      actorId: ctx.user.id,
      after: { contractorId: input.contractorId, workPackageId: pkg!.id, ref, contractValuePaise },
    });
    await writeActivity(ctx.db, {
      projectId: tender.projectId,
      objectType: "tender",
      objectId: input.tenderId,
      eventType: "tender.awarded",
      actorName: ctx.user.fullName ?? ctx.user.email,
      visibility: "STAFF",
      summary: `Awarded "${tender.title}" → work package ${ref}`,
      metadata: { contractorId: input.contractorId, workPackageId: pkg!.id, contractValuePaise },
    });
    return { ok: true as const, tenderId: input.tenderId, workPackageId: pkg!.id, ref, contractValuePaise };
  }),
});

type ItemComparisonCell = {
  invitationId: string;
  contractorId: string;
  ratePaise: number | null;
  amountPaise: number | null;
};
type ItemComparisonLine = {
  tenderItemId: string;
  description: string;
  unit: string;
  qty: number;
  estRatePaise: number;
  cells: ItemComparisonCell[];
  lowestInvitationIds: string[];
};
type ItemComparisonTotal = {
  invitationId: string;
  contractorId: string;
  contractorName: string;
  totalPaise: number;
  rank: number;
  lowest: boolean;
};
