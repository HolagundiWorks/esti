import { z } from "zod";

/**
 * Native rate / material / spec text-import engine. Pure, no I/O. Takes messy
 * unstructured text (copied from PDF rate schedules, OCR, vendor quotes) and
 * returns structured rows that map onto the existing KB tables. See
 * docs/esti/IMPORT_SPEC.md. Money is integer paise. Canonical units are
 * lowercase-metric. Nothing here touches the database — the upsert (dedup by
 * normName + canonical unit) lives in the backend `kb.import.*` router.
 */

// ── Canonical unit dictionary ────────────────────────────────────────────────
/** variant (normalised: lowercase, no spaces/dots) → canonical lowercase-metric unit. */
const UNIT_ALIASES: Record<string, string> = {
  // m3
  m3: "m3", "m³": "m3", cum: "m3", cumt: "m3", cubicmetre: "m3", cubicmeter: "m3",
  // m2
  m2: "m2", "m²": "m2", sqm: "m2", sqmt: "m2", squaremetre: "m2", squaremeter: "m2",
  // m (running / linear)
  m: "m", rm: "m", rmt: "m", rmtr: "m", lm: "m", linm: "m", runningmetre: "m", runningmeter: "m",
  // count
  no: "no", nos: "no", number: "no", each: "no", ea: "no", unit: "no", "no.": "no",
  // mass
  kg: "kg", kgs: "kg", kilogram: "kg",
  t: "t", mt: "t", ton: "t", tonne: "t", metricton: "t",
  q: "q", qtl: "q", quintal: "q",
  // volume (liquid)
  l: "l", ltr: "l", litre: "l", liter: "l", liters: "l", litres: "l",
  // packaged
  bag: "bag", bags: "bag",
  pair: "pair", pairs: "pair",
  set: "set", sets: "set",
  sheet: "sheet", sheets: "sheet",
  roll: "roll", rolls: "roll",
  // imperial (kept as-is, canonicalised)
  sqft: "sqft", sft: "sqft", squarefoot: "sqft", squarefeet: "sqft",
  rft: "rft", rf: "rft", ft: "rft", foot: "rft", feet: "rft",
};

/** Reduce a raw unit token to its canonical lowercase-metric form, or null if unknown. */
export function canonicalUnit(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/[\s.]/g, "");
  return UNIT_ALIASES[key] ?? null;
}

/** True if the token (after normalisation) is a recognised unit. */
export function isKnownUnit(raw: string): boolean {
  return canonicalUnit(raw) !== null;
}

// ── Name normalisation (matching key only — never stored) ────────────────────
/** Lowercase, strip a leading sl-no / dotted-code prefix, drop punctuation,
 *  collapse whitespace. Used to dedup against existing rows. */
export function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/^\s*\d+(\.\d+)*[).]?\s+/, "") // leading "1. " or "7.23.1 "
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // punctuation → space
    .replace(/\s+/g, " ")
    .trim();
}

// ── Money ────────────────────────────────────────────────────────────────────
const RATE_RE = /^-?\d{1,3}(,\d{2,3})*(\.\d+)?$|^-?\d+(\.\d+)?$/;
/** Parse a rate token (rupees, may carry thousands commas) → integer paise, or null. */
export function parseRatePaise(token: string): number | null {
  const t = token.trim();
  if (!RATE_RE.test(t)) return null;
  const n = Number(t.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

// ── Parsed row + result types ────────────────────────────────────────────────
export type ImportFormat = "material" | "schedule";

export const ImportFormatEnum = z.enum(["material", "schedule"]);

export type ParsedRow = {
  /** "material" → KB material; "item" → KB item (+ spec when measurable). */
  kind: "material" | "item";
  slNo: string | null;
  code: string | null; // dotted schedule code (7.23.1.1) when present
  parentCode: string | null;
  description: string;
  rawUnit: string | null; // exactly as parsed
  unit: string | null; // canonical, null if unknown/absent
  ratePaise: number | null;
  level: number; // hierarchy depth (1 for flat material)
  isMeasurable: boolean; // has unit + rate
  flags: string[]; // "missing-rate", "unknown-unit", "missing-description"
};

export type ParseResult = {
  format: ImportFormat;
  rows: ParsedRow[];
  errorCount: number;
  warningCount: number;
};

// ── Pre-cleaner ──────────────────────────────────────────────────────────────
function preClean(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => {
      const t = l.trim();
      if (t === "") return false;
      if (/^\d{1,4}$/.test(t)) return false; // standalone page number
      if (/^page\s+\d+\s+of\s+\d+$/i.test(t)) return false;
      if (/^[-=_]{3,}$/.test(t)) return false; // divider
      if (/^(sl\.?\s*no|s\.?\s*no|description|unit|rate)\b/i.test(t) && t.split(/\s+/).length <= 6)
        return false; // column header
      return true;
    });
}

// ── Auto-detect ──────────────────────────────────────────────────────────────
const MULTI_DOT_CODE = /(^|\s)\d+\.\d+(\.\d+)+/;
const DOT_CODE = /^\d+\.\d+/;
const NUMBERED = /^\d+[.)]\s+/;

