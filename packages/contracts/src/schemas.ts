import { z } from "zod";
import { CoaWorkCategory } from "./coa.js";
import { GstSystem } from "./gst.js";

export const ProjectType = z.enum([
  "Residential Architecture",
  "Commercial Architecture",
  "Institutional Architecture",
  "Healthcare Architecture",
  "Hospitality Architecture",
  "Industrial Architecture",
  "Educational Architecture",
  "Landscape Architecture",
  "Religious Architecture",
  "Urban Design & Planning",
  "Interior Architecture",
  "Transportation Architecture",
  "Cultural Architecture",
  "Sustainable / Green Architecture",
  "Recreational Architecture",
  "Mixed-Use Architecture",
  "Heritage Conservation Architecture",
  "Public Architecture",
  "Infrastructure Architecture",
  "Experimental / Conceptual Architecture",
]);
export type ProjectType = z.infer<typeof ProjectType>;

/** Discipline / engagement type — orthogonal to the building-use ProjectType. */
export const ProjectWorkType = z.enum(["ARCHITECTURE", "INTERIOR", "LANDSCAPE", "MISC"]);
export type ProjectWorkType = z.infer<typeof ProjectWorkType>;

export const PROJECT_WORK_TYPE_LABEL: Record<ProjectWorkType, string> = {
  ARCHITECTURE: "Architecture Consultancy",
  INTERIOR: "Interior Consultancy",
  LANDSCAPE: "Landscape",
  MISC: "Miscellaneous",
};

export const Jurisdiction = z.enum(["BBMP", "BDA", "PANCHAYAT", "HMDA", "CMDA", "OTHER"]);

