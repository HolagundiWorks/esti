import { describe, expect, it } from "vitest";
import {
  dropRecorded,
  moveRow,
  pressEnter,
  previewColumn,
  previewColumnQty,
  setValue,
  startMeasuring,
  type MeasureState,
} from "./estimateSheet.js";

function fill(s: MeasureState, values: (number | string | null)[]): MeasureState {
  let cur = s;
  for (const v of values) {
    cur = setValue(cur, v == null ? "" : String(v));
    const r = pressEnter(cur);
    if (r.kind === "closed") throw new Error("unexpected close");
    if (r.kind === "invalid") throw new Error(`unexpected invalid: ${r.reason}`);
    cur = r.state;
  }
  return cur;
}

describe("estimate sheet keyboard grammar", () => {
  it("cum block walks Nos → L → B → H, records on the last Enter", () => {
    let s = startMeasuring("cum");
    expect(s.rows).toEqual(["Nos", "Length", "Breadth/Height", "Breadth/Height"]);
    s = fill(s, [2, 4.5, 3, 0.15]);
    expect(s.recorded).toEqual([{ nos: 2, l: 4.5, b: 3, h: 0.15 }]);
    expect(s.rowIdx).toBe(0); // fresh column armed
  });

  it("rm block shows only Nos + Length", () => {
    let s = startMeasuring("rm");
    expect(s.rows).toEqual(["Nos", "Length"]);
    s = fill(s, [3, 12]);
    expect(s.recorded).toEqual([{ nos: 3, l: 12 }]);
  });

  it("count units collapse to a single Qty row", () => {
    let s = startMeasuring("nos");
    expect(s.rows).toEqual(["Qty"]);
    s = fill(s, [8]);
    expect(s.recorded).toEqual([{ nos: 8 }]);
  });

  it("double Enter (untouched column) closes with the recorded measurements", () => {
    let s = startMeasuring("sqm");
    s = fill(s, [1, 4, 3]);
    const r = pressEnter(s); // second Enter, empty column
    expect(r.kind).toBe("closed");
    if (r.kind === "closed") expect(r.measurements).toEqual([{ nos: 1, l: 4, b: 3 }]);
  });

  it("closing an untouched block yields zero measurements (skip)", () => {
    const r = pressEnter(startMeasuring("kg"));
    expect(r.kind).toBe("closed");
    if (r.kind === "closed") expect(r.measurements).toEqual([]);
  });

  it("arrow keys move the cursor without recording", () => {
    let s = startMeasuring("cum");
    s = moveRow(s, 1);
    s = moveRow(s, 1);
    expect(s.rowIdx).toBe(2);
    s = moveRow(s, -1);
    expect(s.rowIdx).toBe(1);
    expect(s.recorded).toEqual([]);
  });

  it("blank Nos on a dimensioned column defaults to 1 (takeoff convention)", () => {
    let s = startMeasuring("sqm");
    // leave Nos blank, fill Length + Breadth
    let r = pressEnter(s); // Nos empty, rowIdx 0 → would close; so type nothing but move via arrow
    // simulate: skip Nos by arrowing down, fill L and B, record on last row
    s = moveRow(startMeasuring("sqm"), 1); // cursor on Length
    s = setValue(s, "4");
    r = pressEnter(s); // advance to Breadth
    if (r.kind !== "advanced") throw new Error("expected advance");
    s = setValue(r.state, "3");
    r = pressEnter(s); // last row → record
    expect(r.kind).toBe("recorded");
    if (r.kind === "recorded") {
      expect(r.state.recorded[0]).toEqual({ nos: 1, l: 4, b: 3 });
    }
  });

  it("partial column still records (missing dims read as zero qty)", () => {
    let s = startMeasuring("cum");
    s = setValue(s, "2"); // Nos
    let r = pressEnter(s);
    if (r.kind !== "advanced") throw new Error("expected advance");
    s = r.state; // Length row, leave empty
    r = pressEnter(s);
    if (r.kind !== "advanced") throw new Error("expected advance");
    s = r.state;
    r = pressEnter(s);
    if (r.kind !== "advanced") throw new Error("expected advance");
    s = r.state;
    r = pressEnter(s); // last row, column has nos only
    expect(r.kind).toBe("recorded");
    if (r.kind === "recorded") {
      expect(r.state.recorded[0]).toEqual({ nos: 2, l: undefined, b: undefined, h: undefined });
    }
  });
});

