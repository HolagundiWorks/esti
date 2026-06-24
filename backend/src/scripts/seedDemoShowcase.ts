/**
 * Idempotent demo showcase records — drawings, ESTICAD takeoff, draft estimates.
 * Called from seedDemo / backfill on every run so VPS demos stay current.
 */
import { computeTakeoffBoq, takeoffElement } from "@esti/contracts";
import { createHash } from "node:crypto";
import { and, eq, inArray, isNull, like, or } from "drizzle-orm";
import type { db } from "../db/index.js";
import {
  comments,
  decisions,
  drawings,
  estimateItems,
  estimates,
  measurements,
  projectOffices,
  users,
} from "../db/schema.js";
import { nextRef } from "../lib/numbering.js";
import { importTakeoffToEstimate } from "../modules/boq/takeoffImport.js";
import { companionMeasurementSchemaReady } from "./seedBootstrap.js";
import { ensureBuildingDsrCatalog } from "./seedBuildingDsr.js";

type Db = typeof db;

const SHOWCASE_PROJECT_TITLES = [
  "Sharma Villa — Whitefield",
  "Verde Commercial Block",
] as const;

const SOLO_SHOWCASE_TITLE = "Desai Residence — Indiranagar";

/** Remove legacy browser takeoff rows — charter: ESTICAD-only capture. */
export async function purgeLegacyWebMeasurements(database: Db): Promise<number> {
  if (!(await companionMeasurementSchemaReady(database))) {
    console.warn("    skip purge: esti_measurement.source not migrated yet");
    return 0;
  }

  const demoProjects = await database
    .select({ id: projectOffices.id })
    .from(projectOffices)
    .innerJoin(users, eq(users.id, projectOffices.createdById))
    .where(eq(users.isDemo, true));

  const projectIds = demoProjects.map((p) => p.id);
  if (projectIds.length === 0) return 0;

  const deleted = await database
    .delete(measurements)
    .where(
      and(
        inArray(measurements.projectId, projectIds),
        or(eq(measurements.source, "WEB"), isNull(measurements.source)),
      ),
    )
    .returning({ id: measurements.id });

  return deleted.length;
}

async function ensureLinkedDrawing(
  database: Db,
  input: { projectId: string; title: string; refSuffix: string },
) {
  const [existing] = await database
    .select()
    .from(drawings)
    .where(and(eq(drawings.projectId, input.projectId), eq(drawings.title, input.title)))
    .limit(1);
  if (existing) return existing;

  const { ref } = await nextRef(database, "drawing", "DRW");
  const placeholder = createHash("sha256")
    .update(`demo-drawing:${input.projectId}:${input.refSuffix}:${ref}`)
    .digest("hex");

  const [row] = await database
    .insert(drawings)
    .values({
      ref,
      projectId: input.projectId,
      title: input.title,
      fileName: `${input.refSuffix}.esti`,
      fileHash: placeholder,
      storageKey: `linked/${placeholder}`,
      sizeBytes: 0,
      status: "READY",
      scaleUnit: "mm",
      scaleUnitsPerVb: 1,
      isCurrent: true,
    })
    .returning();

  return row!;
}

async function ensureEsticadMeasurements(
  database: Db,
  input: {
    projectId: string;
    drawingId: string;
    items: Array<{
      label: string;
      elementTypeId: string;
      kind: "LINEAR" | "AREA" | "COUNT";
      realLength: number;
      itemCount?: number;
    }>;
  },
): Promise<number> {
  if (!(await companionMeasurementSchemaReady(database))) {
    console.warn("    skip ESTICAD takeoff rows: run migrations (0055) first");
    return 0;
  }

  let added = 0;
  for (const item of input.items) {
    const [exists] = await database
      .select({ id: measurements.id })
      .from(measurements)
      .where(
        and(
          eq(measurements.drawingId, input.drawingId),
          eq(measurements.label, item.label),
          eq(measurements.source, "ESTICAD"),
        ),
      )
      .limit(1);
    if (exists) continue;

    const boq = computeTakeoffBoq({
      elementTypeId: item.elementTypeId,
      measureKind: item.kind,
      realLength: item.realLength,
      unit: "mm",
      itemCount: item.itemCount,
    });

    const el = takeoffElement(item.elementTypeId);

    await database.insert(measurements).values({
      drawingId: input.drawingId,
      projectId: input.projectId,
      label: item.label,
      kind: item.kind,
      vbLength: 0,
      realLength: item.realLength,
      unit: "mm",
      elementTypeId: item.elementTypeId,
      elementCategory: el?.category ?? null,
      itemCount: item.itemCount ?? 1,
      boqQty: boq.boqQty,
      boqUnit: boq.boqUnit,
      boqDescription: boq.boqDescription,
      source: "ESTICAD",
      scaleWorldUnits: "mm",
      createdByClient: "esticad/demo-seed",
      worldGeometry: {
        type: "LINE",
        points: [
          { x: 0, y: 0 },
          { x: item.realLength, y: 0 },
        ],
      },
    });
    added += 1;
  }
  return added;
}

