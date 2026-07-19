import { describe, expect, it } from "vitest";
import { buildAbstractExportRows, type AbstractSourceRow } from "./abstract-export.js";

const row = (o: Partial<AbstractSourceRow>): AbstractSourceRow => ({
  levelId: null,
  libraryItemCode: null,
  particulars: "Wall",
  lengthMm: 5000,
  breadthMm: 2500,
  heightMm: null,
  quantity: 12.5,
  uom: "SQM",
  derivation: "AUTO",
  ...o,
});

const label = (id: string | null) => (id ? `LVL ${id}` : "All levels");

describe("buildAbstractExportRows", () => {
  it("formats dimensions as metres to 3 dp and blanks missing ones", () => {
    const [r] = buildAbstractExportRows([row({ lengthMm: 8400, heightMm: null })], label);
    expect(r!["L (m)"]).toBe("8.400");
    expect(r!["B (m)"]).toBe("2.500");
    expect(r!["H (m)"]).toBe("—");
    expect(r!.Unit).toBe("sqm");
    expect(r!["Item code"]).toBe("—");
    expect(r!["S.No"]).toBe(1);
  });

  it("appends one TOTAL line per unit, summed before rounding", () => {
    // 25.2 + 18.6 + 12.3 drifts to 56.099999999999994 if rounded per line.
    const out = buildAbstractExportRows(
      [
        row({ quantity: 25.2 }),
        row({ quantity: 18.6 }),
        row({ quantity: 12.3 }),
      ],
      label,
    );
    expect(out).toHaveLength(4);
    const total = out.at(-1)!;
    expect(total.Particulars).toBe("TOTAL — sqm");
    expect(total.Quantity).toBe(56.1);
    expect(total["S.No"]).toBe("");
  });

  it("keeps a separate total for each unit", () => {
    const out = buildAbstractExportRows(
      [row({ quantity: 10, uom: "SQM" }), row({ quantity: 4, uom: "CUM" })],
      label,
    );
    const totals = out.filter((r) => String(r.Particulars).startsWith("TOTAL"));
    expect(totals.map((t) => [t.Particulars, t.Quantity])).toEqual([
      ["TOTAL — sqm", 10],
      ["TOTAL — cum", 4],
    ]);
  });

  it("resolves level labels through the caller's map", () => {
    const [r] = buildAbstractExportRows([row({ levelId: "3" })], label);
    expect(r!.Level).toBe("LVL 3");
  });

  it("returns nothing for an empty book", () => {
    expect(buildAbstractExportRows([], label)).toEqual([]);
  });
});
