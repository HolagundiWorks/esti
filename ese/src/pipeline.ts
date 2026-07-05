import { RateLibraryPack } from "@esti/contracts";
import { config } from "./config.js";
import { getSource } from "./registry.js";
import { packChecksum } from "./pack-checksum.js";
import { formatMarkdown } from "./normalize.js";

export { formatMarkdown };

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

// Deterministic rate parsing now lives per source under src/parsers/<state>.ts
// (registered in src/registry.ts). The Karnataka parser is the reference impl.

/** Stage 4 — assemble + checksum a Rate Library Pack from reviewed, structured data.
 *  The seal is content-addressed (key-sorted), so regenerating the pack from the
 *  same source is byte-stable regardless of key order. */
export function buildRateLibraryPack(
  input: Omit<RateLibraryPack, "formatVersion" | "packType" | "checksum" | "currency">,
): RateLibraryPack {
  const base = {
    formatVersion: 1 as const,
    packType: "RATE_LIBRARY" as const,
    currency: "INR" as const,
    ...input,
  };
  const checksum = packChecksum(base);
  return RateLibraryPack.parse({ ...base, checksum });
}

/**
 * Any registered source → validated, checksummed Rate Library Pack. The source's
 * deterministic parser reads every rate/unit/coefficient; this only maps the
 * parsed entities into pack shape (dropping the parser's internal `via`
 * provenance) and seals it. The Ollama enrichment pass (attribute inference,
 * material-name reconciliation) layers on top of this — it never overrides a
 * parsed rate.
 */
export function buildPack(
  sourceKey: string,
  markdown: string,
  opts: { year?: number; edition?: string } = {},
): RateLibraryPack {
  const src = getSource(sourceKey);
  const year = opts.year ?? src.defaultYear;
  const parsed = src.parse(formatMarkdown(markdown), `${src.key}-${year}`);
  return buildRateLibraryPack({
    source: src.key,
    year,
    edition: opts.edition ?? `${src.key}-SR-${year}`,
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
