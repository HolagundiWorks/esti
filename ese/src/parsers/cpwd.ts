/**
 * CPWD Delhi Schedule of Rates parser (CSV). The product's single schedule.
 *
 * Source shape (one CSV per chapter, e.g. "Earth Work.csv", "RCC Works.csv"):
 *   Item No. , Description , Unit , Rate
 *   • parent row      → code in col0, description ends ":", no unit/rate  (work item)
 *   • sub-item row    → col0 EMPTY, code embedded at the start of the description
 *                       ("2.1.1 All kinds of soil")                       (rate item)
 *   • standalone item → code in col0 with unit + rate                     (rate item)
 *   • 4-digit basic rates ("0002 Hire charges …")                         (rate item)
 *   • Hindi duplicate rows use HYPHEN codes ("2-1", "2-1-1") + garbled
 *     transliteration → skipped wholesale.
 *
 * A separate "COEFFICIENTS FOR CEMENT CONSUMPTION.csv" gives cement consumption
 * (quintals per unit) → recipes.
 *
 * Pure + dependency-free (runs/tests standalone). Rates are read verbatim — never
 * LLM-guessed. Returns the shared ParsedSR shape (see registry.ts).
 */

// ── Shared parsed shapes (structurally identical to the Karnataka parser's) ────
export interface ParsedWorkItem { code: string; name: string; discipline?: string }
export interface ParsedRateItem {
  code: string; itemCode: string; shortName: string; specification?: string;
  attributes: Record<string, string>; uom: string; ratePaise: number; source: string;
}
export interface ParsedMaterial { code: string; name: string; unit: string; ratePaise?: number }
export interface ParsedRecipe { rateItemCode: string; materialCode: string; coefficient: number; wastagePct: number; via?: "TABLE20" | "DAR" }
export interface ParsedCpwdSR { workItems: ParsedWorkItem[]; rateItems: ParsedRateItem[]; materials: ParsedMaterial[]; recipes: ParsedRecipe[] }

// ── RFC-4180 CSV parse (quoted fields, embedded commas/newlines, BOM) ─────────
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── Units, codes, rates ───────────────────────────────────────────────────────
const UNIT_MAP: Record<string, string> = {
  sqm: "m²", "sq.m": "m²", sqmt: "m²", cum: "m³", "cu.m": "m³", cm: "m³",
  metre: "m", meter: "m", rm: "m", rmt: "m", m: "m", km: "km",
  each: "each", nos: "Nos.", no: "Nos.", quintal: "quintal", qtl: "quintal",
  kg: "kg", tonne: "t", t: "t", litre: "L", ltr: "L", l: "L", day: "day", hour: "hr", hr: "hr",
  quital: "quintal",
};
function normUnit(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const key = t.toLowerCase().replace(/[\s.]/g, "");
  return UNIT_MAP[key] ?? t; // keep unknown units verbatim (e.g. "km/cum")
}

const CODE_DOT = /^\d+(?:\.\d+)*[A-Za-z]?$/; // English code: dots (+ optional letter variant)
const HAS_HYPHEN_CODE = /\d-\d/; // Hindi rows: hyphen-separated codes
const LEADING_CODE = /^(\d+(?:\.\d+)+[A-Za-z]?)\s+(.+)$/s; // sub-item: code embedded in description