describe("raw-text cells (decimals survive; server-invalid values are blocked)", () => {
  it("records true decimals — 4.5 stays 4.5, not 45", () => {
    let s = startMeasuring("rm"); // Nos, Length
    s = setValue(s, "3");
    let r = pressEnter(s);
    if (r.kind !== "advanced") throw new Error("expected advance");
    s = setValue(r.state, "12.5");
    r = pressEnter(s);
    expect(r.kind).toBe("recorded");
    if (r.kind === "recorded") expect(r.state.recorded[0]).toEqual({ nos: 3, l: 12.5 });
  });

  it("preserves a leading-zero decimal like 0.15", () => {
    let s = startMeasuring("cum");
    s = fill(s, ["2", "4.5", "3", "0.15"]);
    expect(s.recorded).toEqual([{ nos: 2, l: 4.5, b: 3, h: 0.15 }]);
  });

  it("records a negative Nos as a deduction (count unit)", () => {
    let s = startMeasuring("kg"); // single Qty row (slot 0 = Nos/Qty)
    s = setValue(s, "-5");
    const r = pressEnter(s);
    expect(r.kind).toBe("recorded");
    if (r.kind === "recorded") expect(r.state.recorded[0]).toEqual({ nos: -5 });
  });

  it("records a deduction column: negative Nos with positive dimensions", () => {
    // A door void in a wall-plaster line: -1 × 1.0 × 2.1
    let s = startMeasuring("sqm"); // Nos, Length, Breadth
    s = fill(s, ["-1", "1.0", "2.1"]);
    expect(s.recorded[0]).toEqual({ nos: -1, l: 1, b: 2.1 });
  });

  it("blocks a negative dimension on a multi-row column", () => {
    let s = startMeasuring("sqm"); // Nos, Length, Breadth
    s = setValue(s, "2");
    let r = pressEnter(s); // -> Length
    if (r.kind !== "advanced") throw new Error("expected advance");
    s = setValue(r.state, "4");
    r = pressEnter(s); // -> Breadth (last row)
    if (r.kind !== "advanced") throw new Error("expected advance");
    s = setValue(r.state, "-3");
    r = pressEnter(s);
    expect(r.kind).toBe("invalid");
  });

  it("non-numeric garbage in a used column is rejected, not silently recorded", () => {
    let s = startMeasuring("rm");
    s = setValue(s, "2"); // Nos ok
    let r = pressEnter(s); // -> Length (last row)
    if (r.kind !== "advanced") throw new Error("expected advance");
    s = setValue(r.state, "abc");
    r = pressEnter(s);
    expect(r.kind).toBe("invalid");
  });
});

describe("dropRecorded (roll back a failed optimistic save)", () => {
  it("removes exactly the failed column by identity, keeping the rest", () => {
    let s = startMeasuring("rm");
    s = fill(s, ["3", "12"]); // M1 = {nos:3, l:12}
    s = fill(s, ["1", "5"]); // M2 = {nos:1, l:5}
    expect(s.recorded).toHaveLength(2);
    const m1 = s.recorded[0]!;
    const rolledBack = dropRecorded(s, m1);
    expect(rolledBack.recorded).toEqual([{ nos: 1, l: 5 }]);
  });

  it("is a no-op for a column that isn't in the sheet", () => {
    let s = startMeasuring("rm");
    s = fill(s, ["3", "12"]);
    expect(dropRecorded(s, { nos: 9 }).recorded).toHaveLength(1);
  });
});

describe("live column preview (F3)", () => {
  it("is null before anything is typed", () => {
    const s = startMeasuring("cum");
    expect(previewColumn(s)).toBeNull();
    expect(previewColumnQty(s)).toBeNull();
  });

  it("reads 0 while a required dimension is still blank", () => {
    let s = startMeasuring("cum"); // Nos, L, B, H
    s = setValue(s, "2"); // only Nos typed
    expect(previewColumn(s)).toEqual({ nos: 2, l: undefined, b: undefined, h: undefined });
    expect(previewColumnQty(s)).toBe(0); // missing L/B/H ⇒ 0, the visible cue
  });

  it("computes the live qty of a complete column", () => {
    let s = startMeasuring("rm"); // Nos, Length
    s = setValue(s, "3");
    const r = pressEnter(s);
    if (r.kind !== "advanced") throw new Error("expected advance");
    s = setValue(r.state, "12");
    expect(previewColumnQty(s)).toBe(36);
  });

  it("applies the blank-Nos→1 takeoff default in the preview", () => {
    let s = moveRow(startMeasuring("rm"), 1); // skip Nos, cursor on Length
    s = setValue(s, "4");
    expect(previewColumn(s)).toEqual({ nos: 1, l: 4 });
    expect(previewColumnQty(s)).toBe(4);
  });
});
