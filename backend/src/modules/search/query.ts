import {
  KB_SEARCH_TYPES,
  SearchEntityType,
  searchResultHref,
  type SearchHit,
  type SearchQueryInput,
  can,
} from "@esti/contracts";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  clients,
  consultants,
  contractors,
  contracts,
  criticalNotes,
  decisions,
  drawings,
  dsrItems,
  feeProposals,
  inspections,
  invoices,
  lessonsLearned,
  letters,
  moms,
  officeTemplates,
  projectOffices,
  proposals,
  specCatalogItems,
  specSheets,
  specificationStandards,
  structuralElementTemplates,
  tasks,
  tenders,
} from "../../db/schema.js";

export type SearchCaps = {
  financials: boolean;
  fees: boolean;
  archived: boolean;
};

export function searchCapsForRole(role: string): SearchCaps {
  return {
    financials: can(role, "invoice:manage"),
    fees: can(role, "fees:manage"),
    archived: can(role, "project:delete"),
  };
}

function pattern(q: string): string {
  return `%${q.replace(/[%_\\]/g, "\\$&")}%`;
}

function snippet(text: string | null | undefined, max = 140): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function rank(ref: string | null | undefined, title: string, q: string): number {
  const ql = q.toLowerCase();
  const rl = ref?.toLowerCase() ?? "";
  const tl = title.toLowerCase();
  if (rl === ql) return 100;
  if (rl.includes(ql)) return 85;
  if (tl.startsWith(ql)) return 70;
  if (tl.includes(ql)) return 55;
  return 40;
}

function activeProjectFilter(caps: SearchCaps) {
  return caps.archived ? undefined : isNull(projectOffices.archivedAt);
}

const PER_TYPE_LIMIT = 12;

async function searchProjects(
  db: DB,
  q: string,
  caps: SearchCaps,
  projectId?: string,
): Promise<SearchHit[]> {
  const like = pattern(q);
  const rows = await db
    .select({
      id: projectOffices.id,
      ref: projectOffices.ref,
      title: projectOffices.title,
      city: projectOffices.city,
    })
    .from(projectOffices)
    .where(
      and(
        activeProjectFilter(caps),
        projectId ? eq(projectOffices.id, projectId) : undefined,
        or(
          ilike(projectOffices.ref, like),
          ilike(projectOffices.title, like),
          ilike(projectOffices.city, like),
          ilike(projectOffices.siteAddress, like),
        ),
      ),
    )
    .limit(PER_TYPE_LIMIT);

  return rows.map((r) => ({
    entityType: "PROJECT" as const,
    entityId: r.id,
    title: `${r.ref} · ${r.title}`,
    snippet: snippet(r.city ?? r.title, 120),
    href: searchResultHref("PROJECT", r.id),
    rank: rank(r.ref, r.title, q),
    projectId: r.id,
    projectRef: r.ref,
  }));
}

async function searchClients(db: DB, q: string): Promise<SearchHit[]> {
  const like = pattern(q);
  const rows = await db
    .select({ id: clients.id, name: clients.name, city: clients.city })
    .from(clients)
    .where(or(ilike(clients.name, like), ilike(clients.email, like), ilike(clients.city, like)))
    .limit(PER_TYPE_LIMIT);

  return rows.map((r) => ({
    entityType: "CLIENT" as const,
    entityId: r.id,
    title: r.name,
    snippet: snippet(r.city, 120),
    href: searchResultHref("CLIENT", r.id),
    rank: rank(null, r.name, q),
  }));
}

