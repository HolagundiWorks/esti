import { z } from "zod";
import { ProgrammeProjectParams } from "./programme.js";
import { CostHead } from "./estimation.js";

export const PmcProjectParams = ProgrammeProjectParams;

export const SnagStatus = z.enum(["OPEN", "IN_PROGRESS", "VERIFIED", "CLOSED"]);
export type SnagStatus = z.infer<typeof SnagStatus>;

export const SNAG_STATUS_LABEL: Record<SnagStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  VERIFIED: "Verified",
  CLOSED: "Closed",
};

export const SnagCreate = z.object({
  projectId: z.string().uuid(),
  location: z.string().max(200).optional(),
  trade: z.string().max(100).optional(),
  description: z.string().min(2).max(2000),
  dueDate: z.string().date().optional(),
});
export type SnagCreate = z.infer<typeof SnagCreate>;

export const SnagUpdate = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  location: z.string().max(200).nullable().optional(),
  trade: z.string().max(100).nullable().optional(),
  description: z.string().min(2).max(2000).optional(),
  status: SnagStatus.optional(),
  dueDate: z.string().date().nullable().optional(),
});
export type SnagUpdate = z.infer<typeof SnagUpdate>;

export const SiteInstructionCreate = z.object({
  projectId: z.string().uuid(),
  contractorId: z.string().uuid().optional(),
  subject: z.string().min(2).max(200),
  body: z.string().max(8000).optional(),
  issuedAt: z.string().date().optional(),
});
export type SiteInstructionCreate = z.infer<typeof SiteInstructionCreate>;

export const SubmittalReviewCode = z.enum(["A", "B", "C", "D"]);
export type SubmittalReviewCode = z.infer<typeof SubmittalReviewCode>;

export const SUBMITTAL_REVIEW_LABEL: Record<SubmittalReviewCode, string> = {
  A: "Approved",
  B: "Approved as noted",
  C: "Rejected",
  D: "Revise and resubmit",
};

export const ConstructionReview = z.object({
  id: z.string().uuid(),
  reviewCode: SubmittalReviewCode,
  reviewNote: z.string().max(4000).optional(),
  status: z.enum(["ACKNOWLEDGED", "RESOLVED", "DECLINED"]).optional(),
});
export type ConstructionReview = z.infer<typeof ConstructionReview>;

export const ProgressReportCreate = z.object({
  projectId: z.string().uuid(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  narrative: z.string().max(12000).optional(),
  physicalProgressPct: z.number().int().min(0).max(100).optional(),
});
export type ProgressReportCreate = z.infer<typeof ProgressReportCreate>;

export const ProgressReportUpdate = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  narrative: z.string().max(12000).nullable().optional(),
  physicalProgressPct: z.number().int().min(0).max(100).nullable().optional(),
});
export type ProgressReportUpdate = z.infer<typeof ProgressReportUpdate>;

export const PhaseProgressUpdate = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETE"]),
});
export type PhaseProgressUpdate = z.infer<typeof PhaseProgressUpdate>;

export const RunningBillStatus = z.enum([
  "MEASURED",
  "SENT_TO_CONTRACTOR",
  "CONTRACTOR_VERIFIED",
  "SENT_TO_OFFICE",
  "MEASUREMENT_VERIFIED",
  "APPROVED_MEASUREMENT_SENT",
  "CONTRACTOR_INVOICED",
  "OFFICE_APPROVED",
  "SENT_TO_CLIENT",
]);
export type RunningBillStatus = z.infer<typeof RunningBillStatus>;

export const RUNNING_BILL_STATUS_LABEL: Record<RunningBillStatus, string> = {
  MEASURED: "Measured on site",
  SENT_TO_CONTRACTOR: "Sent to contractor",
  CONTRACTOR_VERIFIED: "Contractor verified",
  SENT_TO_OFFICE: "Sent to office",
  MEASUREMENT_VERIFIED: "Measurement verified",
  APPROVED_MEASUREMENT_SENT: "Approved measurement sent",
  CONTRACTOR_INVOICED: "Contractor invoiced",
  OFFICE_APPROVED: "Office approved",
  SENT_TO_CLIENT: "Sent to client",
};

