/**
 * AORMS-Consultancy — engineering consultancy spine.
 * Phase 0 "Living record": engagements + the deliverable register.
 * Phase 1 "Reliance engine": the serial sign-off chain (CHECK → APPROVE →
 * VERIFY per check category; checker ≠ author enforced server-side; ISSUED is
 * gated on the chain) and the TQ register with closure evidence.
 * Design: docs/esti/AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md.
 */
import {
  missingReviewSteps,
  reviewStepIndependenceError,
  mayIssueDeliverable,
  computeFeePosition,
  feeStageFinancialsLocked,
  canAdvanceFeeStage,
  canRaiseCheckCategory,
  canTransitionDeliverable,
  canDecideVariation,
  variationDeletionBlocked,
  timesheetValuePaise,
  sumFirmWip,
  realisationRatio,
  rankPrecedentEngagements,
  buildDeliverableLineage,
  buildCapacityOutlook,
  buildMdrDeliverableCode,
  capacityOutlookAlerts,
  isValidMdrDeliverableCode,
  nextMdrSequence,
  CONSULTANCY_SCOPE_TEMPLATES,
  can,
  ConsBriefSet,
  ConsPhaseCreate,
  ConsultancyType,
  EngagementModel,
  EngineeringDiscipline,
  ConsDeliverableCreate,
  ConsDeliverableUpdate,
  ConsIssueTransmittalCreate,
  ConsEngagementCreate,
  ConsEngagementUpdate,
  ConsEnquiryCreate,
  ConsEnquiryScore,
  ConsEnquiryDecide,
  ConsEnquiryConvert,
  canAdvanceEnquiryStatus,
  canConvertEnquiry,
  canDecideGoNoGo,
  canRecordIssueTransmittal,
  issueClassToTransmittalPurpose,
  canRaiseFeeStageStudioInvoice,
  goNoGoRecommendation,
  ConsAnalyticsPeriod,
  ConsCapacityOutlookInput,
  ConsFeeStageCreate,
  ConsFeeStageUpdate,
  ConsFieldReportCreate,
  ConsInputPackCreate,
  ConsCalcPackageCreate,
  ConsCalcPackageUpdate,
  canAdvanceCalcPackage,
  ConsInsuranceSet,
  ConsRateCardSet,
  ConsRelianceLetterCreate,
  ConsRelianceLetterRevoke,
  ConsReviewCommentClose,
  ConsReviewCommentCreate,
  ConsReviewStepCreate,
  ConsRiskCreate,
  ConsRiskUpdate,
  ConsTimesheetCreate,
  ConsTqAnswer,
  ConsTqClose,
  ConsTqCreate,
  ConsVariationCreate,
  DELIVERABLE_STATUS_LABEL,
  REVIEW_STEP_LABEL,
  istToday,
  relianceLetterStatus,
  ReviewStepKind,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne } from "drizzle-orm";
import { z } from "zod";
import {
  clients,
  consContractReviews,
  consDeliverables,
  consEngagements,
  consEnquiries,
  consFeeStages,
  consFieldReports,
  consInputPacks,
  consCalcPackages,
  consInsurance,
  consLessons,
  consMoms,
  consNcs,
  consPhases,
  consRateCards,
  consRelianceLetters,
  consReviewComments,
  consReviewSteps,
  consRisks,
  consTimesheets,
  consTqs,
  consVariations,
  consWipReviews,
  invoices,
  transmittalItems,
  transmittals,
} from "../../db/schema.js";
import {
  askConsultancyIntelligence,
  eomsReviewInputPack,
} from "../../lib/ai/consultancy-intelligence.js";
import type { DB } from "../../db/index.js";
import { writeAudit } from "../../lib/audit.js";
import { createStudioInvoice } from "../../lib/createInvoice.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { enqueueJob } from "../../lib/redis.js";
import { publishEntity } from "../../lib/sync/publish.js";
import { presignedGet } from "../../lib/storage.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";
import {
  contractReviewsRouter,
  lessonsRouter,
  momsRouter,
  ncsRouter,
  wipReviewsRouter,
} from "./closeout.js";

const manage = capabilityProcedure("write");
// Money is L2+ in this firm's permission model ("ASSOCIATE: no invoices/fees").
// Fee stages, rate cards, variation approvals and the commercial reads sit
// behind the finance capabilities, not the operational `write` — mirroring the
// invoice/estimate modules. `write` (associate+) still logs time and records the
// engineering sign-off chain; those are not financial acts.
const feesManage = capabilityProcedure("fees:manage");
const costApprove = capabilityProcedure("cost:approve");

/** Whether the caller may see rupee figures (fee position, rates, WIP). */
const seesMoney = (role: string | null | undefined) => can(role, "fees:manage");

/** Allocate next job number C-YY-NNN (SOP §2 — job register). */
async function allocateEngagementJobCode(db: DB): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(2);
  const existing = await db.select({ code: consEngagements.code }).from(consEngagements);
  const serial =
    existing
      .map((r) => /^C-\d{2}-(\d{3})$/.exec(r.code ?? "")?.[1])
      .filter(Boolean)
      .map(Number)
      .reduce((m, n) => Math.max(m, n!), 0) + 1;
  return `C-${yy}-${String(serial).padStart(3, "0")}`;
}

/** Allocate next enquiry ref EQ-YY-NNN. */
async function allocateEnquiryRef(db: DB): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(2);
  const existing = await db.select({ ref: consEnquiries.ref }).from(consEnquiries);
  const serial =
    existing
      .map((r) => /^EQ-\d{2}-(\d{3})$/.exec(r.ref)?.[1])
      .filter(Boolean)
      .map(Number)
      .reduce((m, n) => Math.max(m, n!), 0) + 1;
  return `EQ-${yy}-${String(serial).padStart(3, "0")}`;
}

/** Steps still missing before this deliverable may be ISSUED. */
function missingSteps(
  checkCategory: string,
  recorded: { kind: string }[],
): ReviewStepKind[] {
  return missingReviewSteps(checkCategory, recorded.map((s) => s.kind));
}

const engagementsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(consEngagements)
      .orderBy(desc(consEngagements.updatedAt));
    // Redact the agreed fee for callers without finance access.
    return seesMoney(ctx.user.role)
      ? rows
      : rows.map((r) => ({ ...r, feeTotalPaise: null }));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(consEngagements)
        .where(eq(consEngagements.id, input.id));
      if (!row) return null;
      const money = seesMoney(ctx.user.role);
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
      const crs = ids.length
        ? await ctx.db
            .select()
            .from(consReviewComments)
            .where(inArray(consReviewComments.deliverableId, ids))
            .orderBy(asc(consReviewComments.createdAt))
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
      const calcPackages = await ctx.db
        .select()
        .from(consCalcPackages)
        .where(eq(consCalcPackages.engagementId, input.id))
        .orderBy(asc(consCalcPackages.code));
      const relianceLetters = await ctx.db
        .select()
        .from(consRelianceLetters)
        .where(eq(consRelianceLetters.engagementId, input.id))
        .orderBy(asc(consRelianceLetters.issuedOn));
      const phases = await ctx.db
        .select()
        .from(consPhases)
        .where(eq(consPhases.engagementId, input.id))
        .orderBy(asc(consPhases.seq));
      const fieldReports = await ctx.db
        .select()
        .from(consFieldReports)
        .where(eq(consFieldReports.engagementId, input.id))
        .orderBy(desc(consFieldReports.reportNo));
      const timesheets = await ctx.db
        .select()
        .from(consTimesheets)
        .where(eq(consTimesheets.engagementId, input.id))
        .orderBy(desc(consTimesheets.date), desc(consTimesheets.createdAt));
      const [lessons, ncs, moms, wipReviews, contractReviews] = await Promise.all([
        ctx.db
          .select()
          .from(consLessons)
          .where(eq(consLessons.engagementId, input.id))
          .orderBy(desc(consLessons.createdAt)),
        ctx.db
          .select()
          .from(consNcs)
          .where(eq(consNcs.engagementId, input.id))
          .orderBy(asc(consNcs.code)),
        ctx.db
          .select()
          .from(consMoms)
          .where(eq(consMoms.engagementId, input.id))
          .orderBy(desc(consMoms.meetingDate), desc(consMoms.createdAt)),
        money
          ? ctx.db
              .select()
              .from(consWipReviews)
              .where(eq(consWipReviews.engagementId, input.id))
              .orderBy(desc(consWipReviews.reviewedAt))
          : Promise.resolve([]),
        ctx.db
          .select()
          .from(consContractReviews)
          .where(eq(consContractReviews.engagementId, input.id))
          .orderBy(desc(consContractReviews.reviewDate)),
      ]);
      // Fee position — agreed vs staged vs billable vs invoiced, plus time
      // booked and WIP (time value performed but not yet invoiced; case study §5.2).
      // Pure helper lives in @esti/contracts so P9.V can unit-test the money math.
      const feePosition = computeFeePosition({
        agreedPaise: row.feeTotalPaise,
        stages: feeStages,
        timesheets,
      });
      const trnIds = deliverables
        .map((d) => d.transmittalId)
        .filter((id): id is string => Boolean(id));
      const issueTrns = trnIds.length
        ? await ctx.db.select().from(transmittals).where(inArray(transmittals.id, trnIds))
        : [];
      const trnById = new Map(issueTrns.map((t) => [t.id, t]));
      const invIds = feeStages
        .map((f) => f.invoiceId)
        .filter((id): id is string => Boolean(id));
      const studioInvs = invIds.length
        ? await ctx.db
            .select({
              id: invoices.id,
              ref: invoices.ref,
              status: invoices.status,
              pdfStatus: invoices.pdfStatus,
              netReceivablePaise: invoices.netReceivablePaise,
            })
            .from(invoices)
            .where(inArray(invoices.id, invIds))
        : [];
      const invById = new Map(studioInvs.map((i) => [i.id, i]));
      return {
        ...row,
        // Redact rupee figures for non-finance callers (money = L2+).
        feeTotalPaise: money ? row.feeTotalPaise : null,
        deliverables: deliverables.map((d) => {
          const trn = d.transmittalId ? trnById.get(d.transmittalId) : undefined;
          return {
            ...d,
            chain: steps.filter((s) => s.deliverableId === d.id),
            missing: d.status === "DRAFT" ? missingSteps(d.checkCategory, steps.filter((s) => s.deliverableId === d.id)) : [],
            crs: crs.filter((c) => c.deliverableId === d.id),
            crsOpen: crs.filter((c) => c.deliverableId === d.id && c.status === "OPEN").length,
            issueTransmittal: trn
              ? {
                  id: trn.id,
                  ref: trn.ref,
                  recipient: trn.recipient,
                  dateIssued: trn.dateIssued,
                  acknowledgedAt: trn.acknowledgedAt,
                  acknowledgedBy: trn.acknowledgedBy,
                }
              : null,
          };
        }),
        tqs,
        feeStages: money
          ? feeStages.map((f) => {
              const inv = f.invoiceId ? invById.get(f.invoiceId) : undefined;
              return {
                ...f,
                studioInvoice: inv
                  ? {
                      id: inv.id,
                      ref: inv.ref,
                      status: inv.status,
                      pdfStatus: inv.pdfStatus,
                      netReceivablePaise: inv.netReceivablePaise,
                    }
                  : null,
              };
            })
          : [],
        variations: money
          ? variations
          : variations.map((v) => ({ ...v, amountPaise: null })),
        risks,
        inputPacks,
        calcPackages,
        // Derive LIVE / EXPIRED / REVOKED so the register and UI read consistently.
        relianceLetters: relianceLetters.map((l) => ({
          ...l,
          status: relianceLetterStatus(l, istToday()),
        })),
        phases,
        fieldReports,
        timesheets: money
          ? timesheets
          : timesheets.map((t) => ({ ...t, valuePaise: null })),
        feePosition: money ? feePosition : null,
        lessons,
        ncs,
        moms,
        wipReviews: money ? wipReviews : [],
        contractReviews,
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
    // The agreed fee is finance-only; a non-finance creator sets everything else
    // and a partner fills the fee later.
    if (!seesMoney(ctx.user.role)) input = { ...input, feeTotalPaise: undefined };
    // Job number (SOP §2): C-YY-serial, allocated at creation — the root the
    // timesheet bookings and document numbers hang off.
    const code = await allocateEngagementJobCode(ctx.db);
    const [row] = await ctx.db
      .insert(consEngagements)
      .values({ ...input, code })
      .returning();
    // Typed scope: the consultancy pattern seeds the engagement's phases —
    // consultancy work is typed, not generalised (unlike architecture's one
    // COA ladder). Fully editable afterwards.
    if (input.consultancyType) {
      const template = CONSULTANCY_SCOPE_TEMPLATES[input.consultancyType as ConsultancyType];
      if (template) {
        await ctx.db.insert(consPhases).values(
          template.map((p, i) => ({
            engagementId: row!.id,
            seq: i,
            name: p.name,
            scope: [...p.scope],
          })),
        );
      }
    }
    await writeAudit(ctx.db, { entity: "cons_engagement", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: manage.input(ConsEngagementUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    // Non-finance callers cannot rewrite the agreed fee (undefined = unchanged).
    if (!seesMoney(ctx.user.role)) rest.feeTotalPaise = undefined;
    const [row] = await ctx.db
      .update(consEngagements)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(consEngagements.id, id))
      .returning();
    await writeAudit(ctx.db, { entity: "cons_engagement", entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  /** Store the typed project brief — the design-basis parameter set. */
  setBrief: manage.input(ConsBriefSet).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(consEngagements)
      .set({ brief: input.brief, updatedAt: new Date() })
      .where(eq(consEngagements.id, input.engagementId))
      .returning();
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await writeAudit(ctx.db, { entity: "cons_engagement", entityId: input.engagementId, action: "UPDATE", actorId: ctx.user.id, after: { brief: input.brief } });
    return row;
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
    const [eng] = await ctx.db
      .select({ id: consEngagements.id, code: consEngagements.code })
      .from(consEngagements)
      .where(eq(consEngagements.id, input.engagementId));
    if (!eng) throw new TRPCError({ code: "NOT_FOUND", message: "Engagement not found." });
    const jobRoot = (eng.code ?? "").trim().toUpperCase();
    if (!jobRoot) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This engagement has no job number — reopen or recreate it before registering deliverables.",
      });
    }

    const siblings = await ctx.db
      .select({ code: consDeliverables.code })
      .from(consDeliverables)
      .where(eq(consDeliverables.engagementId, input.engagementId));
    const existingCodes = siblings.map((s) => s.code);

    let code: string;
    if (input.docType) {
      const seq = nextMdrSequence(existingCodes, jobRoot, input.docType);
      code = buildMdrDeliverableCode({ jobRoot, docType: input.docType, sequence: seq });
    } else {
      const candidate = (input.code ?? "").trim().toUpperCase();
      if (!isValidMdrDeliverableCode(candidate, jobRoot)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Register code must follow MDR form ${jobRoot}-TYPE-NNN (e.g. ${jobRoot}-CAL-001). Revision stays metadata.`,
        });
      }
      code = candidate;
    }

    if (existingCodes.some((c) => c.toUpperCase() === code)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `${code} is already on this engagement's register.`,
      });
    }

    const { docType: _docType, code: _ignored, ...rest } = input;
    const [row] = await ctx.db
      .insert(consDeliverables)
      // The author is the chain's implicit ORIGINATE step (checker ≠ author).
      .values({ ...rest, code, originatedBy: ctx.user.id })
      .returning();
    await writeAudit(ctx.db, { entity: "cons_deliverable", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: manage.input(ConsDeliverableUpdate).mutation(async ({ ctx, input }) => {
    const { id, status, docType: _docType, ...rest } = input;
    const [d] = await ctx.db.select().from(consDeliverables).where(eq(consDeliverables.id, id));
    if (!d) throw new TRPCError({ code: "NOT_FOUND" });

    if (rest.code != null) {
      const [eng] = await ctx.db
        .select({ code: consEngagements.code })
        .from(consEngagements)
        .where(eq(consEngagements.id, d.engagementId));
      const jobRoot = (eng?.code ?? "").trim().toUpperCase();
      const candidate = rest.code.trim().toUpperCase();
      if (!jobRoot || !isValidMdrDeliverableCode(candidate, jobRoot)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Register code must follow MDR form ${jobRoot || "C-YY-NNN"}-TYPE-NNN.`,
        });
      }
      const siblings = await ctx.db
        .select({ id: consDeliverables.id, code: consDeliverables.code })
        .from(consDeliverables)
        .where(eq(consDeliverables.engagementId, d.engagementId));
      if (siblings.some((s) => s.id !== id && s.code.toUpperCase() === candidate)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${candidate} is already on this engagement's register.`,
        });
      }
      rest.code = candidate;
    }

    const bodyEdits = (Object.keys(rest) as (keyof typeof rest)[]).filter(
      (k) => rest[k] !== undefined,
    );

    // Issued content is immutable — the document number, title and revision sit
    // on a relied-upon register. Edits re-enter only through startRevision (which
    // resets to DRAFT and clears the chain). Status-only transitions still pass.
    if (d.status !== "DRAFT" && bodyEdits.length > 0)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `${d.code} is ${(DELIVERABLE_STATUS_LABEL as Record<string, string>)[d.status] ?? d.status} — issued content is immutable; start a new revision to change it.`,
      });

    // Check category may be raised (more rigour) but never lowered.
    if (rest.checkCategory && !canRaiseCheckCategory(d.checkCategory, rest.checkCategory))
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Check category cannot be downgraded from ${d.checkCategory} to ${rest.checkCategory} — a lower category means less review.`,
      });

    // Forward-only status machine (blocks ISSUED→DRAFT reverts and re-issue).
    if (status && status !== d.status) {
      if (!canTransitionDeliverable(d.status, status))
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${d.code}: cannot move from ${d.status} to ${status}.`,
        });
    }
    if (status === "ISSUED" && d.status === "ISSUED")
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: `${d.code} is already issued.` });

    // Issuing runs the three reliance gates, the status write, and the billing
    // fire atomically — no window for a comment to be reopened or a chain step
    // deleted between the check and the commit (TOCTOU).
    if (status === "ISSUED") {
      return ctx.db.transaction(async (tx) => {
        const steps = await tx
          .select()
          .from(consReviewSteps)
          .where(eq(consReviewSteps.deliverableId, id));
        const openComments = await tx
          .select({ reviewer: consReviewComments.reviewer })
          .from(consReviewComments)
          .where(
            and(eq(consReviewComments.deliverableId, id), eq(consReviewComments.status, "OPEN")),
          );
        const held = await tx
          .select({ title: consInputPacks.title })
          .from(consInputPacks)
          .where(
            and(eq(consInputPacks.engagementId, d.engagementId), eq(consInputPacks.status, "RECEIVED")),
          );
        const missing = missingSteps(d.checkCategory, steps);
        const gate = mayIssueDeliverable({
          checkCategory: d.checkCategory,
          recordedKinds: steps.map((s) => s.kind),
          openCrsCount: openComments.length,
          receivedInputPackCount: held.length,
        });
        if (!gate.ok) {
          if (missing.length > 0)
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Cannot issue ${d.code}: the ${d.checkCategory} sign-off chain is incomplete — missing ${missing
                .map((k) => REVIEW_STEP_LABEL[k].toLowerCase())
                .join(", ")}.`,
            });
          if (openComments.length > 0)
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Cannot issue ${d.code}: ${openComments.length} review comment${openComments.length > 1 ? "s" : ""} open on the CRS — respond and close them first.`,
            });
          if (held.length > 0)
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Cannot issue ${d.code}: ${held.length} input pack${held.length > 1 ? "s" : ""} awaiting validation (${held
                .map((h) => h.title)
                .slice(0, 3)
                .join(", ")}) — validate or reject them first.`,
            });
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Cannot issue ${d.code}: ${gate.reason}`,
          });
        }
        const [row] = await tx
          .update(consDeliverables)
          .set({ ...rest, status, issuedAt: new Date(), updatedAt: new Date() })
          .where(eq(consDeliverables.id, id))
          .returning();
        await writeAudit(tx, { entity: "cons_deliverable", entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });
        const fired = await tx
          .update(consFeeStages)
          .set({ status: "BILLABLE", billableAt: new Date(), updatedAt: new Date() })
          .where(and(eq(consFeeStages.deliverableId, id), eq(consFeeStages.status, "PENDING")))
          .returning();
        for (const s of fired)
          await writeAudit(tx, { entity: "cons_fee_stage", entityId: s.id, action: "UPDATE", actorId: ctx.user.id, after: s });
        return row!;
      });
    }

    const [row] = await ctx.db
      .update(consDeliverables)
      .set({ ...rest, ...(status ? { status } : {}), updatedAt: new Date() })
      .where(eq(consDeliverables.id, id))
      .returning();
    await writeAudit(ctx.db, { entity: "cons_deliverable", entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consDeliverables).where(eq(consDeliverables.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_deliverable", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),

  /**
   * Start a new revision of an issued deliverable (SOP §4: changes re-enter
   * the same chain at the next revision). Bumps the revision on the two-track
   * convention (P01→P02, C01→C02, A→B) and **clears the sign-off chain** — a
   * new revision needs fresh checks. Prior sign-offs remain in the audit log.
   */
  startRevision: manage
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [d] = await ctx.db.select().from(consDeliverables).where(eq(consDeliverables.id, input.id));
      if (!d) throw new TRPCError({ code: "NOT_FOUND" });
      if (d.status !== "ISSUED")
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${d.code} is ${d.status} — only issued deliverables are revised (drafts are just edited).`,
        });
      const rev = d.revision ?? "P01";
      const track = /^([PC])(\d+)$/.exec(rev);
      const letter = /^[A-Y]$/.exec(rev);
      const next = track
        ? `${track[1]}${String(Number(track[2]) + 1).padStart(2, "0")}`
        : letter
          ? String.fromCharCode(rev.charCodeAt(0) + 1)
          : `${rev}.1`;
      const steps = await ctx.db
        .select()
        .from(consReviewSteps)
        .where(eq(consReviewSteps.deliverableId, input.id));
      await ctx.db.delete(consReviewSteps).where(eq(consReviewSteps.deliverableId, input.id));
      const [row] = await ctx.db
        .update(consDeliverables)
        .set({
          status: "DRAFT",
          revision: next,
          issuedAt: null,
          // New revision needs a fresh issue transmittal (prior TRN stays on the old issue record via audit).
          transmittalId: null,
          updatedAt: new Date(),
        })
        .where(eq(consDeliverables.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "cons_deliverable",
        entityId: input.id,
        action: "REVISE",
        actorId: ctx.user.id,
        before: { revision: rev, status: "ISSUED", chain: steps.map((s) => `${s.kind}:${s.userName}`) },
        after: { revision: next, status: "DRAFT" },
      });
      return row!;
    }),

  /**
   * Create a Studio issue transmittal for an ISSUED deliverable and back-reference
   * it on the MDR (SOP §3). Requires engagement.projectId.
   */
  recordIssueTransmittal: manage
    .input(ConsIssueTransmittalCreate)
    .mutation(async ({ ctx, input }) => {
      const [d] = await ctx.db
        .select()
        .from(consDeliverables)
        .where(eq(consDeliverables.id, input.deliverableId));
      if (!d) throw new TRPCError({ code: "NOT_FOUND" });
      const [eng] = await ctx.db
        .select()
        .from(consEngagements)
        .where(eq(consEngagements.id, d.engagementId));
      if (!eng) throw new TRPCError({ code: "NOT_FOUND" });
      const gate = canRecordIssueTransmittal({
        deliverableStatus: d.status,
        existingTransmittalId: d.transmittalId,
        engagementProjectId: eng.projectId,
      });
      if (!gate.ok)
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: gate.reason });

      let recipient = input.recipient?.trim() ?? "";
      if (!recipient && eng.clientId) {
        const [client] = await ctx.db
          .select({ name: clients.name })
          .from(clients)
          .where(eq(clients.id, eng.clientId));
        recipient = client?.name ?? "";
      }
      if (!recipient)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Recipient is required — set a client on the engagement or pass recipient.",
        });

      const purpose = issueClassToTransmittalPurpose(
        d.issueClass as "FOR_INFORMATION" | "FOR_APPROVAL" | "FOR_CONSTRUCTION",
      );
      const issuedOn = (d.issuedAt ?? new Date()).toISOString().slice(0, 10);
      const { ref } = await nextRef(ctx.db, "transmittal", "TRN");

      const result = await ctx.db.transaction(async (tx) => {
        const [t] = await tx
          .insert(transmittals)
          .values({
            ref,
            projectId: eng.projectId!,
            recipient,
            purpose,
            channel: input.channel,
            dateIssued: issuedOn,
            notes:
              input.notes ??
              `Issue of ${d.code} rev ${d.revision} — ${eng.code ?? eng.title}`,
            createdById: ctx.user.id,
          })
          .returning();
        await tx.insert(transmittalItems).values({
          transmittalId: t!.id,
          drawingId: null,
          drawingRef: d.code,
          title: d.title,
          rev: d.revision,
          copies: 1,
        });
        const [updated] = await tx
          .update(consDeliverables)
          .set({ transmittalId: t!.id, updatedAt: new Date() })
          .where(eq(consDeliverables.id, d.id))
          .returning();
        return { transmittal: t!, deliverable: updated! };
      });

      await publishEntity(ctx.db, "transmittal", result.transmittal.id);
      await writeAudit(ctx.db, {
        entity: "transmittal",
        entityId: result.transmittal.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: result.transmittal,
      });
      await writeAudit(ctx.db, {
        entity: "cons_deliverable",
        entityId: d.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: { transmittalId: result.transmittal.id, transmittalRef: result.transmittal.ref },
      });
      return result;
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

    // Independence rules (author ≠ checker ≠ approver on CAT2/CAT3, etc.) —
    // pure helper so P9.V can unit-test the liability path without a DB.
    const independenceError = reviewStepIndependenceError({
      kind: input.kind,
      checkCategory: d.checkCategory,
      actorUserId: ctx.user.id,
      originatedBy: d.originatedBy,
      recorded: steps,
    });
    if (independenceError)
      throw new TRPCError({ code: "FORBIDDEN", message: independenceError });

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

/**
 * A fee stage may only link to a deliverable in its OWN engagement — otherwise
 * issuing engagement B's deliverable would flip engagement A's stage billable.
 */
async function assertDeliverableInEngagement(
  db: DB,
  deliverableId: string,
  engagementId: string,
) {
  const [d] = await db
    .select({ engagementId: consDeliverables.engagementId })
    .from(consDeliverables)
    .where(eq(consDeliverables.id, deliverableId));
  if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Linked deliverable not found." });
  if (d.engagementId !== engagementId)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The linked deliverable belongs to a different engagement.",
    });
}

const feeStagesRouter = router({
  create: feesManage.input(ConsFeeStageCreate).mutation(async ({ ctx, input }) => {
    if (input.deliverableId)
      await assertDeliverableInEngagement(ctx.db, input.deliverableId, input.engagementId);
    const [row] = await ctx.db.insert(consFeeStages).values(input).returning();
    await writeAudit(ctx.db, { entity: "cons_fee_stage", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: feesManage.input(ConsFeeStageUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const [existing] = await ctx.db.select().from(consFeeStages).where(eq(consFeeStages.id, id));
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    // Amount and deliverable link are frozen once invoiced/paid — pure lock
    // helper so P9.V can unit-test without a DB. Label stays editable always.
    const financialChange =
      (rest.amountPaise !== undefined && rest.amountPaise !== existing.amountPaise) ||
      (rest.deliverableId !== undefined && rest.deliverableId !== existing.deliverableId);
    if (financialChange && feeStageFinancialsLocked(existing.status))
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Stage is ${existing.status.toLowerCase()} — its amount and linked deliverable are locked. Raise a credit note / adjustment instead of editing a billed stage.`,
      });
    if (rest.deliverableId)
      await assertDeliverableInEngagement(ctx.db, rest.deliverableId, existing.engagementId);
    const [row] = await ctx.db
      .update(consFeeStages)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(consFeeStages.id, id))
      .returning();
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await writeAudit(ctx.db, { entity: "cons_fee_stage", entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row;
  }),

  /** Raise a Studio tax invoice for a BILLABLE stage; payment terms start the dunning clock. */
  markInvoiced: feesManage
    .input(z.object({ id: z.string().uuid(), dueInDays: z.number().int().min(0).max(180).default(30) }))
    .mutation(async ({ ctx, input }) => {
      const [stage] = await ctx.db.select().from(consFeeStages).where(eq(consFeeStages.id, input.id));
      if (!stage) throw new TRPCError({ code: "NOT_FOUND" });
      const [eng] = await ctx.db
        .select()
        .from(consEngagements)
        .where(eq(consEngagements.id, stage.engagementId));
      if (!eng) throw new TRPCError({ code: "NOT_FOUND" });

      const gate = canRaiseFeeStageStudioInvoice({
        stageStatus: stage.status,
        engagementProjectId: eng.projectId,
        existingInvoiceId: stage.invoiceId,
      });
      if (!gate.ok)
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: gate.reason });

      const invoiceDue = new Date(Date.now() + input.dueInDays * 86400000)
        .toISOString()
        .slice(0, 10);
      const jobLabel = eng.code ?? eng.title;
      const notes = `Consultancy fee stage — ${jobLabel}: ${stage.label}`;

      // Raise the ISSUED Studio tax invoice first (serial + PDF). Then lock the
      // fee stage to it. A rare race that loses the BILLABLE claim leaves a
      // valid orphan invoice — safer than rolling back a consumed INV serial.
      const invoice = await createStudioInvoice(ctx.db, {
        input: {
          projectId: eng.projectId!,
          clientId: eng.clientId ?? undefined,
          taxablePaise: stage.amountPaise,
          sac: "998322",
          notes,
          isAdvance: false,
        },
        actor: { id: ctx.user.id, fullName: ctx.user.fullName },
        requestId: ctx.requestId,
        issue: true,
      });
      const [row] = await ctx.db
        .update(consFeeStages)
        .set({
          status: "INVOICED",
          invoicedAt: new Date(),
          invoiceDue,
          invoiceId: invoice.id,
          updatedAt: new Date(),
        })
        .where(and(eq(consFeeStages.id, input.id), eq(consFeeStages.status, "BILLABLE")))
        .returning();
      if (!row)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Studio invoice ${invoice.ref} was raised, but this stage is no longer billable — link or cancel the invoice manually.`,
        });

      await writeAudit(ctx.db, {
        entity: "cons_fee_stage",
        entityId: input.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: { ...row, invoiceRef: invoice.ref },
      });
      return row;
    }),

  /** Record payment received — closes the stage's dunning clock and syncs the Studio invoice. */
  markPaid: feesManage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [stage] = await ctx.db.select().from(consFeeStages).where(eq(consFeeStages.id, input.id));
    if (!stage) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canAdvanceFeeStage(stage.status, "PAID"))
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          stage.status === "PAID"
            ? "This stage is already paid."
            : "Only invoiced stages can be marked paid.",
      });

    const result = await ctx.db.transaction(async (tx) => {
      const [row] = await tx
        .update(consFeeStages)
        .set({ status: "PAID", paidAt: new Date(), updatedAt: new Date() })
        .where(and(eq(consFeeStages.id, input.id), eq(consFeeStages.status, "INVOICED")))
        .returning();
      if (!row)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This stage is no longer invoiced — refresh and try again.",
        });

      if (stage.invoiceId) {
        const [inv] = await tx.select().from(invoices).where(eq(invoices.id, stage.invoiceId));
        if (inv && inv.status === "ISSUED") {
          const [paidInv] = await tx
            .update(invoices)
            .set({
              status: "PAID",
              paidPaise: inv.netReceivablePaise,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, inv.id))
            .returning();
          await writeAudit(tx, {
            entity: "invoice",
            entityId: inv.id,
            action: "STATUS",
            actorId: ctx.user.id,
            before: { status: inv.status },
            after: { status: "PAID", paidPaise: paidInv?.paidPaise },
          });
          return { stage: row, invoiceId: inv.id };
        }
        if (inv && inv.status === "CANCELLED")
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "The linked Studio invoice was cancelled — raise a replacement invoice before marking paid.",
          });
      }
      return { stage: row, invoiceId: stage.invoiceId };
    });

    if (result.invoiceId) await publishEntity(ctx.db, "invoice", result.invoiceId);
    await writeAudit(ctx.db, {
      entity: "cons_fee_stage",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: result.stage,
    });
    return result.stage;
  }),

  remove: feesManage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [stage] = await ctx.db.select().from(consFeeStages).where(eq(consFeeStages.id, input.id));
    if (!stage) throw new TRPCError({ code: "NOT_FOUND" });
    if (feeStageFinancialsLocked(stage.status))
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Stage is ${stage.status.toLowerCase()} — it cannot be deleted. Reverse the invoice / record an adjustment instead.`,
      });
    await ctx.db.delete(consFeeStages).where(eq(consFeeStages.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_fee_stage", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

const rateCardsRouter = router({
  // Chargeout rates are commercial data — finance-only.
  list: feesManage.query(({ ctx }) =>
    ctx.db.select().from(consRateCards).orderBy(asc(consRateCards.grade)),
  ),

  /** Upsert the firm rate card (paise/hour + weekly capacity per grade). */
  set: feesManage.input(ConsRateCardSet).mutation(async ({ ctx, input }) => {
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
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(consTimesheets)
        .where(eq(consTimesheets.engagementId, input.engagementId))
        .orderBy(desc(consTimesheets.date));
      // Hours stay visible (own-work review); rupee value is finance-only.
      return seesMoney(ctx.user.role)
        ? rows
        : rows.map((t) => ({ ...t, valuePaise: null }));
    }),

  /** Log hours — value is snapshotted at the grade rate then in force. */
  log: manage.input(ConsTimesheetCreate).mutation(async ({ ctx, input }) => {
    if (input.deliverableId)
      await assertDeliverableInEngagement(ctx.db, input.deliverableId, input.engagementId);
    const [rate] = await ctx.db
      .select()
      .from(consRateCards)
      .where(eq(consRateCards.grade, input.grade));
    // Without a rate the booking is worth ₹0, silently inflating realisation and
    // dropping the hours out of the per-grade view. Require the rate first.
    if (!rate || !rate.ratePaise)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `No rate card is set for grade ${input.grade} — set the rate card before logging billable time.`,
      });
    const valuePaise = timesheetValuePaise(rate.ratePaise, input.hours);
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
    const [sheet] = await ctx.db.select().from(consTimesheets).where(eq(consTimesheets.id, input.id));
    if (!sheet) throw new TRPCError({ code: "NOT_FOUND" });
    // An approved entry is billable WIP on the fee position — deleting it erases
    // recorded time value. Correct it by re-logging, not by silent deletion.
    if (sheet.status === "APPROVED")
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This entry is approved and counted as WIP — it cannot be deleted.",
      });
    await ctx.db.delete(consTimesheets).where(eq(consTimesheets.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_timesheet", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),

  /** SOP §8 — weekly approval, a named audited act. Pass ids, or an engagementId to approve all pending. */
  approve: manage
    .input(
      z.object({
        ids: z.array(z.string().uuid()).max(200).optional(),
        engagementId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.ids?.length && !input.engagementId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pass entry ids or an engagementId." });
      // Approval is an independent act — you cannot approve your own hours into
      // billable WIP. Own entries are excluded from the batch.
      const notOwn = ne(consTimesheets.userId, ctx.user.id);
      const where = input.ids?.length
        ? and(inArray(consTimesheets.id, input.ids), eq(consTimesheets.status, "SUBMITTED"), notOwn)
        : and(
            eq(consTimesheets.engagementId, input.engagementId!),
            eq(consTimesheets.status, "SUBMITTED"),
            notOwn,
          );
      const rows = await ctx.db
        .update(consTimesheets)
        .set({
          status: "APPROVED",
          approvedBy: ctx.user.id,
          approvedByName: ctx.user.fullName,
          approvedAt: new Date(),
        })
        .where(where)
        .returning();
      await writeAudit(ctx.db, {
        entity: "cons_timesheet",
        action: "APPROVE",
        actorId: ctx.user.id,
        after: { count: rows.length, ids: rows.map((r) => r.id) },
      });
      return { approved: rows.length };
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
  approve: costApprove.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    // Transactional with a conditional status flip so two concurrent approvals
    // cannot each append a BILLABLE stage (double-billing the same variation).
    return ctx.db.transaction(async (tx) => {
      const claimed = await tx
        .update(consVariations)
        .set({ status: "APPROVED", approvedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(consVariations.id, input.id), eq(consVariations.status, "PROPOSED")))
        .returning();
      if (claimed.length === 0) {
        // Either it doesn't exist or it was already approved/rejected — the
        // loser of a race, or a stale client.
        const [v] = await tx.select().from(consVariations).where(eq(consVariations.id, input.id));
        if (!v) throw new TRPCError({ code: "NOT_FOUND" });
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${v.code} is already ${v.status.toLowerCase()}.`,
        });
      }
      const v = claimed[0]!;
      const [stage] = await tx
        .insert(consFeeStages)
        .values({
          engagementId: v.engagementId,
          label: `Variation ${v.code} — ${v.title}`,
          amountPaise: v.amountPaise,
          status: "BILLABLE",
          billableAt: new Date(),
        })
        .returning();
      const [row] = await tx
        .update(consVariations)
        .set({ feeStageId: stage!.id, updatedAt: new Date() })
        .where(eq(consVariations.id, input.id))
        .returning();
      await writeAudit(tx, { entity: "cons_variation", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, after: row });
      await writeAudit(tx, { entity: "cons_fee_stage", entityId: stage!.id, action: "CREATE", actorId: ctx.user.id, after: stage });
      return row!;
    });
  }),

  reject: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [v] = await ctx.db.select().from(consVariations).where(eq(consVariations.id, input.id));
    if (!v) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canDecideVariation(v.status))
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

  remove: feesManage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [v] = await ctx.db.select().from(consVariations).where(eq(consVariations.id, input.id));
    if (!v) throw new TRPCError({ code: "NOT_FOUND" });
    // An approved variation owns a BILLABLE fee stage; deleting it would leave
    // that stage billing with no variation behind it. Reject it first.
    if (variationDeletionBlocked(v.status))
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `${v.code} is approved and carries a billable fee stage — it cannot be deleted.`,
      });
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
  summary: feesManage.input(ConsAnalyticsPeriod).query(async ({ ctx, input }) => {
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
    const periodPosition = computeFeePosition({
      agreedPaise: 0,
      stages,
      timesheets: sheets,
    });
    // WIP per engagement (all-time; floored at zero), summed across the firm.
    const allSheets = await ctx.db.select().from(consTimesheets);
    const engIds = [...new Set(allSheets.map((s) => s.engagementId))];
    const wipPaise = sumFirmWip(
      engIds.map((id) => {
        const tv = allSheets
          .filter((s) => s.engagementId === id)
          .reduce((a, s) => a + (s.valuePaise ?? 0), 0);
        const inv = stages
          .filter(
            (s) =>
              s.engagementId === id && (s.status === "INVOICED" || s.status === "PAID"),
          )
          .reduce((a, s) => a + (s.amountPaise ?? 0), 0);
        return { timeValuePaise: tv, invoicedPaise: inv };
      }),
    );

    return {
      period: input,
      hoursBooked,
      timeValuePaise: periodPosition.timeValuePaise,
      billablePaise: periodPosition.billablePaise,
      invoicedPaise: periodPosition.invoicedPaise,
      outstandingPaise: periodPosition.outstandingPaise,
      wipPaise,
      realisation: realisationRatio(periodPosition.invoicedPaise, periodPosition.timeValuePaise),
      byGrade,
    };
  }),

  /**
   * P9.4 capacity outlook — trailing timesheet run-rate by engagement lead
   * discipline vs firm weekly capacity (rate cards). Pure projection; no LLM.
   */
  capacityOutlook: feesManage
    .input(ConsCapacityOutlookInput.optional())
    .query(async ({ ctx, input }) => {
      const asOf = input?.asOf ?? new Date().toISOString().slice(0, 10);
      const horizonMonths = input?.horizonMonths ?? 3;

      const rates = await ctx.db.select().from(consRateCards);
      const firmCapacityHoursWeek = rates.reduce(
        (a, r) => a + (r.capacityHoursWeek ?? 0),
        0,
      );

      const engagements = await ctx.db
        .select({
          id: consEngagements.id,
          leadDiscipline: consEngagements.leadDiscipline,
          status: consEngagements.status,
        })
        .from(consEngagements);

      // Enough history for trailing 28d + prior-month actuals in the horizon window.
      const lookback = new Date(`${asOf}T00:00:00Z`);
      lookback.setUTCDate(lookback.getUTCDate() - 100);
      const from = lookback.toISOString().slice(0, 10);

      const sheets = await ctx.db
        .select({
          date: consTimesheets.date,
          hours: consTimesheets.hours,
          engagementId: consTimesheets.engagementId,
        })
        .from(consTimesheets)
        .where(and(gte(consTimesheets.date, from), lte(consTimesheets.date, asOf)));

      const rows = buildCapacityOutlook({
        asOf,
        horizonMonths,
        firmCapacityHoursWeek,
        sheets,
        engagements,
      });

      return {
        asOf,
        horizonMonths,
        firmCapacityHoursWeek,
        rows,
        alerts: capacityOutlookAlerts(rows),
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
    const [existing] = await ctx.db.select().from(consRisks).where(eq(consRisks.id, id));
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    // A partial update may touch only one score; enforce residual ≤ inherent
    // against the effective values so the heat-map can't be silently corrupted.
    const likelihood = rest.likelihood ?? existing.likelihood ?? 1;
    const impact = rest.impact ?? existing.impact ?? 1;
    const resLik = rest.residualLikelihood ?? existing.residualLikelihood ?? likelihood;
    const resImp = rest.residualImpact ?? existing.residualImpact ?? impact;
    if (resLik > likelihood || resImp > impact)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Residual score cannot exceed the inherent score.",
      });
    const [row] = await ctx.db
      .update(consRisks)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(consRisks.id, id))
      .returning();
    await writeAudit(ctx.db, { entity: "cons_risk", entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [risk] = await ctx.db.select().from(consRisks).where(eq(consRisks.id, input.id));
    if (!risk) throw new TRPCError({ code: "NOT_FOUND" });
    // Once a risk has been managed (mitigated/closed) its mitigation history is
    // part of the liability / PI-defence record — close it, don't delete it.
    if (risk.status !== "OPEN")
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `This risk is ${risk.status.toLowerCase()} and is part of the liability record — it cannot be deleted.`,
      });
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
    // A reliance letter grants a third party a legal right to rely on the firm's
    // work — it must stand on something actually issued. Refuse to write one over
    // an engagement with no ISSUED deliverable (all-draft / unchecked work).
    const [issued] = await ctx.db
      .select({ id: consDeliverables.id })
      .from(consDeliverables)
      .where(
        and(
          eq(consDeliverables.engagementId, input.engagementId),
          eq(consDeliverables.status, "ISSUED"),
        ),
      )
      .limit(1);
    if (!issued)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "This engagement has no issued deliverable — a reliance letter cannot be granted over unissued work.",
      });
    const [row] = await ctx.db.insert(consRelianceLetters).values(input).returning();
    await writeAudit(ctx.db, { entity: "cons_reliance_letter", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  /**
   * Withdraw a live reliance letter (partner act). The row is never deleted —
   * it is stamped REVOKED with who, when and why, so the beneficiary-facing
   * record and the audit trail both survive. One-way: to reinstate, issue a new
   * letter.
   */
  revoke: costApprove.input(ConsRelianceLetterRevoke).mutation(async ({ ctx, input }) => {
    const [letter] = await ctx.db
      .select()
      .from(consRelianceLetters)
      .where(eq(consRelianceLetters.id, input.id));
    if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
    if (letter.revokedAt)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This reliance letter is already revoked.",
      });
    const [row] = await ctx.db
      .update(consRelianceLetters)
      .set({
        revokedAt: new Date(),
        revokedBy: ctx.user.id,
        revokedByName: ctx.user.fullName,
        revokeReason: input.reason,
      })
      .where(eq(consRelianceLetters.id, input.id))
      .returning();
    await writeAudit(ctx.db, { entity: "cons_reliance_letter", entityId: input.id, action: "REVOKE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async () => {
    // A reliance letter is a legal instrument issued to a beneficiary; it is not
    // deletable. Withdraw it with `revoke` (which preserves the record), or issue
    // a superseding letter.
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Reliance letters cannot be deleted — revoke the letter (it stays on record) or issue a superseding one.",
    });
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
   * EOMS-assisted review (Phase 4) — a validation checklist recommendation for
   * the named human validator. The recommendation never validates anything.
   */
  eomsReview: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [pack] = await ctx.db.select().from(consInputPacks).where(eq(consInputPacks.id, input.id));
      if (!pack) throw new TRPCError({ code: "NOT_FOUND" });
      const [eng] = await ctx.db
        .select({ title: consEngagements.title })
        .from(consEngagements)
        .where(eq(consEngagements.id, pack.engagementId));
      return eomsReviewInputPack(
        ctx.db,
        { title: pack.title, kind: pack.kind, source: pack.source },
        eng?.title ?? "engagement",
      );
    }),
});

/**
 * P9.4 / D4 — CalculationPackage lineage. Record what was computed (tool,
 * code refs, assumptions, I/O summaries); no in-app calculation engine.
 */
const calcPackagesRouter = router({
  record: manage.input(ConsCalcPackageCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(consCalcPackages)
      .values({
        ...input,
        preparedBy: ctx.user.id,
        preparedByName: ctx.user.fullName,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "cons_calc_package",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  update: manage.input(ConsCalcPackageUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...patch } = input;
    const [row] = await ctx.db
      .update(consCalcPackages)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(consCalcPackages.id, id))
      .returning();
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await writeAudit(ctx.db, {
      entity: "cons_calc_package",
      entityId: id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row;
  }),

  setStatus: manage
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["DRAFT", "CURRENT", "SUPERSEDED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [pack] = await ctx.db
        .select()
        .from(consCalcPackages)
        .where(eq(consCalcPackages.id, input.id));
      if (!pack) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canAdvanceCalcPackage(pack.status, input.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot move ${pack.code} from ${pack.status} to ${input.status}.`,
        });
      }
      // Promoting to CURRENT supersedes any other CURRENT package on the same deliverable.
      if (input.status === "CURRENT" && pack.deliverableId) {
        await ctx.db
          .update(consCalcPackages)
          .set({ status: "SUPERSEDED", updatedAt: new Date() })
          .where(
            and(
              eq(consCalcPackages.deliverableId, pack.deliverableId),
              eq(consCalcPackages.status, "CURRENT"),
              ne(consCalcPackages.id, pack.id),
            ),
          );
      }
      const [row] = await ctx.db
        .update(consCalcPackages)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(consCalcPackages.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "cons_calc_package",
        entityId: input.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [pack] = await ctx.db
      .select()
      .from(consCalcPackages)
      .where(eq(consCalcPackages.id, input.id));
    if (!pack) throw new TRPCError({ code: "NOT_FOUND" });
    if (pack.status === "CURRENT") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `${pack.code} is CURRENT — supersede it before deleting.`,
      });
    }
    await ctx.db.delete(consCalcPackages).where(eq(consCalcPackages.id, input.id));
    await writeAudit(ctx.db, {
      entity: "cons_calc_package",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
    });
    return { ok: true };
  }),
});

const phasesRouter = router({
  /** Add a custom phase beyond the seeded template. */
  add: manage.input(ConsPhaseCreate).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db
      .select({ seq: consPhases.seq })
      .from(consPhases)
      .where(eq(consPhases.engagementId, input.engagementId));
    const seq = existing.reduce((m, p) => Math.max(m, p.seq ?? 0), -1) + 1;
    const [row] = await ctx.db
      .insert(consPhases)
      .values({ engagementId: input.engagementId, name: input.name, scope: input.scope, seq })
      .returning();
    await writeAudit(ctx.db, { entity: "cons_phase", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  /** Move the phase through its lifecycle; setting ACTIVE stamps the engagement's stage text. */
  setStatus: manage
    .input(z.object({ id: z.string().uuid(), status: z.enum(["PENDING", "ACTIVE", "DONE"]) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(consPhases)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(consPhases.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.status === "ACTIVE") {
        await ctx.db
          .update(consEngagements)
          .set({ stage: row.name, updatedAt: new Date() })
          .where(eq(consEngagements.id, row.engagementId));
      }
      await writeAudit(ctx.db, { entity: "cons_phase", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, after: row });
      return row;
    }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consPhases).where(eq(consPhases.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_phase", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

const fieldReportsRouter = router({
  /** Record a site visit — report number auto-allocated per engagement. */
  create: manage.input(ConsFieldReportCreate).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db
      .select({ reportNo: consFieldReports.reportNo })
      .from(consFieldReports)
      .where(eq(consFieldReports.engagementId, input.engagementId));
    const reportNo = existing.reduce((m, r) => Math.max(m, r.reportNo ?? 0), 0) + 1;
    const [row] = await ctx.db
      .insert(consFieldReports)
      .values({ ...input, reportNo, authorId: ctx.user.id, authorName: ctx.user.fullName })
      .returning();
    await writeAudit(ctx.db, { entity: "cons_field_report", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consFieldReports).where(eq(consFieldReports.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_field_report", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

const crsRouter = router({
  /** Raise a review comment on the deliverable's current revision. */
  add: manage.input(ConsReviewCommentCreate).mutation(async ({ ctx, input }) => {
    const [d] = await ctx.db
      .select()
      .from(consDeliverables)
      .where(eq(consDeliverables.id, input.deliverableId));
    if (!d) throw new TRPCError({ code: "NOT_FOUND" });
    // Comments belong to the review of a DRAFT. Once issued, the CRS is the frozen
    // review record for that revision — new comments open a new revision instead.
    if (d.status !== "DRAFT")
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `${d.code} is ${(DELIVERABLE_STATUS_LABEL as Record<string, string>)[d.status] ?? d.status} — start a new revision to raise further comments.`,
      });
    const [row] = await ctx.db
      .insert(consReviewComments)
      .values({ ...input, revision: d.revision })
      .returning();
    await writeAudit(ctx.db, { entity: "cons_review_comment", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  /** Close a line — the designer's response is required (the review record). */
  close: manage.input(ConsReviewCommentClose).mutation(async ({ ctx, input }) => {
    const [c] = await ctx.db
      .select()
      .from(consReviewComments)
      .where(eq(consReviewComments.id, input.id));
    if (!c) throw new TRPCError({ code: "NOT_FOUND" });
    if (c.status === "CLOSED")
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This comment is already closed." });
    const [row] = await ctx.db
      .update(consReviewComments)
      .set({ response: input.response, status: "CLOSED", closedAt: new Date(), updatedAt: new Date() })
      .where(eq(consReviewComments.id, input.id))
      .returning();
    await writeAudit(ctx.db, { entity: "cons_review_comment", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [c] = await ctx.db.select().from(consReviewComments).where(eq(consReviewComments.id, input.id));
    if (!c) throw new TRPCError({ code: "NOT_FOUND" });
    // A closed comment (comment + response) is the review record — deleting it
    // rewrites history. Only an open, unanswered line may be withdrawn.
    if (c.status === "CLOSED")
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "A closed review comment is part of the review record and cannot be deleted.",
      });
    await ctx.db.delete(consReviewComments).where(eq(consReviewComments.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_review_comment", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
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
      // Role-aware: non-finance callers get a money-free digest, so the agent
      // can't be used to read fees the direct reads redact for them.
      const res = await askConsultancyIntelligence(ctx.db, input.question, seesMoney(ctx.user.role));
      await writeAudit(ctx.db, {
        entity: "cons_intelligence",
        action: "ASK",
        actorId: ctx.user.id,
        after: { question: input.question, provider: res.provider, model: res.model },
      });
      return res;
    }),

  /**
   * Deterministic precedent search over past engagements (no LLM). Scores type,
   * model, title, brief, and deliverable titles against the query tokens.
   */
  precedentSearch: protectedProcedure
    .input(z.object({ query: z.string().min(2).max(200), limit: z.number().int().min(1).max(20).default(8) }))
    .query(async ({ ctx, input }) => {
      const engagements = await ctx.db.select().from(consEngagements);
      const deliverables = await ctx.db.select().from(consDeliverables);
      const candidates = engagements.map((e) => ({
        id: e.id,
        title: e.title,
        consultancyType: e.consultancyType,
        model: e.model,
        stage: e.stage,
        status: e.status,
        brief: (e.brief as Record<string, unknown> | null) ?? null,
        deliverableTitles: deliverables
          .filter((d) => d.engagementId === e.id)
          .map((d) => d.title),
      }));
      const hits = rankPrecedentEngagements(input.query, candidates, input.limit);
      const byId = new Map(engagements.map((e) => [e.id, e]));
      return hits.map((h) => {
        const e = byId.get(h.id)!;
        return {
          id: e.id,
          title: e.title,
          consultancyType: e.consultancyType,
          model: e.model,
          stage: e.stage,
          status: e.status,
          score: h.score,
          reasons: h.reasons,
        };
      });
    }),

  /** Deterministic sign-off / fee / calc lineage for one deliverable. */
  deliverableLineage: protectedProcedure
    .input(z.object({ deliverableId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [d] = await ctx.db
        .select()
        .from(consDeliverables)
        .where(eq(consDeliverables.id, input.deliverableId));
      if (!d) throw new TRPCError({ code: "NOT_FOUND" });
      const steps = await ctx.db
        .select()
        .from(consReviewSteps)
        .where(eq(consReviewSteps.deliverableId, d.id));
      const feeStages = await ctx.db
        .select()
        .from(consFeeStages)
        .where(eq(consFeeStages.deliverableId, d.id));
      const calcPackages = await ctx.db
        .select()
        .from(consCalcPackages)
        .where(eq(consCalcPackages.deliverableId, d.id))
        .orderBy(asc(consCalcPackages.code));
      const money = seesMoney(ctx.user.role);
      const lineage = buildDeliverableLineage({
        code: d.code,
        title: d.title,
        status: d.status,
        checkCategory: d.checkCategory,
        revision: d.revision,
        steps,
        feeStages: money
          ? feeStages
          : feeStages.map((f) => ({ ...f, amountPaise: null })),
        calcPackages,
      });
      return {
        deliverableId: d.id,
        engagementId: d.engagementId,
        ...lineage,
        feeStages: money
          ? feeStages
          : feeStages.map((f) => ({ ...f, amountPaise: null })),
        steps,
        calcPackages,
      };
    }),
});

/**
 * SOP §2 — enquiry register + go/no-go scorecard.
 * Convert (GO → WON) allocates the job number and opens an engagement.
 */
const enquiriesRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.select().from(consEnquiries).orderBy(desc(consEnquiries.createdAt)),
  ),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(consEnquiries).where(eq(consEnquiries.id, input.id));
      if (!row) return null;
      return {
        ...row,
        recommendation:
          row.capacityFit != null &&
          row.feeAttractiveness != null &&
          row.risk != null &&
          row.strategicFit != null
            ? goNoGoRecommendation({
                capacityFit: row.capacityFit,
                feeAttractiveness: row.feeAttractiveness,
                risk: row.risk,
                strategicFit: row.strategicFit,
                conflictCheckDone: row.conflictCheckDone,
              })
            : null,
      };
    }),

  create: manage.input(ConsEnquiryCreate).mutation(async ({ ctx, input }) => {
    const ref = await allocateEnquiryRef(ctx.db);
    const [row] = await ctx.db
      .insert(consEnquiries)
      .values({
        ref,
        title: input.title,
        clientName: input.clientName,
        contactName: input.contactName ?? null,
        phone: input.phone ?? null,
        email: input.email || null,
        source: input.source ?? null,
        siteLocation: input.siteLocation ?? null,
        consultancyType: input.consultancyType ?? null,
        leadDiscipline: input.leadDiscipline,
        model: input.model ?? null,
        notes: input.notes ?? null,
        createdBy: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "cons_enquiry",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  /** Soft status advances (RECEIVED → UNDER_REVIEW, early LOST, etc.). */
  setStatus: manage
    .input(z.object({ id: z.string().uuid(), status: z.enum(["UNDER_REVIEW", "LOST"]) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(consEnquiries).where(eq(consEnquiries.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canAdvanceEnquiryStatus(row.status, input.status))
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot move enquiry from ${row.status} to ${input.status}.`,
        });
      const [updated] = await ctx.db
        .update(consEnquiries)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(consEnquiries.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "cons_enquiry",
        entityId: input.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: { status: row.status },
        after: { status: input.status },
      });
      return updated!;
    }),

  /** Record / update the go/no-go scorecard (does not decide). */
  score: manage.input(ConsEnquiryScore).mutation(async ({ ctx, input }) => {
    const { id, ...score } = input;
    const [row] = await ctx.db.select().from(consEnquiries).where(eq(consEnquiries.id, id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    if (row.status === "WON" || row.status === "NO_GO" || row.status === "LOST")
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Enquiry is ${row.status} — the scorecard is frozen.`,
      });
    const nextStatus =
      row.status === "RECEIVED" && canAdvanceEnquiryStatus(row.status, "UNDER_REVIEW")
        ? "UNDER_REVIEW"
        : row.status;
    const [updated] = await ctx.db
      .update(consEnquiries)
      .set({
        capacityFit: score.capacityFit,
        feeAttractiveness: score.feeAttractiveness,
        risk: score.risk,
        strategicFit: score.strategicFit,
        conflictCheckDone: score.conflictCheckDone,
        decisionNote: score.decisionNote ?? row.decisionNote,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(consEnquiries.id, id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "cons_enquiry",
      entityId: id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: updated,
    });
    return {
      ...updated!,
      recommendation: goNoGoRecommendation(score),
    };
  }),

  /** Panel decision — requires a complete scorecard + conflict check. */
  decide: manage.input(ConsEnquiryDecide).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(consEnquiries).where(eq(consEnquiries.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canAdvanceEnquiryStatus(row.status, input.decision))
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Cannot decide ${input.decision} from ${row.status} — start review and score first.`,
      });
    const gate = canDecideGoNoGo(row);
    if (!gate.ok)
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: gate.reason });
    const [updated] = await ctx.db
      .update(consEnquiries)
      .set({
        status: input.decision,
        decisionNote: input.decisionNote ?? row.decisionNote,
        decidedBy: ctx.user.id,
        decidedByName: ctx.user.fullName,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(consEnquiries.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "cons_enquiry",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: updated,
    });
    return updated!;
  }),

  /**
   * Convert a GO enquiry into an engagement (job number allocated).
   * Marks the enquiry WON and links convertedEngagementId.
   */
  convertToEngagement: manage.input(ConsEnquiryConvert).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(consEnquiries).where(eq(consEnquiries.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    const gate = canConvertEnquiry(row);
    if (!gate.ok)
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: gate.reason });

    let feeTotalPaise = input.feeTotalPaise;
    if (!seesMoney(ctx.user.role)) feeTotalPaise = undefined;

    const model: EngagementModel =
      input.model ??
      (EngagementModel.options.includes(row.model as EngagementModel)
        ? (row.model as EngagementModel)
        : "FULL_DESIGN");
    const consultancyType: ConsultancyType | undefined =
      input.consultancyType ??
      (row.consultancyType &&
      ConsultancyType.options.includes(row.consultancyType as ConsultancyType)
        ? (row.consultancyType as ConsultancyType)
        : undefined);
    const leadDiscipline: EngineeringDiscipline =
      input.leadDiscipline ??
      (EngineeringDiscipline.options.includes(row.leadDiscipline as EngineeringDiscipline)
        ? (row.leadDiscipline as EngineeringDiscipline)
        : "STRUCTURAL");
    const title = input.title?.trim() || row.title;
    const code = await allocateEngagementJobCode(ctx.db);

    const result = await ctx.db.transaction(async (tx) => {
      const [eng] = await tx
        .insert(consEngagements)
        .values({
          code,
          title,
          clientId: input.clientId ?? null,
          projectId: input.projectId ?? null,
          model,
          consultancyType: consultancyType ?? null,
          leadDiscipline,
          feeModel: input.feeModel ?? null,
          feeTotalPaise: feeTotalPaise ?? null,
          relianceScope: input.relianceScope ?? null,
          stage: input.stage ?? "Kickoff",
          notes:
            input.notes ??
            [
              `Converted from enquiry ${row.ref}`,
              row.clientName ? `Client (enquiry): ${row.clientName}` : null,
              row.siteLocation ? `Site: ${row.siteLocation}` : null,
              row.decisionNote ? `Go/no-go note: ${row.decisionNote}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
        })
        .returning();

      if (consultancyType) {
        const template = CONSULTANCY_SCOPE_TEMPLATES[consultancyType as ConsultancyType];
        if (template) {
          await tx.insert(consPhases).values(
            template.map((p, i) => ({
              engagementId: eng!.id,
              seq: i,
              name: p.name,
              scope: [...p.scope],
            })),
          );
        }
      }

      const [enq] = await tx
        .update(consEnquiries)
        .set({
          status: "WON",
          convertedEngagementId: eng!.id,
          updatedAt: new Date(),
        })
        .where(and(eq(consEnquiries.id, input.id), eq(consEnquiries.status, "GO")))
        .returning();
      if (!enq)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Enquiry is no longer Go — refresh and try again.",
        });
      return { engagement: eng!, enquiry: enq };
    });

    await writeAudit(ctx.db, {
      entity: "cons_engagement",
      entityId: result.engagement.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: result.engagement,
    });
    await writeAudit(ctx.db, {
      entity: "cons_enquiry",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: { status: "WON", convertedEngagementId: result.engagement.id, code },
    });
    return result;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(consEnquiries).where(eq(consEnquiries.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    if (row.status === "WON" || row.convertedEngagementId)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Won enquiries cannot be deleted — they are the job-number trail.",
      });
    await ctx.db.delete(consEnquiries).where(eq(consEnquiries.id, input.id));
    await writeAudit(ctx.db, {
      entity: "cons_enquiry",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
      before: row,
    });
    return { ok: true };
  }),
});

export const consultancyRouter = router({
  engagements: engagementsRouter,
  enquiries: enquiriesRouter,
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
  calcPackages: calcPackagesRouter,
  phases: phasesRouter,
  crs: crsRouter,
  fieldReports: fieldReportsRouter,
  intelligence: intelligenceRouter,
  lessons: lessonsRouter,
  ncs: ncsRouter,
  moms: momsRouter,
  wipReviews: wipReviewsRouter,
  contractReviews: contractReviewsRouter,
});
