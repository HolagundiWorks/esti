/**
 * Source registry — the plug-in point for each state/central Schedule of Rates.
 * Every source contributes a deterministic parser that returns the shared
 * parsed shape; the pipeline maps that into a RateLibraryPack. New states drop
 * a sibling parser under src/parsers/<state>.ts and register it here.
 */
import { parseKarnatakaSR } from "./parsers/karnataka.js";

/** Canonical parsed shape all source parsers return (Karnataka defines it). */
export type ParsedSR = ReturnType<typeof parseKarnatakaSR>;

export interface SourceDef {
  /** Stable source key, used in edition strings + rateItem.source. */
  key: string;
  label: string;
  authority: string;
  defaultYear: number;
  /** Deterministic parse: normalised markdown → parsed entities (no LLM). */
  parse: (markdown: string, source: string) => ParsedSR;
  /** true once a real parser + golden fixture exist; false = placeholder. */
  ready: boolean;
}

export const SOURCES: Record<string, SourceDef> = {
  "KAR-PWD": {
    key: "KAR-PWD",
    label: "Karnataka PWD Common Schedule of Rates",
    authority: "Karnataka Public Works Department",
    defaultYear: 2023,
    parse: parseKarnatakaSR,
    ready: true,
  },
  // Land as their markdown + parser + golden fixture arrive (see ese/samples):
  "CPWD": { key: "CPWD", label: "CPWD Delhi DSR", authority: "Central Public Works Department", defaultYear: 2023, parse: notReady("CPWD"), ready: false },
  "TN-PWD": { key: "TN-PWD", label: "Tamil Nadu PWD SR", authority: "Tamil Nadu Public Works Department", defaultYear: 2023, parse: notReady("TN-PWD"), ready: false },
  "MH-PWD": { key: "MH-PWD", label: "Maharashtra PWD DSR", authority: "Maharashtra Public Works Department", defaultYear: 2023, parse: notReady("MH-PWD"), ready: false },
  "AP-PWD": { key: "AP-PWD", label: "Andhra Pradesh SoR", authority: "Andhra Pradesh Public Works Department", defaultYear: 2023, parse: notReady("AP-PWD"), ready: false },
};

function notReady(key: string): SourceDef["parse"] {
  return () => {
    throw new Error(`ESE source "${key}" has no parser yet — drop its markdown in ese/samples and build src/parsers/${key.toLowerCase()}.ts`);
  };
}

export function getSource(key: string): SourceDef {
  const s = SOURCES[key];
  if (!s) throw new Error(`Unknown ESE source "${key}". Known: ${Object.keys(SOURCES).join(", ")}`);
  return s;
}

export function readySources(): SourceDef[] {
  return Object.values(SOURCES).filter((s) => s.ready);
}
