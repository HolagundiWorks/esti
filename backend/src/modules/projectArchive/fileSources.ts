import { and, eq, isNotNull, isNull, ne, or } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import type { DB } from "../../db/index.js";
import {
  clientOnboardings,
  documentIssues,
  drawings,
  expenses,
  feasibilityReports,
  inspectionPhotos,
  inspections,
  invoices,
  letters,
  moms,
  proposals,
  specSheets,
  transmittals,
} from "../../db/schema.js";

/**
 * Every object-store file that belongs to a single project, declared with the
 * live Drizzle column refs (a wrong column is a compile error, not a runtime
 * one). Each source is a (table, keyColumn, projectColumn) triple: the file key
 * lives in `key`, and the row belongs to a project via `project` on the same
 * table. Keys are content-addressed and can be shared across projects, so
 * removal is gated on exclusivity (see collectProjectFiles).
 *
 * `inspectionPhotos` links to a project indirectly (via its inspection) and is
 * handled separately below.
 */
type DirectSource = { label: string; table: PgTable; key: AnyPgColumn; project: AnyPgColumn };

const DIRECT_SOURCES: DirectSource[] = [
  { label: "drawing.dxf", table: drawings, key: drawings.storageKey, project: drawings.projectId },
  { label: "drawing.svg", table: drawings, key: drawings.svgKey, project: drawings.projectId },
  { label: "drawing.issuePdf", table: drawings, key: drawings.issuePdfKey, project: drawings.projectId },
  { label: "invoice.pdf", table: invoices, key: invoices.pdfKey, project: invoices.projectId },
  { label: "proposal.pdf", table: proposals, key: proposals.pdfKey, project: proposals.projectId },
  { label: "letter.pdf", table: letters, key: letters.pdfKey, project: letters.projectId },
  { label: "inspection.pdf", table: inspections, key: inspections.pdfKey, project: inspections.projectId },
  { label: "specsheet.pdf", table: specSheets, key: specSheets.pdfKey, project: specSheets.projectId },
  { label: "transmittal.pdf", table: transmittals, key: transmittals.pdfKey, project: transmittals.projectId },
  { label: "mom.pdf", table: moms, key: moms.pdfKey, project: moms.projectId },
  { label: "documentIssue.pdf", table: documentIssues, key: documentIssues.pdfKey, project: documentIssues.projectId },
  { label: "feasibility.pdf", table: feasibilityReports, key: feasibilityReports.pdfKey, project: feasibilityReports.projectId },
  { label: "onboarding.agreement", table: clientOnboardings, key: clientOnboardings.agreementDocKey, project: clientOnboardings.projectId },
  { label: "onboarding.id", table: clientOnboardings, key: clientOnboardings.idDocKey, project: clientOnboardings.projectId },
  { label: "expense.receipt", table: expenses, key: expenses.receiptKey, project: expenses.projectId },
];

async function distinctKeys(rows: Promise<{ k: unknown }[]>): Promise<string[]> {
  return (await rows).map((r) => r.k).filter((k): k is string => typeof k === "string" && k.length > 0);
}

/** Keys this project references via a direct source. */
async function mineFor(db: DB, s: DirectSource, projectId: string): Promise<string[]> {
  return distinctKeys(
    db
      .selectDistinct({ k: s.key })
      .from(s.table)
      .where(and(eq(s.project, projectId), isNotNull(s.key))),
  );
}

/** Keys referenced by rows that do NOT belong to this project (other projects or office-scoped). */
async function othersFor(db: DB, s: DirectSource, projectId: string): Promise<string[]> {
  return distinctKeys(
    db
      .selectDistinct({ k: s.key })
      .from(s.table)
      .where(and(isNotNull(s.key), or(ne(s.project, projectId), isNull(s.project)))),
  );
}

/** inspectionPhotos → inspection → project (indirect). */
async function inspectionPhotoKeys(
  db: DB,
  projectId: string,
): Promise<{ mine: string[]; others: string[] }> {
  const mine = await distinctKeys(
    db
      .selectDistinct({ k: inspectionPhotos.storageKey })
      .from(inspectionPhotos)
      .innerJoin(inspections, eq(inspectionPhotos.inspectionId, inspections.id))
      .where(and(eq(inspections.projectId, projectId), isNotNull(inspectionPhotos.storageKey))),
  );
  const others = await distinctKeys(
    db
      .selectDistinct({ k: inspectionPhotos.storageKey })
      .from(inspectionPhotos)
      .innerJoin(inspections, eq(inspectionPhotos.inspectionId, inspections.id))
      .where(and(isNotNull(inspectionPhotos.storageKey), ne(inspections.projectId, projectId))),
  );
  return { mine, others };
}

export type ProjectFileSet = {
  /** All distinct keys the project references. */
  keys: string[];
  /** Keys safe to delete from the store — referenced ONLY by this project. */
  removableKeys: string[];
};

/**
 * Pure set algebra: dedupe the project's keys and mark as removable only those
 * NOT referenced by any other project / office-scoped row (content-addressed
 * keys can be shared, so a shared key must never be deleted). Exported for tests.
 */
export function computeFileSet(mine: Iterable<string>, others: Iterable<string>): ProjectFileSet {
  const keys = [...new Set(mine)];
  const otherSet = new Set(others);
  return { keys, removableKeys: keys.filter((k) => !otherSet.has(k)) };
}

/**
 * Assemble a project's file set across every source, deduped, and compute which
 * keys are exclusively the project's (safe to remove from the object store).
 * Pure DB reads — never mutates.
 */
export async function collectProjectFiles(db: DB, projectId: string): Promise<ProjectFileSet> {
  const mine = new Set<string>();
  const others = new Set<string>();

  for (const s of DIRECT_SOURCES) {
    for (const k of await mineFor(db, s, projectId)) mine.add(k);
    for (const k of await othersFor(db, s, projectId)) others.add(k);
  }
  const photos = await inspectionPhotoKeys(db, projectId);
  for (const k of photos.mine) mine.add(k);
  for (const k of photos.others) others.add(k);

  return computeFileSet(mine, others);
}
