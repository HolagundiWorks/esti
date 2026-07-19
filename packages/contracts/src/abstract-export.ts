import { MEASUREMENT_UOM_LABEL, type MeasurementUom } from "./item-library.js";
import { formatDimensionMm } from "./measurement-quantity.js";

/** One measurement-book row, as much of it as the abstract sheet needs. */
export type AbstractSourceRow = {
  levelId: string | null;
  libraryItemCode: string | null;
  particulars: string;
  lengthMm: number | null;
  breadthMm: number | null;
  heightMm: number | null;
  quantity: number;
  uom: string;
  derivation: string;
};

export type AbstractExportRow = {
  "S.No": number | "";
  Level: string;
  "Item code": string;
  Particulars: string;
  "L (m)": string;
  "B (m)": string;
  "H (m)": string;
  Quantity: number;
  Unit: string;
  Derivation: string;
};

function uomLabel(uom: string): string {
  return MEASUREMENT_UOM_LABEL[uom as MeasurementUom] ?? uom;
}

/** 3 dp — the precision the measurement book derives at. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Shape measurement rows into an Indian abstract sheet: dimensions in metres to
 * 3 dp, quantity with its UOM, and a trailing TOTAL line per unit (an abstract
 * is read bottom-up). Totals are summed then rounded once, so a column of 3-dp
 * values cannot drift the total.
 */
export function buildAbstractExportRows(
  rows: AbstractSourceRow[],
  levelLabel: (levelId: string | null) => string,
): AbstractExportRow[] {
  const out: AbstractExportRow[] = rows.map((r, i) => ({
    "S.No": i + 1,
    Level: levelLabel(r.levelId),
    "Item code": r.libraryItemCode ?? "—",
    Particulars: r.particulars,
    "L (m)": formatDimensionMm(r.lengthMm),
    "B (m)": formatDimensionMm(r.breadthMm),
    "H (m)": formatDimensionMm(r.heightMm),
    Quantity: round3(r.quantity),
    Unit: uomLabel(r.uom),
    Derivation: r.derivation,
  }));

  const byUom = new Map<string, number>();
  for (const r of rows) byUom.set(r.uom, (byUom.get(r.uom) ?? 0) + r.quantity);
  for (const [uom, total] of byUom) {
    out.push({
      "S.No": "",
      Level: "",
      "Item code": "",
      Particulars: `TOTAL — ${uomLabel(uom)}`,
      "L (m)": "",
      "B (m)": "",
      "H (m)": "",
      Quantity: round3(total),
      Unit: uomLabel(uom),
      Derivation: "",
    });
  }
  return out;
}
