import type { DocumentEntityType, DocumentRegisterFilter } from "@esti/contracts";
import { desc, eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  contracts,
  estimates,
  inspections,
  letters,
  moms,
  projectOffices,
  proposals,
  specSheets,
  transmittals,
} from "../../db/schema.js";

export type DocumentRegisterRow = {
  id: string;
  entityType: DocumentEntityType;
  ref: string;
  title: string;
  projectId: string | null;
  projectRef: string | null;
  projectTitle: string | null;
  versionNo: number;
  status: string;
  pdfStatus: string;
  createdAt: Date;
};

function issuedStatus(pdfStatus: string, explicit?: string | null): string {
  if (explicit) return explicit;
  if (pdfStatus === "READY") return "ISSUED";
  return "DRAFT";
}

/** Cross-project unified document register (read model). */
export async function listDocumentRegister(
  db: DB,
  filter: DocumentRegisterFilter,
): Promise<DocumentRegisterRow[]> {
  const limit = filter.limit ?? 200;
  const rows: DocumentRegisterRow[] = [];

  const push = (r: DocumentRegisterRow) => {
    if (filter.entityType && r.entityType !== filter.entityType) return;
    if (filter.projectId && r.projectId !== filter.projectId) return;
    if (filter.status && r.status !== filter.status) return;
    rows.push(r);
  };

  const [letterRows, contractRows, proposalRows, txRows, inspRows, specRows, estRows, momRows] =
    await Promise.all([
      db.select().from(letters).orderBy(desc(letters.createdAt)).limit(limit),
      db.select().from(contracts).orderBy(desc(contracts.createdAt)).limit(limit),
      db
        .select({ p: proposals, pr: projectOffices })
        .from(proposals)
        .innerJoin(projectOffices, eq(proposals.projectId, projectOffices.id))
        .orderBy(desc(proposals.createdAt))
        .limit(limit),
      db
        .select({ t: transmittals, pr: projectOffices })
        .from(transmittals)
        .innerJoin(projectOffices, eq(transmittals.projectId, projectOffices.id))
        .orderBy(desc(transmittals.createdAt))
        .limit(limit),
      db
        .select({ i: inspections, pr: projectOffices })
        .from(inspections)
        .innerJoin(projectOffices, eq(inspections.projectId, projectOffices.id))
        .orderBy(desc(inspections.createdAt))
        .limit(limit),
      db
        .select({ s: specSheets, pr: projectOffices })
        .from(specSheets)
        .innerJoin(projectOffices, eq(specSheets.projectId, projectOffices.id))
        .orderBy(desc(specSheets.createdAt))
        .limit(limit),
      db
        .select({ e: estimates, pr: projectOffices })
        .from(estimates)
        .innerJoin(projectOffices, eq(estimates.projectId, projectOffices.id))
        .orderBy(desc(estimates.createdAt))
        .limit(limit),
      db
        .select({ m: moms, pr: projectOffices })
        .from(moms)
        .innerJoin(projectOffices, eq(moms.projectId, projectOffices.id))
        .orderBy(desc(moms.createdAt))
        .limit(limit),
    ]);

  for (const l of letterRows) {
    push({
      id: l.id,
      entityType: "LETTER",
      ref: l.ref,
      title: l.subject,
      projectId: l.projectId,
      projectRef: null,
      projectTitle: null,
      versionNo: 1,
      status: issuedStatus(l.pdfStatus),
      pdfStatus: l.pdfStatus,
      createdAt: l.createdAt,
    });
  }
  for (const c of contractRows) {
    push({
      id: c.id,
      entityType: "CONTRACT",
      ref: c.ref,
      title: c.title,
      projectId: c.projectId,
      projectRef: null,
      projectTitle: null,
      versionNo: 1,
      status: c.status,
      pdfStatus: "NONE",
      createdAt: c.createdAt,
    });
  }
  for (const { p, pr } of proposalRows) {
    push({
      id: p.id,
      entityType: "PROPOSAL",
      ref: p.ref,
      title: `Proposal — ${pr.title}`,
      projectId: p.projectId,
      projectRef: pr.ref,
      projectTitle: pr.title,
      versionNo: 1,
      status: issuedStatus(p.pdfStatus, p.status),
      pdfStatus: p.pdfStatus,
      createdAt: p.createdAt,
    });
  }
  for (const { t, pr } of txRows) {
    push({
      id: t.id,
      entityType: "TRANSMITTAL",
      ref: t.ref,
      title: t.purpose,
      projectId: t.projectId,
      projectRef: pr.ref,
      projectTitle: pr.title,
      versionNo: 1,
      status: issuedStatus(t.pdfStatus),
      pdfStatus: t.pdfStatus,
      createdAt: t.createdAt,
    });
  }
  for (const { i, pr } of inspRows) {
    push({
      id: i.id,
      entityType: "INSPECTION",
      ref: i.ref,
      title: `Site report ${i.dateVisit ?? ""}`.trim(),
      projectId: i.projectId,
      projectRef: pr.ref,
      projectTitle: pr.title,
      versionNo: i.versionNo ?? 1,
      status: issuedStatus(i.pdfStatus, i.status),
      pdfStatus: i.pdfStatus,
      createdAt: i.createdAt,
    });
  }
  for (const { s, pr } of specRows) {
    push({
      id: s.id,
      entityType: "SPEC_SHEET",
      ref: s.ref,
      title: s.title,
      projectId: s.projectId,
      projectRef: pr.ref,
      projectTitle: pr.title,
      versionNo: s.versionNo ?? 1,
      status: issuedStatus(s.pdfStatus, s.status),
      pdfStatus: s.pdfStatus,
      createdAt: s.createdAt,
    });
  }
  for (const { e, pr } of estRows) {
    push({
      id: e.id,
      entityType: "ESTIMATE",
      ref: e.ref,
      title: e.title,
      projectId: e.projectId,
      projectRef: pr.ref,
      projectTitle: pr.title,
      versionNo: e.versionNo ?? 1,
      status: e.status === "APPROVED" ? "ISSUED" : "DRAFT",
      pdfStatus: "NONE",
      createdAt: e.createdAt,
    });
  }
  for (const { m, pr } of momRows) {
    push({
      id: m.id,
      entityType: "MOM",
      ref: m.ref,
      title: m.title,
      projectId: m.projectId,
      projectRef: pr.ref,
      projectTitle: pr.title,
      versionNo: m.versionNo,
      status: issuedStatus(m.pdfStatus, m.status),
      pdfStatus: m.pdfStatus,
      createdAt: m.createdAt,
    });
  }

  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return rows.slice(0, limit);
}

/** Flat rows for XLSX export of the register. */
export function registerExportRows(rows: DocumentRegisterRow[]) {
  return rows.map((r) => ({
    Type: r.entityType,
    Ref: r.ref,
    Title: r.title,
    Project: r.projectRef ?? "",
    Version: r.versionNo,
    Status: r.status,
    PDF: r.pdfStatus,
    Created: r.createdAt.toISOString().slice(0, 10),
  }));
}