async function ensureDraftEstimate(
  database: Db,
  projectId: string,
  title: string,
  actorId: string,
): Promise<void> {
  const { versionId } = await ensureBuildingDsrCatalog(database);

  let [estimate] = await database
    .select({ id: estimates.id, status: estimates.status })
    .from(estimates)
    .where(and(eq(estimates.projectId, projectId), eq(estimates.title, title)))
    .limit(1);
  if (!estimate) {
    const { ref } = await nextRef(database, "estimate", "EST");
    [estimate] = await database
      .insert(estimates)
      .values({
        ref,
        projectId,
        title,
        dsrVersionId: versionId,
        status: "DRAFT",
        leadPct: 12.5,
      })
      .returning({ id: estimates.id, status: estimates.status });
  }

  // Never touch an approved estimate. For a draft, rebuild the BOQ lines from the
  // project's current takeoff measurements so each line is traceable to its source
  // ("View calculation"). Idempotent + self-healing: an older demo whose estimate
  // had hand-entered items (or stale lines) is refreshed to the real takeoff.
  if (estimate!.status !== "DRAFT") return;
  await database.delete(estimateItems).where(eq(estimateItems.estimateId, estimate!.id));
  try {
    await importTakeoffToEstimate(database, { projectId, estimateId: estimate!.id, actorId });
  } catch {
    /* no tagged measurements yet — leave the estimate empty until takeoff exists */
  }
}

/** Decision-thread comments with valid decision object IDs (not project refs). */
export async function ensureDemoDecisionComments(database: Db): Promise<number> {
  await database.delete(comments).where(
    and(eq(comments.objectType, "decision"), like(comments.objectId, "PRJ-%")),
  );

  const seeds: { title: string; body: string; actorName: string }[] = [
    {
      title: "Sharma Villa — Whitefield",
      body: "Structural team reviewed ACM anchor loads — within slab capacity. Proceeding to facade contractor shortlist.",
      actorName: "Aarav Mehta",
    },
    {
      title: "Verde Commercial Block",
      body: "Verde client confirmed the additional 150mm floor height — cost impact accepted. Updating drawings.",
      actorName: "Sneha Rao",
    },
    {
      title: "Patel Corp HQ — Pune",
      body: "Unitised facade supplier shortlisted to three vendors. Requesting mock-up proposals from all three.",
      actorName: "Aarav Mehta",
    },
  ];

  let added = 0;
  for (const seed of seeds) {
    const [project] = await database
      .select({ id: projectOffices.id })
      .from(projectOffices)
      .where(eq(projectOffices.title, seed.title))
      .limit(1);
    if (!project) continue;

    const [decision] = await database
      .select({ id: decisions.id })
      .from(decisions)
      .where(eq(decisions.projectId, project.id))
      .limit(1);
    if (!decision) continue;

    const [exists] = await database
      .select({ id: comments.id })
      .from(comments)
      .where(
        and(
          eq(comments.projectId, project.id),
          eq(comments.objectType, "decision"),
          eq(comments.objectId, decision.id),
        ),
      )
      .limit(1);
    if (exists) continue;

    await database.insert(comments).values({
      projectId: project.id,
      objectType: "decision",
      objectId: decision.id,
      body: seed.body,
      actorName: seed.actorName,
      visibility: "STAFF",
    });
    added += 1;
  }

  return added;
}

