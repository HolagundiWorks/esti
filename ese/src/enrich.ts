/**
 * Enrichment stage — the ONLY place the LLM touches a pack, and it may only
 * ADD semantic metadata, never change a number. Two jobs:
 *   1. attribute gap-fill — infer discipline / finish / grade etc. for rate
 *      items where the deterministic regex found nothing (parsed attrs always win);
 *   2. material reconciliation — map DAR-discovered material names (e.g. "cement")
 *      to the canonical basic-rate master code (e.g. "cement-opc-ppc-psc").
 *
 * Pure + dependency-free: the LLM is an injected boundary (`LlmCall`), so the
 * merge logic (`applyEnrichment`) is fully testable with a fake, and rates are
 * provably untouched. The pipeline injects the real Ollama call; offline, it
 * simply skips (returns the pack unchanged).
 */
import type { ParsedSR } from "./registry.js";

/** Injected model boundary: prompt → raw completion text. */
export type LlmCall = (prompt: string) => Promise<string>;

export interface AttributeSuggestion {
  code: string; // rate item code
  attributes: Record<string, string>; // gap-fills only; applied non-destructively
}
export interface MaterialLink {
  from: string; // e.g. DAR "cement"
  to: string; // e.g. master "cement-opc-ppc-psc"
}
export interface Enrichment {
  attributeSuggestions: AttributeSuggestion[];
  materialLinks: MaterialLink[];
}

/** Pull the first JSON object/array out of a (possibly chatty) completion. */
export function extractJson(text: string): unknown {
  const start = text.search(/[[{]/);
  if (start < 0) return null;
  // Walk to the matching close so trailing prose is ignored.
  const open = text[start]!;
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Ask the model to enrich the parsed source. Best-effort and defensive: any
 * malformed response degrades to no suggestion, never to a wrong rate.
 */
export async function enrichPack(parsed: ParsedSR, llm: LlmCall): Promise<Enrichment> {
  const out: Enrichment = { attributeSuggestions: [], materialLinks: [] };

  // 1. Attribute gap-fill for items the regex left bare.
  const bare = parsed.rateItems.filter((r) => Object.keys(r.attributes).length === 0);
  for (const item of bare) {
    const prompt =
      `You are classifying a construction Schedule-of-Rates item. Return ONLY a JSON object of ` +
      `short attribute strings you are confident about (keys among: discipline, finish, grade, ` +
      `mortar, thicknessMm, class). Omit anything uncertain. No prose.\n\n` +
      `Item ${item.code} (${item.uom}): ${item.specification ?? item.shortName}`;
    try {
      const json = extractJson(await llm(prompt));
      if (json && typeof json === "object" && !Array.isArray(json)) {
        const attrs: Record<string, string> = {};
        for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
          if (typeof v === "string" && v.trim()) attrs[k] = v.trim();
        }
        if (Object.keys(attrs).length) out.attributeSuggestions.push({ code: item.code, attributes: attrs });
      }
    } catch {
      /* skip this item */
    }
  }

  // 2. Material reconciliation: link DAR-discovered names to master codes.
  //    (DAR materials are those referenced by recipes but priced in-line; the
  //    master has canonical codes/units. We only propose links, never merge blindly.)
  const masterList = parsed.materials
    .map((m) => `${m.code} — ${m.name} (${m.unit})`)
    .join("\n");
  const referenced = new Set(parsed.recipes.map((r) => r.materialCode));
  const orphans = parsed.materials.filter((m) => referenced.has(m.code));
  if (orphans.length && masterList) {
    const prompt =
      `Map each SOURCE material to the single best MASTER material code, or "" if none fits. ` +
      `Return ONLY a JSON array of {"from":"<source code>","to":"<master code>"}. No prose.\n\n` +
      `MASTER:\n${masterList}\n\nSOURCE:\n${orphans.map((o) => `${o.code} — ${o.name} (${o.unit})`).join("\n")}`;
    try {
      const json = extractJson(await llm(prompt));
      if (Array.isArray(json)) {
        const known = new Set(parsed.materials.map((m) => m.code));
        for (const row of json) {
          const from = (row as { from?: unknown }).from;
          const to = (row as { to?: unknown }).to;
          if (typeof from === "string" && typeof to === "string" && to && from !== to && known.has(to)) {
            out.materialLinks.push({ from, to });
          }
        }
      }
    } catch {
      /* skip reconciliation */
    }
  }
  return out;
}

/**
 * Apply an enrichment to parsed entities — PURE. Invariants (asserted in tests):
 *   • rates (rateItem.ratePaise, material.ratePaise, recipe.coefficient) untouched;
 *   • existing (parsed) attribute keys always win over suggestions;
 *   • a linked recipe points at the canonical master code; the orphan DAR
 *     material entry is dropped only when the target master exists.
 */
export function applyEnrichment(parsed: ParsedSR, e: Enrichment): ParsedSR {
  const attrByCode = new Map(e.attributeSuggestions.map((s) => [s.code, s.attributes]));
  const linkFromTo = new Map(e.materialLinks.map((l) => [l.from, l.to]));
  const masterCodes = new Set(parsed.materials.map((m) => m.code));

  const rateItems = parsed.rateItems.map((r) => {
    const sug = attrByCode.get(r.code);
    if (!sug) return r;
    const merged = { ...r.attributes };
    for (const [k, v] of Object.entries(sug)) if (!(k in merged)) merged[k] = v; // parsed wins
    return { ...r, attributes: merged };
  });

  const recipes = parsed.recipes.map((rec) => {
    const to = linkFromTo.get(rec.materialCode);
    return to && masterCodes.has(to) ? { ...rec, materialCode: to } : rec;
  });

  // Drop DAR material entries fully superseded by a link to an existing master.
  const linkedAway = new Set(
    [...linkFromTo.entries()].filter(([, to]) => masterCodes.has(to)).map(([from]) => from),
  );
  const stillReferenced = new Set(recipes.map((r) => r.materialCode));
  const materials = parsed.materials.filter((m) => !(linkedAway.has(m.code) && !stillReferenced.has(m.code)));

  return { workItems: parsed.workItems, rateItems, materials, recipes };
}
