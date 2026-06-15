import { users } from "./org-auth.js";
import {
  createdAt,
  doublePrecision,
  id,
  integer,
  pgTable,
  text,
  updatedAt,
  uuid,
} from "./_helpers.js";

/** SteelFlow: a named BBS session (one session = one set of structural elements). */
export const sfSessions = pgTable("sf_sessions", {
  id: id(),
  name: text("name").notNull(),
  projectId: uuid("project_id"),
  createdById: uuid("created_by_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** SteelFlow: a structural element (beam / column / slab / footing) within a session. */
export const sfElements = pgTable("sf_elements", {
  id: id(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sfSessions.id, { onDelete: "cascade" }),
  elementType: text("element_type").notNull(),
  elementCode: text("element_code").notNull(),
  lengthMm: integer("length_mm").notNull(),
  widthMm: integer("width_mm").notNull(),
  depthMm: integer("depth_mm").notNull(),
  coverMm: integer("cover_mm").notNull().default(25),
  fck: integer("fck").notNull().default(25),
  fy: integer("fy").notNull().default(500),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** SteelFlow: longitudinal rebar entries for an element. */
export const sfRebars = pgTable("sf_rebars", {
  id: id(),
  elementId: uuid("element_id")
    .notNull()
    .references(() => sfElements.id, { onDelete: "cascade" }),
  barMark: text("bar_mark").notNull(),
  diaMm: integer("dia_mm").notNull(),
  barType: text("bar_type").notNull(),
  quantity: integer("quantity").notNull().default(1),
  cuttingLengthMm: integer("cutting_length_mm"),
  shapeCode: text("shape_code").notNull().default("A"),
  posX: doublePrecision("pos_x"),
  posY: doublePrecision("pos_y"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** SteelFlow: transverse reinforcement (stirrups / ties) for an element. */
export const sfStirrups = pgTable("sf_stirrups", {
  id: id(),
  elementId: uuid("element_id")
    .notNull()
    .references(() => sfElements.id, { onDelete: "cascade" }),
  diaMm: integer("dia_mm").notNull(),
  stirrupType: text("stirrup_type").notNull().default("CLOSED"),
  spacingMm: integer("spacing_mm").notNull(),
  hookAngle: integer("hook_angle").notNull().default(135),
  hookLengthMm: integer("hook_length_mm"),
  zone: text("zone").notNull().default("FULL"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
