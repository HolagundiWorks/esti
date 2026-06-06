import { z } from "zod";

/** Statutory approvals tracked per project (see docs/esti/ARCHITECT-PROFILE.md). */
export const PERMIT_TYPES = {
  BPAS: { label: "BPAS / Building plan approval", authorities: ["BBMP", "BDA", "Panchayat"] },
  RERA: { label: "RERA registration", authorities: ["RERA Karnataka"] },
  FIRE_NOC: { label: "Fire NOC", authorities: ["KSFES"] },
  AVIATION_NOC: { label: "Aviation NOC", authorities: ["AAI"] },
  ENV_NOC: { label: "Environmental clearance", authorities: ["KSPCB", "MoEFCC"] },
  HERITAGE_NOC: { label: "Heritage clearance", authorities: ["ASI", "KSSDA"] },
  OC: { label: "Occupancy Certificate", authorities: ["BBMP", "BDA"] },
  CC: { label: "Completion Certificate", authorities: ["BBMP", "BDA"] },
  BESCOM: { label: "BESCOM sanction", authorities: ["BESCOM"] },
  BWSSB: { label: "BWSSB sanction", authorities: ["BWSSB"] },
} as const;

export const PermitType = z.enum([
  "BPAS",
  "RERA",
  "FIRE_NOC",
  "AVIATION_NOC",
  "ENV_NOC",
  "HERITAGE_NOC",
  "OC",
  "CC",
  "BESCOM",
  "BWSSB",
]);
export type PermitType = z.infer<typeof PermitType>;

export const PermitStatus = z.enum([
  "NOT_STARTED",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
]);
export type PermitStatus = z.infer<typeof PermitStatus>;

export const PermitCreate = z.object({
  projectId: z.string().uuid(),
  permitType: PermitType,
  authority: z.string().min(1).max(128),
  applicationNo: z.string().max(128).optional(),
  dateDue: z.string().date().optional(),
  portalUrl: z.string().url().optional(),
  remarks: z.string().max(2000).optional(),
});
export type PermitCreate = z.infer<typeof PermitCreate>;

export const PermitUpdate = z.object({
  id: z.string().uuid(),
  status: PermitStatus.optional(),
  applicationNo: z.string().max(128).optional(),
  dateSubmitted: z.string().date().nullish(),
  dateApproved: z.string().date().nullish(),
  dateDue: z.string().date().nullish(),
  remarks: z.string().max(2000).optional(),
});
export type PermitUpdate = z.infer<typeof PermitUpdate>;

export type PermitDueTier = "overdue" | "due_soon" | "upcoming" | "none";

/**
 * Due-date alert tier: red = overdue, yellow = ≤14 days, blue = 15–30 days.
 * Closed permits (approved/rejected) raise no alert.
 */
export function permitDueTier(
  dateDue: string | null | undefined,
  status: string | null | undefined,
  now: Date = new Date(),
): PermitDueTier {
  if (!dateDue || status === "APPROVED" || status === "REJECTED") return "none";
  const due = new Date(`${dateDue}T00:00:00Z`).getTime();
  const days = Math.ceil((due - now.getTime()) / 86_400_000);
  if (days < 0) return "overdue";
  if (days <= 14) return "due_soon";
  if (days <= 30) return "upcoming";
  return "none";
}