// --- Bill types + deductions (Construction Cost OS Phase C) ------------------
// A running bill is no longer just Σ(qty×rate): it carries a type and a
// deduction block (retention / advance recovery / tax-TDS / other recoveries)
// that yield the net payable to the contractor.

export const BillType = z.enum([
  "RA",
  "FINAL",
  "EXTRA_ITEM",
  "VARIATION",
  "ADVANCE_RECOVERY",
  "RETENTION_RELEASE",
]);
export type BillType = z.infer<typeof BillType>;

export const BILL_TYPE_LABEL: Record<BillType, string> = {
  RA: "Running account (RA) bill",
  FINAL: "Final bill",
  EXTRA_ITEM: "Extra item bill",
  VARIATION: "Variation bill",
  ADVANCE_RECOVERY: "Advance recovery",
  RETENTION_RELEASE: "Retention release",
};

/** Per-bill deductions (integer paise). Net payable = gross − Σ(deductions). */
export const BillDeductions = z.object({
  retentionPaise: z.number().int().nonnegative().default(0),
  advanceRecoveryPaise: z.number().int().nonnegative().default(0),
  taxTdsPaise: z.number().int().nonnegative().default(0),
  otherRecoveryPaise: z.number().int().nonnegative().default(0),
});
export type BillDeductions = z.infer<typeof BillDeductions>;

export const RunningBillCreate = z
  .object({
    projectId: z.string().uuid(),
    contractorId: z.string().uuid().optional(),
    /** Work package this bill measures against (Construction Cost OS Phase 4/C). */
    workPackageId: z.string().uuid().nullable().optional(),
    title: z.string().min(2).max(200),
    billType: BillType.default("RA"),
    measurementDate: z.string().date().optional(),
    notes: z.string().max(4000).optional(),
    deductions: BillDeductions.optional(),
    /** Phase C (strict): BOQ/work-package quantities are billed only via an
     * approved site-measurement record. The server resolves each record's
     * qty/rate/BOQ link, so nothing can be billed twice. */
    measurementRecordIds: z.array(z.string().uuid()).max(200).optional(),
    /** Free-text (non-BOQ) lines — extras with no measurement record. */
    items: z
      .array(
        z.object({
          description: z.string().min(1).max(400),
          unit: z.string().min(1).max(20),
          qty: z.number().nonnegative(),
          ratePaise: z.number().int().nonnegative().default(0),
        }),
      )
      .max(100)
      .optional(),
  })
  .refine((v) => (v.measurementRecordIds?.length ?? 0) > 0 || (v.items?.length ?? 0) > 0, {
    message: "A bill needs at least one approved measurement or a free-text line.",
  });
export type RunningBillCreate = z.infer<typeof RunningBillCreate>;

export const RunningBillAdvance = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  status: RunningBillStatus,
  note: z.string().max(2000).optional(),
});
export type RunningBillAdvance = z.infer<typeof RunningBillAdvance>;

// --- Site Measurement Book (Construction Cost OS Phase C) --------------------
// A measurement is taken on site against a work-package (BOQ) line — carrying
// location/floor/zone, photo evidence, measured-by/checked-by — then approved
// before it can be billed. The double-billing guard runs at approval time, so
// approved measurements (not raw bill lines) are the unit of billable balance.

export const MeasurementStatus = z.enum(["MEASURED", "APPROVED", "REJECTED", "BILLED"]);
export type MeasurementStatus = z.infer<typeof MeasurementStatus>;

export const MEASUREMENT_STATUS_LABEL: Record<MeasurementStatus, string> = {
  MEASURED: "Measured",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  BILLED: "Billed",
};

