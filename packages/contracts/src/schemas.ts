import { z } from "zod";

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

export const PhaseCode = z.enum([
  "CONCEPT",
  "SD",
  "DD",
  "WD",
  "PERMIT",
  "TENDER",
  "EXECUTION",
  "COMPLETION",
]);

/** Default HCW phase plan with typical billing percentages. */
export const DEFAULT_PHASE_PLAN = [
  { code: "CONCEPT", label: "Concept design", billingPct: 10 },
  { code: "SD", label: "Schematic design", billingPct: 10 },
  { code: "DD", label: "Design development", billingPct: 15 },
  { code: "WD", label: "Working drawings", billingPct: 25 },
  { code: "PERMIT", label: "Permit drawings & submission", billingPct: 15 },
  { code: "TENDER", label: "Tender documents", billingPct: 10 },
  { code: "EXECUTION", label: "Construction administration", billingPct: 10 },
  { code: "COMPLETION", label: "As-built & completion", billingPct: 5 },
] as const;

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
