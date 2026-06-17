import { z } from "zod";

/** APBF Phase 0 — pre-engagement appointment workflow. */
export const AppointmentStatus = z.enum(["DRAFT", "COMPLETE"]);
export type AppointmentStatus = z.infer<typeof AppointmentStatus>;

export const AppointmentUpsert = z.object({
  projectId: z.string().uuid(),
  siteVisitDate: z.string().date().optional(),
  scopeSummary: z.string().max(10000).optional(),
  letterId: z.string().uuid().nullable().optional(),
  feeProposalId: z.string().uuid().nullable().optional(),
});
export type AppointmentUpsert = z.infer<typeof AppointmentUpsert>;

export const APPOINTMENT_PHASE_CODE = "APPOINTMENT" as const;
