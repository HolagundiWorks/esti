import { z } from "zod";

export const ConstructionDependencyType = z.enum(["FS", "SS", "FF", "SF"]);
export type ConstructionDependencyType = z.infer<typeof ConstructionDependencyType>;

export const ConstructionScheduleStatus = z.enum(["DRAFT", "BASELINE", "FROZEN"]);
export type ConstructionScheduleStatus = z.infer<typeof ConstructionScheduleStatus>;

export const ConstructionScheduleProjectParams = z.object({
  projectId: z.string().uuid(),
});
export type ConstructionScheduleProjectParams = z.infer<typeof ConstructionScheduleProjectParams>;

export const ConstructionScheduleTemplateKey = z.enum([
  "residential_villa",
  "commercial_block",
  "institutional",
  "industrial_shed",
  "interior_fitout",
]);
export type ConstructionScheduleTemplateKey = z.infer<typeof ConstructionScheduleTemplateKey>;

export const ConstructionActivityCreate = z.object({
  projectId: z.string().uuid(),
  wbsCode: z.string().min(1).max(32),
  title: z.string().min(2).max(200),
  trade: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  durationDays: z.number().int().min(1).max(999).default(1),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
export type ConstructionActivityCreate = z.infer<typeof ConstructionActivityCreate>;

export const ConstructionActivityUpdate = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  wbsCode: z.string().min(1).max(32).optional(),
  title: z.string().min(2).max(200).optional(),
  trade: z.string().max(100).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  durationDays: z.number().int().min(1).max(999).optional(),
  plannedStart: z.string().date().nullable().optional(),
  plannedEnd: z.string().date().nullable().optional(),
  actualStart: z.string().date().nullable().optional(),
  actualEnd: z.string().date().nullable().optional(),
  percentComplete: z.number().int().min(0).max(100).optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
export type ConstructionActivityUpdate = z.infer<typeof ConstructionActivityUpdate>;

export const ConstructionDependencyCreate = z.object({
  projectId: z.string().uuid(),
  predecessorId: z.string().uuid(),
  successorId: z.string().uuid(),
  type: ConstructionDependencyType.default("FS"),
  lagDays: z.number().int().min(-365).max(365).default(0),
});
export type ConstructionDependencyCreate = z.infer<typeof ConstructionDependencyCreate>;

export const ApplyConstructionTemplateInput = z.object({
  projectId: z.string().uuid(),
  templateKey: ConstructionScheduleTemplateKey.optional(),
  projectStart: z.string().date().optional(),
  force: z.boolean().optional(),
});
export type ApplyConstructionTemplateInput = z.infer<typeof ApplyConstructionTemplateInput>;

export const ConstructionLookaheadInput = z.object({
  projectId: z.string().uuid(),
  weeks: z.number().int().min(1).max(12).default(3),
});
export type ConstructionLookaheadInput = z.infer<typeof ConstructionLookaheadInput>;

/** Map project office type label → default construction schedule template. */
export const PROJECT_TYPE_TO_CONSTRUCTION_TEMPLATE: Record<
  string,
  ConstructionScheduleTemplateKey
> = {
  "Residential Architecture": "residential_villa",
  "Commercial Architecture": "commercial_block",
  "Institutional Architecture": "institutional",
  "Industrial Architecture": "industrial_shed",
  "Interior Design": "interior_fitout",
};
