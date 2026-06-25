import { z } from "zod";

/**
 * Construction Cost OS Phase G — cost dashboard + deterministic risk checks.
 *
 * The reporting head over the spine. These pure helpers turn the rolled-up
 * numbers (estimated / tendered / awarded / billed, per-package and per-item
 * figures) into a calm cost-health picture — a Green/Amber/Red/Grey status, a
 * cost-overrun %, and three deterministic "checker" risk notes.
 *
 * The risk checks are arithmetic over financial data, which the reference (§9)
 * says must never be left to a model that could "silently approve" — so they are
 * computed here, not by an LLM. Everything is integer paise and pure for unit
 * testing.
 */

// --- Status (reference §5.1 cost-status logic) ------------------------------

export const CostStatus = z.enum(["GREEN", "AMBER", "RED", "GREY"]);
export type CostStatus = z.infer<typeof CostStatus>;

export const COST_STATUS_LABEL: Record<CostStatus, string> = {
  GREEN: "Within budget",
  AMBER: "Watch",
  RED: "Overrun or approval required",
  GREY: "Not started / no data",
};

/** Carbon `Tag` type per status — single source so the office UI stays Pure Carbon. */
export const COST_STATUS_TAG: Record<
  CostStatus,
  "green" | "magenta" | "red" | "cool-gray"
> = {
  GREEN: "green",
  AMBER: "magenta",
  RED: "red",
  GREY: "cool-gray",
};

// --- Risk checks (reference §9.6 Bid AI, §9.7 Billing AI) --------------------

export const CostRiskKind = z.enum([
  "DUPLICATE_BILLING",
  "UNBALANCED_BID",
  "BILL_DEVIATION",
]);
export type CostRiskKind = z.infer<typeof CostRiskKind>;

export const COST_RISK_LABEL: Record<CostRiskKind, string> = {
  DUPLICATE_BILLING: "Possible duplicate / over-billing",
  UNBALANCED_BID: "Unbalanced / front-loaded rate",
  BILL_DEVIATION: "Billing exceeds awarded value",
};

export const CostRiskSeverity = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type CostRiskSeverity = z.infer<typeof CostRiskSeverity>;

/** Awarded rate this far from the estimate baseline (±) is flagged unbalanced. */
export const UNBALANCED_RATE_THRESHOLD = 0.25;
/** Billed past this multiple of the awarded value escalates BILL_DEVIATION to HIGH. */
export const BILL_DEVIATION_HIGH = 1.1;

export interface CostRiskNote {
  kind: CostRiskKind;
  severity: CostRiskSeverity;
  label: string;
  detail: string;
  /** The reference module the check derives from (e.g. "§9.7"). */
  ref: string;
}

// --- Pure helpers -----------------------------------------------------------

/**
 * Cost-overrun % — how far the current contracted position (awarded + approved
 * variations) has grown past the original estimate. `null` (→ Grey) when there
 * is no estimate to compare against.
 */
export function costOverrunPct(input: {
  estimatedPaise: number;
  awardedPaise: number;
  variationPaise: number;
}): number | null {
  if (input.estimatedPaise <= 0) return null;
  const projected = input.awardedPaise + input.variationPaise;
  return ((projected - input.estimatedPaise) / input.estimatedPaise) * 100;
}

/**
 * Green/Amber/Red/Grey for one work package. Grey = not started / no contract.
 * Red = billed past the contracted value (+ approved variations) or an open
 * deviation needs approval. Amber = within budget but ≥90% billed (approaching).
 * Green = comfortably within budget with nothing open.
 */
export function costStatusFor(input: {
  contractPaise: number;
  variationPaise: number;
  billedPaise: number;
  openDeviations: number;
  started: boolean;
}): CostStatus {
  const ceiling = input.contractPaise + input.variationPaise;
  if (!input.started || ceiling <= 0) return "GREY";
  if (input.billedPaise > ceiling || input.openDeviations > 0) return "RED";
  if (input.billedPaise >= 0.9 * ceiling) return "AMBER";
  return "GREEN";
}

// Inputs for the risk-check engine — numeric only, so it is DB-free testable.

export interface CostRiskItemLike {
  description: string;
  unit: string;
  /** Σ billed quantity for this BOQ/WP item across every running bill. */
  cumulativeBilledQty: number;
  /** Contracted quantity = approvedQty + variationQty. */
  contractedQty: number;
  /** Awarded unit rate (paise). */
  awardedRatePaise: number;
  /** Estimate baseline unit rate (paise); 0/undefined ⇒ no baseline, skip. */
  estimateRatePaise: number;
}

export interface CostRiskPackageLike {
  name: string;
  /** Awarded contract value + approved variation value (paise). */
  ceilingPaise: number;
  billedPaise: number;
}

/**
 * Derive the deterministic cost-risk notes (the "checker"). Advisory only — the
 * caller surfaces them; nothing here approves or mutates anything.
 *
 * - DUPLICATE_BILLING (§9.7): an item billed beyond its contracted quantity.
 * - UNBALANCED_BID (§9.6): an awarded rate far from the estimate baseline.
 * - BILL_DEVIATION (§9.7): a package billed past its awarded value (+ variations).
 */
export function deriveCostRiskNotes(input: {
  items: CostRiskItemLike[];
  packages: CostRiskPackageLike[];
}): CostRiskNote[] {
  const notes: CostRiskNote[] = [];

  for (const it of input.items) {
    const over = it.cumulativeBilledQty - it.contractedQty;
    if (over > 1e-6) {
      notes.push({
        kind: "DUPLICATE_BILLING",
        severity: "HIGH",
        label: COST_RISK_LABEL.DUPLICATE_BILLING,
        detail: `"${it.description}" billed ${fmtQty(over)} ${it.unit} over the contracted quantity.`,
        ref: "§9.7",
      });
    }
  }

  for (const it of input.items) {
    if (it.estimateRatePaise > 0) {
      const dev = (it.awardedRatePaise - it.estimateRatePaise) / it.estimateRatePaise;
      if (Math.abs(dev) > UNBALANCED_RATE_THRESHOLD) {
        const pct = Math.round(Math.abs(dev) * 100);
        notes.push({
          kind: "UNBALANCED_BID",
          severity: "MEDIUM",
          label: COST_RISK_LABEL.UNBALANCED_BID,
          detail: `"${it.description}" awarded rate is ${pct}% ${dev > 0 ? "above" : "below"} the estimate.`,
          ref: "§9.6",
        });
      }
    }
  }

  for (const p of input.packages) {
    if (p.ceilingPaise > 0 && p.billedPaise > p.ceilingPaise) {
      const over = p.billedPaise - p.ceilingPaise;
      const high = p.billedPaise > p.ceilingPaise * BILL_DEVIATION_HIGH;
      notes.push({
        kind: "BILL_DEVIATION",
        severity: high ? "HIGH" : "MEDIUM",
        label: COST_RISK_LABEL.BILL_DEVIATION,
        detail: `Package "${p.name}" billed ${fmtPaise(over)} beyond its awarded value — check for unapproved variations.`,
        ref: "§9.7",
      });
    }
  }

  return notes;
}

/** Compact quantity for note detail (avoids a money dependency here). */
function fmtQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
}

/** Compact ₹ for note detail (paise → ₹, no decimals). */
function fmtPaise(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}
