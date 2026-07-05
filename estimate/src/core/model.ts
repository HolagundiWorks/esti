/**
 * The Estimate app's working model — the mutable, UI-edited shape. It is
 * assembled into a frozen `.aormsest` (EstimateFile) on export. Everything is
 * kept in the browser; nothing leaves the machine until you export a file.
 */
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
  code: string;
  itemCode?: string;
  shortName: string;
  specification?: string;
  uom: string;
  ratePaise: number; // as-estimated rate (advisory; AORMS re-costs)
  section?: string;
  measurements: MeasureRow[];
  leadKm?: number;
  leadChargePaise?: number; // carriage add-on per UOM
}

export interface MaterialLine {
  id: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  ratePaise?: number;
}

/** A BBS member the estimator configures (element + geometry + bar layout). */
export type BbsMemberRow = { id: string; ref?: string } & MemberInput;

export interface EstimateModel {
  estimateName: string;
  projectName?: string;
  rateBookCode: string;
  rateBookName: string;
  items: WorkItem[];
  materials: MaterialLine[];
  bbs: BbsMemberRow[];
  /** Optional ₹/kg steel rate by diameter (as-estimated). */
  steelRatePaiseByDia: Record<number, number>;
}

let seq = 0;
/** Deterministic-enough id for UI rows (not persisted as identity). */
export function newId(prefix = "r"): string {
  seq += 1;
  return `${prefix}${seq}`;
}

export function emptyModel(): EstimateModel {
  return {
    estimateName: "New estimate",
    projectName: "",
    rateBookCode: "OWN",
    rateBookName: "Office rate book",
    items: [],
    materials: [],
    bbs: [],
    steelRatePaiseByDia: {},
  };
}

export const emptyMeasureRow = (): MeasureRow => ({ id: newId("m"), nos: 1, l: null, b: null, h: null });

export const emptyItem = (): WorkItem => ({
  id: newId("i"),
  code: "",
  shortName: "",
  uom: "m³",
  ratePaise: 0,
  measurements: [emptyMeasureRow()],
});
