import { z } from "zod";

/** Owner-configurable thresholds for alert escalation and digest grouping. */
export const EscalationSettings = z.object({
  /** Client approvals unanswered for this many days become immediate alerts. */
  staleApprovalDays: z.number().int().min(1).max(90).default(7),
  /** Surface follow-ups this many days before the due date (0 = due day only). */
  followUpLeadDays: z.number().int().min(0).max(30).default(0),
  /** Open tasks past due date by this many days become high-severity alerts. */
  taskOverdueDays: z.number().int().min(1).max(90).default(3),
  /** When true, medium-priority items also appear in the daily digest view. */
  digestEnabled: z.boolean().default(true),
  /** Surface approved leave starting within this many days. */
  leaveHorizonDays: z.number().int().min(1).max(30).default(7),
});

export type EscalationSettings = z.infer<typeof EscalationSettings>;

export const DEFAULT_ESCALATION_SETTINGS: EscalationSettings = {
  staleApprovalDays: 7,
  followUpLeadDays: 0,
  taskOverdueDays: 3,
  digestEnabled: true,
  leaveHorizonDays: 7,
};

/** Parse stored JSON — fall back to defaults for missing keys. */
export function parseEscalationSettings(raw: unknown): EscalationSettings {
  const parsed = EscalationSettings.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { ...DEFAULT_ESCALATION_SETTINGS, ...(typeof raw === "object" && raw ? raw : {}) };
}