export const ProjectStatus = z.enum(["ENQUIRY", "PROPOSAL", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  ENQUIRY: "Enquiry",
  PROPOSAL: "Proposal",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// General architectural project delivery stages. Fee-reference logic is separate.
export const PhaseCode = z.enum([
  "INITIATION",
  "CONCEPT_DESIGN",
  "DESIGN_DEVELOPMENT",
  "STATUTORY_COORDINATION",
  "CONSTRUCTION_DOCUMENTATION",
  "TENDER_APPOINTMENT",
  "CONSTRUCTION_ADMINISTRATION",
  "HANDOVER_CLOSEOUT",
]);
export type PhaseCode = z.infer<typeof PhaseCode>;

/** Neutral default delivery plan. Allocation percentages are editable and sum to 100. */
export const DEFAULT_PHASE_PLAN: { code: PhaseCode; label: string; billingPct: number }[] = [
  { code: "INITIATION", label: "Initiation & Brief", billingPct: 5 },
  { code: "CONCEPT_DESIGN", label: "Concept Design", billingPct: 10 },
  { code: "DESIGN_DEVELOPMENT", label: "Design Development", billingPct: 15 },
  { code: "STATUTORY_COORDINATION", label: "Statutory Coordination", billingPct: 15 },
  { code: "CONSTRUCTION_DOCUMENTATION", label: "Construction Documentation", billingPct: 20 },
  { code: "TENDER_APPOINTMENT", label: "Tender & Appointment", billingPct: 10 },
  { code: "CONSTRUCTION_ADMINISTRATION", label: "Construction Administration", billingPct: 20 },
  { code: "HANDOVER_CLOSEOUT", label: "Handover & Closeout", billingPct: 5 },
];

export const ProjectOfficeCreate = z.object({
  title: z.string().min(2).max(200),
  projectType: ProjectType,
  workType: ProjectWorkType.default("ARCHITECTURE"),
  jurisdiction: Jurisdiction.default("OTHER"),
  clientId: z.string().uuid().nullish(),
  state: z.string().max(64).nullish(),
  district: z.string().max(128).nullish(),
  city: z.string().max(128).nullish(),
  pin: z.string().regex(/^\d{6}$/).nullish(),
  siteAddress: z.string().max(400).nullish(),
  siteAreaSqm: z.number().nonnegative().nullish(),
  contractValuePaise: z.number().int().nonnegative().default(0),
  dateStart: z.string().date().nullish(),
});
export type ProjectOfficeCreate = z.infer<typeof ProjectOfficeCreate>;

/** Editable site details on a project (drives the bylaw calculator). */
export const ProjectSiteUpdate = z.object({
  id: z.string().uuid(),
  siteAddress: z.string().max(400).nullish(),
  siteAreaSqm: z.number().nonnegative().nullish(),
});
export type ProjectSiteUpdate = z.infer<typeof ProjectSiteUpdate>;

export const ProjectOffice = ProjectOfficeCreate.extend({
  id: z.string().uuid(),
  ref: z.string(),
  status: ProjectStatus,
  createdAt: z.string().datetime(),
});
export type ProjectOffice = z.infer<typeof ProjectOffice>;

export const ListParams = z.object({
  search: z.string().optional(),
  status: ProjectStatus.optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});
export type ListParams = z.infer<typeof ListParams>;

// --- Clients (esti_clientlog) ---

export const ClientKind = z.enum(["INDIVIDUAL", "COMPANY"]);
export type ClientKind = z.infer<typeof ClientKind>;

/** Indian GSTIN: 2-digit state + 10-char PAN + entity + 'Z' + checksum. */
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const ClientCreate = z.object({
  name: z.string().min(2).max(200),
  kind: ClientKind.default("INDIVIDUAL"),
  gstin: z.string().regex(GSTIN_RE, "Invalid GSTIN").optional(),
  pan: z.string().regex(PAN_RE, "Invalid PAN").optional(),
  state: z.string().max(64).optional(),
  city: z.string().max(128).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
});
export type ClientCreate = z.infer<typeof ClientCreate>;

export const Client = ClientCreate.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type Client = z.infer<typeof Client>;

// --- Phases (esti_phase) ---

/** Derived status — computed from sort_order vs currentPhaseId, never stored. */
export type PhaseStageStatus = "Complete" | "Active" | "Pending";

export const PhaseSetCurrent = z.object({
  projectId: z.string().uuid(),
  phaseId: z.string().uuid(),
});
export type PhaseSetCurrent = z.infer<typeof PhaseSetCurrent>;

// --- CRIF Decision state machine ---

/** CRIF decision states: DRAFT → OPEN → CLIENT_REVIEW → ACCEPTED/REJECTED → LOCKED */
export const DecisionState = z.enum([
  "DRAFT",
  "OPEN",
  "CLIENT_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "LOCKED",
]);
export type DecisionState = z.infer<typeof DecisionState>;

export const DECISION_STATE_LABEL: Record<DecisionState, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLIENT_REVIEW: "Client review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  LOCKED: "Locked",
};

export const DECISION_STATE_TAG: Record<
  DecisionState,
  "gray" | "blue" | "teal" | "green" | "red" | "purple"
> = {
  DRAFT: "gray",
  OPEN: "blue",
  CLIENT_REVIEW: "teal",
  ACCEPTED: "green",
  REJECTED: "red",
  LOCKED: "purple",
};

/** Valid next states from each CRIF state. */
export const DECISION_TRANSITIONS: Record<DecisionState, DecisionState[]> = {
  DRAFT: ["OPEN"],
  OPEN: ["CLIENT_REVIEW", "ACCEPTED", "REJECTED"],
  CLIENT_REVIEW: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["LOCKED"],
  REJECTED: ["LOCKED"],
  LOCKED: ["OPEN"],
};

/** Revision impact category. */
export const RevisionCategory = z.enum(["MINOR", "MAJOR", "CRITICAL"]);
export type RevisionCategory = z.infer<typeof RevisionCategory>;

export const REVISION_CATEGORY_LABEL: Record<RevisionCategory, string> = {
  MINOR: "Minor",
  MAJOR: "Major",
  CRITICAL: "Critical",
};

export const REVISION_CATEGORY_TAG: Record<
  RevisionCategory,
  "blue" | "magenta" | "red"
> = {
  MINOR: "blue",
  MAJOR: "magenta",
  CRITICAL: "red",
};

/** Revision source — why the revision was generated. */
export const RevisionSource = z.enum([
  "CLIENT_DRIVEN",
  "INTERNAL_ERROR",
  "TECHNICAL_QUERY",
  "SCOPE_CHANGE",
]);
export type RevisionSource = z.infer<typeof RevisionSource>;

export const REVISION_SOURCE_LABEL: Record<RevisionSource, string> = {
  CLIENT_DRIVEN:    "Client driven",
  INTERNAL_ERROR:   "Internal error",
  TECHNICAL_QUERY:  "Technical query / RFI",
  SCOPE_CHANGE:     "Scope change",
};

export const REVISION_SOURCE_TAG: Record<RevisionSource, "blue" | "red" | "teal" | "magenta"> = {
  CLIENT_DRIVEN:   "blue",
  INTERNAL_ERROR:  "red",
  TECHNICAL_QUERY: "teal",
  SCOPE_CHANGE:    "magenta",
};

// --- Fee proposals (esti_feeproposal) ---

export const FeeProposalStatus = z.enum([
  "DRAFT",
  "INTERNAL_REVIEW",
  "CLIENT_SUBMISSION",
  "APPROVED",
  "REVISED",
]);
export type FeeProposalStatus = z.infer<typeof FeeProposalStatus>;

export const FeeProposalCreate = z.object({
  projectId: z.string().uuid(),
  workCategory: z.nativeEnum(CoaWorkCategory),
  costOfWorksPaise: z.number().int().nonnegative(),
  feePaise: z.number().int().nonnegative(),
  docCommPct: z.number().min(0).max(100).default(10),
  scope: z.string().max(4000).optional(),
  /** Required when the quoted fee is below the COA minimum (compliance override). */
  overrideReason: z.string().max(500).optional(),
});
export type FeeProposalCreate = z.infer<typeof FeeProposalCreate>;

// --- Invoices (esti_invoiceindia) ---

export const InvoiceStatus = z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

export const InvoiceCreate = z.object({
  projectId: z.string().uuid(),
  phaseId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  /** Defaults to the firm's active GST system on the server. */
  gstSystem: z.nativeEnum(GstSystem).optional(),
  taxablePaise: z.number().int().nonnegative(),
  interState: z.boolean().default(false),
  /** Defaults to the firm's TDS declaration (Company settings) when omitted. */
  tdsApplicable: z.boolean().optional(),
  sac: z.string().max(10).default("998322"),
  dateInvoice: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
});
export type InvoiceCreate = z.infer<typeof InvoiceCreate>;
