import { z } from "zod";

/** Office / project task management. */
export const TaskStatus = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskPriority = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type TaskPriority = z.infer<typeof TaskPriority>;

export const TASK_STATUS_LABEL: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export const TaskCreate = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  // Tasks are project-specific: a project is required.
  projectId: z.string().uuid(),
  // Assignee must belong to the project's team (member name stored for display).
  assignee: z.string().max(120).optional(),
  priority: TaskPriority.default("MEDIUM"),
  dueDate: z.string().nullable().optional(),
});
export type TaskCreate = z.infer<typeof TaskCreate>;

export const TaskUpdate = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  assignee: z.string().max(120).nullable().optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  dueDate: z.string().nullable().optional(),
});
export type TaskUpdate = z.infer<typeof TaskUpdate>;
