import {
  buildTakeoffEstimateLines,
  estimateItemAmount,
  type TakeoffMeasurementRef,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { estimateItems, estimates, measurements } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { resolveDsrItemRefsForVersion } from "../../lib/dsrCatalog.js";
import { recomputeEstimate } from "./recomputeEstimate.js";
import { dsrSnapshotForItem } from "./estimateProvenance.js";

export async function importTakeoffToEstimate(
  db: DB,
  input: {
    projectId: string;
    estimateId: string;
    measurementIds?: string[];
    actorId: string;
  },
) {
  const [est] = await db.select().from(estimates).where(eq(estimates.id, input.estimateId));
  if (!est) throw new TRPCError({ code: "NOT_FOUND", message: "Estimate not found" });
  if (est.projectId !== input.projectId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Estimate belongs to another project" });
  }
  if (est.status !== "DRAFT") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft estimates accept takeoff import" });
  }
  if (!est.dsrVersionId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Link a rate-book version to this estimate before importing takeoff quantities",
    });
  }

  const where = input.measurementIds?.length
    ? and(
        eq(measurements.projectId, input.projectId),
        inArray(measurements.id, input.measurementIds),
      )
    : eq(measurements.projectId, input.projectId);

  const rows = await db.select().from(measurements).where(where);
  const tagged = rows.filter((r) => r.elementTypeId && r.boqQty != null);
  if (!tagged.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No tagged takeoff measurements to import" });
  }

  const dsrRows = await resolveDsrItemRefsForVersion(db, est.dsrVersionId);

  const refs: TakeoffMeasurementRef[] = tagged.map((m) => ({
    elementTypeId: m.elementTypeId,
    label: m.label,
    boqQty: m.boqQty,
    boqUnit: m.boqUnit,
    boqDescription: m.boqDescription,
  }));

  const lines = buildTakeoffEstimateLines(refs, dsrRows);
  let added = 0;
  let unmatched = 0;

  for (const line of lines) {
    if (!line.dsrMatched) unmatched += 1;
    const amountPaise = estimateItemAmount(line.qty, line.ratePaise, 0);
    const sourceRows = tagged.filter((m) => m.elementTypeId === line.elementTypeId);
    const dsrSnapshot = await dsrSnapshotForItem(db, line.dsrItemId);
    await db.insert(estimateItems).values({
      estimateId: input.estimateId,
      dsrItemId: line.dsrItemId,
      sourceKind: "TAKEOFF_IMPORT",
      ...dsrSnapshot,
      sourceMeasurementIds: sourceRows.map((m) => m.id),
      sourcePayload: {
        ...(dsrSnapshot.sourcePayload ?? {}),
        takeoff: {
          elementTypeId: line.elementTypeId,
          elementLabel: line.elementLabel,
          measurementCount: line.measurementCount,
          measurementNames: line.takeoffNames,
          unmatchedDsr: !line.dsrMatched,
        },
      },
      description: line.description,
      unit: line.unit,
      qty: line.qty,
      ratePaise: line.ratePaise,
      itemLeadPct: 0,
      amountPaise,
    });
    added += 1;
  }

  await recomputeEstimate(db, input.estimateId);
  await writeAudit(db, {
    entity: "estimate",
    entityId: input.estimateId,
    action: "TAKEOFF_IMPORT",
    actorId: input.actorId,
    after: {
      linesAdded: added,
      measurementCount: tagged.length,
      unmatchedDsrCount: unmatched,
      dsrVersionId: est.dsrVersionId,
    },
  });

  return {
    linesAdded: added,
    measurementCount: tagged.length,
    unmatchedDsrCount: unmatched,
  };
}

export async function previewTakeoffForDsr(
  db: DB,
  input: { projectId: string; dsrVersionId: string },
) {
  const rows = await db
    .select({
      elementTypeId: measurements.elementTypeId,
      label: measurements.label,
      boqQty: measurements.boqQty,
      boqUnit: measurements.boqUnit,
      boqDescription: measurements.boqDescription,
    })
    .from(measurements)
    .where(eq(measurements.projectId, input.projectId));

  const tagged = rows.filter((r) => r.elementTypeId && r.boqQty != null);
  const dsrRows = await resolveDsrItemRefsForVersion(db, input.dsrVersionId);

  const lines = buildTakeoffEstimateLines(tagged, dsrRows);
  const subtotalPaise = lines.reduce((s, l) => s + l.amountPaise, 0);
  return {
    lines,
    measurementCount: tagged.length,
    unmatchedDsrCount: lines.filter((l) => !l.dsrMatched).length,
    subtotalPaise,
  };
}
