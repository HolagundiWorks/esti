import {
  boolean,
  createdAt,
  date,
  doublePrecision,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  updatedAt,
  uuid,
} from "./_helpers.js";

/** Versioned BBMP modular rule set — FAR, setbacks, road margins (BYLAWS-BBMP.md). */
export const bbmpRuleSets = pgTable("esti_bbmp_rule_set", {
  id: id(),
  label: text("label").notNull(),
  effectiveDate: date("effective_date").notNull(),
  status: text("status").notNull().default("DRAFT"),
  sourceCitation: text("source_citation"),
  notes: text("notes"),
  active: boolean("active").notNull().default(false),
  /** HCW_OFFICIAL = kit repo (read-only); CUSTOM = firm-owned. */
  origin: text("origin").notNull().default("CUSTOM"),
  packId: text("pack_id"),
  readOnly: boolean("read_only").notNull().default(false),
  cityKey: text("city_key"),
  stateCode: text("state_code"),
  authorityId: text("authority_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const bbmpFarRules = pgTable("esti_bbmp_far_rule", {
  id: id(),
  ruleSetId: uuid("rule_set_id")
    .notNull()
    .references(() => bbmpRuleSets.id, { onDelete: "cascade" }),
  developmentArea: text("development_area").notNull(),
  siteAreaMin: doublePrecision("site_area_min").notNull(),
  siteAreaMax: doublePrecision("site_area_max").notNull(),
  roadWidthMin: doublePrecision("road_width_min").notNull(),
  roadWidthMax: doublePrecision("road_width_max").notNull(),
  residentialFar: doublePrecision("residential_far").notNull(),
  commercialFar: doublePrecision("commercial_far").notNull(),
  semiPublicFar: doublePrecision("semi_public_far").notNull(),
  publicFar: doublePrecision("public_far").notNull(),
  maxCoverage: doublePrecision("max_coverage").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bbmpSetbackLowriseRules = pgTable("esti_bbmp_setback_lowrise_rule", {
  id: id(),
  ruleSetId: uuid("rule_set_id")
    .notNull()
    .references(() => bbmpRuleSets.id, { onDelete: "cascade" }),
  depthMin: doublePrecision("depth_min").notNull(),
  depthMax: doublePrecision("depth_max").notNull(),
  widthMin: doublePrecision("width_min").notNull(),
  widthMax: doublePrecision("width_max").notNull(),
  front: doublePrecision("front").notNull(),
  rear: doublePrecision("rear").notNull(),
  left: doublePrecision("left").notNull(),
  right: doublePrecision("right").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bbmpSetbackHighriseRules = pgTable("esti_bbmp_setback_highrise_rule", {
  id: id(),
  ruleSetId: uuid("rule_set_id")
    .notNull()
    .references(() => bbmpRuleSets.id, { onDelete: "cascade" }),
  heightMin: doublePrecision("height_min").notNull(),
  heightMax: doublePrecision("height_max").notNull(),
  uniformSetback: doublePrecision("uniform_setback").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bbmpRoadRules = pgTable("esti_bbmp_road_rule", {
  id: id(),
  ruleSetId: uuid("rule_set_id")
    .notNull()
    .references(() => bbmpRuleSets.id, { onDelete: "cascade" }),
  roadClass: text("road_class").notNull(),
  roadMarginM: doublePrecision("road_margin_m").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bbmpParkingRules = pgTable("esti_bbmp_parking_rule", {
  id: id(),
  ruleSetId: uuid("rule_set_id")
    .notNull()
    .references(() => bbmpRuleSets.id, { onDelete: "cascade" }),
  projectType: text("project_type").notNull(),
  useCategory: text("use_category").notNull().default("DEFAULT"),
  unitAreaMin: doublePrecision("unit_area_min").notNull().default(0),
  unitAreaMax: doublePrecision("unit_area_max").notNull().default(999_999_999),
  floorAreaMin: doublePrecision("floor_area_min").notNull().default(0),
  floorAreaMax: doublePrecision("floor_area_max").notNull().default(999_999_999),
  formulaKey: text("formula_key").notNull(),
  ecsPerUnit: doublePrecision("ecs_per_unit"),
  ecsPerSqm: doublePrecision("ecs_per_sqm"),
  sqmPerEcs: doublePrecision("sqm_per_ecs"),
  visitorParkingPct: doublePrecision("visitor_parking_pct").notNull().default(0.1),
  sourceNote: text("source_note"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bbmpSolarRules = pgTable("esti_bbmp_solar_rule", {
  id: id(),
  ruleSetId: uuid("rule_set_id")
    .notNull()
    .references(() => bbmpRuleSets.id, { onDelete: "cascade" }),
  occupancyType: text("occupancy_type").notNull(),
  lpdRequired: doublePrecision("lpd_required").notNull(),
  basis: text("basis").notNull(),
  sourceNote: text("source_note"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bbmpSecondaryRules = pgTable("esti_bbmp_secondary_rule", {
  id: id(),
  ruleSetId: uuid("rule_set_id")
    .notNull()
    .references(() => bbmpRuleSets.id, { onDelete: "cascade" }),
  ruleKey: text("rule_key").notNull(),
  description: text("description").notNull(),
  siteAreaMin: doublePrecision("site_area_min"),
  plinthAreaMin: doublePrecision("plinth_area_min"),
  heightMinM: doublePrecision("height_min_m"),
  floorsMin: integer("floors_min"),
  requirementJson: jsonb("requirement_json").notNull().default({}),
  sourceNote: text("source_note"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bbmpEngineConstants = pgTable("esti_bbmp_engine_constant", {
  id: id(),
  ruleSetId: uuid("rule_set_id")
    .notNull()
    .references(() => bbmpRuleSets.id, { onDelete: "cascade" }),
  constantKey: text("constant_key").notNull(),
  valueNum: doublePrecision("value_num").notNull(),
  unit: text("unit"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});