export const MeasurementRecordCreate = z.object({
  projectId: z.string().uuid(),
  workPackageId: z.string().uuid(),
  /** The BOQ/work-package line this measurement is against. Server derives the
   * description, unit, BOQ item + component links from it. */
  workPackageItemId: z.string().uuid(),
  qty: z.number().nonnegative(),
  location: z.string().max(200).optional(),
  floor: z.string().max(100).optional(),
  zone: z.string().max(100).optional(),
  /** Object-storage key for photo evidence (upload UI is a later pass). */
  photoKey: z.string().max(400).optional(),
  measuredByName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});
export type MeasurementRecordCreate = z.infer<typeof MeasurementRecordCreate>;

export const MeasurementRecordApprove = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  checkedByName: z.string().max(200).optional(),
});
export type MeasurementRecordApprove = z.infer<typeof MeasurementRecordApprove>;

export const MeasurementRecordReject = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  reason: z.string().min(2).max(2000),
});
export type MeasurementRecordReject = z.infer<typeof MeasurementRecordReject>;

/** Σ of a bill's deductions (paise). */
export function billDeductionTotal(d?: Partial<BillDeductions> | null): number {
  if (!d) return 0;
  return (
    (d.retentionPaise ?? 0) +
    (d.advanceRecoveryPaise ?? 0) +
    (d.taxTdsPaise ?? 0) +
    (d.otherRecoveryPaise ?? 0)
  );
}

/** Net payable to the contractor: gross − Σ(deductions). May be ≤ 0; the caller
 * decides how to surface an over-deducted bill. */
export function netPayable(grossPaise: number, d?: Partial<BillDeductions> | null): number {
  return Math.round(grossPaise) - billDeductionTotal(d);
}

/** Normalised dedupe key for a measurement location (case/space-insensitive),
 * so the same physical spot isn't measured twice on one BOQ line. */
export function measurementLocationKey(input: {
  location?: string | null;
  floor?: string | null;
  zone?: string | null;
}): string {
  const norm = (s?: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return [norm(input.floor), norm(input.zone), norm(input.location)].join("|");
}

// --- Work packages (Estimation OS Phase 4) ----------------------------------
// Approved (frozen) estimate items are grouped into contractor packages. A
// running bill then measures against a package item, checking the previously
// billed quantity so nothing is billed twice (spec §19–20, Rule 9).

export const WorkPackageStatus = z.enum(["DRAFT", "ISSUED", "AWARDED", "ACTIVE", "CLOSED"]);
export type WorkPackageStatus = z.infer<typeof WorkPackageStatus>;

export const WORK_PACKAGE_STATUS_LABEL: Record<WorkPackageStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  AWARDED: "Awarded",
  ACTIVE: "Active",
  CLOSED: "Closed",
};

/** A line in a contractor package, optionally tied to a frozen BOQ item. */
export const WorkPackageItemInput = z.object({
  boqItemId: z.string().uuid().nullable().optional(),
  componentId: z.string().uuid().nullable().optional(),
  description: z.string().min(1).max(400),
  unit: z.string().min(1).max(20),
  approvedQty: z.number().nonnegative(),
  /** Manual variation allowance (full deviation engine is Phase 5). */
  variationQty: z.number().default(0),
  ratePaise: z.number().int().nonnegative(),
  sortOrder: z.number().int().default(0),
});
export type WorkPackageItemInput = z.infer<typeof WorkPackageItemInput>;

export const WorkPackageCreate = z.object({
  projectId: z.string().uuid(),
  estimateId: z.string().uuid(),
  /** Frozen baseline this package was carved from. */
  estimateVersionId: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(200),
  packageType: z.string().min(1).max(60).default("CIVIL"),
  contractorId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(WorkPackageItemInput).max(500).optional(),
});
export type WorkPackageCreate = z.infer<typeof WorkPackageCreate>;

