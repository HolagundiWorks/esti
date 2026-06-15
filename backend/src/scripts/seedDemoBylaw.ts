/**
 * Demo bylaw calc — pre-construction envelope + optional post-construction audit.
 * Uses the shared BBMP rule engine (BYLAW-SYSTEMS.md).
 */
import {
  computeBylawEnvelope,
  computePostConstructionAudit,
  computePreConstructionPotential,
  type BylawCalcInput,
} from "@esti/contracts";
import { eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { bylawCalcs, projectOffices } from "../db/schema.js";
import { loadActiveBbmpRuleCatalog } from "../lib/bbmpRules.js";

export function demoBylawInput(pi: number, siteAreaSqm: number): BylawCalcInput {
  const plotWidthM = Math.round(Math.sqrt(siteAreaSqm) * 10) / 10;
  const plotDepthM = Math.round((siteAreaSqm / plotWidthM) * 10) / 10;
  const commercial = pi >= 2 && pi !== 3;

  return {
    buildingType: commercial ? "COMMERCIAL" : "RESIDENTIAL",
    developmentArea: pi < 4 ? "A" : pi < 6 ? "B" : "C",
    siteAreaSqm,
    plotWidthM,
    plotDepthM,
    proposedHeightM: pi < 4 ? 9 : 16,
    floorCount: pi < 4 ? 2 : 5,
    dwellingUnits: commercial ? 0 : 1 + (pi % 3),
    unitAreaSqm: 120 + pi * 10,
    front:
      pi % 2 === 0
        ? {
            abutsRoad: true,
            roadWidthM: Math.min(18, 6 + pi * 2),
            roadClass: "LOCAL",
            distanceCentreToBoundaryM: 3,
          }
        : { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
    rear: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
    left: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
    right: { abutsRoad: false, roadWidthM: 0, roadClass: "LOCAL", distanceCentreToBoundaryM: 0 },
    hasBasement: pi >= 4,
    basementHeightM: pi >= 4 ? 2.5 : 0,
    basementMechanicalParking: false,
  };
}

/** Upsert pre/post bylaw data for a demo project (always refreshes engine output). */
export async function upsertDemoBylawCalc(
  db: DB,
  projectId: string,
  pi: number,
  siteAreaSqm: number,
): Promise<void> {
  const catalog = await loadActiveBbmpRuleCatalog(db);
  const input = demoBylawInput(pi, siteAreaSqm);
  const result = computeBylawEnvelope(input, catalog);
  const preConstruction = computePreConstructionPotential(input, catalog);
  const payload = { ...result, preConstruction };
  const now = new Date();

  let postconstructionInput = null;
  let postconstructionAudit = null;
  let postcomputedAt: Date | null = null;

  if (pi === 0) {
    const s = result.setbacks;
    postconstructionInput = {
      totalFloorAreaSqm: Math.round(result.permissibleBuiltup * 1.12),
      exemptAreaSqm: 0,
      groundCoverPct: result.coverageAllowed + 3,
      actualFrontSetbackM: Math.max(0, s.front.value - 0.5),
      actualRearSetbackM: s.rear.value,
      actualLeftSetbackM: s.left.value,
      actualRightSetbackM: s.right.value,
      providedParkingEcs: Math.max(1, result.parking.total - 1),
      treesPlanted: 0,
      hasBasement: false,
      basementHeightM: 0,
      basementMechanicalParking: false,
      basementProjectionAboveGroundM: 0,
    };
    postconstructionAudit = computePostConstructionAudit(
      input,
      postconstructionInput,
      catalog,
    );
    postcomputedAt = now;
  } else if (pi === 2) {
    const s = result.setbacks;
    postconstructionInput = {
      totalFloorAreaSqm: Math.round(result.permissibleBuiltup * 0.92),
      exemptAreaSqm: 0,
      groundCoverPct: Math.max(0, result.coverageAllowed - 5),
      actualFrontSetbackM: s.front.value + 0.5,
      actualRearSetbackM: s.rear.value + 0.5,
      actualLeftSetbackM: s.left.value,
      actualRightSetbackM: s.right.value,
      providedParkingEcs: result.parking.total + 2,
      treesPlanted: 3,
      hasBasement: false,
      basementHeightM: 0,
      basementMechanicalParking: false,
      basementProjectionAboveGroundM: 0,
    };
    postconstructionAudit = computePostConstructionAudit(
      input,
      postconstructionInput,
      catalog,
    );
    postcomputedAt = now;
  }

  const [existing] = await db
    .select()
    .from(bylawCalcs)
    .where(eq(bylawCalcs.projectId, projectId));

  const row = {
    input,
    result: payload,
    bbmpRuleSetId: catalog.ruleSetId ?? null,
    precomputedAt: now,
    postconstructionInput,
    postconstructionAudit,
    postcomputedAt,
  };

  if (existing) {
    await db.update(bylawCalcs).set(row).where(eq(bylawCalcs.id, existing.id));
  } else {
    await db.insert(bylawCalcs).values({ projectId, ...row });
  }

  await db
    .update(projectOffices)
    .set({ siteAreaSqm })
    .where(eq(projectOffices.id, projectId));
}

export async function backfillDemoBylawCalcs(db: DB): Promise<number> {
  const titles = [
    "Sharma Villa — Whitefield",
    "Rao House — Mysuru",
    "Verde Commercial Block",
    "Kapoor Residence — Sarjapur",
    "Patel Corp HQ — Pune",
    "St. Francis School Expansion",
    "Reddy Beach Retreat — Goa",
    "Nexus Co-working — Koramangala",
  ];
  let count = 0;
  for (const [pi, title] of titles.entries()) {
    const [project] = await db
      .select({ id: projectOffices.id })
      .from(projectOffices)
      .where(eq(projectOffices.title, title))
      .limit(1);
    if (!project) continue;
    const siteAreaSqm = 300 + pi * 80;
    await upsertDemoBylawCalc(db, project.id, pi, siteAreaSqm);
    count++;
  }
  return count;
}