async function searchTasks(db: DB, q: string, projectId?: string): Promise<SearchHit[]> {
  const like = pattern(q);
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      projectId: tasks.projectId,
      projectRef: projectOffices.ref,
    })
    .from(tasks)
    .leftJoin(projectOffices, eq(tasks.projectId, projectOffices.id))
    .where(
      and(
        projectId ? eq(tasks.projectId, projectId) : undefined,
        or(ilike(tasks.title, like), ilike(tasks.description, like)),
      ),
    )
    .limit(PER_TYPE_LIMIT);

  return rows.map((r) => ({
    entityType: "TASK" as const,
    entityId: r.id,
    title: r.title,
    snippet: snippet(r.description ?? r.title, 120),
    href: searchResultHref("TASK", r.id, r.projectId),
    rank: rank(null, r.title, q),
    projectId: r.projectId,
    projectRef: r.projectRef,
  }));
}

async function searchDrawings(
  db: DB,
  q: string,
  caps: SearchCaps,
  projectId?: string,
): Promise<SearchHit[]> {
  const like = pattern(q);
  const rows = await db
    .select({
      id: drawings.id,
      ref: drawings.ref,
      title: drawings.title,
      fileName: drawings.fileName,
      projectId: drawings.projectId,
      projectRef: projectOffices.ref,
    })
    .from(drawings)
    .innerJoin(projectOffices, eq(drawings.projectId, projectOffices.id))
    .where(
      and(
        activeProjectFilter(caps),
        eq(drawings.isCurrent, true),
        projectId ? eq(drawings.projectId, projectId) : undefined,
        or(
          ilike(drawings.ref, like),
          ilike(drawings.title, like),
          ilike(drawings.fileName, like),
        ),
      ),
    )
    .limit(PER_TYPE_LIMIT);

  return rows.map((r) => ({
    entityType: "DRAWING" as const,
    entityId: r.id,
    title: `${r.ref} · ${r.title}`,
    snippet: snippet(r.fileName, 120),
    href: searchResultHref("DRAWING", r.id, r.projectId),
    rank: rank(r.ref, r.title, q),
    projectId: r.projectId,
    projectRef: r.projectRef,
  }));
}

