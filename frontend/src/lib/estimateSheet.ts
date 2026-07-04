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
  /** The active column, one slot per row (null = not yet typed). */
  column: (number | null)[];
  /** Which parameter row the cursor is on. */
  rowIdx: number;
  /** Recorded measurement columns. */
  recorded: EstimateMeasurement[];
};

export function startMeasuring(unit: string): MeasureState {
  const rows = measurementRows(unit);
  return { unit, rows, column: rows.map(() => null), rowIdx: 0, recorded: [] };
}

export function setValue(s: MeasureState, value: number | null): MeasureState {
  const column = [...s.column];
  column[s.rowIdx] = value;
  return { ...s, column };
}

/** Column → measurement. Slot 0 is Nos (or Qty for 0-dim units). A blank Nos
 *  on a dimensioned column defaults to 1 — standard takeoff convention, so
 *  writing only "4 × 3" means one 4×3, not a zeroed-out measurement. */
function columnToMeasurement(s: MeasureState): EstimateMeasurement {
  const [nos, l, b, h] = [s.column[0], s.column[1], s.column[2], s.column[3]];
  const m: EstimateMeasurement = { nos: nos ?? 1 };
  if (s.rows.length > 1) m.l = l ?? undefined;
  if (s.rows.length > 2) m.b = b ?? undefined;
  if (s.rows.length > 3) m.h = h ?? undefined;
  return m;
}

export type EnterResult =
  | { kind: "advanced"; state: MeasureState }
  | { kind: "recorded"; state: MeasureState }
  | { kind: "closed"; measurements: EstimateMeasurement[] };

export function pressEnter(s: MeasureState): EnterResult {
  const columnEmpty = s.column.every((v) => v == null || v === 0);

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
  const recorded = [...s.recorded, columnToMeasurement(s)];
  return {
    kind: "recorded",
    state: { ...s, recorded, column: s.rows.map(() => null), rowIdx: 0 },
  };
}

/** ↑/↓ move between parameter rows without recording. */
export function moveRow(s: MeasureState, delta: -1 | 1): MeasureState {
  const rowIdx = Math.min(s.rows.length - 1, Math.max(0, s.rowIdx + delta));
  return { ...s, rowIdx };
}
