import { z } from "zod";
import { ContractorCategory } from "./contractor.js";
import { CostHead } from "./estimation.js";

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

export const TenderDocumentKind = z.enum(["DRAWING", "SPEC", "BOQ", "ADDENDUM", "OTHER"]);
export type TenderDocumentKind = z.infer<typeof TenderDocumentKind>;

export const TENDER_DOCUMENT_KIND_LABEL: Record<TenderDocumentKind, string> = {
  DRAWING: "Drawing",
  SPEC: "Specification",
  BOQ: "BOQ",
  ADDENDUM: "Addendum",
  OTHER: "Other",
};

export const TENDER_DOC_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".dwg", ".zip", ".docx"] as const;
export const TENDER_DOC_MAX_BYTES = 25 * 1024 * 1024;

export const TenderDocumentRegister = z.object({
  tenderId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  kind: TenderDocumentKind.default("OTHER"),
  fileName: z.string().min(1).max(260),
  storageKey: z.string().min(1).max(500),
  addendumNo: z.number().int().min(1).max(99).optional(),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type TenderDocumentRegister = z.infer<typeof TenderDocumentRegister>;

export const TenderDeclineByToken = z.object({
  token: z.string().min(10).max(96),
});
export type TenderDeclineByToken = z.infer<typeof TenderDeclineByToken>;

export const TenderAckDocument = z.object({
  token: z.string().min(10).max(96),
  documentId: z.string().uuid(),
});
export type TenderAckDocument = z.infer<typeof TenderAckDocument>;

// --- Item-wise (BOQ-line) tendering — Construction Cost OS Phase A+B ----------
// A tender can carry BOQ line items (carved from a frozen estimate version, or
// added manually). Contractors then quote a rate per line; the header bid amount
// is the sum of line amounts. Award seeds a work package from the winning rates.

/** Carve item-wise BOQ lines for a tender from a frozen estimate version. */
export const TenderItemsFromEstimate = z.object({
  tenderId: z.string().uuid(),
  estimateVersionId: z.string().uuid(),
  /** Optional cost-head filter; empty/omitted = every head. */
  costHeads: z.array(CostHead).optional(),
});
export type TenderItemsFromEstimate = z.infer<typeof TenderItemsFromEstimate>;

/** Add a manual tender BOQ line (DRAFT only). `estRatePaise` is the office
 *  baseline — never shown to contractors. */
export const TenderItemAdd = z.object({
  tenderId: z.string().uuid(),
  description: z.string().trim().min(1).max(400),
  unit: z.string().trim().min(1).max(20),
  qty: z.number().nonnegative(),
  estRatePaise: z.number().int().nonnegative().default(0),
  sortOrder: z.number().int().default(0),
});
export type TenderItemAdd = z.infer<typeof TenderItemAdd>;

export const TenderItemUpdate = z.object({
  id: z.string().uuid(),
  description: z.string().trim().min(1).max(400).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  qty: z.number().nonnegative().optional(),
  estRatePaise: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
});
export type TenderItemUpdate = z.infer<typeof TenderItemUpdate>;

/** A single tender BOQ line quoted by a contractor. */
export const TenderBidItemLine = z.object({
  tenderItemId: z.string().uuid(),
  ratePaise: z.number().int().nonnegative(),
});
export type TenderBidItemLine = z.infer<typeof TenderBidItemLine>;

/** Item-wise bid recorded by office staff against an invitation. */
export const TenderItemBidInput = z.object({
  invitationId: z.string().uuid(),
  items: z.array(TenderBidItemLine).min(1).max(1000),
});
export type TenderItemBidInput = z.infer<typeof TenderItemBidInput>;

/** Item-wise bid submitted by the contractor via the login portal (the
 *  invitation is resolved server-side from ctx.user.contractorId). */
export const TenderItemBidSubmit = z.object({
  items: z.array(TenderBidItemLine).min(1).max(1000),
});
export type TenderItemBidSubmit = z.infer<typeof TenderItemBidSubmit>;

// --- Pure helpers (unit-tested) ----------------------------------------------

/** Line amount in paise: qty × rate, rounded (mirrors the work-package spine). */
export function tenderItemAmount(qty: number, ratePaise: number): number {
  return Math.round(qty * ratePaise);
}

/** Total of an item-wise bid: Σ over priced lines (qty from the tender item). */
export function bidTotalFromItems(items: { qty: number; ratePaise: number }[]): number {
  return items.reduce((sum, it) => sum + tenderItemAmount(it.qty, it.ratePaise), 0);
}

/**
 * Rank contractor bid totals ascending — lowest is rank 1. Ties share the
 * lowest flag. Returns a new array sorted cheapest-first; input is not mutated.
 */
export function rankBids<T extends { totalPaise: number }>(
  totals: T[],
): (T & { rank: number; lowest: boolean })[] {
  const sorted = [...totals].sort((a, b) => a.totalPaise - b.totalPaise);
  const min = sorted.length ? sorted[0]!.totalPaise : 0;
  return sorted.map((t, i) => ({ ...t, rank: i + 1, lowest: t.totalPaise === min }));
}
