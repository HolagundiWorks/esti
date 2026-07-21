import { callOllamaChat } from "@hcw/aorms-ai-kit/ollama";
import { parseAiSettings, type AiSettings } from "@esti/contracts";
import { ollamaBaseUrlFromEnv, ollamaModelFromEnv } from "./ollama-config.js";
import { getOrgSettings } from "../settings.js";
import type { DB } from "../../db/index.js";

export type EomsRepoSection = {
  title: string;
  summary: string;
  rephrased: string;
};

export type EomsRepoResult = {
  executiveSummary: string;
  sections: EomsRepoSection[];
  provider: string;
  model: string;
};

const EOMS_REPO_SYSTEM = [
  "You are EOMS (External Operations Management System) — the external AI agent on AORMS.",
  "Your job is to ingest markdown converted from external textbooks or reference material, rephrase it in clear professional language, and write accurate summaries.",
  "Rules:",
  "- Do NOT invent facts, codes, numbers, or citations not present in the source.",
  "- Preserve technical meaning; simplify wording only.",
  "- Rephrased text must stay faithful to the source — no new recommendations.",
  "- Respond with ONLY valid JSON (no markdown fences):",
  '{"executiveSummary":"2-4 sentences covering the whole source","sections":[{"title":"section title","summary":"2-3 sentence summary","rephrased":"rephrased body text"}]}',
].join("\n");

const CHUNK_TARGET = 3500;
const MAX_CHUNKS = 8;

function splitIntoChunks(rawText: string): string[] {
  const paragraphs = rawText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if (buf.length + p.length + 2 > CHUNK_TARGET && buf.length > 0) {
      chunks.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.slice(0, MAX_CHUNKS);
}

function parseEomsJson(text: string): EomsRepoResult | null {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd <= jsonStart) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
      executiveSummary?: string;
      sections?: { title?: string; summary?: string; rephrased?: string }[];
    };
    const sections = (parsed.sections ?? [])
      .filter((s) => s.title?.trim() && s.summary?.trim() && s.rephrased?.trim())
      .map((s) => ({
        title: s.title!.trim(),
        summary: s.summary!.trim(),
        rephrased: s.rephrased!.trim(),
      }));
    if (!sections.length) return null;
    return {
      executiveSummary: (parsed.executiveSummary ?? sections[0]!.summary).trim(),
      sections,
      provider: "parsed",
      model: "eoms",
    };
  } catch {
    return null;
  }
}

function mockEomsResult(rawText: string, title: string): EomsRepoResult {
  const chunks = splitIntoChunks(rawText);
  const sections = chunks.map((chunk, i) => {
    const firstLine = chunk.split("\n")[0]?.slice(0, 80) ?? `Section ${i + 1}`;
    const summary = chunk.slice(0, 240).replace(/\s+/g, " ").trim() + (chunk.length > 240 ? "…" : "");
    return {
      title: firstLine || `${title} — part ${i + 1}`,
      summary,
      rephrased: chunk,
    };
  });
  return {
    executiveSummary: `Reference summary for "${title}": ${sections.length} section(s) prepared for firm review (mock — enable AI for EOMS rephrasing).`,
    sections,
    provider: "mock",
    model: "template",
  };
}

async function callEomsChat(
  settings: AiSettings,
  userPrompt: string,
): Promise<{ text: string; provider: string; model: string }> {
  const model = settings.model || ollamaModelFromEnv();
  const baseUrl = settings.ollamaBaseUrl?.trim() || ollamaBaseUrlFromEnv();

  if (
    settings.provider === "cloud" &&
    settings.cloudBaseUrl?.trim() &&
    settings.cloudApiKey?.trim() &&
    settings.cloudModel?.trim()
  ) {
    const url = `${settings.cloudBaseUrl.trim().replace(/\/+$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.cloudApiKey.trim()}`,
      },
      body: JSON.stringify({
        model: settings.cloudModel.trim(),
        messages: [
          { role: "system", content: EOMS_REPO_SYSTEM },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.15,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`cloud ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return {
      text: json.choices?.[0]?.message?.content ?? "",
      provider: "cloud",
      model: settings.cloudModel.trim(),
    };
  }

  if (settings.provider === "mock") {
    return { text: "", provider: "mock", model: "template" };
  }

  const { text } = await callOllamaChat({
    baseUrl,
    model,
    system: EOMS_REPO_SYSTEM,
    user: userPrompt,
  });
  return { text, provider: "ollama", model };
}

/** Run EOMS on textbook raw text — rephrase + summarise into library sections. */
export async function runEomsRepoProcessing(
  db: DB,
  opts: { title: string; author?: string | null; rawText: string },
): Promise<EomsRepoResult> {
  const org = await getOrgSettings(db);
  const settings = parseAiSettings(org.aiSettings);

  if (!settings.enabled || settings.provider === "mock") {
    return mockEomsResult(opts.rawText, opts.title);
  }

  const chunks = splitIntoChunks(opts.rawText);
  const allSections: EomsRepoSection[] = [];
  let executiveSummary = "";
  let provider = "ollama";
  let model = settings.model || ollamaModelFromEnv();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const userPrompt = [
      `## Textbook\nTitle: ${opts.title}`,
      opts.author ? `Author: ${opts.author}` : "",
      `Part ${i + 1} of ${chunks.length}`,
      "",
      "## Source excerpt (external — validate and rephrase faithfully)",
      chunk,
      "",
      "Produce JSON with executiveSummary (only on part 1, otherwise reuse prior) and sections for this excerpt.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { text, provider: p, model: m } = await callEomsChat(settings, userPrompt);
      provider = p;
      model = m;
      const parsed = parseEomsJson(text);
      if (parsed) {
        if (!executiveSummary) executiveSummary = parsed.executiveSummary;
        allSections.push(...parsed.sections);
      } else {
        allSections.push({
          title: `${opts.title} — excerpt ${i + 1}`,
          summary: chunk.slice(0, 200).replace(/\s+/g, " ").trim() + "…",
          rephrased: chunk,
        });
      }
    } catch {
      const fallback = mockEomsResult(chunk, opts.title);
      if (!executiveSummary) executiveSummary = fallback.executiveSummary;
      allSections.push(...fallback.sections);
    }
  }

  if (!allSections.length) {
    return mockEomsResult(opts.rawText, opts.title);
  }

  return {
    executiveSummary: executiveSummary || allSections[0]!.summary,
    sections: allSections.map((s, idx) => ({
      ...s,
      title: s.title || `Section ${idx + 1}`,
    })),
    provider,
    model,
  };
}
