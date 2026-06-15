import { z } from "zod";

// DELIVERABLE / RFI / NOTE are consultant-originated; TASK is firm-assigned to
// the consultant (the firm authors it, the consultant completes it).
export const ConsultantSubmissionKind = z.enum(["DELIVERABLE", "RFI", "NOTE", "TASK"]);
export type ConsultantSubmissionKind = z.infer<typeof ConsultantSubmissionKind>;

/** Kinds a consultant can raise themselves (excludes firm-assigned TASK). */
export const ConsultantOriginKind = z.enum(["DELIVERABLE", "RFI", "NOTE"]);
export type ConsultantOriginKind = z.infer<typeof ConsultantOriginKind>;

export const CONSULTANT_SUBMISSION_KIND_LABEL: Record<ConsultantSubmissionKind, string> = {
  DELIVERABLE: "Deliverable",
  RFI: "RFI",
  NOTE: "Note",
  TASK: "Assigned task",
};

export const CONSULTANT_SUBMISSION_KIND_TAG: Record<
  ConsultantSubmissionKind,
  "green" | "magenta" | "blue" | "purple"
> = {
  DELIVERABLE: "green",
  RFI: "magenta",
  NOTE: "blue",
  TASK: "purple",
};

// Firm-side triage shares the portal submission lifecycle.
export {
  PortalSubmissionStatus as ConsultantSubmissionStatus,
  PORTAL_SUBMISSION_STATUS_LABEL as CONSULTANT_SUBMISSION_STATUS_LABEL,
  PORTAL_SUBMISSION_STATUS_TAG as CONSULTANT_SUBMISSION_STATUS_TAG,
} from "./portal.js";

// ─── collaborator-side mutation inputs ──────────────────────────────────────

export const ConsultantSubmitInput = z.object({
  projectId: z.string().uuid(),
  kind: ConsultantOriginKind,
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().max(4000).optional(),
  objectType: z.string().trim().max(40).optional(),
  objectId: z.string().uuid().optional(),
});
export type ConsultantSubmitInput = z.infer<typeof ConsultantSubmitInput>;

// ─── firm-side: assign a task to a consultant ───────────────────────────────

export const ConsultantAssignInput = z.object({
  projectId: z.string().uuid(),
  consultantId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().max(4000).optional(),
});
export type ConsultantAssignInput = z.infer<typeof ConsultantAssignInput>;
