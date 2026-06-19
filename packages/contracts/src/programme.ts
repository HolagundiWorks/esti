import { z } from "zod";

/** Deliverable milestone within a project programme (Phase 14). */
export const MilestoneStatus = z.enum(["PLANNED", "IN_PROGRESS", "DONE", "BLOCKED"]);
export type MilestoneStatus = z.infer<typeof MilestoneStatus>;

export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  BLOCKED: "Blocked",
};

export const ProjectMilestoneCreate = z.object({
  projectId: z.string().uuid(),
  phaseId: z.string().uuid().optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  targetDate: z.string().date().optional(),
  status: MilestoneStatus.default("PLANNED"),
  sortOrder: z.number().int().min(0).max(999).optional(),
});
export type ProjectMilestoneCreate = z.infer<typeof ProjectMilestoneCreate>;

export const ProjectMilestoneUpdate = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  phaseId: z.string().uuid().nullable().optional(),
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  targetDate: z.string().date().nullable().optional(),
  status: MilestoneStatus.optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});
export type ProjectMilestoneUpdate = z.infer<typeof ProjectMilestoneUpdate>;

export const ProgrammeProjectParams = z.object({
  projectId: z.string().uuid(),
});
export type ProgrammeProjectParams = z.infer<typeof ProgrammeProjectParams>;
