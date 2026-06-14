import { z } from "zod";

/** Consultant-originated collaborator-portal submission kinds. */
export const ConsultantSubmissionKind = z.enum(["DELIVERABLE", "RFI", "NOTE"]);
export type ConsultantSubmissionKind = z.infer<typeof ConsultantSubmissionKind>;

export const CONSULTANT_SUBMISSION_KIND_LABEL: Record<ConsultantSubmissionKind, string> = {
  DELIVERABLE: "Deliverable",
  RFI: "RFI",
  NOTE: "Note",
};

export const CONSULTANT_SUBMISSION_KIND_TAG: Record<
  ConsultantSubmissionKind,
  "green" | "magenta" | "blue"
> = {
  DELIVERABLE: "green",
  RFI: "magenta",
  NOTE: "blue",
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
  kind: ConsultantSubmissionKind,
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().max(4000).optional(),
  objectType: z.string().trim().max(40).optional(),
  objectId: z.string().uuid().optional(),
});
export type ConsultantSubmitInput = z.infer<typeof ConsultantSubmitInput>;
