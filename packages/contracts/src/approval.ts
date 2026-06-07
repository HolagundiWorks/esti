import { z } from "zod";

/**
 * Approval / issue log (roadmap esti_approval). Tracks what was issued to a
 * client or authority for sign-off — a drawing set, a fee proposal, a statutory
 * submission — with the channel, recipient, status and superseded history.
 */
export const APPROVAL_ENTITY_TYPES = {
  DRAWING: "Drawing set",
  FEE_PROPOSAL: "Fee proposal",
  PERMIT: "Statutory submission",
  OTHER: "Other",
} as const;
export type ApprovalEntityTypeCode = keyof typeof APPROVAL_ENTITY_TYPES;
export const ApprovalEntityType = z.enum(
  Object.keys(APPROVAL_ENTITY_TYPES) as [ApprovalEntityTypeCode, ...ApprovalEntityTypeCode[]],
);

export const APPROVAL_CHANNELS = {
  EMAIL: "Email",
  PRINT: "Printed set",
  PORTAL: "Client portal",
  WHATSAPP: "WhatsApp",
  IN_PERSON: "In person",
} as const;
export type ApprovalChannelCode = keyof typeof APPROVAL_CHANNELS;
export const ApprovalChannel = z.enum(
  Object.keys(APPROVAL_CHANNELS) as [ApprovalChannelCode, ...ApprovalChannelCode[]],
);

export const ApprovalStatus = z.enum([
  "DRAFT",
  "SENT",
  "APPROVED",
  "REVISIONS",
  "REJECTED",
  "SUPERSEDED",
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatus>;

export const ApprovalCreate = z.object({
  projectId: z.string().uuid(),
  entityType: ApprovalEntityType,
  title: z.string().min(1).max(200),
  recipient: z.string().max(160).optional(),
  channel: ApprovalChannel,
  sentDate: z.string().nullable().optional(),
  remarks: z.string().max(1000).optional(),
  /** The approval this one supersedes (revision chain). */
  supersedesId: z.string().uuid().nullable().optional(),
});
export type ApprovalCreate = z.infer<typeof ApprovalCreate>;

export const ApprovalUpdate = z.object({
  id: z.string().uuid(),
  status: ApprovalStatus.optional(),
  responseDate: z.string().nullable().optional(),
  remarks: z.string().max(1000).optional(),
});
export type ApprovalUpdate = z.infer<typeof ApprovalUpdate>;
