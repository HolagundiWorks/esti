import { z } from "zod";
import { FeeProposalStatus, ProjectStatus, type TagColor } from "./schemas.js";

/**
 * Project OS — orchestration layer.
 *
 *   Slice G: draft-project state machine (ENQUIRY → PROPOSAL → ACTIVE …).
 *   Slice I: client approval gate on the fee proposal.
 *   Slice K: project activation pre-flight gate.
 *
 * The transition rules and the activation gate are pure functions so they can be
 * unit-tested and shared between the backend (enforcement) and the UI (hints).
 */

// --- Slice I: client approval gate on the fee proposal ----------------------

export const ClientApprovalStatus = z.enum(["PENDING", "APPROVED", "REJECTED", "ON_HOLD"]);
export type ClientApprovalStatus = z.infer<typeof ClientApprovalStatus>;
export const CLIENT_APPROVAL_STATUS_LABEL: Record<ClientApprovalStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ON_HOLD: "On hold",
};
export const CLIENT_APPROVAL_STATUS_TAG: Record<
  ClientApprovalStatus,
  "blue" | "green" | "red" | "gray"
> = {
  PENDING: "blue",
  APPROVED: "green",
  REJECTED: "red",
  ON_HOLD: "gray",
};

export const FeeProposalSetClientApproval = z.object({
  id: z.string().uuid(),
  clientApprovalStatus: ClientApprovalStatus,
  approvalNotes: z.string().max(2000).optional(),
});
export type FeeProposalSetClientApproval = z.infer<typeof FeeProposalSetClientApproval>;

// --- Internal proposal workflow (esti_proposal.status) -----------------------
// Distinct from the client approval gate above: this is the firm's own
// draft → principal sign-off → sent-to-client → revise lifecycle (SOP-03/04).

export const FEE_PROPOSAL_STATUS_LABEL: Record<FeeProposalStatus, string> = {
  DRAFT: "Draft",
  INTERNAL_REVIEW: "Internal review",
  APPROVED: "Approved — ready to send",
  CLIENT_SUBMISSION: "Sent to client",
  REVISED: "Needs revision",
};

export const FEE_PROPOSAL_STATUS_TAG: Record<FeeProposalStatus, TagColor> = {
  DRAFT: "gray",
  INTERNAL_REVIEW: "blue",
  APPROVED: "green",
  CLIENT_SUBMISSION: "green",
  REVISED: "magenta",
};

/** Allowed manual transitions for the internal proposal workflow. */
export const FEE_PROPOSAL_TRANSITIONS: Record<FeeProposalStatus, FeeProposalStatus[]> = {
  DRAFT: ["INTERNAL_REVIEW"],
  INTERNAL_REVIEW: ["APPROVED", "REVISED", "DRAFT"],
  APPROVED: ["CLIENT_SUBMISSION", "REVISED"],
  CLIENT_SUBMISSION: ["REVISED"],
  REVISED: ["DRAFT", "INTERNAL_REVIEW"],
};

export function canTransitionFeeProposal(
  from: FeeProposalStatus,
  to: FeeProposalStatus,
): boolean {
  if (from === to) return true;
  return FEE_PROPOSAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export const FeeProposalSetStatus = z.object({
  id: z.string().uuid(),
  status: FeeProposalStatus,
  note: z.string().max(2000).optional(),
});
export type FeeProposalSetStatus = z.infer<typeof FeeProposalSetStatus>;

// --- Slice G: draft-project state machine -----------------------------------

/**
 * Allowed manual status transitions via `projectOffice.updateStatus`.
 * ENQUIRY → PROPOSAL requires DNA (checked in the procedure, not here).
 * PROPOSAL → ACTIVE is intentionally NOT here — activation runs through the
 * dedicated `projectOffice.activate` gate (Slice K).
 */
export const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  ENQUIRY: ["PROPOSAL", "CANCELLED"],
  PROPOSAL: ["ENQUIRY", "ON_HOLD", "CANCELLED"],
  ACTIVE: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["ACTIVE", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["ENQUIRY"],
};

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  if (from === to) return true;
  return PROJECT_TRANSITIONS[from]?.includes(to) ?? false;
}

export const ProjectSetStatus = z.object({
  id: z.string().uuid(),
  status: ProjectStatus,
});
export type ProjectSetStatus = z.infer<typeof ProjectSetStatus>;

// --- Slice K: activation pre-flight gate ------------------------------------

export const ProjectOfficeActivate = z.object({
  id: z.string().uuid(),
});
export type ProjectOfficeActivate = z.infer<typeof ProjectOfficeActivate>;

export interface ActivationGateInput {
  status: ProjectStatus;
  hasDna: boolean;
  hasAssessment: boolean;
  feeApproved: boolean;
  onboardingComplete: boolean;
  advancePaid: boolean;
}

export interface ActivationGateCheck {
  key: string;
  label: string;
  ok: boolean;
}

export interface ActivationGateResult {
  ok: boolean;
  checks: ActivationGateCheck[];
  /** First failing reason, for a concise error message. */
  blockingReason: string | null;
}

/**
 * Evaluate whether a draft project may be activated. Pure: the backend feeds it
 * booleans gathered from the spine and enforces `ok`; the UI shows the checklist.
 */
export function evaluateActivationGate(input: ActivationGateInput): ActivationGateResult {
  const checks: ActivationGateCheck[] = [
    { key: "status", label: "Project is in PROPOSAL stage", ok: input.status === "PROPOSAL" },
    { key: "dna", label: "Project DNA captured", ok: input.hasDna },
    { key: "assessment", label: "Pre-project assessment recorded", ok: input.hasAssessment },
    { key: "fee", label: "Fee proposal approved by client", ok: input.feeApproved },
    { key: "onboarding", label: "Client onboarding complete", ok: input.onboardingComplete },
    { key: "advance", label: "Advance payment received", ok: input.advancePaid },
  ];
  const firstFail = checks.find((c) => !c.ok);
  return {
    ok: !firstFail,
    checks,
    blockingReason: firstFail ? firstFail.label : null,
  };
}