/** Score the text and pick the more likely format. */
export function detectFormat(text: string): ImportFormat {
  const lines = preClean(text);
  let schedule = 0;
  let material = 0;
  for (const l of lines) {
    if (MULTI_DOT_CODE.test(l)) schedule += 2;
    else if (DOT_CODE.test(l)) schedule += 1;
    if (NUMBERED.test(l)) material += 2;
    const toks = l.split(/\s+/);
    if (toks.length >= 2 && parseRatePaise(toks[toks.length - 1]!) !== null) material += 1;
  }
  if (/\b(kpwd|pwd|dsr|cpwd|morth|schedule of rates)\b/i.test(text)) schedule += 2;
  if (schedule === material) return /\b(department|volume|kpwd|pwd|dsr)\b/i.test(text) ? "schedule" : "material";
  return schedule > material ? "schedule" : "material";
}

// ── Tail extractor: pull trailing [unit] [rate] off a description ─────────────
/** A short alphanumeric token that occupies the unit slot but isn't a known unit
 *  (e.g. "xyz", "cft") — captured so it can be flagged, not silently lost. */
const UNIT_LIKE = /^[\p{L}][\p{L}0-9./%]{0,5}$/u;

function splitTail(text: string): { description: string; rawUnit: string | null; ratePaise: number | null } {
  const toks = text.trim().split(/\s+/);
  let ratePaise: number | null = null;
  let rawUnit: string | null = null;
  if (toks.length >= 1) {
    const maybeRate = parseRatePaise(toks[toks.length - 1]!);
    if (maybeRate !== null) {
      ratePaise = maybeRate;
      toks.pop();
      // two-word known unit ("cu m") first
      if (toks.length >= 3 && isKnownUnit(`${toks[toks.length - 2]} ${toks[toks.length - 1]}`)) {
        rawUnit = `${toks[toks.length - 2]} ${toks[toks.length - 1]}`;
        toks.pop();
        toks.pop();
      } else if (toks.length >= 1) {
        const cand = toks[toks.length - 1]!;
        // Consume the unit slot iff it's a known unit, OR it's a short unit-like
        // token AND removing it still leaves a non-empty description.
        if (isKnownUnit(cand)) {
          rawUnit = cand;
          toks.pop();
        } else if (UNIT_LIKE.test(cand) && toks.length >= 2) {
          rawUnit = cand;
          toks.pop();
        }
      }
    }
  }
  return { description: toks.join(" ").trim(), rawUnit, ratePaise };
}

function flagsFor(description: string, rawUnit: string | null, ratePaise: number | null, requireRate: boolean): string[] {
  const flags: string[] = [];
  if (!description) flags.push("missing-description");
  if (rawUnit && canonicalUnit(rawUnit) === null) flags.push("unknown-unit");
  if (requireRate && ratePaise === null) flags.push("missing-rate");
  return flags;
}

