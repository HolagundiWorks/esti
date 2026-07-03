import {
  can,
  isCadAiDraftKind,
  MOM_REVISION_MAX_SUGGESTIONS,
  type AiDraftKind,
  type AiSourceRef,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  clients,
  decisions,
  projectOffices,
} from "../../db/schema.js";
import { getActionCenter } from "../../modules/dashboard/readModels/index.js";
import { getFirm } from "../firm.js";
import { AGENT_ANSWER_RULES, AORMS_OPERATOR_SYSTEM } from "./aorms-operator.js";
import { buildAgentMockAnswer } from "./agent-response.js";
import {
  formatOperatorSnapshot,
  loadOperatorSnapshot,
} from "./operator-context.js";
import type { AiContextBundle } from "./templates.js";
import {
  buildTemplateDraft,
  type BillingCtx,
  type DecisionCtx,
  type ProjectCtx,
} from "./templates.js";
import { assembleCadAiContext } from "./cad-context.js";

type UserCtx = { id: string; role: string; email?: string; fullName?: string };

function isAgentQuery(input: { mode?: "draft" | "agent"; prompt?: string }): boolean {
  return input.mode === "agent" && !!input.prompt?.trim();
}

// ── MOM_REVISIONS: minutes → client revision-request drafts ──────────────────
// The caller (portal.suggestMomRevisions) passes the issued minutes as
// `prompt` and the MoM id as `contextQuery`. Output contract: a strict JSON
// array parsed by `parseMomRevisionSuggestions` (@esti/contracts).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function momRevisionSources(input: { contextQuery?: string }): AiSourceRef[] {
  const momId = input.contextQuery?.trim();
  return [
    {
      entityType: "mom",
      ...(momId && UUID_RE.test(momId) ? { entityId: momId } : {}),
      label: "Issued meeting minutes",
    },
  ];
}

function assembleMomRevisionContext(input: {
  prompt?: string;
  contextQuery?: string;
}): AiContextBundle {
  const minutes = input.prompt?.trim();
  if (!minutes) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Meeting minutes text is required" });
  }
  return {
    systemPrompt: [
      "You are ESTI, the intelligence layer of AORMS, drafting on behalf of an architecture practice's CLIENT.",
      "Read the issued meeting minutes and extract every design change, revision, or rework the client asked for or agreed to.",
      `Respond with ONLY a JSON array (no prose, no markdown) of at most ${MOM_REVISION_MAX_SUGGESTIONS} items:`,
      '[{"title": "short imperative summary (max 120 chars)", "details": "polite, specific change request the client could send verbatim, referencing what was discussed", "category": "MINOR" | "MAJOR" | "CRITICAL"}]',
      "category: MINOR = cosmetic/small adjustments; MAJOR = replanning or structural/system rework; CRITICAL = safety, compliance, or contract-impacting changes.",
      "Only include changes actually present in the minutes. If none exist, respond with [].",
    ].join("\n"),
    userPrompt: `## Meeting minutes\n${minutes}\n\n## Task\nExtract the client's revision requests as the JSON array now.`,
    sources: momRevisionSources(input),
    promptSummary: `MOM_REVISIONS · ${minutes.slice(0, 80)}`,
  };
}

/** Deterministic mock: derive suggestions from change-flavoured minute lines. */
function buildMockMomRevisions(minutes: string): string {
  const changeRe =
    /\b(chang\w*|revis\w*|mov\w*|shift\w*|replac\w*|relocat\w*|increas\w*|reduc\w*|add\w*|remov\w*|swap\w*|updat\w*|rework\w*|resiz\w*|redesign\w*)\b/i;
  const majorRe = /\b(structur\w*|major|redesign\w*|rework\w*|demolish\w*|replan\w*)\b/i;
  const lines = minutes
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
  const hits = lines.filter((l) => changeRe.test(l)).slice(0, MOM_REVISION_MAX_SUGGESTIONS);
  const basis = hits.length > 0 ? hits : lines.slice(0, 1);
  const items = basis.map((l) => ({
    title: (l.slice(0, 120) || "Revision discussed in the meeting").trim(),
    details: `As discussed in the meeting: ${l}. Please treat this as our formal revision request.`.slice(0, 1000),
    category: majorRe.test(l) ? "MAJOR" : "MINOR",
  }));
  return JSON.stringify(items, null, 2);
}