/** Seed a package directly from a frozen estimate version's BOQ items. */
export const WorkPackageFromEstimate = z.object({
  projectId: z.string().uuid(),
  estimateVersionId: z.string().uuid(),
  name: z.string().min(2).max(200),
  packageType: z.string().min(1).max(60).default("CIVIL"),
  contractorId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
  /** Optional cost-head filter; empty/omitted = every head. */
  costHeads: z.array(CostHead).optional(),
});
export type WorkPackageFromEstimate = z.infer<typeof WorkPackageFromEstimate>;

export const WorkPackageUpdate = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(200).optional(),
  packageType: z.string().min(1).max(60).optional(),
  contractorId: z.string().uuid().nullable().optional(),
  status: WorkPackageStatus.optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type WorkPackageUpdate = z.infer<typeof WorkPackageUpdate>;

export const WorkPackageItemAdd = WorkPackageItemInput.extend({
  workPackageId: z.string().uuid(),
});
export type WorkPackageItemAdd = z.infer<typeof WorkPackageItemAdd>;

/**
 * Remaining billable quantity for a BOQ line (the "golden rule"):
 *   balance = approvedQty + approvedVariationQty − previouslyBilledQty
 * Rounded to 4 dp for stable quantities. May go negative if over-allocated;
 * the caller decides how to surface that.
 */
export function billableBalance(input: {
  approvedQty: number;
  variationQty?: number;
  previousBilledQty: number;
}): number {
  const raw = input.approvedQty + (input.variationQty ?? 0) - input.previousBilledQty;
  return Number(raw.toFixed(4));
}

/** Whether a current measured qty fits within the remaining balance (4 dp float tolerance). */
export function isWithinBalance(currentQty: number, balanceQty: number): boolean {
  return currentQty <= balanceQty + 1e-4;
}

// --- Controls: deviations + variation orders (Construction Cost OS Phase D) ---
// Deviations make scope/rate drift against the contract visible and governed;
// variation orders (the "additions") are the ONLY thing that mutates the
// billable ledger (`workPackageItems.variationQty`), and only after a recorded
// internal + client sign-off. A RATE deviation is document-and-approve only — it
// never overwrites the contract/work-package rate (non-negotiable Rule 5).

export const DeviationType = z.enum(["QTY", "RATE"]);
export type DeviationType = z.infer<typeof DeviationType>;

export const DEVIATION_TYPE_LABEL: Record<DeviationType, string> = {
  QTY: "Quantity deviation",
  RATE: "Rate deviation",
};

export const DeviationStatus = z.enum(["OPEN", "APPROVED", "REJECTED"]);
export type DeviationStatus = z.infer<typeof DeviationStatus>;

