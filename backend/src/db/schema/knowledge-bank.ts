/**
 * Construction Knowledge Bank — foundation reference libraries.
 * See docs/esti/CONSTRUCTION-KNOWLEDGE-BANK.md. All tables use the esti_kb_*
 * namespace. Money (rates) is integer paise; factors are double precision.
 */
import {
  boolean,
  createdAt,
  doublePrecision,
  id,
  integer,
  pgTable,
  text,
} from "./_helpers.js";

/** Material library — generic raw materials (Cement, Sand, Steel…). */
export const kbMaterials = pgTable("esti_kb_material", {
  id: id(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  category: text("category"),
  wastageFactor: doublePrecision("wastage_factor").notNull().default(0),
  density: doublePrecision("density"),
  defaultRatePaise: integer("default_rate_paise").notNull().default(0),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/** Labor library — labour resources (Mason, Helper, Carpenter…). */
export const kbLabor = pgTable("esti_kb_labor", {
  id: id(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  rateType: text("rate_type"),
  productivityFactor: doublePrecision("productivity_factor"),
  defaultRatePaise: integer("default_rate_paise").notNull().default(0),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/** Item library — construction activities (Brickwork 230mm, RCC Slab…). */
export const kbItems = pgTable("esti_kb_item", {
  id: id(),
  name: text("name").notNull(),
  category: text("category"),
  unit: text("unit").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});