async function loadProject(
  db: DB,
  user: UserCtx,
  projectId: string,
): Promise<{ project: ProjectCtx; sources: AiSourceRef[] }> {
  const [row] = await db
    .select({
      id: projectOffices.id,
      ref: projectOffices.ref,
      title: projectOffices.title,
      status: projectOffices.status,
      clientId: projectOffices.clientId,
      archivedAt: projectOffices.archivedAt,
    })
    .from(projectOffices)
    .where(eq(projectOffices.id, projectId));
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  if (row.archivedAt && !can(user.role as never, "project:delete")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Archived project" });
  }
  let clientName: string | null = null;
  if (row.clientId) {
    const [c] = await db
      .select({ name: clients.name })
      .from(clients)
      .where(eq(clients.id, row.clientId));
    clientName = c?.name ?? null;
  }
  return {
    project: {
      ref: row.ref,
      title: row.title,
      clientName,
      stage: row.status,
    },
    sources: [
      {
        entityType: "PROJECT",
        entityId: row.id,
        label: `${row.ref} — ${row.title}`,
      },
    ],
  };
}

async function loadDecisions(
  db: DB,
  projectId: string,
): Promise<{ decisions: DecisionCtx[]; sources: AiSourceRef[] }> {
  const rows = await db
    .select()
    .from(decisions)
    .where(eq(decisions.projectId, projectId))
    .orderBy(desc(decisions.createdAt))
    .limit(25);
  return {
    decisions: rows.map((d) => ({
      ref: d.id.slice(0, 8),
      title: d.title,
      state: d.state,
      category: d.revisionCategory,
      source: d.revisionSource,
      description: d.rationale,
    })),
    sources: rows.slice(0, 8).map((d) => ({
      entityType: "DECISION",
      entityId: d.id,
      label: `${d.id.slice(0, 8)} ${d.title}`,
      excerpt: d.rationale?.slice(0, 200) ?? undefined,
    })),
  };
}

async function loadBillingContext(db: DB, user: UserCtx): Promise<BillingCtx & { sources: AiSourceRef[] }> {
  if (!can(user.role as never, "fees:manage")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Billing context requires fee access" });
  }
  const ac = await getActionCenter(db);
  const billingReady = ac.billingReadyPhases.map((p) => ({
    label: p.label,
    projectRef: p.projectRef,
    pct: p.billingPct,
  }));
  const overdue = ac.overdueInvoices.map((i) => ({
    ref: i.ref,
    projectRef: i.projectRef,
    days: i.daysOverdue,
  }));
  const sources: AiSourceRef[] = [
    ...billingReady.slice(0, 5).map((p) => ({
      entityType: "PHASE",
      label: `${p.projectRef} — ${p.label}`,
    })),
    ...overdue.slice(0, 5).map((i) => ({
      entityType: "INVOICE",
      label: `${i.ref} (${i.projectRef})`,
    })),
  ];
  return { billingReady, overdue, sources };
}

async function assembleAgentContext(
  db: DB,
  user: UserCtx,
  input: { projectId?: string; prompt?: string },
): Promise<AiContextBundle> {
  const { snapshot, sources } = await loadOperatorSnapshot(db, user, input.projectId);
  const liveBlock = formatOperatorSnapshot(snapshot);
  const question = input.prompt!.trim();

  return {
    systemPrompt: `${AORMS_OPERATOR_SYSTEM}\n\n${AGENT_ANSWER_RULES}`,
    userPrompt: `## Live context (permission-filtered)\n${liveBlock}\n\n## User question\n${question}\n\nAnswer using the live context above. Name AORMS screens when pointing the user to more detail.`,
    sources,
    promptSummary: `AGENT${snapshot.project ? ` · ${snapshot.project.ref}` : ""} · ${question.slice(0, 80)}`,
  };
}

