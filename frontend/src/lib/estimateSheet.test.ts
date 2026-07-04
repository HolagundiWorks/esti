import { describe, expect, it } from "vitest";
import { moveRow, pressEnter, setValue, startMeasuring, type MeasureState } from "./estimateSheet.js";

function fill(s: MeasureState, values: (number | null)[]): MeasureState {
  let cur = s;
  for (const v of values) {
    cur = setValue(cur, v);
    const r = pressEnter(cur);
    if (r.kind === "closed") throw new Error("unexpected close");
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
    s = setValue(s, 4);
    r = pressEnter(s); // advance to Breadth
    if (r.kind !== "advanced") throw new Error("expected advance");
    s = setValue(r.state, 3);
    r = pressEnter(s); // last row → record
    expect(r.kind).toBe("recorded");
    if (r.kind === "recorded") {
      expect(r.state.recorded[0]).toEqual({ nos: 1, l: 4, b: 3 });
    }
  });

  it("partial column still records (missing dims read as zero qty)", () => {
    let s = startMeasuring("cum");
    s = setValue(s, 2); // Nos
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
