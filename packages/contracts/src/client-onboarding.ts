import { z } from "zod";

/**
 * Project OS — Client Onboarding Engine (Slice J).
 *
 * Formal onboarding captured before a project can be activated: billing details,
 * tax ids, authorized representatives, communication preference, and uploaded
 * agreement + identity documents (S3 keys). Onboarding moves PENDING → COMPLETE;
 * activation (Slice K) requires COMPLETE.
 */

export const CommunicationPreference = z.enum(["EMAIL", "WHATSAPP", "PHONE", "PORTAL"]);
export type CommunicationPreference = z.infer<typeof CommunicationPreference>;
export const COMMUNICATION_PREFERENCE_LABEL: Record<CommunicationPreference, string> = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  PHONE: "Phone",
  PORTAL: "Client portal",
};

export const OnboardingStatus = z.enum(["PENDING", "COMPLETE"]);
export type OnboardingStatus = z.infer<typeof OnboardingStatus>;
export const ONBOARDING_STATUS_LABEL: Record<OnboardingStatus, string> = {
  PENDING: "Pending",
  COMPLETE: "Complete",
};
export const ONBOARDING_STATUS_TAG: Record<OnboardingStatus, "blue" | "green"> = {
  PENDING: "blue",
  COMPLETE: "green",
};

export const AuthorizedRep = z.object({
  name: z.string().min(1).max(200),
  designation: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
});
export type AuthorizedRep = z.infer<typeof AuthorizedRep>;

export const ClientOnboardingUpsert = z.object({
  projectId: z.string().uuid(),
  billingAddress: z.string().max(1000).optional(),
  gstin: z.string().max(20).optional(),
  pan: z.string().max(15).optional(),
  authorizedReps: z.array(AuthorizedRep).max(10).optional(),
  communicationPreference: CommunicationPreference.optional(),
});
export type ClientOnboardingUpsert = z.infer<typeof ClientOnboardingUpsert>;

export const ClientOnboardingComplete = z.object({
  projectId: z.string().uuid(),
});
export type ClientOnboardingComplete = z.infer<typeof ClientOnboardingComplete>;