export async function assembleAiContext(
  db: DB,
  user: UserCtx,
  input: {
    kind: AiDraftKind;
    mode?: "draft" | "agent";
    projectId?: string;
    prompt?: string;
    contextQuery?: string;
  },
): Promise<AiContextBundle> {
  if (isCadAiDraftKind(input.kind)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "CAD draft kinds require ai.generateCad from ESTICAD",
    });
  }
  if (isAgentQuery(input)) {
    return assembleAgentContext(db, user, input);
  }
  if (input.kind === "MOM_REVISIONS") {
    return assembleMomRevisionContext(input);
  }

  const sources: AiSourceRef[] = [];
  let project: ProjectCtx | undefined;
  let decisionRows: DecisionCtx[] | undefined;
  let billing: BillingCtx | undefined;

  const billingKinds = new Set(["BILLING_ASSISTANT"]);
  const crifKinds = new Set(["CRIF_SUMMARY", "CRIF_IMPACT", "CRIF_RISK", "SUMMARY"]);
  const projectRequiredKinds = new Set(["CRIF_SUMMARY", "CRIF_IMPACT", "CRIF_RISK"]);

  if (billingKinds.has(input.kind)) {
    const b = await loadBillingContext(db, user);
    billing = { billingReady: b.billingReady, overdue: b.overdue };
    sources.push(...b.sources);
  }

  if (input.projectId) {
    const p = await loadProject(db, user, input.projectId);
    project = p.project;
    sources.push(...p.sources);
    if (crifKinds.has(input.kind) || input.kind === "MOM" || input.kind === "SUMMARY") {
      const d = await loadDecisions(db, input.projectId);
      decisionRows = d.decisions;
      sources.push(...d.sources);
    }
  } else if (projectRequiredKinds.has(input.kind)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Project required for this draft kind" });
  }

  const firm = await getFirm(db);
  const templateOutput = buildTemplateDraft(input.kind, {
    project,
    decisions: decisionRows,
    billing,
    userPrompt: input.prompt,
    firmName: firm?.companyName,
  });

  const contextBlock = [
    project ? `Project: ${project.ref} — ${project.title}` : null,
    decisionRows?.length ? `CRIF decisions: ${decisionRows.length} on record` : null,
    billing ? `Billing-ready phases: ${billing.billingReady.length}; overdue: ${billing.overdue.length}` : null,
    input.contextQuery ? `Search hint: ${input.contextQuery}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    systemPrompt:
      "You are ESTI, assistant for an architecture practice using AORMS. Produce editable draft text only. Never auto-issue documents. Cite provided context. Do not invent fees or legal commitments. Refer to AORMS modules (Dashboard, Projects, CRIF, Invoices) when guiding staff.",
    userPrompt: `${contextBlock}\n\n---\n\nReference draft:\n${templateOutput}`,
    sources,
    promptSummary: `${input.kind}${project ? ` · ${project.ref}` : ""}`.slice(0, 200),
  };
}

export async function generateMockOutput(
  db: DB,
  user: UserCtx,
  input: {
    kind: AiDraftKind;
    mode?: "draft" | "agent";
    projectId?: string;
    drawingId?: string;
    prompt?: string;
    cadContext?: import("@esti/contracts").AiCadContext;
  },
): Promise<{ output: string; sources: AiSourceRef[]; promptSummary: string }> {
  if (isCadAiDraftKind(input.kind)) {
    const bundle = await assembleCadAiContext(db, user, {
      kind: input.kind,
      projectId: input.projectId,
      drawingId: input.drawingId,
      prompt: input.prompt,
      context: input.cadContext,
    });
    return {
      output: bundle.templateJson,
      sources: bundle.sources,
      promptSummary: bundle.promptSummary,
    };
  }
  if (isAgentQuery(input)) {
    const bundle = await assembleAgentContext(db, user, input);
    const { snapshot } = await loadOperatorSnapshot(db, user, input.projectId);
    return {
      output: buildAgentMockAnswer(snapshot, input.prompt!),
      sources: bundle.sources,
      promptSummary: bundle.promptSummary,
    };
  }
  if (input.kind === "MOM_REVISIONS") {
    const bundle = assembleMomRevisionContext(input);
    return {
      output: buildMockMomRevisions(input.prompt ?? ""),
      sources: bundle.sources,
      promptSummary: bundle.promptSummary,
    };
  }

  const bundle = await assembleAiContext(db, user, input);
  const firm = await getFirm(db);
  let project: ProjectCtx | undefined;
  let decisionRows: DecisionCtx[] | undefined;
  let billing: BillingCtx | undefined;

  if (input.projectId) {
    const p = await loadProject(db, user, input.projectId);
    project = p.project;
    const d = await loadDecisions(db, input.projectId);
    decisionRows = d.decisions;
  }
  if (input.kind === "BILLING_ASSISTANT") {
    const b = await loadBillingContext(db, user);
    billing = { billingReady: b.billingReady, overdue: b.overdue };
  }

  const output = buildTemplateDraft(input.kind, {
    project,
    decisions: decisionRows,
    billing,
    userPrompt: input.prompt,
    firmName: firm?.companyName,
  });

  return { output, sources: bundle.sources, promptSummary: bundle.promptSummary };
}
