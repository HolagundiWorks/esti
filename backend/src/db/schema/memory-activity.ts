import { users } from "./org-auth.js";
import { projectOffices } from "./project.js";
import {
  createdAt,
  id,
  jsonb,
  pgTable,
  text,
  uuid,
} from "./_helpers.js";

/** Internal project activity / audit notes (distinct from the client log). */
export const projectLogs = pgTable("esti_projectlog", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  note: text("note").notNull(),
  authorId: uuid("author_id"),
  authorName: text("author_name"),
  createdAt: createdAt(),
});

/** Immutable activity stream for project timelines and the office Activity Center. */
export const activities = pgTable("esti_activity", {
  id: id(),
  projectId: uuid("project_id").references(() => projectOffices.id),
  objectType: text("object_type").notNull(),
  objectId: text("object_id"),
  eventType: text("event_type").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  actorName: text("actor_name"),
  visibility: text("visibility").notNull().default("STAFF"),
  summary: text("summary").notNull(),
  metadata: jsonb("metadata"),
  createdAt: createdAt(),
});

/** Reusable contextual comments attached to projects, tasks, and other work objects. */
export const comments = pgTable("esti_comment", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  objectType: text("object_type").notNull(),
  objectId: text("object_id").notNull(),
  body: text("body").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  actorName: text("actor_name"),
  visibility: text("visibility").notNull().default("STAFF"),
  createdAt: createdAt(),
});
