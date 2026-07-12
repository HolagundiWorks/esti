/**
 * AORMS-Consultancy — engineering consultancy spine.
 * Phase 0 "Living record": engagements + the deliverable register.
 * Phase 1 "Reliance engine": the serial sign-off chain (CHECK → APPROVE →
 * VERIFY per check category; checker ≠ author enforced server-side; ISSUED is
 * gated on the chain) and the TQ register with closure evidence.
 * Design: docs/esti/AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md.
 */
import {
  CHECK_CATEGORY_REQUIRED_STEPS,
  CheckCategory,
  ConsDeliverableCreate,
  ConsDeliverableUpdate,
  ConsEngagementCreate,
  ConsEngagementUpdate,
  ConsFeeStageCreate,
  ConsFeeStageUpdate,
  ConsRateCardSet,
  ConsReviewStepCreate,
  ConsTimesheetCreate,
  ConsTqAnswer,
  ConsTqClose,
  ConsTqCreate,
  ConsVariationCreate,
  REVIEW_STEP_LABEL,
  ReviewStepKind,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  consDeliverables,
  consEngagements,
  consFeeStages,
  consRateCards,
  consReviewSteps,
  consTimesheets,
  consTqs,
  consVariations,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet } from "../../lib/storage.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

/** Steps still missing before this deliverable may be ISSUED. */
function missingSteps(
  checkCategory: string,
  recorded: { kind: string }[],
): ReviewStepKind[] {
  const required =
    CHECK_CATEGORY_REQUIRED_STEPS[checkCategory as CheckCategory] ??
    CHECK_CATEGORY_REQUIRED_STEPS.CAT1;
  const have = new Set(recorded.map((s) => s.kind));
  return required.filter((k) => !have.has(k));
}

const engagementsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.select().from(consEngagements).orderBy(desc(consEngagements.updatedAt)),
  ),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(consEngagements)
        .where(eq(consEngagements.id, input.id));
      if (!row) return null;
      const deliverables = await ctx.db
        .select()
        .from(consDeliverables)
        .where(eq(consDeliverables.engagementId, input.id))
        .orderBy(asc(consDeliverables.code));
      const ids = deliverables.map((d) => d.id);
      const steps = ids.length
        ? await ctx.db
            .select()
            .from(consReviewSteps)
            .where(inArray(consReviewSteps.deliverableId, ids))
            .orderBy(asc(consReviewSteps.at))
        : [];
      const tqs = await ctx.db
        .select()
        .from(consTqs)
        .where(eq(consTqs.engagementId, input.id))
        .orderBy(asc(consTqs.code));
      const feeStages = await ctx.db
        .select()
        .from(consFeeStages)
        .where(eq(consFeeStages.engagementId, input.id))
        .orderBy(asc(consFeeStages.createdAt));
      const variations = await ctx.db
        .select()
        .from(consVariations)
        .where(eq(consVariations.engagementId, input.id))
        .orderBy(asc(consVariations.code));
      const timesheets = await ctx.db
        .select()
        .from(consTimesheets)
        .where(eq(consTimesheets.engagementId, input.id))
        .orderBy(desc(consTimesheets.date), desc(consTimesheets.createdAt));
      const invoicedPaise = feeStages
        .filter((s) => s.status === "INVOICED")
        .reduce((a, s) => a + (s.amountPaise ?? 0), 0);
      const timeValuePaise = timesheets.reduce((a, t) => a + (t.valuePaise ?? 0), 0);
      // Fee position — agreed vs staged vs billable vs invoiced, plus time
      // booked and WIP (time value performed but not yet invoiced; case study §5.2).
      const feePosition = {
        agreedPaise: row.feeTotalPaise ?? 0,
        stagedPaise: feeStages.reduce((a, s) => a + (s.amountPaise ?? 0), 0),
        billablePaise: feeStages
          .filter((s) => s.status === "BILLABLE")
          .reduce((a, s) => a + (s.amountPaise ?? 0), 0),
        invoicedPaise,
        hoursBooked: timesheets.reduce((a, t) => a + (t.hours ?? 0), 0),
        timeValuePaise,
        wipPaise: Math.max(0, timeValuePaise - invoicedPaise),
      };
      return {
        ...row,
        deliverables: deliverables.map((d) => ({
          ...d,
          chain: steps.filter((s) => s.deliverableId === d.id),
          missing: d.status === "DRAFT" ? missingSteps(d.checkCategory, steps.filter((s) => s.deliverableId === d.id)) : [],
        })),
        tqs,
        feeStages,
        variations,
        timesheets,
        feePosition,
        // Built-in PDF export — download URL once the worker has rendered it.
        pdfUrl:
          row.pdfStatus === "READY" && row.pdfKey
            ? await presignedGet(row.pdfKey).catch(() => null)
            : null,
      };
    }),

  /** Export the engagement register as a PDF (worker render_pdf → WeasyPrint → S3). */
  exportPdf: manage
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(consEngagements)
        .where(eq(consEngagements.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      // Re-exports render a fresh snapshot — clear READY so the worker re-runs.
      await ctx.db
        .update(consEngagements)
        .set({ pdfStatus: "PENDING", pdfKey: null, updatedAt: new Date() })
        .where(eq(consEngagements.id, input.id));
      await enqueueJob(
        "render_pdf",
        { target: "engagement_register", id: input.id, firm: await firmPayload(ctx.db) },
        ctx.requestId,
      );
      await writeAudit(ctx.db, { entity: "cons_engagement", entityId: input.id, action: "PDF_REQUEST", actorId: ctx.user.id });
      return { ok: true };
    }),

  create: manage.input(ConsEngagementCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(consEngagements).values(input).returning();
    await writeAudit(ctx.db, { entity: "cons_engagement", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: manage.input(ConsEngagementUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const [row] = await ctx.db
      .update(consEngagements)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(consEngagements.id, id))
      .returning();
    await writeAudit(ctx.db, { entity: "cons_engagement", entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consEngagements).where(eq(consEngagements.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_engagement", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

const deliverablesRouter = router({
  listByEngagement: protectedProcedure
    .input(z.object({ engagementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consDeliverables)
        .where(eq(consDeliverables.engagementId, input.engagementId))
        .orderBy(asc(consDeliverables.code)),
    ),

  create: manage.input(ConsDeliverableCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(consDeliverables)
      // The author is the chain's implicit ORIGINATE step (checker ≠ author).
      .values({ ...input, originatedBy: ctx.user.id })
      .returning();
    await writeAudit(ctx.db, { entity: "cons_deliverable", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: manage.input(ConsDeliverableUpdate).mutation(async ({ ctx, input }) => {
    const { id, status, ...rest } = input;

    // Reliance gate: a deliverable may only be ISSUED once the sign-off chain
    // required by its check category is complete (case study §3.2).
    if (status === "ISSUED") {
      const [d] = await ctx.db.select().from(consDeliverables).where(eq(consDeliverables.id, id));
      if (!d) throw new TRPCError({ code: "NOT_FOUND" });
      const steps = await ctx.db
        .select()
        .from(consReviewSteps)
        .where(eq(consReviewSteps.deliverableId, id));
      const missing = missingSteps(d.checkCategory, steps);
      if (missing.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot issue ${d.code}: the ${d.checkCategory} sign-off chain is incomplete — missing ${missing
            .map((k) => REVIEW_STEP_LABEL[k].toLowerCase())
            .join(", ")}.`,
        });
      }
    }

    const [row] = await ctx.db
      .update(consDeliverables)
      .set({
        ...rest,
        ...(status
          ? { status, ...(status === "ISSUED" ? { issuedAt: new Date() } : {}) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(consDeliverables.id, id))
      .returning();
    await writeAudit(ctx.db, { entity: "cons_deliverable", entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });

    // Billing trigger (Phase 2) — issue fires the linked fee stages BILLABLE.
    if (status === "ISSUED") {
      const fired = await ctx.db
        .update(consFeeStages)
        .set({ status: "BILLABLE", billableAt: new Date(), updatedAt: new Date() })
        .where(and(eq(consFeeStages.deliverableId, id), eq(consFeeStages.status, "PENDING")))
        .returning();
      for (const s of fired)
        await writeAudit(ctx.db, { entity: "cons_fee_stage", entityId: s.id, action: "UPDATE", actorId: ctx.user.id, after: s });
    }
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consDeliverables).where(eq(consDeliverables.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_deliverable", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

const reviewsRouter = router({
  listByDeliverable: protectedProcedure
    .input(z.object({ deliverableId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consReviewSteps)
        .where(eq(consReviewSteps.deliverableId, input.deliverableId))
        .orderBy(asc(consReviewSteps.at)),
    ),

  /**
   * Record a sign-off step. Server-enforced rules (case study §3.1):
   * - only DRAFT deliverables accept steps (issued work is already relied on)
   * - one step per kind — the chain is serial, not a vote
   * - CHECK must be independent: checker ≠ author
   * - VERIFY (proof check) must be independent of both author and checker
   * - APPROVE is the signing act; grade thresholds arrive with the grade layer
   */
  record: manage.input(ConsReviewStepCreate).mutation(async ({ ctx, input }) => {
    const [d] = await ctx.db
      .select()
      .from(consDeliverables)
      .where(eq(consDeliverables.id, input.deliverableId));
    if (!d) throw new TRPCError({ code: "NOT_FOUND" });
    if (d.status !== "DRAFT")
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `${d.code} is ${d.status} — sign-off steps can only be recorded on drafts.`,
      });

    const steps = await ctx.db
      .select()
      .from(consReviewSteps)
      .where(eq(consReviewSteps.deliverableId, input.deliverableId));
    if (steps.some((s) => s.kind === input.kind))
      throw new TRPCError({
        code: "CONFLICT",
        message: `${REVIEW_STEP_LABEL[input.kind]} is already recorded for ${d.code}.`,
      });

    if (input.kind === "CHECK" && d.originatedBy && d.originatedBy === ctx.user.id)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "The independent check cannot be recorded by the deliverable's author.",
      });
    if (input.kind === "VERIFY") {
      const checker = steps.find((s) => s.kind === "CHECK");
      if ((d.originatedBy && d.originatedBy === ctx.user.id) || checker?.userId === ctx.user.id)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "The proof check must be independent of both the author and the checker.",
        });
    }

    const [row] = await ctx.db
      .insert(consReviewSteps)
      .values({
        deliverableId: input.deliverableId,
        kind: input.kind,
        userId: ctx.user.id,
        // Snapshot the name — the EoR record must survive user changes.
        userName: ctx.user.fullName,
        note: input.note,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "cons_review_step", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),
});

const tqsRouter = router({
  listByEngagement: protectedProcedure
    .input(z.object({ engagementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consTqs)
        .where(eq(consTqs.engagementId, input.engagementId))
        .orderBy(asc(consTqs.code)),
    ),

  raise: manage.input(ConsTqCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(consTqs)
      .values({ ...input, raisedBy: ctx.user.id })
      .returning();
    await writeAudit(ctx.db, { entity: "cons_tq", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  answer: manage.input(ConsTqAnswer).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(consTqs)
      .set({ answer: input.answer, status: "ANSWERED", answeredAt: new Date(), updatedAt: new Date() })
      .where(eq(consTqs.id, input.id))
      .returning();
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await writeAudit(ctx.db, { entity: "cons_tq", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row;
  }),

  /** Closing requires closure evidence — the dated trail is the dispute record. */
  close: manage.input(ConsTqClose).mutation(async ({ ctx, input }) => {
    const [tq] = await ctx.db.select().from(consTqs).where(eq(consTqs.id, input.id));
    if (!tq) throw new TRPCError({ code: "NOT_FOUND" });
    if (tq.status === "OPEN")
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `${tq.code} has no recorded answer — answer it before closing.`,
      });
    const [row] = await ctx.db
      .update(consTqs)
      .set({ closureNote: input.closureNote, status: "CLOSED", closedAt: new Date(), updatedAt: new Date() })
      .where(eq(consTqs.id, input.id))
      .returning();
    await writeAudit(ctx.db, { entity: "cons_tq", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consTqs).where(eq(consTqs.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_tq", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

const feeStagesRouter = router({
  create: manage.input(ConsFeeStageCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(consFeeStages).values(input).returning();
    await writeAudit(ctx.db, { entity: "cons_fee_stage", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: manage.input(ConsFeeStageUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const [row] = await ctx.db
      .update(consFeeStages)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(consFeeStages.id, id))
      .returning();
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await writeAudit(ctx.db, { entity: "cons_fee_stage", entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row;
  }),

  /** Record the invoice raised for a BILLABLE stage (invoice integration follows). */
  markInvoiced: manage
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [stage] = await ctx.db.select().from(consFeeStages).where(eq(consFeeStages.id, input.id));
      if (!stage) throw new TRPCError({ code: "NOT_FOUND" });
      if (stage.status !== "BILLABLE")
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            stage.status === "INVOICED"
              ? "This stage is already invoiced."
              : "The stage is not billable yet — it turns billable when its linked deliverable is issued.",
        });
      const [row] = await ctx.db
        .update(consFeeStages)
        .set({ status: "INVOICED", invoicedAt: new Date(), updatedAt: new Date() })
        .where(eq(consFeeStages.id, input.id))
        .returning();
      await writeAudit(ctx.db, { entity: "cons_fee_stage", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, after: row });
      return row!;
    }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consFeeStages).where(eq(consFeeStages.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_fee_stage", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

const rateCardsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.select().from(consRateCards).orderBy(asc(consRateCards.grade)),
  ),

  /** Upsert the firm rate card (paise/hour per grade). */
  set: manage.input(ConsRateCardSet).mutation(async ({ ctx, input }) => {
    for (const r of input.rates) {
      await ctx.db
        .insert(consRateCards)
        .values({ grade: r.grade, ratePaise: r.ratePaise })
        .onConflictDoUpdate({
          target: consRateCards.grade,
          set: { ratePaise: r.ratePaise, updatedAt: new Date() },
        });
    }
    await writeAudit(ctx.db, { entity: "cons_rate_card", action: "UPDATE", actorId: ctx.user.id, after: input.rates });
    return ctx.db.select().from(consRateCards).orderBy(asc(consRateCards.grade));
  }),
});

const timesheetsRouter = router({
  listByEngagement: protectedProcedure
    .input(z.object({ engagementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consTimesheets)
        .where(eq(consTimesheets.engagementId, input.engagementId))
        .orderBy(desc(consTimesheets.date)),
    ),

  /** Log hours — value is snapshotted at the grade rate then in force. */
  log: manage.input(ConsTimesheetCreate).mutation(async ({ ctx, input }) => {
    const [rate] = await ctx.db
      .select()
      .from(consRateCards)
      .where(eq(consRateCards.grade, input.grade));
    const valuePaise = Math.round((rate?.ratePaise ?? 0) * input.hours);
    const [row] = await ctx.db
      .insert(consTimesheets)
      .values({
        engagementId: input.engagementId,
        deliverableId: input.deliverableId,
        date: input.date,
        grade: input.grade,
        hours: input.hours,
        valuePaise,
        note: input.note,
        userId: ctx.user.id,
        userName: ctx.user.fullName,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "cons_timesheet", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consTimesheets).where(eq(consTimesheets.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_timesheet", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

const variationsRouter = router({
  create: manage.input(ConsVariationCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(consVariations).values(input).returning();
    await writeAudit(ctx.db, { entity: "cons_variation", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  /**
   * Client approval of the additional service — the fee-defence moment (case
   * study §5.4). Appends a BILLABLE fee stage carrying the variation amount.
   */
  approve: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [v] = await ctx.db.select().from(consVariations).where(eq(consVariations.id, input.id));
    if (!v) throw new TRPCError({ code: "NOT_FOUND" });
    if (v.status !== "PROPOSED")
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `${v.code} is already ${v.status.toLowerCase()}.`,
      });
    const [stage] = await ctx.db
      .insert(consFeeStages)
      .values({
        engagementId: v.engagementId,
        label: `Variation ${v.code} — ${v.title}`,
        amountPaise: v.amountPaise,
        status: "BILLABLE",
        billableAt: new Date(),
      })
      .returning();
    const [row] = await ctx.db
      .update(consVariations)
      .set({ status: "APPROVED", approvedAt: new Date(), feeStageId: stage!.id, updatedAt: new Date() })
      .where(eq(consVariations.id, input.id))
      .returning();
    await writeAudit(ctx.db, { entity: "cons_variation", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, after: row });
    await writeAudit(ctx.db, { entity: "cons_fee_stage", entityId: stage!.id, action: "CREATE", actorId: ctx.user.id, after: stage });
    return row!;
  }),

  reject: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [v] = await ctx.db.select().from(consVariations).where(eq(consVariations.id, input.id));
    if (!v) throw new TRPCError({ code: "NOT_FOUND" });
    if (v.status !== "PROPOSED")
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `${v.code} is already ${v.status.toLowerCase()}.`,
      });
    const [row] = await ctx.db
      .update(consVariations)
      .set({ status: "REJECTED", updatedAt: new Date() })
      .where(eq(consVariations.id, input.id))
      .returning();
    await writeAudit(ctx.db, { entity: "cons_variation", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consVariations).where(eq(consVariations.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_variation", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

export const consultancyRouter = router({
  engagements: engagementsRouter,
  deliverables: deliverablesRouter,
  reviews: reviewsRouter,
  tqs: tqsRouter,
  feeStages: feeStagesRouter,
  rateCards: rateCardsRouter,
  timesheets: timesheetsRouter,
  variations: variationsRouter,
});