function parseRatePaise(raw: string): number | null {
  const t = raw.replace(/[₹`\s]/g, "").replace(/,/g, "");
  if (!/^\d+(?:\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

function isHeaderRow(cells: string[]): boolean {
  const j = cells.join(" ").toLowerCase();
  return /item no|code no|description/.test(j) && /unit|rate/.test(j) || /^no\.?$/.test((cells[0] ?? "").trim().toLowerCase());
}

const parentCode = (code: string) => (code.includes(".") ? code.slice(0, code.lastIndexOf(".")) : code);

function extractAttributes(desc: string): Record<string, string> {
  const a: Record<string, string> = {};
  const mix = desc.match(/\b(1\s*:\s*[\d½¼¾.]+(?:\s*:\s*[\d½¼¾.]+)?)/); // 1:2:4, 1:1½:3, 1:6
  if (mix) a.mix = mix[1]!.replace(/\s+/g, "");
  const grade = desc.match(/\bM[\s-]?(\d{2})\b/);
  if (grade) a.grade = `M${grade[1]}`;
  const nominal = desc.match(/(\d{1,2})\s*mm\s+nominal/i);
  if (nominal) a.nominalSizeMm = nominal[1]!;
  const thick = desc.match(/(\d{2,3})\s*mm\s*(?:thick|th\.?)/i);
  if (thick) a.thicknessMm = thick[1]!;
  return a;
}

/** Parse one chapter CSV. `discipline` is the chapter name (from the filename). */
export function parseCpwdChapter(csv: string, discipline: string, source: string, out: ParsedCpwdSR): void {
  for (const cells of parseCsv(csv)) {
    if (cells.every((c) => c.trim() === "")) continue;
    if (isHeaderRow(cells)) continue;

    const col0 = (cells[0] ?? "").trim();
    const col1 = (cells[1] ?? "").trim();
    const col2 = (cells[2] ?? "").trim();
    const col3 = (cells[3] ?? "").trim();

    if (HAS_HYPHEN_CODE.test(col0) || /^\s*\d+-\d/.test(col1)) continue; // Hindi

    let code: string | null = null;
    let desc = "";
    if (col0 && CODE_DOT.test(col0)) {
      code = col0;
      desc = col1;
    } else if (!col0) {
      const m = col1.match(LEADING_CODE);
      if (m) { code = m[1]!; desc = m[2]!.trim(); }
    }
    if (!code || !desc) continue;

    const uom = normUnit(col2);
    const ratePaise = parseRatePaise(col3);
    if (uom && ratePaise != null) {
      out.rateItems.push({
        code,
        itemCode: parentCode(code),
        shortName: desc.length > 90 ? desc.slice(0, 87).trimEnd() + "…" : desc,
        specification: desc,
        attributes: extractAttributes(desc),
        uom,
        ratePaise,
        source,
      });
    } else if (!col2 && !col3) {
      out.workItems.push({ code, name: desc, discipline }); // parent / grouping row
    }
  }
}

/** Parse the cement-consumption CSV → cement recipes (quintals per unit). */
export function parseCpwdCoefficients(csv: string, out: ParsedCpwdSR): void {
  let hasCement = false;
  for (const cells of parseCsv(csv)) {
    if (isHeaderRow(cells)) continue;
    const col0 = (cells[0] ?? "").trim();
    const col1 = (cells[1] ?? "").trim();
    const col3 = (cells[3] ?? "").trim();
    if (HAS_HYPHEN_CODE.test(col0) || /^\s*\d+-\d/.test(col1)) continue;

    let code: string | null = null;
    if (col0 && CODE_DOT.test(col0)) code = col0;
    else { const m = col1.match(LEADING_CODE); if (m) code = m[1]!; }
    if (!code) continue;

    const quintals = Number(col3.replace(/,/g, ""));
    if (!Number.isFinite(quintals) || quintals <= 0) continue;
    out.recipes.push({ rateItemCode: code, materialCode: "cement", coefficient: Math.round(quintals * 1e4) / 1e4, wastagePct: 0, via: "TABLE20" });
    hasCement = true;
  }
  if (hasCement && !out.materials.some((m) => m.code === "cement")) {
    out.materials.push({ code: "cement", name: "Cement", unit: "quintal" });
  }
}

export interface CpwdInput { chapters: { name: string; csv: string }[]; coefficientsCsv?: string }

/** Parse the whole CPWD SR (all chapter CSVs + the cement-coefficient CSV). */
export function parseCpwdSR(input: CpwdInput, source = "CPWD-2021"): ParsedCpwdSR {
  const out: ParsedCpwdSR = { workItems: [], rateItems: [], materials: [], recipes: [] };
  const seenItem = new Set<string>();
  const seenWork = new Set<string>();

  for (const ch of input.chapters) {
    const before = out.rateItems.length;
    parseCpwdChapter(ch.csv, ch.name, source, out);
    // de-dup rate items + work items by code (first wins), across chapters
    for (let i = before; i < out.rateItems.length; i++) void i;
  }
  out.rateItems = out.rateItems.filter((r) => (seenItem.has(r.code) ? false : (seenItem.add(r.code), true)));
  out.workItems = out.workItems.filter((w) => (seenWork.has(w.code) || seenItem.has(w.code) ? false : (seenWork.add(w.code), true)));

  if (input.coefficientsCsv) parseCpwdCoefficients(input.coefficientsCsv, out);

  // keep only recipes whose item is a known rate item
  out.recipes = out.recipes.filter((r) => seenItem.has(r.rateItemCode));
  // de-dup recipes by item+material
  const seenRec = new Set<string>();
  out.recipes = out.recipes.filter((r) => {
    const k = `${r.rateItemCode}::${r.materialCode}`;
    return seenRec.has(k) ? false : (seenRec.add(k), true);
  });
  return out;
}
