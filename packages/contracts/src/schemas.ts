import { z } from "zod";
import { coaStagePlan } from "./coa.js";

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
