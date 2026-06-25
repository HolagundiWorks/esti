import { z } from "zod";

/**
 * Construction Cost OS Phase F — final account + closure.
 *
 * A final account is the closing statement for one work package (one contract).
 * Its financial position is rolled up from the spine — never re-keyed: the
 * original contract value and the approved-variation/extra-item value come from
 * the work package's items, and the gross billed + deduction block + net paid
 * come from that package's running bills. The office then enters the closing
 * adjustments (final certified amount, retention released) and attests the
 * closure (no-claim cert, client final approval).
 *
 * Closure is governed by a checklist. Rule 6 — "no final-account closure with
 * open variations/deviations" — turns open deviations / open variations into
 * hard blockers; the manual attestations block too; final-measurement and
 * steel-reconciliation state are advisory. The record is two-state DRAFT → CLOSED
 * (close gated by `cost:approve`). Money is integer paise; these helpers are pure
 * for unit testing.
 */

// --- Enums ------------------------------------------------------------------

export const FinalAccountStatus = z.enum(["DRAFT", "CLOSED"]);
export type FinalAccountStatus = z.infer<typeof FinalAccountStatus>;
export const FINAL_ACCOUNT_STATUS_LABEL: Record<FinalAccountStatus, string> = {
  DRAFT: "Draft",
  CLOSED: "Closed",
};

// --- Pure helpers -----------------------------------------------------------

export interface FinalAccountItemLike {
  approvedQty: number;
  variationQty: number;
  ratePaise: number;
}

export interface FinalAccountBillLike {
  totalPaise: number;
  retentionPaise: number;
  advanceRecoveryPaise: number;
  taxTdsPaise: number;
  otherRecoveryPaise: number;
  netPayablePaise: number;
}

export interface FinalAccountFinancials {
  /** Σ(approvedQty × rate) — the awarded contract value before variations. */
  originalContractPaise: number;
  /** Σ(variationQty × rate) — approved additions + extra items (extra items have
   * approvedQty 0, so they land here naturally). */
  variationPaise: number;
  /** Σ gross of every running bill on the package. */
  grossBilledPaise: number;
  retentionHeldPaise: number;
  advanceRecoveredPaise: number;
  taxTdsPaise: number;
  otherRecoveryPaise: number;
  /** Σ net payable — what the contractor has actually been paid to date. */
  netPaidPaise: number;
}

/** Roll up the contract value (from WP items) and billed totals (from bills). */
export function finalAccountFinancials(input: {
  items: FinalAccountItemLike[];
  bills: FinalAccountBillLike[];
}): FinalAccountFinancials {
  let originalContractPaise = 0;
  let variationPaise = 0;
  for (const it of input.items) {
    originalContractPaise += Math.round(it.approvedQty * it.ratePaise);
    variationPaise += Math.round(it.variationQty * it.ratePaise);
  }
  let grossBilledPaise = 0;
  let retentionHeldPaise = 0;
  let advanceRecoveredPaise = 0;
  let taxTdsPaise = 0;
  let otherRecoveryPaise = 0;
  let netPaidPaise = 0;
  for (const b of input.bills) {
    grossBilledPaise += b.totalPaise;
    retentionHeldPaise += b.retentionPaise;
    advanceRecoveredPaise += b.advanceRecoveryPaise;
    taxTdsPaise += b.taxTdsPaise;
    otherRecoveryPaise += b.otherRecoveryPaise;
    netPaidPaise += b.netPayablePaise;
  }
  return {
    originalContractPaise,
    variationPaise,
    grossBilledPaise,
    retentionHeldPaise,
    advanceRecoveredPaise,
    taxTdsPaise,
    otherRecoveryPaise,
    netPaidPaise,
  };
}

/** Seed for the editable "final certified" amount: original + variations. */
export function defaultFinalCertified(f: {
  originalContractPaise: number;
  variationPaise: number;
}): number {
  return f.originalContractPaise + f.variationPaise;
}

/** Balance still due to the contractor: final certified − net already paid. */
export function finalAccountBalance(input: {
  finalCertifiedPaise: number;
  netPaidPaise: number;
}): number {
  return input.finalCertifiedPaise - input.netPaidPaise;
}

// --- Closure checklist (Rule 6) ---------------------------------------------

export const FINAL_ACCOUNT_CHECK_KEYS = [
  "no_open_deviations",
  "no_open_variations",
  "measurements_billed",
  "steel_reconciled",
  "no_claim_cert",
  "client_final_approval",
] as const;
export type FinalAccountCheckKey = (typeof FINAL_ACCOUNT_CHECK_KEYS)[number];

export interface FinalAccountChecklistItem {
  key: FinalAccountCheckKey;
  label: string;
  ok: boolean;
  /** A blocking item must be ok before the account can close. */
  blocking: boolean;
}

/**
 * Evaluate the closure checklist. The open-deviation / open-variation rows are
 * Rule 6 hard blockers; the no-claim cert + client approval also block. The
 * measurement-billed + steel-reconciled rows are advisory (shown, never block).
 */
export function finalAccountChecklist(input: {
  openDeviations: number;
  openVariations: number;
  unbilledApprovedMeasurements: number;
  steelReconFinalized: boolean;
  noClaimReceived: boolean;
  clientFinalApproval: boolean;
}): { items: FinalAccountChecklistItem[]; canClose: boolean } {
  const items: FinalAccountChecklistItem[] = [
    {
      key: "no_open_deviations",
      label: "All deviations resolved (Rule 6 — none open)",
      ok: input.openDeviations === 0,
      blocking: true,
    },
    {
      key: "no_open_variations",
      label: "All variations closed or rejected (Rule 6)",
      ok: input.openVariations === 0,
      blocking: true,
    },
    {
      key: "measurements_billed",
      label: "Approved measurements all billed",
      ok: input.unbilledApprovedMeasurements === 0,
      blocking: false,
    },
    {
      key: "steel_reconciled",
      label: "Steel reconciliation finalized",
      ok: input.steelReconFinalized,
      blocking: false,
    },
    {
      key: "no_claim_cert",
      label: "No-claim certificate received",
      ok: input.noClaimReceived,
      blocking: true,
    },
    {
      key: "client_final_approval",
      label: "Client final approval received",
      ok: input.clientFinalApproval,
      blocking: true,
    },
  ];
  const canClose = items.every((i) => !i.blocking || i.ok);
  return { items, canClose };
}

// --- Input schemas ----------------------------------------------------------

export const FinalAccountCreate = z.object({
  projectId: z.string().uuid(),
  workPackageId: z.string().uuid(),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
});
export type FinalAccountCreate = z.infer<typeof FinalAccountCreate>;

export const FinalAccountUpdate = z.object({
  id: z.string().uuid(),
  finalCertifiedPaise: z.number().int().nonnegative().optional(),
  retentionReleasedPaise: z.number().int().nonnegative().optional(),
  notes: z.string().max(2000).nullable().optional(),
  noClaimReceived: z.boolean().optional(),
  clientFinalApproval: z.boolean().optional(),
});
export type FinalAccountUpdate = z.infer<typeof FinalAccountUpdate>;

export const FinalAccountClose = z.object({ id: z.string().uuid() });
export type FinalAccountClose = z.infer<typeof FinalAccountClose>;

export const FinalAccountPdf = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
});
export type FinalAccountPdf = z.infer<typeof FinalAccountPdf>;
