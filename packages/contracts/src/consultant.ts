import { z } from "zod";

/**
 * Consultant register + per-project engagements (roadmap Phase 5). A consultant
 * is a discipline specialist the office sub-engages; an engagement links one to
 * a project with an agreed fee and tracks payments → outstanding balance.
 */
export const CONSULTANT_DISCIPLINES = {
  STRUCTURAL: "Structural",
  MEP: "MEP",
  ELECTRICAL: "Electrical",
  PLUMBING: "Plumbing",
  HVAC: "HVAC",
  LANDSCAPE: "Landscape",
  INTERIOR: "Interior",
  SURVEY: "Survey",
  SOIL: "Soil / geotech",
  PMC: "Project management",
  OTHER: "Other",
} as const;
export type ConsultantDisciplineCode = keyof typeof CONSULTANT_DISCIPLINES;
export const ConsultantDiscipline = z.enum(
  Object.keys(CONSULTANT_DISCIPLINES) as [ConsultantDisciplineCode, ...ConsultantDisciplineCode[]],
);

export const ConsultantCreate = z.object({
  name: z.string().min(1).max(200),
  discipline: ConsultantDiscipline,
  firm: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
});
export type ConsultantCreate = z.infer<typeof ConsultantCreate>;

export const EngagementStatus = z.enum(["ENGAGED", "COMPLETED", "CANCELLED"]);
export type EngagementStatus = z.infer<typeof EngagementStatus>;

export const EngagementCreate = z.object({
  projectId: z.string().uuid(),
  consultantId: z.string().uuid(),
  scope: z.string().max(500).optional(),
  agreedFeePaise: z.number().int().nonnegative(),
});
export type EngagementCreate = z.infer<typeof EngagementCreate>;

export const EngagementPayment = z.object({
  id: z.string().uuid(),
  amountPaise: z.number().int().positive(),
});
export type EngagementPayment = z.infer<typeof EngagementPayment>;

export const EngagementStatusUpdate = z.object({
  id: z.string().uuid(),
  status: EngagementStatus,
});
export type EngagementStatusUpdate = z.infer<typeof EngagementStatusUpdate>;
