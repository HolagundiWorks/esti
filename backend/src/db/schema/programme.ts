import { phases, projectOffices } from "./project.js";
import { tasks } from "./hr-work.js";
import {
  createdAt,
  date,
  id,
  integer,
  pgTable,
  text,
  updatedAt,
  uuid,
} from "./_helpers.js";

/** Project deliverable milestones — programme schedule (Phase 14). */
export const projectMilestones = pgTable("esti_project_milestone", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  phaseId: uuid("phase_id").references(() => phases.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: date("target_date"),
  status: text("status", {
    enum: ["PLANNED", "IN_PROGRESS", "DONE", "BLOCKED"],
  })
    .notNull()
    .default("PLANNED"),
  sortOrder: integer("sort_order").notNull().default(0),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