export const DEVIATION_STATUS_LABEL: Record<DeviationStatus, string> = {
  OPEN: "Open",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const DeviationSeverity = z.enum(["WITHIN_LIMIT", "WARNING", "APPROVAL_REQUIRED"]);
export type DeviationSeverity = z.infer<typeof DeviationSeverity>;

export const DEVIATION_SEVERITY_LABEL: Record<DeviationSeverity, string> = {
  WITHIN_LIMIT: "Within limit",
  WARNING: "Warning",
  APPROVAL_REQUIRED: "Approval required",
};

export const ReasonSource = z.enum([
  "CLIENT_DRIVEN",
  "SITE_CONDITION",
  "DESIGN_CHANGE",
  "MARKET_RATE",
  "ERROR",
  "OTHER",
]);
export type ReasonSource = z.infer<typeof ReasonSource>;

export const REASON_SOURCE_LABEL: Record<ReasonSource, string> = {
  CLIENT_DRIVEN: "Client-driven",
  SITE_CONDITION: "Site condition",
  DESIGN_CHANGE: "Design change",
  MARKET_RATE: "Market rate",
  ERROR: "Error / omission",
  OTHER: "Other",
};

export const VariationOriginator = z.enum([
  "CLIENT",
  "CONSULTANT",
  "CONTRACTOR",
  "SITE",
  "STATUTORY",
]);
export type VariationOriginator = z.infer<typeof VariationOriginator>;

export const VARIATION_ORIGINATOR_LABEL: Record<VariationOriginator, string> = {
  CLIENT: "Client",
  CONSULTANT: "Consultant",
  CONTRACTOR: "Contractor",
  SITE: "Site",
  STATUTORY: "Statutory",
};

export const VariationStatus = z.enum([
  "DRAFT",
  "SUBMITTED",
  "INTERNAL_APPROVED",
  "CLIENT_APPROVED",
  "APPLIED",
  "CLOSED",
  "REJECTED",
]);
export type VariationStatus = z.infer<typeof VariationStatus>;

export const VARIATION_STATUS_LABEL: Record<VariationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  INTERNAL_APPROVED: "Internal approved",
  CLIENT_APPROVED: "Client approved",
  APPLIED: "Applied",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

/** Quantity deviation of executed vs the BOQ baseline. pct is 0 when baseline ≤ 0. */
export function quantityDeviation(input: { boqQty: number; executedQty: number }): {
  deviationQty: number;
  deviationPct: number;
} {
  const deviationQty = Number((input.executedQty - input.boqQty).toFixed(4));
  const deviationPct =
    input.boqQty > 0 ? Number(((deviationQty / input.boqQty) * 100).toFixed(2)) : 0;
  return { deviationQty, deviationPct };
}

/** Rate deviation of a proposed revised rate vs the awarded/contract rate (paise).
 * pct is 0 when the awarded rate ≤ 0. */
export function rateDeviation(input: {
  awardedRatePaise: number;
  revisedRatePaise: number;
}): { deviationPaise: number; deviationPct: number } {
  const deviationPaise = Math.round(input.revisedRatePaise - input.awardedRatePaise);
  const deviationPct =
    input.awardedRatePaise > 0
      ? Number(((deviationPaise / input.awardedRatePaise) * 100).toFixed(2))
      : 0;
  return { deviationPaise, deviationPct };
}

/** Severity ladder from a deviation % (sign-agnostic): within limit / warning / needs approval. */
export function deviationSeverity(
  pct: number,
  opts: { warnPct?: number; approvePct?: number } = {},
): DeviationSeverity {
  const warnPct = opts.warnPct ?? 5;
  const approvePct = opts.approvePct ?? 10;
  const abs = Math.abs(pct);
  if (abs > approvePct) return "APPROVAL_REQUIRED";
  if (abs > warnPct) return "WARNING";
  return "WITHIN_LIMIT";
}

/** Signed cost impact (paise). QTY: deviationQty × rate; RATE: qty × (revised − awarded). */
export function deviationCostImpactPaise(input: {
  type: DeviationType;
  deviationQty?: number;
  ratePaise?: number;
  qty?: number;
  revisedRatePaise?: number;
  awardedRatePaise?: number;
}): number {
  if (input.type === "RATE") {
    return Math.round(
      (input.qty ?? 0) * ((input.revisedRatePaise ?? 0) - (input.awardedRatePaise ?? 0)),
    );
  }
  return Math.round((input.deviationQty ?? 0) * (input.ratePaise ?? 0));
}

/** Signed amount (paise) for a variation line — an omission (negative qty) yields a negative amount. */
export function variationItemAmountPaise(qty: number, ratePaise: number): number {
  return Math.round(qty * ratePaise);
}

// --- Rate-deviation ladder (Construction Cost OS 3.4) -----------------------
// A line's rate journey across the spine: estimated (design estimate) → tendered
// (office BOQ baseline) → awarded (winning bid) → revised (a RATE deviation).
// Pure presentation maths over rates already on the spine; Rule 5 still holds —
// a revised rate reaches bills only via a variation, never by overwriting.

/** One hop's signed % change; null when the baseline rung is absent (≤ 0 / null). */
function rateHopPct(fromPaise: number | null, toPaise: number | null): number | null {
  if (fromPaise == null || toPaise == null || fromPaise <= 0) return null;
  return Number((((toPaise - fromPaise) / fromPaise) * 100).toFixed(2));
}

export interface RateLadderHops {
  /** Estimate → tender baseline. */
  estToTenderPct: number | null;
  /** Tender baseline → awarded (winning bid). */
  tenderToAwardPct: number | null;
  /** Awarded → revised (RATE deviation). Equals `rateDeviation(...).deviationPct`. */
  awardToRevisedPct: number | null;
  /** Largest absolute hop % present (0 when no hop is computable). */
  maxAbsHopPct: number;
  severity: DeviationSeverity;
}

/**
 * Per-hop deviation across the rate ladder. Each rate is paise, or `null` when
 * that rung doesn't exist (line never estimated/tendered, or no revision yet).
 * Severity runs the existing `deviationSeverity` ladder over the largest hop.
 */
export function rateLadderHops(input: {
  estimatedPaise: number | null;
  tenderedPaise: number | null;
  awardedPaise: number | null;
  revisedPaise: number | null;
}): RateLadderHops {
  const estToTenderPct = rateHopPct(input.estimatedPaise, input.tenderedPaise);
  const tenderToAwardPct = rateHopPct(input.tenderedPaise, input.awardedPaise);
  const awardToRevisedPct = rateHopPct(input.awardedPaise, input.revisedPaise);
  const present = [estToTenderPct, tenderToAwardPct, awardToRevisedPct].filter(
    (p): p is number => p != null,
  );
  const maxAbsHopPct = present.length ? Math.max(...present.map((p) => Math.abs(p))) : 0;
  return {
    estToTenderPct,
    tenderToAwardPct,
    awardToRevisedPct,
    maxAbsHopPct,
    severity: deviationSeverity(maxAbsHopPct),
  };
}

/** The active (latest non-rejected) RATE deviation on a ladder row, if any. */
export interface RateLadderDeviation {
  id: string;
  ref: string;
  status: DeviationStatus;
  reason: string | null;
}

/** One work-package line's rate-ladder row for the read model. */
export interface RateLadderRow {
  workPackageId: string;
  workPackageItemId: string;
  ref: string;
  description: string;
  unit: string;
  estimatedPaise: number | null;
  tenderedPaise: number | null;
  awardedPaise: number | null;
  revisedPaise: number | null;
  hops: RateLadderHops;
  deviation: RateLadderDeviation | null;
}

/** Allowed forward transitions of a variation order's two-step approval ladder. */
export const VARIATION_FLOW: Record<VariationStatus, readonly VariationStatus[]> = {
  DRAFT: ["SUBMITTED", "REJECTED"],
  SUBMITTED: ["INTERNAL_APPROVED", "REJECTED"],
  INTERNAL_APPROVED: ["CLIENT_APPROVED", "REJECTED"],
  CLIENT_APPROVED: ["APPLIED", "REJECTED"],
  APPLIED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
};

/** Whether a variation order may move from one state to another. */
export function canTransitionVariation(from: VariationStatus, to: VariationStatus): boolean {
  return VARIATION_FLOW[from].includes(to);
}

export const DeviationCreate = z.object({
  projectId: z.string().uuid(),
  workPackageId: z.string().uuid(),
  /** The package line this deviation is measured against (baseline derived server-side). */
  workPackageItemId: z.string().uuid(),
  type: DeviationType,
  /** QTY: the executed / projected quantity. */
  executedQty: z.number().optional(),
  /** RATE: the proposed revised rate in paise (the contract rate is never overwritten). */
  revisedRatePaise: z.number().int().nonnegative().optional(),
  reason: z.string().min(2).max(2000),
  reasonSource: ReasonSource.default("OTHER"),
});
export type DeviationCreate = z.infer<typeof DeviationCreate>;

export const DeviationApprove = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
});
export type DeviationApprove = z.infer<typeof DeviationApprove>;

