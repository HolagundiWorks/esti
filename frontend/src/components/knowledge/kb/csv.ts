import type { KbField } from "./KbLibraryTable.js";

// CSV round-trip for the Knowledge Bank libraries. Columns are the field keys.
// Money fields are written/read as rupees (paise / 100); booleans as true/false.

function esc(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function rowsToCsv(fields: KbField[], rows: Record<string, unknown>[]): string {
  const header = fields.map((f) => f.key).join(",");
  const lines = rows.map((row) =>
    fields
      .map((f) => {
        const v = row[f.key];
        if (v === null || v === undefined) return "";
        if (f.type === "money") return String(Number(v) / 100);
        if (f.type === "boolean") return v ? "true" : "false";
        return esc(String(v));
      })
      .join(","),
  );
  return [header, ...lines].join("\n");
}

/** Minimal RFC-4180-ish parser: handles quoted fields, escaped quotes, embedded
 *  commas/newlines. */
function parseGrid(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      cur.push(field);
      field = "";
    } else if (c === "\n") {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field !== "" || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows;
}

export function csvToRows(
  fields: KbField[],
  text: string,
): Record<string, unknown>[] {
  const grid = parseGrid(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (grid.length === 0) return [];
  const header = grid[0]!.map((h) => h.trim());
  const out: Record<string, unknown>[] = [];
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r]!;
    const obj: Record<string, unknown> = {};
    for (const f of fields) {
      const ci = header.indexOf(f.key);
      const raw = ci >= 0 ? (cells[ci] ?? "").trim() : "";
      if (f.type === "boolean") obj[f.key] = raw.toLowerCase() === "true" || raw === "1";
      else if (f.type === "money") {
        if (raw !== "") obj[f.key] = Math.round(Number(raw) * 100);
      } else if (f.type === "number") {
        if (raw !== "") obj[f.key] = Number(raw);
      } else if (raw !== "") obj[f.key] = raw;
    }
    out.push(obj);
  }
  return out;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
