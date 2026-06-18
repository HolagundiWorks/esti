import { z } from "zod";

export const TrialRequestRole = z.enum([
  "PRINCIPAL",
  "PARTNER",
  "PROJECT_LEAD",
  "SOLO_ARCHITECT",
  "STUDIO_OWNER",
  "OPERATIONS",
  "ACCOUNTS",
  "OTHER",
]);

export const TrialPracticeType = z.enum([
  "RESIDENTIAL",
  "COMMERCIAL",
  "INTERIOR",
  "LANDSCAPE",
  "PMC",
  "MULTI_DISCIPLINE",
  "OTHER",
]);

export const TrialTeamSize = z.enum(["SOLO", "2_5", "6_15", "16_50", "50_PLUS"]);

export const TrialLocations = z.enum(["SINGLE", "2_5", "5_PLUS"]);

export const TrialModuleInterest = z.enum([
  "REVISION_CRIF",
  "FEES_GST",
  "DRAWINGS",
  "BYLAWS_RIE",
  "BOQ_ESTIMATION",
  "TASKS_ASPRF",
  "PORTALS",
  "TENDERS",
  "ESTICAD",
  "SELF_HOSTED",
]);

export const TrialCurrentTool = z.enum([
  "SPREADSHEETS",
  "TALLY",
  "OTHER_PM",
  "MANUAL",
  "CUSTOM",
]);

export const TrialPainPoint = z.enum([
  "REVISION_SCOPE",
  "FEE_LEAKAGE",
  "DRAWING_CHAOS",
  "BYLAW_COMPLIANCE",
  "GST_COLLECTIONS",
  "TEAM_COORDINATION",
  "SCATTERED_TOOLS",
  "MANUAL_BOQ",
]);

export const TrialPreference = z.enum(["BETA_ACCESS", "LIVE_DEMO", "BETA_AND_DEMO"]);

export const TrialTimeline = z.enum(["IMMEDIATE", "30_DAYS", "3_MONTHS", "EXPLORING"]);

export const TrialRequestInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  workEmail: z.string().trim().email().max(200),
  mobile: z.string().trim().min(8).max(20),
  companyName: z.string().trim().min(2).max(200),
  role: TrialRequestRole,
  practiceType: TrialPracticeType.optional(),
  teamSize: TrialTeamSize.optional(),
  locations: TrialLocations.optional(),
  interestedModules: z.array(TrialModuleInterest).min(1).max(10),
  currentTools: z.array(TrialCurrentTool).max(6).default([]),
  painPoints: z.array(TrialPainPoint).max(8).default([]),
  improvementNotes: z.string().trim().max(4000).optional(),
  trialPreference: TrialPreference,
  timeline: TrialTimeline.optional(),
});

export type TrialRequestRole = z.infer<typeof TrialRequestRole>;
export type TrialPracticeType = z.infer<typeof TrialPracticeType>;
export type TrialTeamSize = z.infer<typeof TrialTeamSize>;
export type TrialLocations = z.infer<typeof TrialLocations>;
export type TrialModuleInterest = z.infer<typeof TrialModuleInterest>;
export type TrialCurrentTool = z.infer<typeof TrialCurrentTool>;
export type TrialPainPoint = z.infer<typeof TrialPainPoint>;
export type TrialPreference = z.infer<typeof TrialPreference>;
export type TrialTimeline = z.infer<typeof TrialTimeline>;
export type TrialRequestInput = z.infer<typeof TrialRequestInput>;
