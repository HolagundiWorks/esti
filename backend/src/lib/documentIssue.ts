import type { DB } from "../db/index.js";
import { documentIssues } from "../db/schema.js";

export type IssueRecordInput = {
  entityType: string;
  entityId: string;
  projectId?: string | null;
  ref: string;
  versionNo: number;
  revisionNote?: string | null;
  impactNote?: string | null;
  issuedById: string;
  pdfKey?: string | null;
};

/** Append an immutable issue row when a document is issued or revised. */
export async function recordDocumentIssue(db: DB, input: IssueRecordInput) {
  const [row] = await db
    .insert(documentIssues)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      projectId: input.projectId ?? null,
      ref: input.ref,
      versionNo: input.versionNo,
      revisionNote: input.revisionNote ?? null,
      impactNote: input.impactNote ?? null,
      issuedById: input.issuedById,
      pdfKey: input.pdfKey ?? null,
    })
    .returning();
  return row!;
}
