import { projectOffices } from "./project.js";
import { createdAt, date, id, jsonb, pgTable, text, updatedAt, uuid } from "./_helpers.js";

export const projectBriefs = pgTable("esti_project_brief", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projectOffices.id, { onDelete: "cascade" }),
  basicInfo: jsonb("basic_info"),
  projectInfo: jsonb("project_info"),
  occupants: jsonb("occupants"),
  designPrefs: jsonb("design_prefs"),
  spaceSchedule: jsonb("space_schedule"),
  materials: jsonb("materials"),
  roomDetails: jsonb("room_details"),
  assumptions: text("assumptions"),
  approvalNote: text("approval_note"),
  approvedAt: date("approved_at"),
  compiledBrief: text("compiled_brief"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