async function searchOfficeDocs(
  db: DB,
  q: string,
  caps: SearchCaps,
  projectId?: string,
): Promise<SearchHit[]> {
  const like = pattern(q);
  const hits: SearchHit[] = [];

  const letterRows = await db
    .select({
      id: letters.id,
      ref: letters.ref,
      subject: letters.subject,
      projectId: letters.projectId,
      projectRef: projectOffices.ref,
    })
    .from(letters)
    .leftJoin(projectOffices, eq(letters.projectId, projectOffices.id))
    .where(
      and(
        projectId ? eq(letters.projectId, projectId) : undefined,
        or(ilike(letters.ref, like), ilike(letters.subject, like), ilike(letters.recipient, like)),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...letterRows.map((r) => ({
      entityType: "LETTER" as const,
      entityId: r.id,
      title: `${r.ref} · ${r.subject}`,
      snippet: snippet(r.subject, 120),
      href: searchResultHref("LETTER", r.id, r.projectId),
      rank: rank(r.ref, r.subject, q),
      projectId: r.projectId,
      projectRef: r.projectRef,
    })),
  );

  const proposalRows = await db
    .select({
      id: proposals.id,
      ref: proposals.ref,
      projectId: proposals.projectId,
      projectRef: projectOffices.ref,
      projectTitle: projectOffices.title,
    })
    .from(proposals)
    .innerJoin(projectOffices, eq(proposals.projectId, projectOffices.id))
    .where(
      and(
        activeProjectFilter(caps),
        projectId ? eq(proposals.projectId, projectId) : undefined,
        ilike(proposals.ref, like),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...proposalRows.map((r) => ({
      entityType: "PROPOSAL" as const,
      entityId: r.id,
      title: `${r.ref} · ${r.projectTitle}`,
      snippet: snippet(r.projectTitle, 120),
      href: searchResultHref("PROPOSAL", r.id, r.projectId),
      rank: rank(r.ref, r.projectTitle, q),
      projectId: r.projectId,
      projectRef: r.projectRef,
    })),
  );

  const contractRows = await db
    .select({
      id: contracts.id,
      ref: contracts.ref,
      title: contracts.title,
      projectId: contracts.projectId,
      projectRef: projectOffices.ref,
    })
    .from(contracts)
    .leftJoin(projectOffices, eq(contracts.projectId, projectOffices.id))
    .where(
      and(
        projectId ? eq(contracts.projectId, projectId) : undefined,
        or(ilike(contracts.ref, like), ilike(contracts.title, like)),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...contractRows.map((r) => ({
      entityType: "CONTRACT" as const,
      entityId: r.id,
      title: `${r.ref} · ${r.title}`,
      snippet: snippet(r.title, 120),
      href: searchResultHref("CONTRACT", r.id, r.projectId),
      rank: rank(r.ref, r.title, q),
      projectId: r.projectId,
      projectRef: r.projectRef,
    })),
  );

  return hits;
}

async function searchProjectMemory(
  db: DB,
  q: string,
  caps: SearchCaps,
  projectId?: string,
): Promise<SearchHit[]> {
  const like = pattern(q);
  const hits: SearchHit[] = [];

  const decisionRows = await db
    .select({
      id: decisions.id,
      title: decisions.title,
      rationale: decisions.rationale,
      projectId: decisions.projectId,
      projectRef: projectOffices.ref,
    })
    .from(decisions)
    .innerJoin(projectOffices, eq(decisions.projectId, projectOffices.id))
    .where(
      and(
        activeProjectFilter(caps),
        projectId ? eq(decisions.projectId, projectId) : undefined,
        or(ilike(decisions.title, like), ilike(decisions.rationale, like)),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...decisionRows.map((r) => ({
      entityType: "DECISION" as const,
      entityId: r.id,
      title: r.title,
      snippet: snippet(r.rationale, 120),
      href: searchResultHref("DECISION", r.id, r.projectId),
      rank: rank(null, r.title, q),
      projectId: r.projectId,
      projectRef: r.projectRef,
    })),
  );

  const noteRows = await db
    .select({
      id: criticalNotes.id,
      title: criticalNotes.title,
      body: criticalNotes.body,
      projectId: criticalNotes.projectId,
      projectRef: projectOffices.ref,
    })
    .from(criticalNotes)
    .innerJoin(projectOffices, eq(criticalNotes.projectId, projectOffices.id))
    .where(
      and(
        activeProjectFilter(caps),
        projectId ? eq(criticalNotes.projectId, projectId) : undefined,
        or(ilike(criticalNotes.title, like), ilike(criticalNotes.body, like)),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...noteRows.map((r) => ({
      entityType: "CRITICAL_NOTE" as const,
      entityId: r.id,
      title: r.title,
      snippet: snippet(r.body ?? r.title, 120),
      href: searchResultHref("CRITICAL_NOTE", r.id, r.projectId),
      rank: rank(null, r.title, q),
      projectId: r.projectId,
      projectRef: r.projectRef,
    })),
  );

  return hits;
}

async function searchLessons(
  db: DB,
  q: string,
  caps: SearchCaps,
  projectId?: string,
): Promise<SearchHit[]> {
  const like = pattern(q);
  const rows = await db
    .select({
      id: lessonsLearned.id,
      title: lessonsLearned.title,
      body: lessonsLearned.body,
      recommendations: lessonsLearned.recommendations,
      projectId: lessonsLearned.projectId,
      projectRef: projectOffices.ref,
    })
    .from(lessonsLearned)
    .innerJoin(projectOffices, eq(lessonsLearned.projectId, projectOffices.id))
    .where(
      and(
        activeProjectFilter(caps),
        projectId ? eq(lessonsLearned.projectId, projectId) : undefined,
        eq(lessonsLearned.status, "PUBLISHED"),
        or(
          ilike(lessonsLearned.title, like),
          ilike(lessonsLearned.body, like),
          ilike(lessonsLearned.recommendations, like),
          ilike(lessonsLearned.tags, like),
        ),
      ),
    )
    .limit(PER_TYPE_LIMIT);

  return rows.map((r) => ({
    entityType: "LESSON" as const,
    entityId: r.id,
    title: r.title,
    snippet: snippet(r.recommendations || r.body, 120),
    href: searchResultHref("LESSON", r.id, r.projectId),
    rank: rank(null, r.title, q),
    projectId: r.projectId,
    projectRef: r.projectRef,
  }));
}

async function searchKnowledge(db: DB, q: string): Promise<SearchHit[]> {
  const like = pattern(q);
  const hits: SearchHit[] = [];

  const tplRows = await db
    .select({
      id: officeTemplates.id,
      kind: officeTemplates.kind,
      title: officeTemplates.title,
      body: officeTemplates.body,
    })
    .from(officeTemplates)
    .where(
      or(
        ilike(officeTemplates.title, like),
        ilike(officeTemplates.body, like),
        ilike(officeTemplates.tags, like),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...tplRows.map((r) => ({
      entityType: "OFFICE_TEMPLATE" as const,
      entityId: r.id,
      title: `${r.kind} · ${r.title}`,
      snippet: snippet(r.body, 120),
      href: searchResultHref("OFFICE_TEMPLATE", r.id),
      rank: rank(null, r.title, q),
    })),
  );

  const dsrRows = await db
    .select({ id: dsrItems.id, code: dsrItems.code, description: dsrItems.description })
    .from(dsrItems)
    .where(or(ilike(dsrItems.code, like), ilike(dsrItems.description, like)))
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...dsrRows.map((r) => ({
      entityType: "DSR_ITEM" as const,
      entityId: r.id,
      title: `${r.code} · ${r.description.slice(0, 60)}`,
      snippet: snippet(r.description, 120),
      href: searchResultHref("DSR_ITEM", r.id),
      rank: rank(r.code, r.description, q),
    })),
  );

  const specCatRows = await db
    .select({
      id: specCatalogItems.id,
      item: specCatalogItems.item,
      category: specCatalogItems.category,
      make: specCatalogItems.make,
    })
    .from(specCatalogItems)
    .where(
      or(
        ilike(specCatalogItems.item, like),
        ilike(specCatalogItems.category, like),
        ilike(specCatalogItems.make, like),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...specCatRows.map((r) => ({
      entityType: "SPEC_CATALOG" as const,
      entityId: r.id,
      title: r.category ? `${r.category} · ${r.item}` : r.item,
      snippet: snippet(r.make, 120),
      href: searchResultHref("SPEC_CATALOG", r.id),
      rank: rank(null, r.item, q),
    })),
  );

  const specStdRows = await db
    .select({
      id: specificationStandards.id,
      code: specificationStandards.code,
      title: specificationStandards.title,
      specificationText: specificationStandards.specificationText,
    })
    .from(specificationStandards)
    .where(
      and(
        eq(specificationStandards.status, "PUBLISHED"),
        or(
          ilike(specificationStandards.code, like),
          ilike(specificationStandards.title, like),
          ilike(specificationStandards.specificationText, like),
        ),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...specStdRows.map((r) => ({
      entityType: "SPEC_STANDARD" as const,
      entityId: r.id,
      title: `${r.code} · ${r.title}`,
      snippet: snippet(r.specificationText, 120),
      href: searchResultHref("SPEC_STANDARD", r.id),
      rank: rank(r.code, r.title, q),
    })),
  );

  const structRows = await db
    .select({
      id: structuralElementTemplates.id,
      code: structuralElementTemplates.code,
      name: structuralElementTemplates.name,
      description: structuralElementTemplates.description,
    })
    .from(structuralElementTemplates)
    .where(
      and(
        eq(structuralElementTemplates.status, "PUBLISHED"),
        or(
          ilike(structuralElementTemplates.code, like),
          ilike(structuralElementTemplates.name, like),
          ilike(structuralElementTemplates.description, like),
        ),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...structRows.map((r) => ({
      entityType: "STRUCTURAL_TEMPLATE" as const,
      entityId: r.id,
      title: `${r.code} · ${r.name}`,
      snippet: snippet(r.description, 120),
      href: searchResultHref("STRUCTURAL_TEMPLATE", r.id),
      rank: rank(r.code, r.name, q),
    })),
  );

  return hits;
}

async function searchPeopleAndTenders(
  db: DB,
  q: string,
  caps: SearchCaps,
  projectId?: string,
): Promise<SearchHit[]> {
  const like = pattern(q);
  const hits: SearchHit[] = [];

  const consultantRows = await db
    .select({
      id: consultants.id,
      name: consultants.name,
      discipline: consultants.discipline,
      firm: consultants.firm,
    })
    .from(consultants)
    .where(
      or(
        ilike(consultants.name, like),
        ilike(consultants.firm, like),
        ilike(consultants.discipline, like),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...consultantRows.map((r) => ({
      entityType: "CONSULTANT" as const,
      entityId: r.id,
      title: r.name,
      snippet: snippet(`${r.discipline}${r.firm ? ` · ${r.firm}` : ""}`, 120),
      href: searchResultHref("CONSULTANT", r.id),
      rank: rank(null, r.name, q),
    })),
  );

  const contractorRows = await db
    .select({
      id: contractors.id,
      name: contractors.name,
      category: contractors.category,
      companyName: contractors.companyName,
    })
    .from(contractors)
    .where(
      and(
        eq(contractors.active, true),
        or(
          ilike(contractors.name, like),
          ilike(contractors.companyName, like),
          ilike(contractors.category, like),
        ),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...contractorRows.map((r) => ({
      entityType: "CONTRACTOR" as const,
      entityId: r.id,
      title: r.companyName ?? r.name,
      snippet: snippet(r.category, 120),
      href: searchResultHref("CONTRACTOR", r.id),
      rank: rank(null, r.name, q),
    })),
  );

  const tenderRows = await db
    .select({
      id: tenders.id,
      title: tenders.title,
      scope: tenders.scope,
      projectId: tenders.projectId,
      projectRef: projectOffices.ref,
    })
    .from(tenders)
    .innerJoin(projectOffices, eq(tenders.projectId, projectOffices.id))
    .where(
      and(
        activeProjectFilter(caps),
        projectId ? eq(tenders.projectId, projectId) : undefined,
        or(ilike(tenders.title, like), ilike(tenders.scope, like)),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...tenderRows.map((r) => ({
      entityType: "TENDER" as const,
      entityId: r.id,
      title: r.title,
      snippet: snippet(r.scope, 120),
      href: searchResultHref("TENDER", r.id, r.projectId),
      rank: rank(null, r.title, q),
      projectId: r.projectId,
      projectRef: r.projectRef,
    })),
  );

  return hits;
}

async function searchFinancials(
  db: DB,
  q: string,
  caps: SearchCaps,
  projectId?: string,
): Promise<SearchHit[]> {
  const hits: SearchHit[] = [];
  const like = pattern(q);

  if (caps.financials) {
    const invoiceRows = await db
      .select({
        id: invoices.id,
        ref: invoices.ref,
        projectId: invoices.projectId,
        projectRef: projectOffices.ref,
      })
      .from(invoices)
      .innerJoin(projectOffices, eq(invoices.projectId, projectOffices.id))
      .where(
        and(
          activeProjectFilter(caps),
          projectId ? eq(invoices.projectId, projectId) : undefined,
          or(ilike(invoices.ref, like), ilike(invoices.notes, like)),
        ),
      )
      .limit(PER_TYPE_LIMIT);
    hits.push(
      ...invoiceRows.map((r) => ({
        entityType: "INVOICE" as const,
        entityId: r.id,
        title: r.ref,
        snippet: r.projectRef ?? "",
        href: searchResultHref("INVOICE", r.id, r.projectId),
        rank: rank(r.ref, r.ref, q),
        projectId: r.projectId,
        projectRef: r.projectRef,
      })),
    );
  }

  if (caps.fees) {
    const feeRows = await db
      .select({
        id: feeProposals.id,
        ref: feeProposals.ref,
        projectId: feeProposals.projectId,
        projectRef: projectOffices.ref,
        projectTitle: projectOffices.title,
      })
      .from(feeProposals)
      .innerJoin(projectOffices, eq(feeProposals.projectId, projectOffices.id))
      .where(
        and(
          activeProjectFilter(caps),
          projectId ? eq(feeProposals.projectId, projectId) : undefined,
          ilike(feeProposals.ref, like),
        ),
      )
      .limit(PER_TYPE_LIMIT);
    hits.push(
      ...feeRows.map((r) => ({
        entityType: "FEE_PROPOSAL" as const,
        entityId: r.id,
        title: `${r.ref} · ${r.projectTitle}`,
        snippet: snippet(r.projectTitle, 120),
        href: searchResultHref("FEE_PROPOSAL", r.id, r.projectId),
        rank: rank(r.ref, r.projectTitle, q),
        projectId: r.projectId,
        projectRef: r.projectRef,
      })),
    );
  }

  return hits;
}

async function searchProjectDocuments(
  db: DB,
  q: string,
  caps: SearchCaps,
  projectId?: string,
): Promise<SearchHit[]> {
  const like = pattern(q);
  const hits: SearchHit[] = [];

  const momRows = await db
    .select({
      id: moms.id,
      ref: moms.ref,
      title: moms.title,
      projectId: moms.projectId,
      projectRef: projectOffices.ref,
    })
    .from(moms)
    .innerJoin(projectOffices, eq(moms.projectId, projectOffices.id))
    .where(
      and(
        activeProjectFilter(caps),
        projectId ? eq(moms.projectId, projectId) : undefined,
        or(ilike(moms.ref, like), ilike(moms.title, like)),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...momRows.map((r) => ({
      entityType: "MOM" as const,
      entityId: r.id,
      title: `${r.ref} · ${r.title}`,
      snippet: snippet(r.title, 120),
      href: searchResultHref("MOM", r.id, r.projectId),
      rank: rank(r.ref, r.title, q),
      projectId: r.projectId,
      projectRef: r.projectRef,
    })),
  );

  const inspectionRows = await db
    .select({
      id: inspections.id,
      ref: inspections.ref,
      projectId: inspections.projectId,
      projectRef: projectOffices.ref,
      observations: inspections.observations,
    })
    .from(inspections)
    .innerJoin(projectOffices, eq(inspections.projectId, projectOffices.id))
    .where(
      and(
        activeProjectFilter(caps),
        projectId ? eq(inspections.projectId, projectId) : undefined,
        or(ilike(inspections.ref, like), ilike(inspections.observations, like)),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...inspectionRows.map((r) => ({
      entityType: "INSPECTION" as const,
      entityId: r.id,
      title: r.ref,
      snippet: snippet(r.observations, 120),
      href: searchResultHref("INSPECTION", r.id, r.projectId),
      rank: rank(r.ref, r.ref, q),
      projectId: r.projectId,
      projectRef: r.projectRef,
    })),
  );

  const specRows = await db
    .select({
      id: specSheets.id,
      ref: specSheets.ref,
      title: specSheets.title,
      projectId: specSheets.projectId,
      projectRef: projectOffices.ref,
    })
    .from(specSheets)
    .innerJoin(projectOffices, eq(specSheets.projectId, projectOffices.id))
    .where(
      and(
        activeProjectFilter(caps),
        projectId ? eq(specSheets.projectId, projectId) : undefined,
        or(ilike(specSheets.ref, like), ilike(specSheets.title, like)),
      ),
    )
    .limit(PER_TYPE_LIMIT);
  hits.push(
    ...specRows.map((r) => ({
      entityType: "SPEC_SHEET" as const,
      entityId: r.id,
      title: `${r.ref} · ${r.title}`,
      snippet: snippet(r.title, 120),
      href: searchResultHref("SPEC_SHEET", r.id, r.projectId),
      rank: rank(r.ref, r.title, q),
      projectId: r.projectId,
      projectRef: r.projectRef,
    })),
  );

  return hits;
}

function wants(types: SearchEntityType[] | undefined, t: SearchEntityType): boolean {
  return !types || types.length === 0 || types.includes(t);
}

/** Run permission-scoped universal search across office and knowledge entities. */
export async function runUniversalSearch(
  db: DB,
  role: string,
  input: SearchQueryInput,
): Promise<{ hits: SearchHit[]; typeCounts: Partial<Record<SearchEntityType, number>> }> {
  const caps = searchCapsForRole(role);
  const q = input.q.trim();
  const types = input.types;
  const projectId = input.projectId;

  const batches: Promise<SearchHit[]>[] = [];

  if (wants(types, "PROJECT")) batches.push(searchProjects(db, q, caps, projectId));
  if (wants(types, "CLIENT")) batches.push(searchClients(db, q));
  if (wants(types, "TASK")) batches.push(searchTasks(db, q, projectId));
  if (wants(types, "DRAWING")) batches.push(searchDrawings(db, q, caps, projectId));
  if (wants(types, "LETTER") || wants(types, "PROPOSAL") || wants(types, "CONTRACT")) {
    batches.push(searchOfficeDocs(db, q, caps, projectId));
  }
  if (wants(types, "DECISION") || wants(types, "CRITICAL_NOTE")) {
    batches.push(searchProjectMemory(db, q, caps, projectId));
  }
  if (wants(types, "LESSON")) batches.push(searchLessons(db, q, caps, projectId));
  if (
    wants(types, "OFFICE_TEMPLATE") ||
    wants(types, "DSR_ITEM") ||
    wants(types, "SPEC_CATALOG") ||
    wants(types, "SPEC_STANDARD") ||
    wants(types, "STRUCTURAL_TEMPLATE")
  ) {
    batches.push(searchKnowledge(db, q));
  }
  if (wants(types, "CONSULTANT") || wants(types, "CONTRACTOR") || wants(types, "TENDER")) {
    batches.push(searchPeopleAndTenders(db, q, caps, projectId));
  }
  if (wants(types, "INVOICE") || wants(types, "FEE_PROPOSAL")) {
    batches.push(searchFinancials(db, q, caps, projectId));
  }
  if (wants(types, "MOM") || wants(types, "INSPECTION") || wants(types, "SPEC_SHEET")) {
    batches.push(searchProjectDocuments(db, q, caps, projectId));
  }

  const merged = (await Promise.all(batches)).flat();
  const filtered = types?.length ? merged.filter((h) => types.includes(h.entityType)) : merged;

  filtered.sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title));
  const hits = filtered.slice(0, input.limit);

  const typeCounts: Partial<Record<SearchEntityType, number>> = {};
  for (const h of hits) {
    typeCounts[h.entityType] = (typeCounts[h.entityType] ?? 0) + 1;
  }

  return { hits, typeCounts };
}

/** Knowledge Bank scoped search — published catalogue rows only. */
export async function runKnowledgeBankSearch(
  db: DB,
  role: string,
  input: Pick<SearchQueryInput, "q" | "limit">,
): Promise<SearchHit[]> {
  const { hits } = await runUniversalSearch(db, role, {
    ...input,
    types: [...KB_SEARCH_TYPES],
  });
  return hits;
}