export const DeviationReject = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  reason: z.string().min(2).max(2000),
});
export type DeviationReject = z.infer<typeof DeviationReject>;

export const DeviationConvert = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string().min(2).max(200).optional(),
});
export type DeviationConvert = z.infer<typeof DeviationConvert>;

/** A variation line: adds qty to an existing package line, or introduces extra scope. */
export const VariationItemInput = z.object({
  /** Set to add qty to an existing package line; omit + isExtraItem for new scope. */
  workPackageItemId: z.string().uuid().nullable().optional(),
  isExtraItem: z.boolean().default(false),
  description: z.string().min(1).max(400),
  unit: z.string().min(1).max(20),
  /** Signed — negative for an omission. */
  qty: z.number(),
  ratePaise: z.number().int().nonnegative().default(0),
});
export type VariationItemInput = z.infer<typeof VariationItemInput>;

export const VariationCreate = z.object({
  projectId: z.string().uuid(),
  workPackageId: z.string().uuid(),
  title: z.string().min(2).max(200),
  reason: z.string().max(4000).optional(),
  originator: VariationOriginator.default("CLIENT"),
  timeImpactDays: z.number().int().default(0),
  billable: z.boolean().default(true),
  items: z.array(VariationItemInput).max(200).optional(),
});
export type VariationCreate = z.infer<typeof VariationCreate>;

