import { createHash } from "node:crypto";
import { RateLibraryPack } from "@esti/contracts";
import { config } from "./config.js";
import { parseKarnatakaSR } from "./parsers/karnataka.js";

/**
 * The ESE pipeline: PDF/Markdown → clean Markdown → Ollama-structured entities →
 * a published pack. Rates are parsed DETERMINISTICALLY; the LLM only structures
 * and cross-checks — it never guesses a rate.
 *
 * These stages are scaffolds with the seams in place; the real PDF converter and
 * Ollama prompts land as the first build task (see docs/esti/ESTIMATION-SPEC-ENGINE.md).
 */

/** Stage 1 — PDF → Markdown (tables preserved). */
export async function pdfToMarkdown(_pdf: Buffer): Promise<string> {
  // TODO: wire a real converter (e.g. a local pdf→md tool). Markdown-in passes through.
  throw new Error("pdfToMarkdown: not yet implemented — wire a PDF→Markdown converter");
}

/** Stage 2 — normalise the markdown (strip page furniture, fix table rows, units). */
export function formatMarkdown(md: string): string {
  return md
    .replace(/\r\n/g, "\n")
    .replace(/^\s*Page \d+ of \d+\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Stage 3 — local Ollama call. Structures + reads; used only for semantic fields. */
export async function ollamaExtract(prompt: string): Promise<string> {
  const res = await fetch(`${config.ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.ollamaModel, prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const json = (await res.json()) as { response: string };
  return json.response;
}

/** Deterministic rate/code/unit parse from a normalised markdown table row.
 *  (Regex/table parse — NEVER LLM. Returns null for a non-item row.) */
export function parseRateRow(
  row: string,
): { code: string; description: string; unit: string; ratePaise: number } | null {
  // Placeholder shape; per-source parsers are built from the state-SoR research.
  const m = row.match(
    /^\s*([\d.]+)\s*\|\s*(.+?)\s*\|\s*([A-Za-z%]+)\s*\|\s*₹?\s*([\d,]+(?:\.\d+)?)\s*$/,
  );
  if (!m) return null;
  const rupees = Number(m[4]!.replace(/,/g, ""));
  return { code: m[1]!, description: m[2]!.trim(), unit: m[3]!, ratePaise: Math.round(rupees * 100) };
}

/** Stage 4 — assemble + checksum a Rate Library Pack from reviewed, structured data. */
export function buildRateLibraryPack(
  input: Omit<RateLibraryPack, "formatVersion" | "packType" | "checksum" | "currency">,
): RateLibraryPack {
  const draft = {
    formatVersion: 1 as const,
    packType: "RATE_LIBRARY" as const,
    currency: "INR" as const,
    checksum: "",
    ...input,
  };
  const checksum = createHash("sha256")
    .update(JSON.stringify({ ...draft, checksum: undefined }))
    .digest("hex");
  return RateLibraryPack.parse({ ...draft, checksum });
}

/**
 * Karnataka source → validated, checksummed Rate Library Pack. The deterministic
 * parser reads every rate/unit/coefficient; this only maps the parsed entities
 * into pack shape (dropping the parser's internal `via` provenance) and seals it.
 * The Ollama enrichment pass (attribute inference, material-name reconciliation)
 * layers on top of this — it never overrides a parsed rate.
 */
export function buildKarnatakaPack(
  markdown: string,
  opts: { year?: number; edition?: string; source?: string } = {},
): RateLibraryPack {
  const source = opts.source ?? "KAR-PWD";
  const parsed = parseKarnatakaSR(formatMarkdown(markdown), `${source}-${opts.year ?? 2023}`);
  return buildRateLibraryPack({
    source,
    year: opts.year ?? 2023,
    edition: opts.edition ?? `${source}-SR-${opts.year ?? 2023}`,
    workItems: parsed.workItems.map((w) => ({ code: w.code, name: w.name, discipline: w.discipline })),
    rateItems: parsed.rateItems.map((r) => ({
      code: r.code,
      itemCode: r.itemCode,
      shortName: r.shortName,
      specification: r.specification,
      attributes: r.attributes,
      uom: r.uom,
      ratePaise: r.ratePaise,
      source: r.source,
      derivations: [],
    })),
    materials: parsed.materials.map((m) => ({ code: m.code, name: m.name, unit: m.unit, ratePaise: m.ratePaise })),
    recipes: parsed.recipes.map((r) => ({
      rateItemCode: r.rateItemCode,
      materialCode: r.materialCode,
      coefficient: r.coefficient,
      wastagePct: r.wastagePct,
    })),
    specs: [],
  });
}
