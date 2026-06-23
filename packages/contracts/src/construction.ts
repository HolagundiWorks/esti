import { z } from "zod";

/** Contractor → firm construction coordination items (Phase 7). */
export const ConstructionKind = z.enum([
  "QUERY",
  "RFI",
  "MATERIAL_SUBMITTAL",
  "SHOP_DRAWING",
  "INSPECTION_REQUEST",
  "SITE_INSTRUCTION",
  "SNAG",
  "NCR",
]);
export type ConstructionKind = z.infer<typeof ConstructionKind>;

export const CONSTRUCTION_KIND_LABEL: Record<ConstructionKind, string> = {
  QUERY: "Query",
  RFI: "RFI",
  MATERIAL_SUBMITTAL: "Material submittal",
  SHOP_DRAWING: "Shop drawing",
  INSPECTION_REQUEST: "Inspection request",
  SITE_INSTRUCTION: "Site instruction",
  SNAG: "Snag",
  NCR: "Non-conformance (NCR)",
};

export const ConstructionStatus = z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "DECLINED"]);
export type ConstructionStatus = z.infer<typeof ConstructionStatus>;

export const CONSTRUCTION_STATUS_LABEL: Record<ConstructionStatus, string> = {
  OPEN: "Open",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
  DECLINED: "Declined",
};

export const ConstructionSubmit = z.object({
  kind: ConstructionKind,
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().max(8000).optional(),
});
export type ConstructionSubmit = z.infer<typeof ConstructionSubmit>;

export const ConstructionSubmitByToken = ConstructionSubmit.extend({
  token: z.string().min(10).max(96),
});
export type ConstructionSubmitByToken = z.infer<typeof ConstructionSubmitByToken>;

export const ConstructionRespond = z.object({
  id: z.string().uuid(),
  status: ConstructionStatus,
  responseNote: z.string().trim().max(4000).optional(),
});
export type ConstructionRespond = z.infer<typeof ConstructionRespond>;

export { ConstructionReview, SubmittalReviewCode, SUBMITTAL_REVIEW_LABEL } from "./pmc.js";
