import { projectOffices } from "./project.js";
import { users } from "./org-auth.js";
import {
  createdAt,
  id,
  pgTable,
  text,
  updatedAt,
  uuid,
} from "./_helpers.js";

/** Project-close lessons learned — published rows surface in Knowledge Bank search. */
export const lessonsLearned = pgTable("esti_lesson_learned", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  title: text("title").notNull(),
  category: text("category").notNull().default("OTHER"),
  body: text("body").notNull(),
  recommendations: text("recommendations").notNull().default(""),
  tags: text("tags"),
  status: text("status").notNull().default("DRAFT"),
  authorId: uuid("author_id").references(() => users.id),
  authorName: text("author_name"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
