import { z } from "zod";

/** Operating mode — solo practice vs multi-person studio (distinct from legal firmType). */
export const OrgMode = z.enum(["SOLO", "STUDIO"]);
export type OrgMode = z.infer<typeof OrgMode>;

export const ORG_MODE_LABEL: Record<OrgMode, string> = {
  SOLO: "Team mode",
  STUDIO: "Team mode",
};

/** Why disabling Team & HR requires an archive workflow instead of a simple toggle. */
export const HrLockReason = z.enum([
  "MULTIPLE_TEAM_MEMBERS",
  "ATTENDANCE",
  "LEAVES",
  "REWARD_POINTS",
  "MULTI_PERSON_ASSIGNMENTS",
]);
export type HrLockReason = z.infer<typeof HrLockReason>;

export const HR_LOCK_REASON_LABEL: Record<HrLockReason, string> = {
  MULTIPLE_TEAM_MEMBERS: "More than one active team member",
  ATTENDANCE: "Attendance register entries on record",
  LEAVES: "Leave records",
  REWARD_POINTS: "Performance reward points",
  MULTI_PERSON_ASSIGNMENTS: "Project assignments across multiple people",
};

export const HrArchiveConfirmPhrase = "ARCHIVE TEAM";

export const ArchiveTeamModuleInput = z.object({
  confirmPhrase: z.literal(HrArchiveConfirmPhrase),
  reason: z.string().max(500).optional(),
});
