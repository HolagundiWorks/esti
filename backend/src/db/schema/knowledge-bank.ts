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
  uuid,
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

/** Brand library — manufacturers, kept independent of the generic material
 *  (Cement ≠ UltraTech). Material → brand variants are mapped separately. */
export const kbBrands = pgTable("esti_kb_brand", {
  id: id(),
  name: text("name").notNull(),
  category: text("category"),
  website: text("website"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/** Material → brand mapping — which branded variants supply a generic material
 *  (Cement → UltraTech OPC 53; Steel → Tata Tiscon Fe500D). One preferred per material. */
export const kbMaterialBrands = pgTable("esti_kb_material_brand", {
  id: id(),
  materialId: uuid("material_id")
    .notNull()
    .references(() => kbMaterials.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => kbBrands.id, { onDelete: "cascade" }),
  gradeOrVariant: text("grade_or_variant"),
  qualityLevel: text("quality_level"),
  preferred: boolean("preferred").notNull().default(false),
  createdAt: createdAt(),
});

/** Specification library — method/mix variants of an item (Brickwork → 1:6;
 *  Concrete → M25). Each specification belongs to one item; an item has many.
 *  Material + labour consumption recipes attach to a specification (next phase). */
export const kbSpecifications = pgTable("esti_kb_specification", {
  id: id(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => kbItems.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  /** Unit of measurement for this specification (often the item's unit, e.g. Cum). */
  unit: text("unit"),
  /** Analysed / applied rate for this specification, in integer paise per unit. */
  ratePaise: integer("rate_paise").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/** Consumption recipe — material quantity-per-item-unit for a specification
 *  (Brickwork 1:6 → 500 bricks/cum, 1.5 bags cement/cum…). */
export const kbSpecMaterials = pgTable("esti_kb_spec_material", {
  id: id(),
  specificationId: uuid("specification_id")
    .notNull()
    .references(() => kbSpecifications.id, { onDelete: "cascade" }),
  materialId: uuid("material_id")
    .notNull()
    .references(() => kbMaterials.id, { onDelete: "cascade" }),
  quantityPerUnit: doublePrecision("quantity_per_unit").notNull().default(0),
  wastageFactor: doublePrecision("wastage_factor").notNull().default(0),
  createdAt: createdAt(),
});

/** Consumption recipe — labour quantity-per-item-unit for a specification
 *  (Brickwork → 0.8 mason-day/cum, 1 helper-day/cum…). */
export const kbSpecLabor = pgTable("esti_kb_spec_labor", {
  id: id(),
  specificationId: uuid("specification_id")
    .notNull()
    .references(() => kbSpecifications.id, { onDelete: "cascade" }),
  laborId: uuid("labor_id")
    .notNull()
    .references(() => kbLabor.id, { onDelete: "cascade" }),
  quantityPerUnit: doublePrecision("quantity_per_unit").notNull().default(0),
  createdAt: createdAt(),
});

/** Item dependency (KB Phase 5 / CMS-3) — a parent activity implies a child
 *  activity at a derived quantity (e.g. Brickwork → Plastering at ratio 2.0).
 *  Drives the Component auto-generation: parent element → suggested children. */
export const kbItemDependencies = pgTable("esti_kb_item_dependency", {
  id: id(),
  parentItemId: uuid("parent_item_id")
    .notNull()
    .references(() => kbItems.id, { onDelete: "cascade" }),
  childItemId: uuid("child_item_id")
    .notNull()
    .references(() => kbItems.id, { onDelete: "cascade" }),
  ratio: doublePrecision("ratio").notNull().default(1), // child qty = parent qty × ratio
  dependencyType: text("dependency_type").notNull().default("MANDATORY"), // MANDATORY|OPTIONAL|SEQUENCE
  notes: text("notes"),
  createdAt: createdAt(),
});
