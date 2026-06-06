import { z } from "zod";
import { CoaWorkCategory, coaStagePlan } from "./coa.js";
import { GstSystem } from "./gst.js";

export const ProjectType = z.enum([
  "RESIDENTIAL",
  "COMMERCIAL",
  "INSTITUTIONAL",
  "SITE_LANDSCAPE",
  "INTERIORS",
]);
export type ProjectType = z.infer<typeof ProjectType>;

export const Jurisdiction = z.enum(["BBMP", "BDA", "PANCHAYAT", "HMDA", "CMDA", "OTHER"]);

export const ProjectStatus = z.enum(["ENQUIRY", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]);

// Phases follow COA's Conditions of Engagement stages (see coa.ts / INDIA-PROFILE).
export const PhaseCode = z.enum([
  "BRIEF",
  "CONCEPT",
  "PRELIMINARY",
  "APPROVALS",
  "WORKING_TENDER",
  "CONTRACTOR",
  "CONSTRUCTION",
  "COMPLETION",
]);
export type PhaseCode = z.infer<typeof PhaseCode>;

/** Default phase plan = COA stages; `billingPct` is the per-stage share (sums to 100). */
export const DEFAULT_PHASE_PLAN = coaStagePlan().map((s) => ({
  code: s.code,
  label: s.label,
  billingPct: s.stagePct,
}));

export const ProjectOfficeCreate = z.object({
  title: z.string().min(2).max(200),
  projectType: ProjectType,
  jurisdiction: Jurisdiction.default("OTHER"),
  clientId: z.string().uuid().nullish(),
  state: z.string().max(64).nullish(),
  district: z.string().max(128).nullish(),
  city: z.string().max(128).nullish(),
  pin: z.string().regex(/^\d{6}$/).nullish(),
  contractValuePaise: z.number().int().nonnegative().default(0),
  dateStart: z.string().date().nullish(),
});
export type ProjectOfficeCreate = z.infer<typeof ProjectOfficeCreate>;

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

export const PhaseStatus = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "CLIENT_REVIEW",
  "APPROVED",
  "COMPLETE",
]);
export type PhaseStatus = z.infer<typeof PhaseStatus>;

export const PhaseUpdate = z.object({
  id: z.string().uuid(),
  status: PhaseStatus.optional(),
  datePlanned: z.string().date().nullish(),
  dateActual: z.string().date().nullish(),
});
export type PhaseUpdate = z.infer<typeof PhaseUpdate>;

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
  tdsApplicable: z.boolean().default(true),
  sac: z.string().max(10).default("998322"),
  dateInvoice: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
});
export type InvoiceCreate = z.infer<typeof InvoiceCreate>;
