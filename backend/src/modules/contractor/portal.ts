import { ConstructionSubmit, TENDER_STATUS_LABEL } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import {
  contractorSubmissions,
  contractors,
  drawings,
  projectOffices,
  runningBills,
  tenderBids,
  tenderDocumentAcks,
  tenderDocuments,
  tenderInvitations,
  tenders,
  transmittals,
} from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { getFirm } from "../../lib/firm.js";
import { presignedGet } from "../../lib/storage.js";
import { contractorProcedure, router } from "../../trpc/trpc.js";

/**
 * Resolve the logged-in contractor's current tender invitation (the most recent
 * one). The contractor portal is now login-based — scoped by ctx.user.contractorId
 * rather than a magic-link token. Returns undefined when the contractor has no
 * tender invitation yet.
 */
async function loadForContractor(db: DB, contractorId: string) {
  const [row] = await db
    .select({
      invitationId: tenderInvitations.id,
      invitationStatus: tenderInvitations.status,
      contractorId: tenderInvitations.contractorId,
      contractorName: contractors.name,
      tenderId: tenders.id,
      projectId: tenders.projectId,
      tenderTitle: tenders.title,
      tenderStatus: tenders.status,
      scope: tenders.scope,
      instructions: tenders.instructions,
      dueDate: tenders.dueDate,
      projectRef: projectOffices.ref,
      projectTitle: projectOffices.title,
    })
    .from(tenderInvitations)
    .innerJoin(tenders, eq(tenders.id, tenderInvitations.tenderId))
    .innerJoin(projectOffices, eq(projectOffices.id, tenders.projectId))
    .innerJoin(contractors, eq(contractors.id, tenderInvitations.contractorId))
    .where(eq(tenderInvitations.contractorId, contractorId))
    .orderBy(desc(tenders.createdAt))
    .limit(1);
  return row;
}

/** Resolve the contractor's invitation or throw — used by the action mutations. */
async function requireInvitation(db: DB, contractorId: string) {
  const inv = await loadForContractor(db, contractorId);
  if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "No tender is assigned to you yet." });
  return inv;
}

async function tenderDocumentsForPortal(db: DB, tenderId: string, invitationId: string) {
  const docs = await db
    .select()
    .from(tenderDocuments)
    .where(eq(tenderDocuments.tenderId, tenderId))
    .orderBy(desc(tenderDocuments.createdAt));
  const acks = await db
    .select({ documentId: tenderDocumentAcks.documentId })
    .from(tenderDocumentAcks)
    .where(eq(tenderDocumentAcks.invitationId, invitationId));
  const ackSet = new Set(acks.map((a) => a.documentId));
  return Promise.all(
    docs.map(async (d) => ({
      id: d.id,
      title: d.title,
      kind: d.kind,
      fileName: d.fileName,
      addendumNo: d.addendumNo,
      issuedAt: d.issuedAt,
      downloadUrl: await presignedGet(d.storageKey).catch(() => null),
      acknowledged: ackSet.has(d.id),
      requiresAck: d.addendumNo != null,
    })),
  );
}

