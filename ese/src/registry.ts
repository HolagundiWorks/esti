/**
 * Source registry. The product standardises on ONE schedule — **CPWD** (the
 * Central PWD Delhi Schedule of Rates + its Analysis of Rates) — as the single
 * specification/rate source. The speculative multi-state fan-out (TN / MH / AP)
 * was dropped: we do not juggle multiple state DSRs.
 *
 * The parser is the CPWD/PWD-family SR parser (implemented as `parseKarnatakaSR`
 * — the reference impl, built and golden-tested against a real Karnataka SR
 * sample of the *identical* published format: hierarchical item codes, embedded
 * specs, "Details of cost" DAR blocks, basic-rate + coefficient tables). The
 * Karnataka entry is retained only as a bundled real-data fixture (`reference`),
 * not as a second product schedule.
 */
import { parseKarnatakaSR } from "./parsers/karnataka.js";

/** Canonical parsed shape all source parsers return. */
export type ParsedSR = ReturnType<typeof parseKarnatakaSR>;

/** The CPWD/PWD-family deterministic SR parser (rates never LLM-guessed). */
export const parseSR = parseKarnatakaSR;

export interface SourceDef {
  /** Stable source key, used in edition strings + rateItem.source. */
  key: string;
  label: string;
  authority: string;
  defaultYear: number;
  /** Deterministic parse: normalised markdown → parsed entities (no LLM). */
  parse: (markdown: string, source: string) => ParsedSR;
  /** true once a real parser exists. */
  ready: boolean;
  /** true = a bundled real-data fixture for parser validation, NOT a product schedule. */
  reference?: boolean;
}

export const SOURCES: Record<string, SourceDef> = {
  // The single product schedule.
  CPWD: {
    key: "CPWD",
    label: "CPWD Delhi Schedule of Rates",
    authority: "Central Public Works Department",
    defaultYear: 2023,
    parse: parseSR,
    ready: true,
  },
  // Real-data parser fixture (same published format as CPWD). Not a product source.
  "KAR-PWD": {
    key: "KAR-PWD",
    label: "Karnataka PWD Common SR (parser fixture)",
    authority: "Karnataka Public Works Department",
    defaultYear: 2023,
    parse: parseSR,
    ready: true,
    reference: true,
  },
};

export function getSource(key: string): SourceDef {
  const s = SOURCES[key];
  if (!s) throw new Error(`Unknown ESE source "${key}". Known: ${Object.keys(SOURCES).join(", ")}`);
  return s;
}

/** Product sources (CPWD) — excludes real-data reference fixtures. */
export function productSources(): SourceDef[] {
  return Object.values(SOURCES).filter((s) => s.ready && !s.reference);
}
