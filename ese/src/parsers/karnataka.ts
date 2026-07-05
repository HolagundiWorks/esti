/**
 * Karnataka PWD "Common Schedule of Rates" parser (deterministic).
 *
 * Reads the machine-converted Markdown of the Karnataka Common SR (Vol-1) and
 * emits the raw entities for a RateLibraryPack — WITHOUT any LLM. Every rate,
 * unit, code and coefficient here is read straight from the source tables; the
 * Ollama pass in the pipeline only enriches semantic attributes it can't reach.
 *
 * The source (see ese/samples/kar-dsr-2023.md) is real OCR output and carries
 * two kinds of noise this parser is built to survive:
 *   1. a diagonal "KPWD VOL-1" watermark that bleeds into cells as leading
 *      K/P/W/D/V/L / VOL-1 / L-1 tokens;
 *   2. garbled Kannada column headers (Tables 1, 2, 19) — skipped wholesale.
 *
 * What it extracts:
 *   • rateItems   ← the Schedule table (Item No · Description · Unit · Rate)
 *   • workItems   ← parent rows + sub-heads (the item hierarchy)
 *   • materials   ← the "Material Component · Unit · Basic Rate" tables
 *   • recipes     ← Table 20 material co-efficients + DAR "Details of cost" blocks
 *   • attributes  ← grade / mortar / thickness / nominal-size (regex, unambiguous)
 *
 * Pure, dependency-free module (no imports): it returns plain entities that the
 * pipeline maps into a zod-validated RateLibraryPack. Keeping it import-free lets
 * it run and test standalone (node --test) without the workspace being installed.
 */

// ── Local shapes (mirror the RateLibrary* zod schemas; pipeline validates) ─────
export interface ParsedWorkItem {
  code: string;
  name: string;
  discipline?: string;
}
export interface ParsedRateItem {
  code: string;
  itemCode: string;
  shortName: string;
  specification?: string;
  attributes: Record<string, string>;
  uom: string;
  ratePaise: number;
  source: string;
}
export interface ParsedMaterial {
  code: string;
  name: string;
  unit: string;
  ratePaise?: number;
}
export interface ParsedRecipe {
  rateItemCode: string;
  materialCode: string;
  coefficient: number;
  wastagePct: number;
  /** Provenance — which source produced this line (drives Table-20↔DAR reconciliation). */
  via?: "TABLE20" | "DAR";
}
export interface ParsedKarnatakaSR {
  workItems: ParsedWorkItem[];
  rateItems: ParsedRateItem[];
  materials: ParsedMaterial[];
  recipes: ParsedRecipe[];
}

interface RawTable {
  index: number;
  rows: string[][];
}

// ── Units ──────────────────────────────────────────────────────────────────
const UNIT_MAP: Record<string, string> = {
  "m2": "m²",
  "m²": "m²",
  "sqm": "m²",
  "m3": "m³",
  "m³": "m³",
  "cum": "m³",
  "m": "m",
  "rm": "m",
  "rmt": "m",
  "km": "km",
  "nos": "Nos.",
  "nos.": "Nos.",
  "no": "Nos.",
  "each": "each",
  "kg": "kg",
  "t": "t",
  "l": "L",
  "litre": "L",
  "hr": "hr",
  "day": "day",
  "bag": "bag",
  "quintal": "quintal",
  "%": "%",
};
function normUnit(raw: string): string | null {
  const s = raw
    .replace(/<sup>2<\/sup>/gi, "²")
    .replace(/<sup>3<\/sup>/gi, "³")
    .replace(/[.\s`]+$/g, "")
    .trim()
    .toLowerCase();
  return UNIT_MAP[s] ?? null;
}

// ── Watermark / noise scrubbing ───────────────────────────────────────────────
// The "KPWD VOL-1" watermark surfaces as leading tokens on a cell. Strip them
// repeatedly from the front (handles "PWD VO ", "D VO ", "L-1 …").
const WATERMARK_LEADING =
  /^(?:KPWD|KP|PWD|PW|WD|VOL-?1|VOL-|VOL|VO|L-1|L-|-1|[KPWDVL])\b[.\s]+/;
function stripWatermark(s: string): string {
  let out = s.trim();
  // Bounded loop — at most a handful of watermark fragments ever stack.
  for (let i = 0; i < 6; i++) {
    const next = out.replace(WATERMARK_LEADING, "").trim();
    if (next === out) break;
    out = next;
  }
  return out;
}

const CODE_RE = /^\d+(?:\.\d+)*\.?$/;
const NUM_RE = /^-?[\d,]+(?:\.\d+)?$/;
function toNumber(s: string): number | null {
  const t = s.replace(/[`₹\s]/g, "");
  if (!NUM_RE.test(t)) return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}