export const contractorPortalRouter = router({
  /** The contractor's portal landing: their current tender, bid and documents. */
  mySpace: contractorProcedure.query(async ({ ctx }) => {
    const firm = await getFirm(ctx.db);
    const inv = await loadForContractor(ctx.db, ctx.user.contractorId);

    // Contractor with no tender yet — return the name only so the portal can
    // render a friendly empty state instead of erroring.
    if (!inv) {
      const [c] = await ctx.db
        .select({ name: contractors.name })
        .from(contractors)
        .where(eq(contractors.id, ctx.user.contractorId));
      return {
        firmName: firm.companyName,
        contractorName: c?.name ?? null,
        tender: null,
        invitationStatus: null,
        bid: null,
        documents: [],
        pendingAddendaCount: 0,
      };
    }

    if (inv.invitationStatus === "INVITED") {
      await ctx.db
        .update(tenderInvitations)
        .set({ status: "VIEWED" })
        .where(eq(tenderInvitations.id, inv.invitationId));
    }

    const [bid] = await ctx.db
      .select({
        amountPaise: tenderBids.amountPaise,
        completionWeeks: tenderBids.completionWeeks,
        technicalScore: tenderBids.technicalScore,
        notes: tenderBids.notes,
      })
      .from(tenderBids)
      .where(eq(tenderBids.invitationId, inv.invitationId));

    const documents = await tenderDocumentsForPortal(ctx.db, inv.tenderId, inv.invitationId);
    const pendingAddenda = documents.filter((d) => d.requiresAck && !d.acknowledged);

    return {
      firmName: firm.companyName,
      contractorName: inv.contractorName,
      tender: {
        title: inv.tenderTitle,
        scope: inv.scope,
        instructions: inv.instructions,
        dueDate: inv.dueDate,
        status: inv.tenderStatus,
        statusLabel:
          TENDER_STATUS_LABEL[inv.tenderStatus as keyof typeof TENDER_STATUS_LABEL] ?? inv.tenderStatus,
        projectRef: inv.projectRef,
        projectTitle: inv.projectTitle,
        open: inv.tenderStatus === "OPEN",
      },
      invitationStatus: inv.invitationStatus === "INVITED" ? "VIEWED" : inv.invitationStatus,
      bid: bid ?? null,
      documents,
      pendingAddendaCount: pendingAddenda.length,
    };
  }),

  submitBid: contractorProcedure
    .input(
      z.object({
        amountPaise: z.number().int().nonnegative(),
        completionWeeks: z.number().int().min(0).max(520).optional(),
        technicalScore: z.number().int().min(0).max(100).optional(),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await requireInvitation(ctx.db, ctx.user.contractorId);
      if (inv.tenderStatus !== "OPEN")
        throw new TRPCError({ code: "BAD_REQUEST", message: "This tender is not open for bids." });

      const docs = await tenderDocumentsForPortal(ctx.db, inv.tenderId, inv.invitationId);
      if (docs.some((d) => d.requiresAck && !d.acknowledged)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Acknowledge all addenda before submitting your bid." });
      }

      const [existing] = await ctx.db
        .select({ id: tenderBids.id })
        .from(tenderBids)
        .where(eq(tenderBids.invitationId, inv.invitationId));
      if (existing) {
        await ctx.db
          .update(tenderBids)
          .set({
            amountPaise: input.amountPaise,
            completionWeeks: input.completionWeeks ?? null,
            technicalScore: input.technicalScore ?? null,
            notes: input.notes ?? null,
            updatedAt: new Date(),
          })
          .where(eq(tenderBids.id, existing.id));
      } else {
        await ctx.db.insert(tenderBids).values({
          invitationId: inv.invitationId,
          amountPaise: input.amountPaise,
          completionWeeks: input.completionWeeks ?? null,
          technicalScore: input.technicalScore ?? null,
          notes: input.notes ?? null,
        });
      }
      await ctx.db
        .update(tenderInvitations)
        .set({ status: "SUBMITTED" })
        .where(eq(tenderInvitations.id, inv.invitationId));
      return { ok: true as const };
    }),

  decline: contractorProcedure.mutation(async ({ ctx }) => {
    const inv = await requireInvitation(ctx.db, ctx.user.contractorId);
    if (inv.tenderStatus !== "OPEN")
      throw new TRPCError({ code: "BAD_REQUEST", message: "This tender is not open." });
    await ctx.db
      .update(tenderInvitations)
      .set({ status: "DECLINED" })
      .where(eq(tenderInvitations.id, inv.invitationId));
    return { ok: true as const };
  }),

  ackDocument: contractorProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const inv = await requireInvitation(ctx.db, ctx.user.contractorId);
      const [doc] = await ctx.db
        .select()
        .from(tenderDocuments)
        .where(and(eq(tenderDocuments.id, input.documentId), eq(tenderDocuments.tenderId, inv.tenderId)));
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      await ctx.db
        .insert(tenderDocumentAcks)
        .values({ invitationId: inv.invitationId, documentId: input.documentId })
        .onConflictDoNothing();
      return { ok: true as const };
    }),

  /** Issued drawings + transmittals for the contractor's project (read-only). */
  projectDocuments: contractorProcedure.query(async ({ ctx }) => {
    const inv = await requireInvitation(ctx.db, ctx.user.contractorId);
    const drawingRows = await ctx.db
      .select({ id: drawings.id, ref: drawings.ref, title: drawings.title })
      .from(drawings)
      .where(and(eq(drawings.projectId, inv.projectId), eq(drawings.status, "READY")))
      .orderBy(desc(drawings.createdAt));
    const transmittalRows = await ctx.db
      .select({
        ref: transmittals.ref,
        purpose: transmittals.purpose,
        channel: transmittals.channel,
        dateIssued: transmittals.dateIssued,
      })
      .from(transmittals)
      .where(and(eq(transmittals.projectId, inv.projectId), isNotNull(transmittals.dateIssued)))
      .orderBy(desc(transmittals.dateIssued));
    return { drawings: drawingRows, transmittals: transmittalRows };
  }),

  listCoordination: contractorProcedure.query(async ({ ctx }) => {
    const inv = await requireInvitation(ctx.db, ctx.user.contractorId);
    return ctx.db
      .select({
        id: contractorSubmissions.id,
        kind: contractorSubmissions.kind,
        subject: contractorSubmissions.subject,
        body: contractorSubmissions.body,
        status: contractorSubmissions.status,
        responseNote: contractorSubmissions.responseNote,
        createdAt: contractorSubmissions.createdAt,
      })
      .from(contractorSubmissions)
      .where(
        and(
          eq(contractorSubmissions.projectId, inv.projectId),
          eq(contractorSubmissions.contractorId, inv.contractorId),
        ),
      )
      .orderBy(desc(contractorSubmissions.createdAt));
  }),

  submitCoordination: contractorProcedure.input(ConstructionSubmit).mutation(async ({ ctx, input }) => {
    const inv = await requireInvitation(ctx.db, ctx.user.contractorId);
    const [row] = await ctx.db
      .insert(contractorSubmissions)
      .values({
        projectId: inv.projectId,
        contractorId: inv.contractorId,
        kind: input.kind,
        subject: input.subject,
        body: input.body ?? null,
      })
      .returning({ id: contractorSubmissions.id });
    await writeActivity(ctx.db, {
      projectId: inv.projectId,
      objectType: "contractor_submission",
      objectId: row!.id,
      eventType: "construction.submitted",
      actorName: inv.contractorName,
      visibility: "STAFF",
      summary: `${input.kind}: ${input.subject}`,
      metadata: { contractorId: inv.contractorId },
    });
    return { ok: true as const, id: row!.id };
  }),

  listRunningBills: contractorProcedure.query(async ({ ctx }) => {
    const inv = await requireInvitation(ctx.db, ctx.user.contractorId);
    return ctx.db
      .select()
      .from(runningBills)
      .where(and(eq(runningBills.projectId, inv.projectId), eq(runningBills.contractorId, inv.contractorId)))
      .orderBy(desc(runningBills.createdAt));
  }),

  advanceRunningBill: contractorProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["CONTRACTOR_VERIFIED", "CONTRACTOR_INVOICED"]),
        note: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await requireInvitation(ctx.db, ctx.user.contractorId);
      const [bill] = await ctx.db.select().from(runningBills).where(eq(runningBills.id, input.id));
      if (!bill || bill.projectId !== inv.projectId || bill.contractorId !== inv.contractorId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const allowed =
        (bill.status === "SENT_TO_CONTRACTOR" && input.status === "CONTRACTOR_VERIFIED") ||
        (bill.status === "APPROVED_MEASUREMENT_SENT" && input.status === "CONTRACTOR_INVOICED");
      if (!allowed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Running bill is not waiting for contractor action" });
      }
      const statusHistory = [
        ...((bill.statusHistory as unknown[]) ?? []),
        {
          status: input.status,
          actor: "contractor",
          contractorId: inv.contractorId,
          contractorName: inv.contractorName,
          note: input.note ?? null,
          at: new Date().toISOString(),
        },
      ];
      await ctx.db
        .update(runningBills)
        .set({ status: input.status, statusHistory, updatedAt: new Date() })
        .where(eq(runningBills.id, input.id));
      await writeActivity(ctx.db, {
        projectId: inv.projectId,
        objectType: "running_bill",
        objectId: input.id,
        eventType: "pmc.running_bill.contractor",
        actorName: inv.contractorName,
        visibility: "STAFF",
        summary: `${bill.ref}: ${input.status}`,
        metadata: { contractorId: inv.contractorId, status: input.status },
      });
      return { ok: true as const };
    }),
});
