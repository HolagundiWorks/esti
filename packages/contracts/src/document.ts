import { z } from "zod";

/** Issuable document kinds surfaced in the unified register. */
export const DocumentEntityType = z.enum([
  "LETTER",
  "CONTRACT",
  "PROPOSAL",
  "TRANSMITTAL",
  "INSPECTION",
  "SPEC_SHEET",
  "MOOD_BOARD",
  "ESTIMATE",
  "MOM",
  "FEE_PROPOSAL",
]);
export type DocumentEntityType = z.infer<typeof DocumentEntityType>;

export const DOCUMENT_ENTITY_LABEL: Record<DocumentEntityType, string> = {
  LETTER: "Letter",
  CONTRACT: "Contract",
  PROPOSAL: "Proposal",
  TRANSMITTAL: "Transmittal",
  INSPECTION: "Site report",
  SPEC_SHEET: "Specification",
  MOOD_BOARD: "Mood board",
  ESTIMATE: "BOQ / estimate",
  MOM: "Meeting minutes",
  FEE_PROPOSAL: "Fee proposal",
};

export const DocumentIssueStatus = z.enum(["DRAFT", "ISSUED", "SUPERSEDED"]);
export type DocumentIssueStatus = z.infer<typeof DocumentIssueStatus>;

/** Per-scope numbering override stored on org settings. */
export const NumberingPattern = z.object({
  prefix: z.string().min(1).max(12).optional(),
  padding: z.number().int().min(2).max(8).optional(),
});
export type NumberingPattern = z.infer<typeof NumberingPattern>;

export const NumberingPatterns = z.record(z.string(), NumberingPattern);
export type NumberingPatterns = z.infer<typeof NumberingPatterns>;

export const DEFAULT_NUMBERING_SCOPES: Record<string, { prefix: string; padding: number }> = {
  letter: { prefix: "LTR", padding: 4 },
  contract: { prefix: "CTR", padding: 4 },
  transmittal: { prefix: "TRN", padding: 4 },
  inspection: { prefix: "SIR", padding: 4 },
  specsheet: { prefix: "SPC", padding: 4 },
  moodboard: { prefix: "MOOD", padding: 4 },
  estimate: { prefix: "EST", padding: 4 },
  proposal: { prefix: "PRP", padding: 4 },
  feeproposal: { prefix: "FEE", padding: 4 },
  mom: { prefix: "MOM", padding: 4 },
  bbs: { prefix: "BBS", padding: 4 },
};

export const OfficeTemplateKind = z.enum(["LETTER", "SCOPE", "COA", "MOM"]);
export type OfficeTemplateKind = z.infer<typeof OfficeTemplateKind>;

export const OFFICE_TEMPLATE_KIND_LABEL: Record<OfficeTemplateKind, string> = {
  LETTER: "Letter",
  SCOPE: "Scope of work",
  COA: "COA proposal scope",
  MOM: "Meeting minutes",
};

export const OfficeTemplateCreate = z.object({
  kind: OfficeTemplateKind,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(50000),
  tags: z.string().max(500).optional(),
});
export type OfficeTemplateCreate = z.infer<typeof OfficeTemplateCreate>;

export const MomCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  meetingDate: z.string().date().optional(),
  venue: z.string().max(300).optional(),
  attendees: z.string().max(2000).optional(),
  minutes: z.string().max(50000).default(""),
});
export type MomCreate = z.infer<typeof MomCreate>;

export const MomActionCreate = z.object({
  momId: z.string().uuid(),
  description: z.string().min(1).max(2000),
  assigneeName: z.string().max(120).optional(),
  dueDate: z.string().date().optional(),
});
export type MomActionCreate = z.infer<typeof MomActionCreate>;

export const InspectionActionCreate = z.object({
  inspectionId: z.string().uuid(),
  description: z.string().min(1).max(2000),
  assigneeName: z.string().max(120).optional(),
  dueDate: z.string().date().optional(),
});
export type InspectionActionCreate = z.infer<typeof InspectionActionCreate>;

export const DocumentReviseInput = z.object({
  entityType: DocumentEntityType,
  entityId: z.string().uuid(),
  revisionNote: z.string().min(1).max(2000),
  impactNote: z.string().max(2000).optional(),
});
export type DocumentReviseInput = z.infer<typeof DocumentReviseInput>;

export const DocumentRegisterFilter = z.object({
  entityType: DocumentEntityType.optional(),
  projectId: z.string().uuid().optional(),
  status: DocumentIssueStatus.optional(),
  limit: z.number().int().min(1).max(500).default(200),
});
export type DocumentRegisterFilter = z.infer<typeof DocumentRegisterFilter>;

export const INSPECTION_ACTION_STATUS = z.enum(["OPEN", "DONE"]);
export const MOM_ACTION_STATUS = z.enum(["OPEN", "DONE"]);
