import {
  type BbmpRuleCatalog,
  type BbmpEngineConstants,
  type DevelopmentArea,
  type RoadClass,
  type SecondaryRuleKey,
  type ParkingFormulaKey,
  BBMP_ENGINE_CONSTANT_DEFAULTS,
} from "@esti/contracts";
import { DEFAULT_BBMP_RULE_CATALOG } from "@hcw/india-compliance-kit/profiles/bbmp-2003";
import { and, asc, desc, eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import {
  bbmpEngineConstants,
  bbmpFarRules,
  bbmpParkingRules,
  bbmpRoadRules,
  bbmpRuleSets,
  bbmpSecondaryRules,
  bbmpSetbackHighriseRules,
  bbmpSetbackLowriseRules,
  bbmpSolarRules,
} from "../db/schema.js";

/** SQL sentinel for open-ended bands — maps to Infinity in the engine. */
const OPEN_BAND = 999_999_999;

function toBandMax(value: number): number {
  return value >= OPEN_BAND ? Infinity : value;
}

const CONSTANT_KEY_MAP: Record<string, keyof typeof BBMP_ENGINE_CONSTANT_DEFAULTS> = {
  lowrise_height_m: "lowriseHeightM",
  basement_min_height_m: "basementMinHeightM",
  basement_max_height_m: "basementMaxHeightM",
  basement_mech_parking_height_m: "basementMechParkingHeightM",
  basement_max_projection_m: "basementMaxProjectionM",
  visitor_parking_pct: "visitorParkingPct",
  sqm_per_ecs: "sqmPerEcs",
};

function mapFarRows(
  rows: (typeof bbmpFarRules.$inferSelect)[],
): BbmpRuleCatalog["far"] {
  return rows.map((r) => ({
    developmentArea: r.developmentArea as DevelopmentArea,
    siteAreaMin: r.siteAreaMin,
    siteAreaMax: toBandMax(r.siteAreaMax),
    roadWidthMin: r.roadWidthMin,
    roadWidthMax: toBandMax(r.roadWidthMax),
    residentialFar: r.residentialFar,
    commercialFar: r.commercialFar,
    semiPublicFar: r.semiPublicFar,
    publicFar: r.publicFar,
    maxCoverage: r.maxCoverage,
  }));
}

function mapLowriseRows(
  rows: (typeof bbmpSetbackLowriseRules.$inferSelect)[],
): BbmpRuleCatalog["lowriseSetbacks"] {
  return rows.map((r) => ({
    depthMin: r.depthMin,
    depthMax: toBandMax(r.depthMax),
    widthMin: r.widthMin,
    widthMax: toBandMax(r.widthMax),
    front: r.front,
    rear: r.rear,
    left: r.left,
    right: r.right,
  }));
}

function mapHighriseRows(
  rows: (typeof bbmpSetbackHighriseRules.$inferSelect)[],
): BbmpRuleCatalog["highriseSetbacks"] {
  return rows.map((r) => ({
    heightMin: r.heightMin,
    heightMax: toBandMax(r.heightMax),
    uniformSetback: r.uniformSetback,
  }));
}

function mapRoadRows(
  rows: (typeof bbmpRoadRules.$inferSelect)[],
): BbmpRuleCatalog["roadMargins"] {
  return rows.map((r) => ({
    roadClass: r.roadClass as RoadClass,
    roadMarginM: r.roadMarginM,
  }));
}

function mapParkingRows(
  rows: (typeof bbmpParkingRules.$inferSelect)[],
): BbmpRuleCatalog["parkingRules"] {
  return rows.map((r) => ({
    projectType: r.projectType as BbmpRuleCatalog["parkingRules"][number]["projectType"],
    useCategory: r.useCategory,
    unitAreaMin: r.unitAreaMin,
    unitAreaMax: toBandMax(r.unitAreaMax),
    floorAreaMin: r.floorAreaMin,
    floorAreaMax: toBandMax(r.floorAreaMax),
    formulaKey: r.formulaKey as ParkingFormulaKey,
    ecsPerUnit: r.ecsPerUnit ?? undefined,
    ecsPerSqm: r.ecsPerSqm ?? undefined,
    sqmPerEcs: r.sqmPerEcs ?? undefined,
    visitorParkingPct: r.visitorParkingPct,
  }));
}

function mapSolarRows(
  rows: (typeof bbmpSolarRules.$inferSelect)[],
): BbmpRuleCatalog["solarRules"] {
  return rows.map((r) => ({
    occupancyType: r.occupancyType,
    lpdRequired: r.lpdRequired,
    basis: r.basis,
  }));
}

function mapSecondaryRows(
  rows: (typeof bbmpSecondaryRules.$inferSelect)[],
): BbmpRuleCatalog["secondaryRules"] {
  return rows.map((r) => ({
    ruleKey: r.ruleKey as SecondaryRuleKey,
    description: r.description,
    siteAreaMin: r.siteAreaMin ?? undefined,
    plinthAreaMin: r.plinthAreaMin ?? undefined,
    heightMinM: r.heightMinM ?? undefined,
    floorsMin: r.floorsMin ?? undefined,
    requirementJson: (r.requirementJson ?? {}) as Record<string, unknown>,
  }));
}

function mapEngineConstants(
  rows: (typeof bbmpEngineConstants.$inferSelect)[],
): BbmpEngineConstants {
  const out: BbmpEngineConstants = { ...BBMP_ENGINE_CONSTANT_DEFAULTS };
  for (const row of rows) {
    const key = CONSTANT_KEY_MAP[row.constantKey];
    if (key) out[key] = row.valueNum;
  }
  return out;
}

/** Load the active published BBMP rule catalog from DB, or code defaults if none. */
export async function loadActiveBbmpRuleCatalog(db: DB): Promise<BbmpRuleCatalog> {
  const [ruleSet] = await db
    .select()
    .from(bbmpRuleSets)
    .where(and(eq(bbmpRuleSets.status, "PUBLISHED"), eq(bbmpRuleSets.active, true)))
    .orderBy(desc(bbmpRuleSets.effectiveDate))
    .limit(1);

  if (!ruleSet) return DEFAULT_BBMP_RULE_CATALOG;

  return loadBbmpRuleCatalogById(db, ruleSet.id);
}

/** Load a specific BBMP rule set by id. */
export async function loadBbmpRuleCatalogById(
  db: DB,
  ruleSetId: string,
): Promise<BbmpRuleCatalog> {
  const [ruleSet] = await db
    .select()
    .from(bbmpRuleSets)
    .where(eq(bbmpRuleSets.id, ruleSetId));

  if (!ruleSet) return DEFAULT_BBMP_RULE_CATALOG;

  if ((ruleSet.readOnly || ruleSet.origin === "HCW_OFFICIAL") && ruleSet.packId === "compliance-bbmp-2003") {
    return {
      ...DEFAULT_BBMP_RULE_CATALOG,
      ruleSetId: ruleSet.id,
      label: ruleSet.label,
    };
  }

  const [far, lowrise, highrise, road, parking, solar, secondary, constants] =
    await Promise.all([
      db
        .select()
        .from(bbmpFarRules)
        .where(eq(bbmpFarRules.ruleSetId, ruleSetId))
        .orderBy(asc(bbmpFarRules.sortOrder)),
      db
        .select()
        .from(bbmpSetbackLowriseRules)
        .where(eq(bbmpSetbackLowriseRules.ruleSetId, ruleSetId))
        .orderBy(asc(bbmpSetbackLowriseRules.sortOrder)),
      db
        .select()
        .from(bbmpSetbackHighriseRules)
        .where(eq(bbmpSetbackHighriseRules.ruleSetId, ruleSetId))
        .orderBy(asc(bbmpSetbackHighriseRules.sortOrder)),
      db
        .select()
        .from(bbmpRoadRules)
        .where(eq(bbmpRoadRules.ruleSetId, ruleSetId))
        .orderBy(asc(bbmpRoadRules.sortOrder)),
      db
        .select()
        .from(bbmpParkingRules)
        .where(eq(bbmpParkingRules.ruleSetId, ruleSetId))
        .orderBy(asc(bbmpParkingRules.sortOrder)),
      db
        .select()
        .from(bbmpSolarRules)
        .where(eq(bbmpSolarRules.ruleSetId, ruleSetId))
        .orderBy(asc(bbmpSolarRules.sortOrder)),
      db
        .select()
        .from(bbmpSecondaryRules)
        .where(eq(bbmpSecondaryRules.ruleSetId, ruleSetId))
        .orderBy(asc(bbmpSecondaryRules.sortOrder)),
      db
        .select()
        .from(bbmpEngineConstants)
        .where(eq(bbmpEngineConstants.ruleSetId, ruleSetId))
        .orderBy(asc(bbmpEngineConstants.sortOrder)),
    ]);

  return {
    ruleSetId: ruleSet.id,
    label: ruleSet.label,
    far: mapFarRows(far),
    lowriseSetbacks: mapLowriseRows(lowrise),
    highriseSetbacks: mapHighriseRows(highrise),
    roadMargins: mapRoadRows(road),
    parkingRules: parking.length ? mapParkingRows(parking) : DEFAULT_BBMP_RULE_CATALOG.parkingRules,
    solarRules: solar.length ? mapSolarRows(solar) : DEFAULT_BBMP_RULE_CATALOG.solarRules,
    secondaryRules: secondary.length
      ? mapSecondaryRows(secondary)
      : DEFAULT_BBMP_RULE_CATALOG.secondaryRules,
    engineConstants: constants.length
      ? mapEngineConstants(constants)
      : DEFAULT_BBMP_RULE_CATALOG.engineConstants,
  };
}

/** JSON-safe catalog for API responses (Infinity → open-band sentinel). */
export function catalogForApi(catalog: BbmpRuleCatalog): BbmpRuleCatalog {
  const cap = (value: number) =>
    !Number.isFinite(value) || value >= OPEN_BAND ? OPEN_BAND : value;
  return {
    ...catalog,
    far: catalog.far.map((row) => ({
      ...row,
      siteAreaMax: cap(row.siteAreaMax),
      roadWidthMax: cap(row.roadWidthMax),
    })),
    lowriseSetbacks: catalog.lowriseSetbacks.map((row) => ({
      ...row,
      depthMax: cap(row.depthMax),
      widthMax: cap(row.widthMax),
    })),
    highriseSetbacks: catalog.highriseSetbacks.map((row) => ({
      ...row,
      heightMax: cap(row.heightMax),
    })),
    parkingRules: catalog.parkingRules.map((row) => ({
      ...row,
      unitAreaMax: cap(row.unitAreaMax),
      floorAreaMax: cap(row.floorAreaMax),
    })),
  };
}
