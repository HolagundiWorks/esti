import { z } from "zod";
import { ProjectType } from "./schemas.js";
import type { TagColor } from "./schemas.js";

/**
 * Project OS — Lead Capture Engine (Slice A).
 *
 * A lead is an inbound enquiry recorded *before* a client or project exists.
 * It carries the bare contact + project hint and a status machine that ends in
 * either QUALIFIED (converted to a client + draft project) or DROPPED / LOST.
 *
 * `leads.convert` creates an `esti_client` and a draft `esti_projectoffice`
 * (status ENQUIRY) in one transaction and stamps the lead with the new ids.
 */

// --- Enums ------------------------------------------------------------------

export const LeadSource = z.enum([
  "WALK_IN",
  "WEBSITE",
  "WHATSAPP",
  "REFERRAL",
  "COLD_OUTREACH",
  "EXISTING_CLIENT",
  "SOCIAL_MEDIA",
]);
export type LeadSource = z.infer<typeof LeadSource>;

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  WALK_IN: "Walk-in",
  WEBSITE: "Website",
  WHATSAPP: "WhatsApp",
  REFERRAL: "Referral",
  COLD_OUTREACH: "Cold outreach",
  EXISTING_CLIENT: "Existing client",
  SOCIAL_MEDIA: "Social media",
};

export const LeadStatus = z.enum([
  "NEW",
  "CONTACTED",
  "ASSESSMENT_STARTED",
  "AWAITING_REVIEW",
  "QUALIFIED",
  "DROPPED",
  "LOST",
]);
export type LeadStatus = z.infer<typeof LeadStatus>;

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  ASSESSMENT_STARTED: "Assessment started",
  AWAITING_REVIEW: "Awaiting review",
  QUALIFIED: "Qualified",
  DROPPED: "Dropped",
  LOST: "Lost",
};

export const LEAD_STATUS_TAG: Record<LeadStatus, TagColor> = {
  NEW: "blue",
  CONTACTED: "cyan",
  ASSESSMENT_STARTED: "teal",
  AWAITING_REVIEW: "purple",
  QUALIFIED: "green",
  DROPPED: "gray",
  LOST: "red",
};

/** Terminal statuses — a lead here is closed and cannot be converted. */
export const LEAD_TERMINAL_STATUSES: ReadonlySet<LeadStatus> = new Set<LeadStatus>([
  "QUALIFIED",
  "DROPPED",
  "LOST",
]);

// --- Input schemas ----------------------------------------------------------

export const LeadCreate = z.object({
  clientName: z.string().min(1).max(200),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(200).optional().or(z.literal("")),
  leadSource: LeadSource,
  projectType: z.string().max(200).optional(),
  siteLocation: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  notes: z.string().max(4000).optional(),
});
export type LeadCreate = z.infer<typeof LeadCreate>;

export const LeadUpdate = z.object({
  id: z.string().uuid(),
  clientName: z.string().min(1).max(200).optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().email().max(200).nullable().optional().or(z.literal("")),
  leadSource: LeadSource.optional(),
  projectType: z.string().max(200).nullable().optional(),
  siteLocation: z.string().max(300).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});
export type LeadUpdate = z.infer<typeof LeadUpdate>;

export const LeadSetStatus = z.object({
  id: z.string().uuid(),
  status: LeadStatus,
});
export type LeadSetStatus = z.infer<typeof LeadSetStatus>;

/**
 * Convert a qualified lead into a client + draft project. `clientId` may point
 * at an existing client (existing-client leads); otherwise a new client is
 * created from the lead's contact details.
 */
export const LeadConvert = z.object({
  id: z.string().uuid(),
  /** Reuse an existing client instead of creating one. */
  clientId: z.string().uuid().nullable().optional(),
  /** Project title — defaults to the lead's project type / client name. */
  projectTitle: z.string().min(2).max(200),
  projectType: ProjectType,
  workType: z.enum(["ARCHITECTURE", "INTERIOR", "LANDSCAPE", "MISC"]).default("ARCHITECTURE"),
  /**
   * COA Regulations 1989 conflict-of-interest check (SOP-01/02, SOP-26) — must be
   * confirmed before a lead becomes a draft project: no other architect is already
   * engaged on this commission without a written release.
   */
  conflictCheckDone: z.boolean(),
  conflictCheckNotes: z.string().max(2000).optional(),
});
export type LeadConvert = z.infer<typeof LeadConvert>;
