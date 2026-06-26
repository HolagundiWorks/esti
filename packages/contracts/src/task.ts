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

/** ASPRF architectural work category — separate from financial classification. */
export const TaskWorkType = z.enum([
  "DESIGN_COMMUNICATION",
  "DESIGN_DEVELOPMENT",
  "TECHNICAL_PRODUCTION",
  "CONSTRUCTION_SUPPORT",
]);
export type TaskWorkType = z.infer<typeof TaskWorkType>;

export const TASK_WORK_TYPE_LABEL: Record<string, string> = {
  DESIGN_COMMUNICATION: "Design Communication",
  DESIGN_DEVELOPMENT: "Design Development",
  TECHNICAL_PRODUCTION: "Technical Production",
  CONSTRUCTION_SUPPORT: "Construction Support",
};

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
  workType: TaskWorkType.optional(),
  priority: TaskPriority.default("MEDIUM"),
  dueDate: z.string().nullable().optional(),
  estimatedHours: z.number().min(0.25).max(999).optional(),
  difficultyCoefficient: z.number().int().min(1).max(5).default(3),
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
  workType: TaskWorkType.nullable().optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  dueDate: z.string().nullable().optional(),
  estimatedHours: z.number().min(0.25).max(999).nullable().optional(),
  difficultyCoefficient: z.number().int().min(1).max(5).optional(),
});
export type TaskUpdate = z.infer<typeof TaskUpdate>;

/**
 * Multi-factor priority score (0–100) for a task.
 * Factors:
 *   - Priority enum:  CRITICAL=40, HIGH=25, MEDIUM=15, LOW=5
 *   - Overdue:        +20 (dueDate in the past)
 *   - Due today:      +10
 *   - Intervention:   +15 (dependency stale >48h)
 *   - WorkType:       CONSTRUCTION_SUPPORT=+5, TECHNICAL_PRODUCTION=+3
 *   - BLOCKED status: +5 (visible waiting signal)
 * Clamped to 0–100.
 */
export function computeTaskPriority(task: {
  priority: string;
  dueDate?: string | null;
  interventionRequired?: boolean | null;
  workType?: string | null;
  status?: string | null;
}): number {
  const today = new Date().toISOString().slice(0, 10);

  const base =
    task.priority === "CRITICAL" ? 40
    : task.priority === "HIGH" ? 25
    : task.priority === "MEDIUM" ? 15
    : 5;

  const overdue = task.dueDate && task.dueDate < today ? 20 : 0;
  const dueToday = task.dueDate && task.dueDate === today ? 10 : 0;
  const intervention = task.interventionRequired ? 15 : 0;
  const workTypeBonus =
    task.workType === "CONSTRUCTION_SUPPORT" ? 5
    : task.workType === "TECHNICAL_PRODUCTION" ? 3
    : 0;
  const blocked = task.status === "BLOCKED" ? 5 : 0;

  return Math.min(100, Math.max(0, base + overdue + dueToday + intervention + workTypeBonus + blocked));
}

export const TaskListParams = z.object({
  openOnly: z.boolean().default(false),
  myTasks: z.boolean().default(false),
  projectId: z.string().uuid().optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  classification: TaskClassification.optional(),
  workType: TaskWorkType.optional(),
  limit: z.number().int().min(1).max(500).optional(),
});
export type TaskListParams = z.infer<typeof TaskListParams>;
