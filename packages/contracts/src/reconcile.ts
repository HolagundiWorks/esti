import { z } from "zod";

/**
 * Bank-statement reconciliation (ADR-10). A CSV/XLSX statement is uploaded and
 * the Python worker (pandas) parses credit lines and matches them against
 * invoices by reference and/or amount. Results drive the SPA poll.
 *
 * Canonical statement columns (case-insensitive, flexible aliases):
 *   date | description/narration/particulars | amount/credit/deposit
 * Credits (positive amounts) are reconciled against receivables.
 */
export const ReconcileStatus = z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]);
export type ReconcileStatus = z.infer<typeof ReconcileStatus>;

export const ReconcileMatchType = z.enum(["ref_amount", "ref", "amount", "none"]);
export type ReconcileMatchType = z.infer<typeof ReconcileMatchType>;

/** One parsed statement credit line + its match outcome. */
export const ReconcileLine = z.object({
  row: z.number().int(),
  date: z.string().nullable(),
  description: z.string(),
  amountPaise: z.number().int(),
  matchType: ReconcileMatchType,
  matchedInvoiceId: z.string().uuid().nullable(),
  matchedInvoiceRef: z.string().nullable(),
});
export type ReconcileLine = z.infer<typeof ReconcileLine>;

export const ReconcileUploadFields = z.object({
  label: z.string().min(1).max(200),
});
export type ReconcileUploadFields = z.infer<typeof ReconcileUploadFields>;

export const RECONCILE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB statement cap
export const RECONCILE_EXTENSIONS = [".csv", ".xlsx", ".xls"] as const;
