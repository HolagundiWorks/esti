import { z } from "zod";

/**
 * Construction Cost OS — Procurement Forecast (ref 5.16).
 *
 * A forward look at what is still to be procured / executed across a project,
 * derived entirely from the existing spine: for every awarded work-package item
 * the *outstanding* quantity is the contracted quantity (approved + variation)
 * minus everything already billed against it, valued at the awarded unit rate.
 *
 *     outstanding qty   = max(0, contractedQty − billedQty)
 *     outstanding value = round(outstanding qty × awarded rate)   [integer paise]
 *
 * These pure helpers roll the per-item numbers up by cost head and by work
 * package and total them. No materials master is invented — the work-package
 * BOQ item is the office's real procurement-planning unit. Everything is integer
 * paise and DB-free for unit testing. Read-only, advisory; nothing here writes.
 */

// --- Status -----------------------------------------------------------------

export const ProcurementStatus = z.enum(["NOT_STARTED", "IN_PROGRESS", "FULLY_BILLED"]);
export type ProcurementStatus = z.infer<typeof ProcurementStatus>;

export const PROCUREMENT_STATUS_LABEL: Record<ProcurementStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  FULLY_BILLED: "Fully executed",
};

/** Carbon `Tag` type per status — single source so the office UI stays Pure Carbon. */
export const PROCUREMENT_STATUS_TAG: Record<
  ProcurementStatus,
  "magenta" | "blue" | "cool-gray"
> = {
  NOT_STARTED: "magenta",
  IN_PROGRESS: "blue",
  FULLY_BILLED: "cool-gray",
};

/** Cost-head bucket for items whose BOQ line has no cost head. */
export const UNCATEGORISED_COST_HEAD = "Uncategorised";

/** Quantities within this tolerance of each other are treated as equal. */
const EPSILON = 1e-6;

// --- Inputs / outputs -------------------------------------------------------

/** One work-package item, the procurement-planning unit. Numeric only. */
export interface ProcurementForecastItemLike {
  workPackageId: string;
  workPackageRef: string;
  workPackageName: string;
  contractor: string | null;
  description: string;
  unit: string;
  /** BOQ cost head from the linked estimate item; null ⇒ Uncategorised. */
  costHead: string | null;
  /** Contracted quantity = approvedQty + variationQty. */
  contractedQty: number;
  /** Σ billed quantity across every running bill for this item. */
  billedQty: number;
  /** Awarded unit rate (paise). */
  ratePaise: number;
}

export interface ProcurementForecastItem {
  workPackageId: string;
  workPackageRef: string;
  workPackageName: string;
  contractor: string | null;
  description: string;
  unit: string;
  costHead: string;
  contractedQty: number;
  billedQty: number;
  outstandingQty: number;
  ratePaise: number;
  contractedValuePaise: number;
  billedValuePaise: number;
  outstandingValuePaise: number;
  status: ProcurementStatus;
}

export interface ProcurementCostHeadRow {
  costHead: string;
  itemCount: number;
  /** Items still carrying an outstanding quantity. */
  outstandingItemCount: number;
  contractedValuePaise: number;
  billedValuePaise: number;
  outstandingValuePaise: number;
}

export interface ProcurementPackageRow {
  workPackageId: string;
  ref: string;
  name: string;
  contractor: string | null;
  itemCount: number;
  contractedValuePaise: number;
  billedValuePaise: number;
  outstandingValuePaise: number;
  status: ProcurementStatus;
}

export interface ProcurementForecastTotals {
  itemCount: number;
  outstandingItemCount: number;
  packageCount: number;
  costHeadCount: number;
  contractedValuePaise: number;
  billedValuePaise: number;
  outstandingValuePaise: number;
}

export interface ProcurementForecast {
  items: ProcurementForecastItem[];
  byCostHead: ProcurementCostHeadRow[];
  byPackage: ProcurementPackageRow[];
  totals: ProcurementForecastTotals;
}

// --- Pure helpers -----------------------------------------------------------

/**
 * Status from the executed position: nothing outstanding ⇒ fully executed (grey,
 * nothing left to procure); nothing billed yet ⇒ not started; otherwise mid-flight.
 */
export function procurementStatusFor(input: {
  contractedQty: number;
  billedQty: number;
}): ProcurementStatus {
  const outstanding = Math.max(0, input.contractedQty - input.billedQty);
  if (outstanding <= EPSILON) return "FULLY_BILLED";
  if (input.billedQty <= EPSILON) return "NOT_STARTED";
  return "IN_PROGRESS";
}

/**
 * Roll work-package items into the procurement forecast — per-item outstanding
 * figures, plus by-cost-head and by-package rollups and project totals. Items
 * are returned outstanding-value first (the procurement priority), then by ref.
 */
