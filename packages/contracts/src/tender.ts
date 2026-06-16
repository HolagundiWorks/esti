import { z } from "zod";
import { ContractorCategory } from "./contractor.js";

/**
 * Tender packages and contractor invitations (roadmap Phase 7). A tender is
 * raised on a project for a trade scope; contractors from the register are
 * invited, and (later) submit sealed bids. Each invitation carries an access
 * token so a contractor portal can be isolated per invitation/project.
 */
export const TenderStatus = z.enum(["DRAFT", "OPEN", "CLOSED", "AWARDED", "CANCELLED"]);
export type TenderStatus = z.infer<typeof TenderStatus>;

export const TENDER_STATUS_LABEL: Record<TenderStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open for bids",
  CLOSED: "Closed",
  AWARDED: "Awarded",
  CANCELLED: "Cancelled",
};

export const TENDER_STATUS_TAG: Record<TenderStatus, "gray" | "blue" | "magenta" | "green" | "red"> = {
  DRAFT: "gray",
  OPEN: "blue",
  CLOSED: "magenta",
  AWARDED: "green",
  CANCELLED: "red",
};

export const TenderInvitationStatus = z.enum(["INVITED", "VIEWED", "SUBMITTED", "DECLINED", "WITHDRAWN"]);
export type TenderInvitationStatus = z.infer<typeof TenderInvitationStatus>;

export const TENDER_INVITATION_STATUS_LABEL: Record<TenderInvitationStatus, string> = {
  INVITED: "Invited",
  VIEWED: "Viewed",
  SUBMITTED: "Bid submitted",
  DECLINED: "Declined",
  WITHDRAWN: "Withdrawn",
};

export const TENDER_INVITATION_STATUS_TAG: Record<TenderInvitationStatus, "gray" | "blue" | "green" | "red" | "cool-gray"> = {
  INVITED: "blue",
  VIEWED: "cool-gray",
  SUBMITTED: "green",
  DECLINED: "red",
  WITHDRAWN: "gray",
};

export const TenderCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  category: ContractorCategory.optional(),
  scope: z.string().trim().max(4000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  instructions: z.string().trim().max(4000).optional(),
});
export type TenderCreate = z.infer<typeof TenderCreate>;

export const TenderUpdate = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  scope: z.string().trim().max(4000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  instructions: z.string().trim().max(4000).optional(),
  status: TenderStatus.optional(),
  awardedContractorId: z.string().uuid().optional().or(z.literal("")),
});
export type TenderUpdate = z.infer<typeof TenderUpdate>;

export const TenderInvite = z.object({
  tenderId: z.string().uuid(),
  contractorId: z.string().uuid(),
});
export type TenderInvite = z.infer<typeof TenderInvite>;

/** A contractor's bid submitted via their magic-link invitation token. */
export const ContractorBidByToken = z.object({
  token: z.string().min(10).max(96),
  amountPaise: z.number().int().nonnegative(),
  completionWeeks: z.number().int().min(0).max(520).optional(),
  technicalScore: z.number().int().min(0).max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type ContractorBidByToken = z.infer<typeof ContractorBidByToken>;

/** A sealed bid recorded against an invitation (commercial + technical). */
export const TenderBidInput = z.object({
  invitationId: z.string().uuid(),
  amountPaise: z.number().int().nonnegative(),
  completionWeeks: z.number().int().min(0).max(520).optional(),
  technicalScore: z.number().int().min(0).max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type TenderBidInput = z.infer<typeof TenderBidInput>;
