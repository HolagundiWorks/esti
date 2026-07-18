/**
 * AORMS-Consultancy Phase 4 — the internal agent. Answers ONLY from the
 * validated firm record (engagements, registers, sign-off chains, TQs, fees,
 * risks, input packs) — deterministic truth; intelligence explains. Also
 * provides EmOI-assisted input-pack review: a validation recommendation the
 * named human validator acts on (the recommendation never validates).
 */
import { callOllamaChat } from "@hcw/aorms-ai-kit/ollama";
import { parseAiSettings } from "@esti/contracts";
import { gte } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  consDeliverables,
  consEngagements,
  consFeeStages,
  consInputPacks,
  consRateCards,
  consReviewSteps,
  consRisks,
  consTimesheets,
  consTqs,
  consVariations,
} from "../../db/schema.js";
import { getOrgSettings } from "../settings.js";
import { ollamaBaseUrlFromEnv, ollamaModelFromEnv } from "./ollama-config.js";

const INR = (paise: number | null | undefined) => `₹${((paise ?? 0) / 100).toLocaleString("en-IN")}`;

/**
 * A compact plain-text digest of the firm record — the ONLY ground the agent
 * may answer from. Capped so small local models stay coherent.
 */
export async function buildConsultancyDigest(db: DB): Promise<string> {
  const engagements = await db.select().from(consEngagements);
  const deliverables = await db.select().from(consDeliverables);
  const steps = await db.select().from(consReviewSteps);
  const tqs = await db.select().from(consTqs);
  const stages = await db.select().from(consFeeStages);
  const variations = await db.select().from(consVariations);
  const risks = await db.select().from(consRisks);
  const packs = await db.select().from(consInputPacks);
  const rates = await db.select().from(consRateCards);
  const since = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const sheets = await db
    .select()
    .from(consTimesheets)
    .where(gte(consTimesheets.date, since));

  const lines: string[] = [];
  for (const e of engagements) {
    const ds = deliverables.filter((d) => d.engagementId === e.id);
    const tv = sheets
      .filter((s) => s.engagementId === e.id)
      .reduce((a, s) => a + (s.valuePaise ?? 0), 0);
    const inv = stages
      .filter((s) => s.engagementId === e.id && s.status === "INVOICED")
      .reduce((a, s) => a + (s.amountPaise ?? 0), 0);
    lines.push(
      `ENGAGEMENT "${e.title}" — ${e.model}${e.consultancyType ? ` (${e.consultancyType} consultancy)` : ""}, stage ${e.stage ?? "-"}, status ${e.status}.` +
        (e.feeModel ? ` Fee: ${e.feeModel} agreed ${INR(e.feeTotalPaise)}.` : "") +
        ` Invoiced ${INR(inv)}; time value (30d) ${INR(tv)}.`,
    );
    if (e.brief && typeof e.brief === "object") {
      const briefLine = Object.entries(e.brief as Record<string, unknown>)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join("; ")
        .slice(0, 500);
      if (briefLine) lines.push(`  BRIEF: ${briefLine}`);
    }
    for (const d of ds) {
      const chain = steps
        .filter((s) => s.deliverableId === d.id)
        .map((s) => `${s.kind}:${s.userName}`)
        .join(", ");
      lines.push(
        `  DELIVERABLE ${d.code} "${d.title}" rev ${d.revision} ${d.checkCategory} — ${d.status}${chain ? ` (chain: ${chain})` : ""}`,
      );
    }
    for (const t of tqs.filter((t) => t.engagementId === e.id))
      lines.push(
        `  TQ ${t.code} — ${t.status}${t.scopeImpact ? " [scope impact]" : ""}: ${t.question.slice(0, 120)}`,
      );
    for (const v of variations.filter((v) => v.engagementId === e.id))
      lines.push(`  VARIATION ${v.code} "${v.title}" ${INR(v.amountPaise)} — ${v.status}`);
    for (const r of risks.filter((r) => r.engagementId === e.id))
      lines.push(
        `  RISK "${r.title}" inherent ${r.likelihood}x${r.impact}=${(r.likelihood ?? 0) * (r.impact ?? 0)}` +
          (r.residualLikelihood != null
            ? ` residual ${r.residualLikelihood}x${r.residualImpact}=${(r.residualLikelihood ?? 0) * (r.residualImpact ?? 0)}`
            : "") +
          ` — ${r.status}${r.owner ? `, owner ${r.owner}` : ""}`,
      );
    for (const p of packs.filter((p) => p.engagementId === e.id))
      lines.push(
        `  INPUT PACK "${p.title}" (${p.kind}) — ${p.status}${p.validatedByName ? ` by ${p.validatedByName}` : ""}`,
      );
  }
  if (rates.length) {
    lines.push(
      `RATE CARD: ${rates
        .map((r) => `${r.grade} ${INR(r.ratePaise)}/h cap ${r.capacityHoursWeek ?? 0}h/wk`)
        .join("; ")}`,
    );
    const byGrade = new Map<string, number>();
    for (const s of sheets) byGrade.set(s.grade, (byGrade.get(s.grade) ?? 0) + (s.hours ?? 0));
    lines.push(
      `HOURS (last 30d): ${[...byGrade.entries()].map(([g, h]) => `${g} ${h}h`).join("; ") || "none"}`,
    );
  }
  return lines.join("\n").slice(0, 7000);
}

