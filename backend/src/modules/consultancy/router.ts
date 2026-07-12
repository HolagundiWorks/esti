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
  ConsAnalyticsPeriod,
  ConsFeeStageCreate,
  ConsFeeStageUpdate,
  ConsInputPackCreate,
  ConsInsuranceSet,
  ConsRateCardSet,
  ConsRelianceLetterCreate,
  ConsReviewStepCreate,
  ConsRiskCreate,
  ConsRiskUpdate,
  ConsTimesheetCreate,
  ConsTqAnswer,
  ConsTqClose,
  ConsTqCreate,
  ConsVariationCreate,
  REVIEW_STEP_LABEL,
  ReviewStepKind,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import {
  consDeliverables,
  consEngagements,
  consFeeStages,
  consInputPacks,
  consInsurance,
  consRateCards,
  consRelianceLetters,
  consReviewSteps,
  consRisks,
  consTimesheets,
  consTqs,
  consVariations,
} from "../../db/schema.js";
import {
  askConsultancyIntelligence,
  emoiReviewInputPack,
} from "../../lib/ai/consultancy-intelligence.js";
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
      const risks = await ctx.db
        .select()
        .from(consRisks)
        .where(eq(consRisks.engagementId, input.id))
        .orderBy(desc(consRisks.createdAt));
      const inputPacks = await ctx.db
        .select()
        .from(consInputPacks)
        .where(eq(consInputPacks.engagementId, input.id))
        .orderBy(asc(consInputPacks.createdAt));
      const relianceLetters = await ctx.db
        .select()
        .from(consRelianceLetters)
        .where(eq(consRelianceLetters.engagementId, input.id))
        .orderBy(asc(consRelianceLetters.issuedOn));
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
        risks,
        inputPacks,
        relianceLetters,
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
      // EmOI input gate (Phase 3): an unvalidated input pack is a hold point —
      // nothing built on unvalidated assumptions leaves the office.
      const held = await ctx.db
        .select({ title: consInputPacks.title })
        .from(consInputPacks)
        .where(
          and(
            eq(consInputPacks.engagementId, d.engagementId),
            eq(consInputPacks.status, "RECEIVED"),
          ),
        );
      if (held.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot issue ${d.code}: ${held.length} input pack${held.length > 1 ? "s" : ""} awaiting validation (${held
            .map((h) => h.title)
            .slice(0, 3)
            .join(", ")}) — validate or reject them first.`,
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

  /** Upsert the firm rate card (paise/hour + weekly capacity per grade). */
  set: manage.input(ConsRateCardSet).mutation(async ({ ctx, input }) => {
    for (const r of input.rates) {
      await ctx.db
        .insert(consRateCards)
        .values({
          grade: r.grade,
          ratePaise: r.ratePaise,
          capacityHoursWeek: r.capacityHoursWeek ?? 0,
        })
        .onConflictDoUpdate({
          target: consRateCards.grade,
          set: {
            ratePaise: r.ratePaise,
            ...(r.capacityHoursWeek !== undefined
              ? { capacityHoursWeek: r.capacityHoursWeek }
              : {}),
            updatedAt: new Date(),
          },
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

const analyticsRouter = router({
  /**
   * Firm-level commercial health for a period (case study §5.3).
   * Utilisation = hours booked ÷ capacity (owner-entered hours/week per grade
   * on the rate card × weeks in the period). Realisation = invoiced ÷ time
   * value booked. WIP = time value not yet covered by invoiced stages, summed
   * per engagement.
   */
  summary: protectedProcedure.input(ConsAnalyticsPeriod).query(async ({ ctx, input }) => {
    const sheets = await ctx.db
      .select()
      .from(consTimesheets)
      .where(and(gte(consTimesheets.date, input.from), lte(consTimesheets.date, input.to)));
    const rates = await ctx.db.select().from(consRateCards);
    const stages = await ctx.db.select().from(consFeeStages);

    const weeks =
      Math.max(
        1,
        Math.round(
          (new Date(input.to).getTime() - new Date(input.from).getTime()) / 86400000,
        ) + 1,
      ) / 7;

    const byGrade = rates
      .map((r) => {
        const graded = sheets.filter((s) => s.grade === r.grade);
        const hours = graded.reduce((a, s) => a + (s.hours ?? 0), 0);
        const capacity = (r.capacityHoursWeek ?? 0) * weeks;
        return {
          grade: r.grade,
          hours,
          valuePaise: graded.reduce((a, s) => a + (s.valuePaise ?? 0), 0),
          capacityHours: capacity,
          utilisation: capacity > 0 ? hours / capacity : null,
        };
      })
      .filter((g) => g.hours > 0 || g.capacityHours > 0);

    const hoursBooked = sheets.reduce((a, s) => a + (s.hours ?? 0), 0);
    const timeValuePaise = sheets.reduce((a, s) => a + (s.valuePaise ?? 0), 0);
    const invoicedPaise = stages
      .filter((s) => s.status === "INVOICED")
      .reduce((a, s) => a + (s.amountPaise ?? 0), 0);
    const billablePaise = stages
      .filter((s) => s.status === "BILLABLE")
      .reduce((a, s) => a + (s.amountPaise ?? 0), 0);

    // WIP per engagement (all-time; floored at zero), summed across the firm.
    const allSheets = await ctx.db.select().from(consTimesheets);
    const engIds = [...new Set(allSheets.map((s) => s.engagementId))];
    let wipPaise = 0;
    for (const id of engIds) {
      const tv = allSheets
        .filter((s) => s.engagementId === id)
        .reduce((a, s) => a + (s.valuePaise ?? 0), 0);
      const inv = stages
        .filter((s) => s.engagementId === id && s.status === "INVOICED")
        .reduce((a, s) => a + (s.amountPaise ?? 0), 0);
      wipPaise += Math.max(0, tv - inv);
    }

    return {
      period: input,
      hoursBooked,
      timeValuePaise,
      billablePaise,
      invoicedPaise,
      wipPaise,
      realisation: timeValuePaise > 0 ? invoicedPaise / timeValuePaise : null,
      byGrade,
    };
  }),
});

const risksRouter = router({
  /** Practice-level risks (no engagement) — engagement risks ride on engagements.get. */
  listPractice: protectedProcedure.query(({ ctx }) =>
    ctx.db.select().from(consRisks).where(isNull(consRisks.engagementId)).orderBy(desc(consRisks.createdAt)),
  ),

  create: manage.input(ConsRiskCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(consRisks)
      .values({
        ...input,
        residualLikelihood: input.residualLikelihood ?? input.likelihood,
        residualImpact: input.residualImpact ?? input.impact,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "cons_risk", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: manage.input(ConsRiskUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const [row] = await ctx.db
      .update(consRisks)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(consRisks.id, id))
      .returning();
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await writeAudit(ctx.db, { entity: "cons_risk", entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consRisks).where(eq(consRisks.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_risk", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

const insuranceRouter = router({
  /** The firm PI policy (single record; claims-made). */
  get: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db.select().from(consInsurance).limit(1);
    return row ?? null;
  }),

  set: manage.input(ConsInsuranceSet).mutation(async ({ ctx, input }) => {
    const [existing] = await ctx.db.select().from(consInsurance).limit(1);
    const [row] = existing
      ? await ctx.db
          .update(consInsurance)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(consInsurance.id, existing.id))
          .returning()
      : await ctx.db.insert(consInsurance).values(input).returning();
    await writeAudit(ctx.db, { entity: "cons_insurance", entityId: row!.id, action: existing ? "UPDATE" : "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),
});

const relianceLettersRouter = router({
  create: manage.input(ConsRelianceLetterCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(consRelianceLetters).values(input).returning();
    await writeAudit(ctx.db, { entity: "cons_reliance_letter", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consRelianceLetters).where(eq(consRelianceLetters.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_reliance_letter", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

const inputPacksRouter = router({
  record: manage.input(ConsInputPackCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(consInputPacks).values(input).returning();
    await writeAudit(ctx.db, { entity: "cons_input_pack", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  /** Named validation — lifts the hold point. Rejection also lifts it (the pack is unusable). */
  setStatus: manage
    .input(z.object({ id: z.string().uuid(), status: z.enum(["VALIDATED", "REJECTED"]), note: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [pack] = await ctx.db.select().from(consInputPacks).where(eq(consInputPacks.id, input.id));
      if (!pack) throw new TRPCError({ code: "NOT_FOUND" });
      if (pack.status !== "RECEIVED")
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${pack.title} is already ${pack.status.toLowerCase()}.`,
        });
      const [row] = await ctx.db
        .update(consInputPacks)
        .set({
          status: input.status,
          note: input.note,
          validatedBy: ctx.user.id,
          validatedByName: ctx.user.fullName,
          validatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(consInputPacks.id, input.id))
        .returning();
      await writeAudit(ctx.db, { entity: "cons_input_pack", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, after: row });
      return row!;
    }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consInputPacks).where(eq(consInputPacks.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_input_pack", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),

  /**
   * EmOI-assisted review (Phase 4) — a validation checklist recommendation for
   * the named human validator. The recommendation never validates anything.
   */
  emoiReview: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [pack] = await ctx.db.select().from(consInputPacks).where(eq(consInputPacks.id, input.id));
      if (!pack) throw new TRPCError({ code: "NOT_FOUND" });
      const [eng] = await ctx.db
        .select({ title: consEngagements.title })
        .from(consEngagements)
        .where(eq(consEngagements.id, pack.engagementId));
      return emoiReviewInputPack(
        ctx.db,
        { title: pack.title, kind: pack.kind, source: pack.source },
        eng?.title ?? "engagement",
      );
    }),
});

const intelligenceRouter = router({
  /**
   * Phase 4 — the internal agent: answers grounded ONLY in the validated firm
   * record (engagements, chains, TQs, fees, risks, packs). Read-only.
   */
  ask: protectedProcedure
    .input(z.object({ question: z.string().min(3).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const res = await askConsultancyIntelligence(ctx.db, input.question);
      await writeAudit(ctx.db, {
        entity: "cons_intelligence",
        action: "ASK",
        actorId: ctx.user.id,
        after: { question: input.question, provider: res.provider, model: res.model },
      });
      return res;
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
  analytics: analyticsRouter,
  risks: risksRouter,
  insurance: insuranceRouter,
  relianceLetters: relianceLettersRouter,
  inputPacks: inputPacksRouter,
  intelligence: intelligenceRouter,
});