const toPaise = (rupees: number) => Math.round(rupees * 100);

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/<sup>\d<\/sup>/g, "")
    .replace(/\bwith\b.*$/i, "") // drop "with 2.5% wastage" tails
    .replace(/@.*$/, "") // drop "@ 0.4 per cent of cement"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// ── Table splitting ───────────────────────────────────────────────────────────
/** Split the doc into tables; each table is its list of pipe-rows (cells trimmed),
 *  the `--- | ---` separators dropped, and the "(+N more rows)" footer removed. */
export function splitTables(md: string): RawTable[] {
  const tables: RawTable[] = [];
  let current: RawTable | null = null;
  for (const line of md.replace(/\r\n/g, "\n").split("\n")) {
    const head = line.match(/^##\s+Table\s+(\d+)/i);
    if (head) {
      if (current) tables.push(current);
      current = { index: Number(head[1]), rows: [] };
      continue;
    }
    if (!current) continue;
    if (!line.includes("|")) continue;
    if (/^[\s|:-]+$/.test(line)) continue; // --- | --- separator
    const cells = line.split("|").map((c) => c.trim());
    if (cells.every((c) => c === "")) continue;
    current.rows.push(cells);
  }
  if (current) tables.push(current);
  return tables;
}

// ── Deterministic semantic attributes (regex-clean, no LLM) ───────────────────
export function extractAttributes(desc: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const grade = desc.match(/\bM[\s-]?(\d{1,2})\b/); // M20, M 25
  if (grade) attrs.grade = `M${grade[1]}`;
  const mortar = desc.match(/\b(1\s*:\s*\d+(?:\s*:\s*\d+)?)\b/); // 1:4, 1:2:4
  if (mortar) attrs.mortar = mortar[1]!.replace(/\s+/g, "");
  const nominal = desc.match(/(\d{1,3})\s*mm\s+nominal/i);
  if (nominal) attrs.nominalSizeMm = nominal[1]!;
  const thick = desc.match(/(\d{2,3})\s*mm\s*(?:th\.?|thick|thickness)/i);
  if (thick) attrs.thicknessMm = thick[1]!;
  return attrs;
}

// ── Schedule table → rate items + work-item hierarchy ─────────────────────────
const NOTE_RE = /^\s*(?:\d+\s+)?Note\s*[:.]/i;
function isScheduleHeaderRow(cells: string[]): boolean {
  const joined = cells.join(" ").toLowerCase();
  return /item no/.test(joined) && /description/.test(joined) && /rate/.test(joined);
}
/** A schedule table is the DSR proper: "Item No. | Description of item | Unit | Rate". */
function parseScheduleTable(t: RawTable, source: string, out: ParsedKarnatakaSR): void {
  let subHead: string | undefined;
  for (const cells of t.rows) {
    if (isScheduleHeaderRow(cells)) continue;
    const code = cells[0]!.replace(/\.$/, "");
    const rest = cells.slice(1).filter((c) => c !== "");

    // Section / sub-head row: no code, a single text cell (e.g. "Manual Means").
    if (!CODE_RE.test(cells[0]!)) {
      if (rest.length === 1 && !NOTE_RE.test(rest[0]!) && rest[0]!.length < 60) {
        subHead = stripWatermark(rest[0]!);
      }
      continue;
    }
    const desc = stripWatermark(cells[1] ?? "");
    if (!desc || NOTE_RE.test(desc)) continue;

    // Locate unit + rate among the remaining cells (tolerant of column drift).
    let uom: string | null = null;
    let rate: number | null = null;
    for (const c of cells.slice(2)) {
      if (uom === null) {
        const u = normUnit(c);
        if (u) {
          uom = u;
          continue;
        }
      }
      if (uom !== null && rate === null) {
        const n = toNumber(c);
        if (n !== null && n > 0) rate = n;
      }
    }

    if (uom === null || rate === null) {
      // Parent / grouping row (has children): capture as a work item.
      out.workItems.push({ code, name: desc, discipline: subHead });
      continue;
    }
    const itemCode = code.includes(".") ? code.slice(0, code.lastIndexOf(".")) : code;
    out.rateItems.push({
      code,
      itemCode,
      shortName: desc.length > 80 ? desc.slice(0, 77).trimEnd() + "…" : desc,
      specification: desc,
      attributes: extractAttributes(desc),
      uom,
      ratePaise: toPaise(rate),
      source,
    });
  }
}

// ── Material-component tables → material master ───────────────────────────────
function isMaterialHeaderRow(cells: string[]): boolean {
  const j = cells.join(" ").toLowerCase();
  return /material component/.test(j) && /basic rate/.test(j);
}
/** True for tables that carry basic material rates (Table 5 and its continuations). */
function parseMaterialTable(t: RawTable, out: ParsedKarnatakaSR, seen: Set<string>): void {
  for (const cells of t.rows) {
    if (isMaterialHeaderRow(cells)) continue;
    // Column-number row "1 | 2 | 3 | 4"
    if (cells.length >= 4 && cells.slice(0, 4).join(",") === "1,2,3,4") continue;
    const name = stripWatermark(cells[1] ?? "");
    const unit = normUnit(cells[2] ?? "");
    const rate = toNumber(cells[3] ?? "");
    if (!name) continue;
    if (unit === null || rate === null || unit === "hr") continue; // sub-headers / stray machinery
    const code = slug(name);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.materials.push({ code, name, unit, ratePaise: toPaise(rate) });
  }
}

// ── Table 20 material co-efficients → aggregate/sand/murrum recipes ───────────
const COEFF_COLS: { col: number; material: ParsedMaterial }[] = [
  { col: 5, material: { code: "jelly-metal-stone", name: "Jelly Metal / Stone", unit: "m³" } },
  { col: 6, material: { code: "sand", name: "Sand", unit: "m³" } },
  { col: 7, material: { code: "murrum-soil", name: "Murrum/Soil", unit: "m³" } },
];
function isCoefficientTable(t: RawTable): boolean {
  const j = t.rows.map((r) => r.join(" ")).join(" ").toLowerCase();
  return /co-?efficient/.test(j) && /jelly/.test(j) && /murrum/.test(j);
}
function parseCoefficientTable(t: RawTable, out: ParsedKarnatakaSR): void {
  for (const cells of t.rows) {
    // Item-code cell (col 2) can list several codes: "2.1.1 2.1.2 2.1.3".
    const codeCell = cells[2] ?? "";
    const codes = codeCell.match(/\d+(?:\.\d+)+/g);
    if (!codes || codes.length === 0) continue;
    for (const { col, material } of COEFF_COLS) {
      const raw = cells[col] ?? "";
      if (!raw || raw === "-") continue;
      const coeff = toNumber(raw);
      if (coeff === null || coeff <= 0) continue;
      for (const code of codes) {
        out.recipes.push({ rateItemCode: code, materialCode: material.code, coefficient: coeff, wastagePct: 0, via: "TABLE20" });
      }
      if (!out.materials.some((m) => m.code === material.code)) out.materials.push({ ...material });
    }
  }
}

// ── DAR "Details of cost" blocks → detailed per-unit recipes (best effort) ────
const BASIS_RE =
  /Details of cost for\s+([\d,]+(?:\.\d+)?)\s*(m<sup>2<\/sup>|m<sup>3<\/sup>|m²|m³|m2|m3|Nos\.?|each|kg|t|km|L|l|RM|Rmt|m)\b/i;
const SECTION_RE = /^(MATERIAL|MATERIALS|LABOUR|LABOR|MACHINERY)$/i;
const CONTROL_RE =
  /^(sub\s*total|over\s*head|contractor|cost\s+(for|per)|total|add\b|sundries|deduct|rate\s+(approved|per)|say\b|form\s*work|water\s+charges|shoring)/i;
function normSectionWord(s: string): string {
  return s
    .replace(/[^a-z]/gi, "")
    .toUpperCase()
    .replace(/^LABOUR$/, "LABOUR")
    .replace(/^LABO+UR$/, "LABOUR")
    .replace(/^MACHIN?ERY$/, "MACHINERY")
    .replace(/^MATERIALS?$/, "MATERIAL");
}
/** Walk a schedule/DAR table, extracting per-unit MATERIAL coefficients from each
 *  "Details of cost for N unit" block. Coefficient = qty ÷ N. Only the MATERIAL
 *  section becomes a recipe (that is the BOQ material take-off); LABOUR and
 *  MACHINERY lines are rate build-up, not material quantities, so they are
 *  skipped here — re-costing is driven by the published rate, not re-derived. */
function parseDarBlocks(t: RawTable, out: ParsedKarnatakaSR, seenMaterial: Set<string>): void {
  let code: string | null = null;
  let basis: number | null = null;
  let section: "MATERIAL" | "LABOUR" | "MACHINERY" | null = null;
  for (const cells of t.rows) {
    const first = cells[0]!.replace(/\.$/, "");
    if (CODE_RE.test(cells[0]!)) code = first;

    const joined = cells.join(" ");
    const basisMatch = joined.match(BASIS_RE);
    if (basisMatch) {
      basis = toNumber(basisMatch[1]!);
      section = null; // a fresh block resets the section context
      continue;
    }

    // Section marker rows (MATERIAL / LABOUR / MACHINERY) — set context, no item.
    const marker = cells.map((c) => normSectionWord(c)).find((w) => SECTION_RE.test(w));
    if (marker) {
      section = /MATERIAL/.test(marker) ? "MATERIAL" : /MACHIN/.test(marker) ? "MACHINERY" : "LABOUR";
      continue;
    }
    if (code === null || basis === null || basis <= 0 || section !== "MATERIAL") continue;

    // Find a unit cell; qty/rate/amount are the numbers that follow it.
    let unitIdx = -1;
    let unit: string | null = null;
    for (let i = 1; i < cells.length; i++) {
      const u = normUnit(cells[i]!);
      if (u && u !== "%") {
        unitIdx = i;
        unit = u;
        break;
      }
    }
    if (unitIdx < 0 || unit === null) continue;
    const nums: number[] = [];
    for (let i = unitIdx + 1; i < cells.length; i++) {
      const n = toNumber(cells[i]!);
      if (n !== null) nums.push(n);
    }
    if (nums.length < 1) continue;
    const qty = nums[0]!;
    const rate = nums.length >= 2 ? nums[1]! : null; // qty · rate · amount
    if (qty <= 0) continue;

    // Name = text cells before the unit, minus the leading section letter / code.
    const nameParts = cells
      .slice(0, unitIdx)
      .filter((c, i) => c !== "" && !(i === 0 && (/^[A-Z]$/.test(c) || CODE_RE.test(c))));
    const name = stripWatermark(nameParts.join(" ").replace(/\s+/g, " "));
    if (!name || CONTROL_RE.test(name)) continue;

    const materialCode = slug(name);
    if (!materialCode) continue;
    const wastage = name.match(/(\d+(?:\.\d+)?)\s*%\s*wastage/i);
    out.recipes.push({
      rateItemCode: code,
      materialCode,
      coefficient: Math.round((qty / basis) * 1e6) / 1e6,
      wastagePct: wastage ? Number(wastage[1]) : 0,
      via: "DAR",
    });
    // Register the DAR-discovered material with its build-up rate (name-level
    // reconciliation against the basic-rate master is the enrichment pass's job).
    if (!seenMaterial.has(materialCode)) {
      seenMaterial.add(materialCode);
      out.materials.push({ code: materialCode, name, unit, ratePaise: rate !== null ? toPaise(rate) : undefined });
    }
  }
}

// ── Top-level parse ───────────────────────────────────────────────────────────
export function parseKarnatakaSR(md: string, source = "KAR-PWD-2023"): ParsedKarnatakaSR {
  const out: ParsedKarnatakaSR = { workItems: [], rateItems: [], materials: [], recipes: [] };
  const tables = splitTables(md);
  const seenMaterial = new Set<string>();

  for (const t of tables) {
    const flat = t.rows.map((r) => r.join(" ")).join("\n");
    if (isCoefficientTable(t)) {
      parseCoefficientTable(t, out);
      continue;
    }
    if (t.rows.some(isMaterialHeaderRow) || /Material Component/i.test(flat)) {
      parseMaterialTable(t, out, seenMaterial);
      // Table 5's continuations (6, 7) have no header — handled below by heuristic.
    }
    // Schedule proper (has an "Item No." header) → rate items.
    if (t.rows.some(isScheduleHeaderRow)) {
      parseScheduleTable(t, source, out);
    }
    // DAR analysis: any table that carries "Details of cost for …" blocks.
    if (/Details of cost for/i.test(flat)) {
      parseDarBlocks(t, out, seenMaterial);
    }
  }

  // Continuation material tables (6, 7): no header row, but rows look like
  // "<n> | <name> | <unit> | <rate>" and sit right after Table 5. Detect by shape.
  // The unit filter alone separates them from machinery (unit "hr") and labour /
  // royalty tables (no valid unit cell) — no text guard needed (and a text guard
  // wrongly drops a materials table that merely mentions "Royalty" in one row).
  for (const t of tables) {
    if (t.rows.some(isMaterialHeaderRow)) continue; // already done
    if (t.rows.some(isScheduleHeaderRow)) continue;
    const matRows = t.rows.filter((c) => {
      const u = normUnit(c[2] ?? "");
      return c.length >= 4 && /^\d+$/.test(c[0] ?? "") && u !== null && u !== "hr" && u !== "%" && toNumber(c[3] ?? "") !== null;
    });
    if (t.rows.length >= 3 && matRows.length >= Math.ceil(t.rows.length * 0.6)) {
      parseMaterialTable(t, out, seenMaterial);
    }
  }

  // Reconcile Table-20 summary coefficients against DAR detailed breakdowns:
  // when an item has a DAR "Details of cost" breakdown, that is authoritative —
  // drop the coarser Table-20 jelly/sand/murrum lines for it to avoid double-
  // counting aggregate. Items with no DAR block keep their Table-20 coefficients.
  const darItems = new Set(out.recipes.filter((r) => r.via === "DAR").map((r) => r.rateItemCode));
  out.recipes = out.recipes.filter((r) => !(r.via === "TABLE20" && darItems.has(r.rateItemCode)));

  // De-dup recipes (same item+material) keeping the first (schedule/Table-20 wins).
  const recSeen = new Set<string>();
  out.recipes = out.recipes.filter((r) => {
    const k = `${r.rateItemCode}::${r.materialCode}`;
    if (recSeen.has(k)) return false;
    recSeen.add(k);
    return true;
  });
  return out;
}