export async function ensureDemoShowcase(database: Db): Promise<{
  purgedWebMeasurements: number;
  drawings: number;
  measurements: number;
  estimates: number;
  comments: number;
}> {
  const purgedWebMeasurements = await purgeLegacyWebMeasurements(database);

  let drawingCount = 0;
  let measurementCount = 0;

  for (const title of SHOWCASE_PROJECT_TITLES) {
    const [project] = await database
      .select({ id: projectOffices.id, createdById: projectOffices.createdById })
      .from(projectOffices)
      .where(eq(projectOffices.title, title))
      .limit(1);
    if (!project) continue;

    const drawing = await ensureLinkedDrawing(database, {
      projectId: project.id,
      title: title.startsWith("Sharma") ? "Ground floor plan — GFC" : "Typical floor plan — GFC",
      refSuffix: title.startsWith("Sharma") ? "sharma-gfc" : "verde-gfc",
    });
    drawingCount += 1;

    // The AREA takeoff model is a length×1-unit placeholder (not a true polygon
    // area), so it yields nonsense BOQ quantities. Drop the legacy Sharma slab
    // measurement and use LINEAR/COUNT elements that compute correctly, so the
    // demo estimate (and its "View calculation" breakdown) reads true.
    if (title.startsWith("Sharma")) {
      await database
        .delete(measurements)
        .where(and(eq(measurements.drawingId, drawing.id), eq(measurements.elementTypeId, "SLAB_150")));
    }

    measurementCount += await ensureEsticadMeasurements(database, {
      projectId: project.id,
      drawingId: drawing.id,
      items:
        title.startsWith("Sharma") ?
          [
            { label: "External wall — north", elementTypeId: "WALL_230", kind: "LINEAR", realLength: 12_400 },
            { label: "External wall — south", elementTypeId: "WALL_230", kind: "LINEAR", realLength: 11_800 },
            { label: "Internal partitions — GF", elementTypeId: "WALL_115", kind: "LINEAR", realLength: 24_600 },
            { label: "RCC columns — ground floor", elementTypeId: "COL_300x300", kind: "COUNT", realLength: 0, itemCount: 12 },
            { label: "Isolated footings", elementTypeId: "FTG_1000x1000x450", kind: "COUNT", realLength: 0, itemCount: 12 },
          ]
        : [
            { label: "Typical floor plate", elementTypeId: "SLAB_150", kind: "AREA", realLength: 5_000 },
            { label: "Core wall — east", elementTypeId: "WALL_200", kind: "LINEAR", realLength: 18_600 },
            { label: "Columns — grid A", elementTypeId: "COL_300x300", kind: "COUNT", realLength: 0, itemCount: 8 },
          ],
    });

    if (title.startsWith("Sharma") && project.createdById) {
      await ensureDraftEstimate(
        database,
        project.id,
        "Sharma Villa — architecture BOQ (draft)",
        project.createdById,
      );
    }
  }

  const commentCount = await ensureDemoDecisionComments(database);

  return {
    purgedWebMeasurements,
    drawings: drawingCount,
    measurements: measurementCount,
    estimates: 1,
    comments: commentCount,
  };
}

export async function ensureSoloDemoShowcase(database: Db): Promise<void> {
  const [project] = await database
    .select({ id: projectOffices.id })
    .from(projectOffices)
    .where(eq(projectOffices.title, SOLO_SHOWCASE_TITLE))
    .limit(1);
  if (!project) return;

  const drawing = await ensureLinkedDrawing(database, {
    projectId: project.id,
    title: "Concept plan — courtyard scheme",
    refSuffix: "solo-concept",
  });

  await ensureEsticadMeasurements(database, {
    projectId: project.id,
    drawingId: drawing.id,
    items: [
      { label: "Perimeter wall", elementTypeId: "WALL_115", kind: "LINEAR", realLength: 9_200 },
    ],
  });
}

/** All studio demo project titles — used for per-project backfill. */
export const STUDIO_DEMO_PROJECT_TITLES = [
  "Sharma Villa — Whitefield",
  "Rao House — Mysuru",
  "Verde Commercial Block",
  "Kapoor Residence — Sarjapur",
  "Patel Corp HQ — Pune",
  "St. Francis School Expansion",
  "Reddy Beach Retreat — Goa",
  "Nexus Co-working — Koramangala",
  "Sunrise Boutique Hotel — Indiranagar",
  "Nair Wellness Clinic — Mangaluru",
  "GreenField Factory Shed — Hosur",
  "Lakeview Apartments — Hyderabad",
  "Meghana Community Centre",
  "Desai Villa — Belagavi",
] as const;
