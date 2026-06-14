import { z } from "zod";

/** Client-originated portal submission kinds. */
export const PortalSubmissionKind = z.enum([
  "ACKNOWLEDGEMENT",
  "CHANGE_REQUEST",
  "FEEDBACK",
]);
export type PortalSubmissionKind = z.infer<typeof PortalSubmissionKind>;

export const PORTAL_SUBMISSION_KIND_LABEL: Record<PortalSubmissionKind, string> = {
  ACKNOWLEDGEMENT: "Acknowledgement",
  CHANGE_REQUEST: "Change request",
  FEEDBACK: "Feedback",
};

/** Firm-side triage state for a submission. */
export const PortalSubmissionStatus = z.enum([
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "DECLINED",
]);
export type PortalSubmissionStatus = z.infer<typeof PortalSubmissionStatus>;

export const PORTAL_SUBMISSION_STATUS_LABEL: Record<PortalSubmissionStatus, string> = {
  OPEN: "Open",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
  DECLINED: "Declined",
};

export const PORTAL_SUBMISSION_STATUS_TAG: Record<
  PortalSubmissionStatus,
  "blue" | "teal" | "green" | "gray"
> = {
  OPEN: "blue",
  ACKNOWLEDGED: "teal",
  RESOLVED: "green",
  DECLINED: "gray",
};

/** The decisions a client may record against a sent approval. */
export const PortalApprovalDecision = z.enum(["APPROVED", "REVISIONS", "REJECTED"]);
export type PortalApprovalDecision = z.infer<typeof PortalApprovalDecision>;

// ─── client-side mutation inputs ────────────────────────────────────────────

export const PortalApprovalRespondInput = z.object({
  approvalId: z.string().uuid(),
  decision: PortalApprovalDecision,
  remarks: z.string().trim().max(2000).optional(),
});
export type PortalApprovalRespondInput = z.infer<typeof PortalApprovalRespondInput>;

export const PortalAcknowledgeInput = z.object({
  projectId: z.string().uuid(),
  objectType: z.string().trim().min(1).max(40),
  objectId: z.string().uuid().optional(),
  subject: z.string().trim().min(1).max(200),
});
export type PortalAcknowledgeInput = z.infer<typeof PortalAcknowledgeInput>;

export const PortalChangeRequestInput = z.object({
  projectId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000),
  objectType: z.string().trim().max(40).optional(),
  objectId: z.string().uuid().optional(),
});
export type PortalChangeRequestInput = z.infer<typeof PortalChangeRequestInput>;

export const PortalFeedbackInput = z.object({
  projectId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().max(4000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});
export type PortalFeedbackInput = z.infer<typeof PortalFeedbackInput>;