const ASK_SYSTEM = [
  "You are the internal intelligence agent of an engineering consultancy running on AORMS-Consultancy.",
  "STRICT GROUNDING RULES:",
  "1. Mention ONLY items (deliverables, TQs, variations, risks, people) whose codes or names appear VERBATIM in the FIRM RECORD. Never invent or extrapolate items.",
  "2. Quote ONLY ₹ amounts that appear in the record. Never compute new money figures.",
  "3. Attribute sign-off steps ONLY where the record shows a chain entry for that exact deliverable.",
  "4. If the record does not contain the answer, say exactly that.",
  "Be concise; cite codes. You explain the record; you never change it.",
].join("\n");

export async function askConsultancyIntelligence(
  db: DB,
  question: string,
): Promise<{ answer: string; provider: string; model: string }> {
  const org = await getOrgSettings(db);
  const settings = parseAiSettings(org.aiSettings);
  const digest = await buildConsultancyDigest(db);

  if (!settings.enabled || settings.provider === "mock") {
    return {
      answer:
        "AI is not enabled for this firm (Company → AI settings). The question was not processed; the firm record itself remains available in the workspace.",
      provider: "mock",
      model: "disabled",
    };
  }

  const model = settings.model || ollamaModelFromEnv();
  const baseUrl = settings.ollamaBaseUrl?.trim() || ollamaBaseUrlFromEnv();
  const { text } = await callOllamaChat({
    baseUrl,
    model,
    system: ASK_SYSTEM,
    user: `FIRM RECORD:\n${digest}\n\nQUESTION: ${question}`,
  });
  return { answer: text.trim(), provider: "ollama", model };
}

const EMOI_REVIEW_SYSTEM = [
  "You are EmOI, the external-input gate of an engineering consultancy.",
  "Given an incoming input pack, produce a short validation checklist the named human validator should run before the pack becomes a working assumption.",
  "Be specific to the pack kind and the engagement. 4-6 bullet points, each one actionable check. No preamble.",
].join(" ");

/** Static fallback checklists — the gate stays useful with AI off. */
const STATIC_CHECKLIST: Record<string, string> = {
  GEOTECH: "- Confirm borehole locations cover the footprint\n- Check SBC/recommendations against the foundation scheme\n- Verify water table + seismic parameters cited\n- Confirm report revision + date supersede earlier issues",
  ARCHITECT_PACK: "- Confirm grids/levels match the current structural model\n- Check revision clouds against the drawing list\n- Verify openings/penetrations against services holds\n- Confirm the issue purpose and revision supersede earlier packs",
  CODE: "- Confirm the edition/amendment year in force for the permit authority\n- Check clauses cited against the design basis\n- Record where it diverges from the office standard",
  BRIEF: "- Confirm areas/loads/occupancy stated match the fee basis\n- Flag items that change scope (variation candidates)\n- Verify the client sign-off on the brief revision",
  OTHER: "- Confirm source, date, and revision\n- Check consistency with current working assumptions\n- Record what downstream work relies on it",
};

export async function emoiReviewInputPack(
  db: DB,
  pack: { title: string; kind: string; source: string | null },
  engagementTitle: string,
): Promise<{ recommendation: string; provider: string; model: string }> {
  const org = await getOrgSettings(db);
  const settings = parseAiSettings(org.aiSettings);
  const fallback = STATIC_CHECKLIST[pack.kind] ?? STATIC_CHECKLIST.OTHER!;

  if (!settings.enabled || settings.provider === "mock") {
    return { recommendation: fallback, provider: "mock", model: "template" };
  }
  try {
    const model = settings.model || ollamaModelFromEnv();
    const baseUrl = settings.ollamaBaseUrl?.trim() || ollamaBaseUrlFromEnv();
    const { text } = await callOllamaChat({
      baseUrl,
      model,
      system: EMOI_REVIEW_SYSTEM,
      user: `Engagement: ${engagementTitle}\nInput pack: "${pack.title}" (kind ${pack.kind})${pack.source ? `, source: ${pack.source}` : ""}\n\nValidation checklist:`,
    });
    return { recommendation: text.trim() || fallback, provider: "ollama", model };
  } catch {
    // The gate must not depend on the model being up.
    return { recommendation: fallback, provider: "mock", model: "template" };
  }
}