// ── Material parser ──────────────────────────────────────────────────────────
function parseMaterial(lines: string[]): ParsedRow[] {
  const rows: ParsedRow[] = [];
  let cur: { slNo: string | null; buf: string } | null = null;
  const flush = () => {
    if (!cur) return;
    const { description, rawUnit, ratePaise } = splitTail(cur.buf);
    rows.push({
      kind: "material",
      slNo: cur.slNo,
      code: null,
      parentCode: null,
      description,
      rawUnit,
      unit: canonicalUnit(rawUnit),
      ratePaise,
      level: 1,
      isMeasurable: !!rawUnit && ratePaise !== null,
      flags: flagsFor(description, rawUnit, ratePaise, true),
    });
    cur = null;
  };
  for (const line of lines) {
    const m = line.match(NUMBERED);
    if (m) {
      flush();
      cur = { slNo: m[0].replace(/[.)]\s+$/, "").trim(), buf: line.slice(m[0].length) };
    } else if (cur) {
      cur.buf += ` ${line.trim()}`;
    } else {
      // unnumbered first line — still accept as a row
      cur = { slNo: null, buf: line.trim() };
    }
  }
  flush();
  return rows;
}

// ── Schedule parser (flattened — no separate table) ──────────────────────────
function parseSchedule(lines: string[]): ParsedRow[] {
  const rows: ParsedRow[] = [];
  let cur: { code: string; buf: string } | null = null;
  const flush = () => {
    if (!cur) return;
    const { description, rawUnit, ratePaise } = splitTail(cur.buf);
    const segs = cur.code.split(".");
    rows.push({
      kind: "item",
      slNo: null,
      code: cur.code,
      parentCode: segs.length > 1 ? segs.slice(0, -1).join(".") : null,
      description,
      rawUnit,
      unit: canonicalUnit(rawUnit),
      ratePaise,
      level: segs.length,
      isMeasurable: !!rawUnit && ratePaise !== null,
      // section headers (no unit/rate) are valid parents — only flag missing description
      flags: flagsFor(description, rawUnit, ratePaise, false),
    });
    cur = null;
  };
  for (const line of lines) {
    const m = line.match(/^(\d+(\.\d+)+)\s+/);
    if (m) {
      flush();
      cur = { code: m[1]!, buf: line.slice(m[0].length) };
    } else if (cur) {
      cur.buf += ` ${line.trim()}`;
    }
  }
  flush();
  return rows;
}

/** Parse unstructured rate text into structured rows. `format` forces a parser;
 *  omit it to auto-detect. */
export function parseRateText(text: string, format?: ImportFormat): ParseResult {
  const fmt = format ?? detectFormat(text);
  const lines = preClean(text);
  const rows = fmt === "schedule" ? parseSchedule(lines) : parseMaterial(lines);
  let errorCount = 0;
  let warningCount = 0;
  for (const r of rows) {
    if (r.flags.includes("missing-description") || r.flags.includes("missing-rate")) errorCount++;
    else if (r.flags.includes("unknown-unit")) warningCount++;
  }
  return { format: fmt, rows, errorCount, warningCount };
}

// ── Commit payloads (sent to backend kb.import.*) ────────────────────────────
export const ImportMaterialRow = z.object({
  name: z.string().min(1).max(160),
  unit: z.string().max(40).nullable(),
  ratePaise: z.number().int().min(0).nullable(),
  category: z.string().max(80).nullable().optional(),
});
export type ImportMaterialRow = z.infer<typeof ImportMaterialRow>;

export const ImportItemRow = z.object({
  name: z.string().min(1).max(160),
  category: z.string().max(80).nullable().optional(),
  unit: z.string().max(40).nullable(),
  ratePaise: z.number().int().min(0).nullable(), // when present → a default spec is created
  specName: z.string().max(160).nullable().optional(),
});
export type ImportItemRow = z.infer<typeof ImportItemRow>;

export const ImportCommitMaterials = z.object({ rows: z.array(ImportMaterialRow).max(5000) });
export type ImportCommitMaterials = z.infer<typeof ImportCommitMaterials>;

export const ImportCommitItems = z.object({ rows: z.array(ImportItemRow).max(5000) });
export type ImportCommitItems = z.infer<typeof ImportCommitItems>;

export type ImportCommitResult = { inserted: number; updated: number; skipped: number };
