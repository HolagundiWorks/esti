import type { BbmpRuleCatalogInput } from "@esti/contracts";
import type { DB } from "../db/index.js";
import {
  bbmpEngineConstants,
  bbmpFarRules,
  bbmpParkingRules,
  bbmpRoadRules,
  bbmpSecondaryRules,
  bbmpSetbackHighriseRules,
  bbmpSetbackLowriseRules,
} from "../db/schema.js";

const OPEN_BAND = 999_999_999;

function toDbMax(value: number): number {
  return !Number.isFinite(value) || value >= OPEN_BAND ? OPEN_BAND : value;
}

/** Insert all modular rule rows for a rule set (caller owns the rule set row). */
export async function insertBbmpCatalogRows(
  db: DB,
  ruleSetId: string,
  catalog: BbmpRuleCatalogInput,
): Promise<void> {
  if (catalog.far.length) {
    await db.insert(bbmpFarRules).values(
      catalog.far.map((r, i) => ({
        ruleSetId,
        developmentArea: r.developmentArea,
        siteAreaMin: r.siteAreaMin,
        siteAreaMax: toDbMax(r.siteAreaMax),
        roadWidthMin: r.roadWidthMin,
        roadWidthMax: toDbMax(r.roadWidthMax),
        residentialFar: r.residentialFar,
        commercialFar: r.commercialFar,
        semiPublicFar: r.semiPublicFar,
        publicFar: r.publicFar,
        maxCoverage: r.maxCoverage,
        sortOrder: i,
      })),
    );
  }

  if (catalog.lowriseSetbacks.length) {
    await db.insert(bbmpSetbackLowriseRules).values(
      catalog.lowriseSetbacks.map((r, i) => ({
        ruleSetId,
        depthMin: r.depthMin,
        depthMax: toDbMax(r.depthMax),
        widthMin: r.widthMin,
        widthMax: toDbMax(r.widthMax),
        front: r.front,
        rear: r.rear,
        left: r.left,
        right: r.right,
        sortOrder: i,
      })),
    );
  }

  if (catalog.highriseSetbacks.length) {
    await db.insert(bbmpSetbackHighriseRules).values(
      catalog.highriseSetbacks.map((r, i) => ({
        ruleSetId,
        heightMin: r.heightMin,
        heightMax: toDbMax(r.heightMax),
        uniformSetback: r.uniformSetback,
        sortOrder: i,
      })),
    );
  }

  if (catalog.roadMargins.length) {
    await db.insert(bbmpRoadRules).values(
      catalog.roadMargins.map((r, i) => ({
        ruleSetId,
        roadClass: r.roadClass,
        roadMarginM: r.roadMarginM,
        sortOrder: i,
      })),
    );
  }

  if (catalog.parkingRules.length) {
    await db.insert(bbmpParkingRules).values(
      catalog.parkingRules.map((r, i) => ({
        ruleSetId,
        projectType: r.projectType,
        useCategory: r.useCategory,
        unitAreaMin: r.unitAreaMin,
        unitAreaMax: toDbMax(r.unitAreaMax),
        floorAreaMin: r.floorAreaMin,
        floorAreaMax: toDbMax(r.floorAreaMax),
        formulaKey: r.formulaKey,
        sqmPerEcs: r.sqmPerEcs ?? null,
        visitorParkingPct: r.visitorParkingPct,
        sortOrder: i,
      })),
    );
  }

  if (catalog.secondaryRules.length) {
    await db.insert(bbmpSecondaryRules).values(
      catalog.secondaryRules.map((r, i) => ({
        ruleSetId,
        ruleKey: r.ruleKey,
        description: r.description,
        siteAreaMin: r.siteAreaMin ?? null,
        plinthAreaMin: r.plinthAreaMin ?? null,
        heightMinM: r.heightMinM ?? null,
        floorsMin: r.floorsMin ?? null,
        requirementJson: r.requirementJson,
        sortOrder: i,
      })),
    );
  }

  const c = catalog.engineConstants;
  const constantRows: Array<{ key: string; value: number; unit: string; description: string; order: number }> = [
    { key: "lowrise_height_m", value: c.lowriseHeightM, unit: "m", description: "Low-rise cutoff", order: 1 },
    { key: "basement_min_height_m", value: c.basementMinHeightM, unit: "m", description: "Basement min height", order: 2 },
    { key: "basement_max_height_m", value: c.basementMaxHeightM, unit: "m", description: "Basement max height", order: 3 },
    { key: "basement_mech_parking_height_m", value: c.basementMechParkingHeightM, unit: "m", description: "Mech parking basement", order: 4 },
    { key: "basement_max_projection_m", value: c.basementMaxProjectionM, unit: "m", description: "Basement projection", order: 5 },
    { key: "visitor_parking_pct", value: c.visitorParkingPct, unit: "ratio", description: "Visitor parking", order: 6 },
    { key: "sqm_per_ecs", value: c.sqmPerEcs, unit: "sqm", description: "Sq m per ECS", order: 7 },
  ];

  await db.insert(bbmpEngineConstants).values(
    constantRows.map((row) => ({
      ruleSetId,
      constantKey: row.key,
      valueNum: row.value,
      unit: row.unit,
      description: row.description,
      sortOrder: row.order,
    })),
  );
}
