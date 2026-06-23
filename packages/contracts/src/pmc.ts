import { z } from "zod";
import { ProgrammeProjectParams } from "./programme.js";

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

export const RunningBillCreate = z.object({
  projectId: z.string().uuid(),
  contractorId: z.string().uuid().optional(),
  title: z.string().min(2).max(200),
  measurementDate: z.string().date().optional(),
  notes: z.string().max(4000).optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(400),
    unit: z.string().min(1).max(20),
    qty: z.number().nonnegative(),
    ratePaise: z.number().int().nonnegative().default(0),
  })).min(1).max(100),
});
export type RunningBillCreate = z.infer<typeof RunningBillCreate>;

export const RunningBillAdvance = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  status: RunningBillStatus,
  note: z.string().max(2000).optional(),
});
export type RunningBillAdvance = z.infer<typeof RunningBillAdvance>;

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
