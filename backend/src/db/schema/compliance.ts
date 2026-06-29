/**
 * Studio › Libraries › Compliance Library — structured per-area reference tables
 * (NBC rules, FAR, setbacks, fire compliance, regulations). Office-wide reference
 * data; auto-lookup / computation is a later compliance-engine phase.
 */
import {
  createdAt,
  doublePrecision,
  id,
  integer,
  pgTable,
  text,
  updatedAt,
} from "./_helpers.js";

/** FAR rules — buildable ratio by zone / plot band. */
export const complianceFar = pgTable("esti_compliance_far", {
  id: id(),
  zone: text("zone").notNull(),
  plotType: text("plot_type"),
  plotAreaMinSqm: doublePrecision("plot_area_min_sqm"),
  plotAreaMaxSqm: doublePrecision("plot_area_max_sqm"),
  far: doublePrecision("far").notNull().default(0),
  groundCoveragePct: integer("ground_coverage_pct"),
  maxHeightM: doublePrecision("max_height_m"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Setback rules — required margins by zone / frontage band. */
export const complianceSetback = pgTable("esti_compliance_setback", {
  id: id(),
  zone: text("zone").notNull(),
  plotType: text("plot_type"),
  frontageMinM: doublePrecision("frontage_min_m"),
  frontageMaxM: doublePrecision("frontage_max_m"),
  frontM: doublePrecision("front_m"),
  rearM: doublePrecision("rear_m"),
  side1M: doublePrecision("side1_m"),
  side2M: doublePrecision("side2_m"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** NBC (National Building Code) rules — clause reference + requirement. */
export const complianceNbc = pgTable("esti_compliance_nbc", {
  id: id(),
  clause: text("clause").notNull(),
  title: text("title").notNull(),
  requirement: text("requirement"),
  applicability: text("applicability"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Fire-compliance rules — by building type / height band. */
export const complianceFire = pgTable("esti_compliance_fire", {
  id: id(),
  buildingType: text("building_type").notNull(),
  heightBandM: text("height_band_m"),
  requirement: text("requirement"),
  refugeArea: text("refuge_area"),
  staircaseWidthM: doublePrecision("staircase_width_m"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** General regulations — authority circulars / bye-laws. */
export const complianceRegulation = pgTable("esti_compliance_regulation", {
  id: id(),
  authority: text("authority").notNull(),
  refNo: text("ref_no"),
  title: text("title").notNull(),
  summary: text("summary"),
  link: text("link"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
