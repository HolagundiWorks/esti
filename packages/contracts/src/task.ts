import { z } from "zod";

/** Office / project task management. */
export const TaskStatus = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskPriority = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type TaskPriority = z.infer<typeof TaskPriority>;

export const TaskClassification = z.enum([
  "BILLABLE",
  "NON_BILLABLE",
  "TRAINING",
  "COLLABORATION",
  "PERSONAL",
]);
export type TaskClassification = z.infer<typeof TaskClassification>;

export const TASK_STATUS_LABEL: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export const TASK_PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const TASK_CLASSIFICATION_LABEL: Record<string, string> = {
  BILLABLE: "Billable",
  NON_BILLABLE: "Non-billable",
  TRAINING: "Training",
  COLLABORATION: "Collaboration",
  PERSONAL: "Personal",
};

export const TaskCreate = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable().optional(),
  reviewerId: z.string().uuid().nullable().optional(),
  dependsOnId: z.string().uuid().nullable().optional(),
  classification: TaskClassification.optional(),
  priority: TaskPriority.default("MEDIUM"),
  dueDate: z.string().nullable().optional(),
});
export type TaskCreate = z.infer<typeof TaskCreate>;

export const TaskUpdate = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  reviewerId: z.string().uuid().nullable().optional(),
  dependsOnId: z.string().uuid().nullable().optional(),
  classification: TaskClassification.nullable().optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  dueDate: z.string().nullable().optional(),
});
export type TaskUpdate = z.infer<typeof TaskUpdate>;

export const TaskListParams = z.object({
  openOnly: z.boolean().default(false),
  myTasks: z.boolean().default(false),
  projectId: z.string().uuid().optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  classification: TaskClassification.optional(),
});
export type TaskListParams = z.infer<typeof TaskListParams>;
