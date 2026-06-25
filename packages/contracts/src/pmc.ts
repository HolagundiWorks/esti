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
