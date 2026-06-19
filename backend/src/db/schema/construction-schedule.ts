import { projectOffices } from "./project.js";
import {
  boolean,
  createdAt,
  date,
  id,
  integer,
  pgTable,
  text,
  updatedAt,
  uuid,
} from "./_helpers.js";

export const constructionSchedules = pgTable("esti_construction_schedule", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  baselineName: text("baseline_name").notNull().default("Baseline 1"),
  projectStart: date("project_start").notNull(),
  status: text("status", { enum: ["DRAFT", "BASELINE", "FROZEN"] })
    .notNull()
    .default("DRAFT"),
  versionNo: integer("version_no").notNull().default(1),
  templateKey: text("template_key"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const constructionActivities = pgTable("esti_construction_activity", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  scheduleId: uuid("schedule_id")
    .notNull()
    .references(() => constructionSchedules.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  wbsCode: text("wbs_code").notNull(),
  title: text("title").notNull(),
  trade: text("trade"),
  location: text("location"),
  durationDays: integer("duration_days").notNull().default(1),
  plannedStart: date("planned_start"),
  plannedEnd: date("planned_end"),
  actualStart: date("actual_start"),
  actualEnd: date("actual_end"),
  percentComplete: integer("percent_complete").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  earlyStart: integer("early_start"),
  earlyFinish: integer("early_finish"),
  lateStart: integer("late_start"),
  lateFinish: integer("late_finish"),
  totalFloat: integer("total_float"),
  isCritical: boolean("is_critical").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const constructionDependencies = pgTable("esti_construction_dependency", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  predecessorId: uuid("predecessor_id")
    .notNull()
    .references(() => constructionActivities.id, { onDelete: "cascade" }),
  successorId: uuid("successor_id")
    .notNull()
    .references(() => constructionActivities.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["FS", "SS", "FF", "SF"] })
    .notNull()
    .default("FS"),
  lagDays: integer("lag_days").notNull().default(0),
  createdAt: createdAt(),
});
