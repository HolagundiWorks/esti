/**
 * The Estimate app's working model — the mutable, UI-edited shape. It is
 * assembled into a frozen `.aormsest` (EstimateFile) on export.
 */
import type { MeasurementTemplate } from "@esti/contracts";
import type { MemberInput } from "@esti/contracts";

export interface MeasureRow {
  id: string;
  desc?: string;
  nos: number;
  l: number | null;
  b: number | null;
  h: number | null;
}

export interface WorkItem {
  id: string;
  /** Rate-book item code — join key for recipes and AORMS re-cost. */
  code: string;
  /** Parent work-item / chapter code from the rate book. */
  itemCode?: string;
  shortName: string;
  /** Full written specification from CPWD DSR (rate-free text). */
  specification?: string;
  uom: string;
  ratePaise: number;
  section?: string;
  /** Which of Nos·L·B·H to punch (from rate book or UOM default). */
  measurementTemplate?: MeasurementTemplate;
  measurements: MeasureRow[];
  leadKm?: number;
  leadChargePaise?: number;
  /** Parent item code when auto-derived from derivation rules. */
  derivedFrom?: string;
}

export interface MaterialLine {
  id: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  ratePaise?: number;
}

export type BbsMemberRow = { id: string; ref?: string } & MemberInput;

export interface EstimateModel {
  estimateName: string;
  projectName?: string;
  rateBookCode: string;
  rateBookName: string;
  items: WorkItem[];
  /** Manual overrides only — export uses computed materials when rate book is loaded. */
  materials: MaterialLine[];
  bbs: BbsMemberRow[];
  steelRatePaiseByDia: Record<number, number>;
}

let seq = 0;
export function newId(prefix = "r"): string {
  seq += 1;
  return `${prefix}${seq}`;
}

export function emptyModel(): EstimateModel {
  return {
    estimateName: "New estimate",
    projectName: "",
    rateBookCode: "",
    rateBookName: "",
    items: [],
    materials: [],
    bbs: [],
    steelRatePaiseByDia: {},
  };
}

export const emptyMeasureRow = (): MeasureRow => ({
  id: newId("m"),
  nos: 1,
  l: null,
  b: null,
  h: null,
});

export const emptyItem = (): WorkItem => ({
  id: newId("i"),
  code: "",
  shortName: "",
  uom: "m²",
  ratePaise: 0,
  measurements: [emptyMeasureRow()],
});
