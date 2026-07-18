/**
 * Paste-and-parse helpers for vendor quotes / rate schedules.
 * See docs/esti/IMPORT_SPEC.md — canonical units + line parser.
 */

export type ParsedRateRow = {
  description: string;
  rawUnit?: string;
  ratePaise?: number | null;
};

export type ParseRateTextResult = {
  rows: ParsedRateRow[];
};

/** Normalise a display name for dedup matching (not for storage). */
export function normName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/g, "")
    .replace(/^(\d+(\.\d+)*\.?\s+|\d+\.\s+)/, "");
}

/** Dedup key fragment — whitespace stripped after normName. */
export function nameKey(s: string): string {
  return normName(s).replace(/\s+/g, "");
}

const UNIT_ALIASES: Record<string, string> = {
  m3: "m3",
  "m³": "m3",
  cum: "m3",
  cubicmetre: "m3",
  cubicmeter: "m3",

  m2: "m2",
  "m²": "m2",
  sqm: "m2",
  sqmt: "m2",
  "sq.m": "m2",
  squaremetre: "m2",
  squaremeter: "m2",

  m: "m",
  rm: "m",
  rmt: "m",
  rmtr: "m",
  lm: "m",
  "lin.m": "m",
  runningmetre: "m",
  runningmeter: "m",

  no: "no",
  "no.": "no",
  nos: "no",
  number: "no",
  each: "no",
  ea: "no",
  unit: "no",

  kg: "kg",
  kgs: "kg",
  kilogram: "kg",

  t: "t",
  mt: "t",
  ton: "t",
  tonne: "t",
  metricton: "t",

  q: "q",
  qtl: "q",
  quintal: "q",

  l: "l",
  ltr: "l",
  litre: "l",
  liter: "l",
  liters: "l",

  bag: "bag",
  bags: "bag",

  pair: "pair",
  pairs: "pair",

  set: "set",
  sets: "set",

  sheet: "sheet",
  sheets: "sheet",

  sqft: "sqft",
  "sq.ft": "sqft",
  sft: "sqft",

  rft: "rft",
  rf: "rft",
  ft: "rft",
  foot: "rft",
  feet: "rft",
};

function unitLookupKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s.]+/g, "");
}

/** Map a pasted unit token to canonical lowercase metric (or null if unknown). */
export function canonicalUnit(raw: string): string | null {
  const key = unitLookupKey(raw);
  if (!key) return null;
  return UNIT_ALIASES[key] ?? null;
}

function preCleanLine(line: string): string | null {
  const t = line.trim();
  if (!t) return null;
  if (/^page\s+\d+/i.test(t)) return null;
  if (/^\d{1,4}$/.test(t)) return null;
  if (/^-{3,}$/.test(t)) return null;
  return t;
}

function parseLine(line: string): ParsedRateRow | null {
  const cleaned = preCleanLine(line);
  if (!cleaned) return null;

  const rest = cleaned.replace(/^(\d+(\.\d+)*\.?\s+|\d+\.\s+)/, "").trim();
  if (!rest) return null;

  const parts = rest.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  const last = parts[parts.length - 1]!.replace(/,/g, "");
  const rateNum = Number.parseFloat(last);
  const hasRate = Number.isFinite(rateNum) && /^\d+(\.\d+)?$/.test(last);

  if (!hasRate) {
    return { description: rest };
  }

  if (parts.length >= 3) {
    const unitToken = parts[parts.length - 2]!;
    const canon = canonicalUnit(unitToken);
    if (canon) {
      const description = parts.slice(0, -2).join(" ").trim();
      return {
        description: description || rest,
        rawUnit: unitToken,
        ratePaise: Math.round(rateNum * 100),
      };
    }
  }

  const description = parts.slice(0, -1).join(" ").trim();
  return {
    description: description || rest,
    ratePaise: Math.round(rateNum * 100),
  };
}

/**
 * Parse pasted quote / rate text into rows.
 * @param kind — `material` for numbered vendor lines; reserved for schedule parsing later.
 */
export function parseRateText(
  raw: string,
  _kind: "material" | "schedule" = "material",
): ParseRateTextResult {
  void _kind;
  const rows: ParsedRateRow[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const row = parseLine(line);
    if (row) rows.push(row);
  }
  return { rows };
}