export const VariationItemUpsert = VariationItemInput.extend({
  variationId: z.string().uuid(),
  /** Present = edit that line; absent = add a new line. */
  id: z.string().uuid().optional(),
});
export type VariationItemUpsert = z.infer<typeof VariationItemUpsert>;

export const VariationItemRemove = z.object({
  id: z.string().uuid(),
  variationId: z.string().uuid(),
});
export type VariationItemRemove = z.infer<typeof VariationItemRemove>;

/** Shared shape for a single-step workflow action on a variation order. */
const VariationStep = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
});

export const VariationSubmit = VariationStep;
export type VariationSubmit = z.infer<typeof VariationSubmit>;

export const VariationApproveInternal = VariationStep;
export type VariationApproveInternal = z.infer<typeof VariationApproveInternal>;

export const VariationApproveClient = VariationStep.extend({
  clientApprovedByName: z.string().max(200).optional(),
});
export type VariationApproveClient = z.infer<typeof VariationApproveClient>;

export const VariationApply = VariationStep;
export type VariationApply = z.infer<typeof VariationApply>;

export const VariationClose = VariationStep;
export type VariationClose = z.infer<typeof VariationClose>;

export const VariationReject = VariationStep.extend({
  reason: z.string().min(2).max(2000),
});
export type VariationReject = z.infer<typeof VariationReject>;

/** Default APBF Layer 2 live stages keyed by phase code. */
export const DEFAULT_LIVE_STAGES: Record<string, { code: string; label: string }[]> = {
  CONSTRUCTION_ADMINISTRATION: [
    { code: "SITE_KICKOFF", label: "Site kick-off" },
    { code: "MONITORING", label: "Construction monitoring" },
    { code: "SITE_QUERIES", label: "Site queries" },
    { code: "MATERIAL_APPROVALS", label: "Material approvals" },
    { code: "SNAG_REVIEW", label: "Snag review" },
  ],
  HANDOVER_CLOSEOUT: [
    { code: "FINAL_INSPECTION", label: "Final inspection" },
    { code: "SNAG_CLOSURE", label: "Snag closure" },
    { code: "AS_BUILT", label: "As-built documentation" },
    { code: "HANDOVER", label: "Handover" },
    { code: "CLOSURE", label: "Project closure" },
  ],
};
