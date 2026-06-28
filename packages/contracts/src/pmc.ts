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