export function summarizeProcurementForecast(
  rows: ProcurementForecastItemLike[],
): ProcurementForecast {
  const items: ProcurementForecastItem[] = rows.map((r) => {
    const outstandingQty = Math.max(0, r.contractedQty - r.billedQty);
    const contractedValuePaise = Math.round(r.contractedQty * r.ratePaise);
    const billedValuePaise = Math.round(r.billedQty * r.ratePaise);
    const outstandingValuePaise = Math.round(outstandingQty * r.ratePaise);
    return {
      workPackageId: r.workPackageId,
      workPackageRef: r.workPackageRef,
      workPackageName: r.workPackageName,
      contractor: r.contractor,
      description: r.description,
      unit: r.unit,
      costHead: r.costHead?.trim() ? r.costHead.trim() : UNCATEGORISED_COST_HEAD,
      contractedQty: r.contractedQty,
      billedQty: r.billedQty,
      outstandingQty,
      ratePaise: r.ratePaise,
      contractedValuePaise,
      billedValuePaise,
      outstandingValuePaise,
      status: procurementStatusFor({ contractedQty: r.contractedQty, billedQty: r.billedQty }),
    };
  });

  // --- By cost head ---------------------------------------------------------
  const costHeadMap = new Map<string, ProcurementCostHeadRow>();
  for (const it of items) {
    let row = costHeadMap.get(it.costHead);
    if (!row) {
      row = {
        costHead: it.costHead,
        itemCount: 0,
        outstandingItemCount: 0,
        contractedValuePaise: 0,
        billedValuePaise: 0,
        outstandingValuePaise: 0,
      };
      costHeadMap.set(it.costHead, row);
    }
    row.itemCount += 1;
    if (it.outstandingValuePaise > 0 || it.outstandingQty > EPSILON) row.outstandingItemCount += 1;
    row.contractedValuePaise += it.contractedValuePaise;
    row.billedValuePaise += it.billedValuePaise;
    row.outstandingValuePaise += it.outstandingValuePaise;
  }
  const byCostHead = [...costHeadMap.values()].sort(
    (a, b) =>
      b.outstandingValuePaise - a.outstandingValuePaise || a.costHead.localeCompare(b.costHead),
  );

  // --- By work package ------------------------------------------------------
  const pkgMap = new Map<
    string,
    ProcurementPackageRow & { _contractedQty: number; _billedQty: number }
  >();
  for (const it of items) {
    let row = pkgMap.get(it.workPackageId);
    if (!row) {
      row = {
        workPackageId: it.workPackageId,
        ref: it.workPackageRef,
        name: it.workPackageName,
        contractor: it.contractor,
        itemCount: 0,
        contractedValuePaise: 0,
        billedValuePaise: 0,
        outstandingValuePaise: 0,
        status: "FULLY_BILLED",
        _contractedQty: 0,
        _billedQty: 0,
      };
      pkgMap.set(it.workPackageId, row);
    }
    row.itemCount += 1;
    row.contractedValuePaise += it.contractedValuePaise;
    row.billedValuePaise += it.billedValuePaise;
    row.outstandingValuePaise += it.outstandingValuePaise;
    row._contractedQty += it.contractedQty;
    row._billedQty += it.billedQty;
  }
  const byPackage: ProcurementPackageRow[] = [...pkgMap.values()]
    .map((r) => {
      const { _contractedQty, _billedQty, ...rest } = r;
      return {
        ...rest,
        status: procurementStatusFor({ contractedQty: _contractedQty, billedQty: _billedQty }),
      };
    })
    .sort((a, b) => a.ref.localeCompare(b.ref));

  // --- Totals ---------------------------------------------------------------
  const totals: ProcurementForecastTotals = {
    itemCount: items.length,
    outstandingItemCount: items.filter((it) => it.outstandingValuePaise > 0 || it.outstandingQty > EPSILON).length,
    packageCount: byPackage.length,
    costHeadCount: byCostHead.length,
    contractedValuePaise: items.reduce((s, it) => s + it.contractedValuePaise, 0),
    billedValuePaise: items.reduce((s, it) => s + it.billedValuePaise, 0),
    outstandingValuePaise: items.reduce((s, it) => s + it.outstandingValuePaise, 0),
  };

  const sortedItems = [...items].sort(
    (a, b) =>
      b.outstandingValuePaise - a.outstandingValuePaise ||
      a.workPackageRef.localeCompare(b.workPackageRef) ||
      a.description.localeCompare(b.description),
  );

  return { items: sortedItems, byCostHead, byPackage, totals };
}
