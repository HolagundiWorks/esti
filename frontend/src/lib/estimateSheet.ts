import { type EstimateMeasurement, measurementRows } from "@esti/contracts";

/**
 * Estimate sheet keyboard grammar — the pure state machine behind the
 * Excel-inspired measurement block. A measurement is a COLUMN punched
 * top-to-bottom (Nos, then the unit's dimensions):
 *
 *   Enter          → next parameter row; on the last row it RECORDS the
 *                    column and starts a fresh one (single-Enter rhythm)
 *   Enter on a completely empty column → CLOSE the item (the double-Enter:
 *                    the previous Enter recorded, this one closes)
 *
 * The component owns element search ("/", ↑/↓, Space) and the dependency
 * queue; this module owns only the measuring rhythm, so it stays testable.
 */

export type MeasureState = {
  unit: string;
  /** Parameter row labels, from contracts measurementRows(unit). */
  rows: string[];
  /**
   * The active column as RAW editing text, one slot per row ("" = untyped).
   * Held as strings — never parsed numbers — so an in-progress decimal ("0.",
   * "4.5") is not mangled by an early `Number()` round-trip that reflects the
   * parsed value straight back into the input. Cells parse only when recorded.
   */
  column: string[];
  /** Which parameter row the cursor is on. */
  rowIdx: number;
  /** Recorded measurement columns. */
  recorded: EstimateMeasurement[];
};

export function startMeasuring(unit: string): MeasureState {
  const rows = measurementRows(unit);
  return { unit, rows, column: rows.map(() => ""), rowIdx: 0, recorded: [] };
}

/** Store the raw text of the active cell verbatim (parsing is deferred). */
export function setValue(s: MeasureState, raw: string): MeasureState {
  const column = [...s.column];
  column[s.rowIdx] = raw;
  return { ...s, column };
}

/** Parse a cell's raw text to a finite number, or null when blank/unparseable. */
function parseCell(raw: string | undefined): number | null {
  const t = (raw ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Column → measurement. Slot 0 is Nos (or Qty for 0-dim units). A blank Nos
 *  on a dimensioned column defaults to 1 — standard takeoff convention, so
 *  writing only "4 × 3" means one 4×3, not a zeroed-out measurement. */
function columnToMeasurement(s: MeasureState): EstimateMeasurement {
  const nos = parseCell(s.column[0]);
  const l = parseCell(s.column[1]);
  const b = parseCell(s.column[2]);
  const h = parseCell(s.column[3]);
  const m: EstimateMeasurement = { nos: nos ?? 1 };
  if (s.rows.length > 1) m.l = l ?? undefined;
  if (s.rows.length > 2) m.b = b ?? undefined;
  if (s.rows.length > 3) m.h = h ?? undefined;
  return m;
}

export type EnterResult =
  | { kind: "advanced"; state: MeasureState }
  | { kind: "recorded"; state: MeasureState }
  | { kind: "closed"; measurements: EstimateMeasurement[] }
  | { kind: "invalid"; state: MeasureState; reason: string };

export function pressEnter(s: MeasureState): EnterResult {
  const columnEmpty = s.column.every((raw) => {
    const n = parseCell(raw);
    return n == null || n === 0;
  });

  // The double-Enter: an untouched column closes the item.
  if (columnEmpty && s.rowIdx === 0) {
    return { kind: "closed", measurements: s.recorded };
  }

  // Not on the last row yet — move the cursor down the column.
  if (s.rowIdx < s.rows.length - 1) {
    return { kind: "advanced", state: { ...s, rowIdx: s.rowIdx + 1 } };
  }

  // Last row: record the column (if it holds anything) and start a new one.
  if (columnEmpty) {
    return { kind: "closed", measurements: s.recorded };
  }
  // Guard before recording — the server contract (EstimateMeasurement) enforces
  // finite, non-negative values, so reject them here with inline feedback rather
  // than optimistically "recording" a column the backend will silently drop.
  for (const raw of s.column) {
    const t = raw.trim();
    if (t === "") continue;
    const n = Number(t);
    if (!Number.isFinite(n)) return { kind: "invalid", state: s, reason: "Enter a valid number." };
    if (n < 0) return { kind: "invalid", state: s, reason: "Measurements can’t be negative." };
  }
  const recorded = [...s.recorded, columnToMeasurement(s)];
  return {
    kind: "recorded",
    state: { ...s, recorded, column: s.rows.map(() => ""), rowIdx: 0 },
  };
}

/** ↑/↓ move between parameter rows without recording. */
export function moveRow(s: MeasureState, delta: -1 | 1): MeasureState {
  const rowIdx = Math.min(s.rows.length - 1, Math.max(0, s.rowIdx + delta));
  return { ...s, rowIdx };
}

/**
 * Remove a previously-recorded column by identity. Used to roll a column back
 * out of the live sheet (and its running total) when its optimistic save to the
 * server fails, so nothing is ever shown as recorded that the backend rejected.
 */
export function dropRecorded(s: MeasureState, m: EstimateMeasurement): MeasureState {
  return { ...s, recorded: s.recorded.filter((x) => x !== m) };
}
