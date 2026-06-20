import { z } from "zod";
import {
  DsrImportRow,
  parseDsrCsvText,
  type DsrImportCsv,
} from "@hcw/master-dsr-kit/schemas";

export { DsrImportRow, parseDsrCsvText, type DsrImportCsv };

/**
 * Estimation / BOQ / BBS (Phase 10). A versioned master DSR feeds estimates;
 * an estimate carries a whole-estimate lead plus optional per-item leads. An
 * approved estimate is the project's BOQ.
 */

// --- Master DSR -------------------------------------------------------------
export const DsrVersionStatus = z.enum(["DRAFT", "PUBLISHED"]);
export type DsrVersionStatus = z.infer<typeof DsrVersionStatus>;

export const DsrVersionCreate = z.object({
  label: z.string().min(1).max(40), // e.g. "2026-27"
  description: z.string().max(200).optional(),
  /** Clone all rate items from an existing version. */
  copyFromVersionId: z.string().uuid().optional(),
  status: DsrVersionStatus.default("PUBLISHED"),
  /** Optional rows from CSV import (merged by code after copy). */
  importRows: z.array(DsrImportRow).max(500).optional(),
});
export type DsrVersionCreate = z.infer<typeof DsrVersionCreate>;

export const DsrItemCreate = z.object({
  versionId: z.string().uuid(),
  code: z.string().min(1).max(40),
  description: z.string().min(1).max(400),
  unit: z.string().min(1).max(20),
  ratePaise: z.number().int().nonnegative(),
});
export type DsrItemCreate = z.infer<typeof DsrItemCreate>;

// --- Estimate ---------------------------------------------------------------
export const EstimateStatus = z.enum(["DRAFT", "APPROVED"]);
export type EstimateStatus = z.infer<typeof EstimateStatus>;

export const EstimateCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  dsrVersionId: z.string().uuid().nullable().optional(),
  leadPct: z.number().min(0).max(100).default(0), // whole-estimate lead
});
export type EstimateCreate = z.infer<typeof EstimateCreate>;

export const EstimateItemCreate = z.object({
  estimateId: z.string().uuid(),
  dsrItemId: z.string().uuid().nullable().optional(),
  description: z.string().min(1).max(400),
  unit: z.string().min(1).max(20),
  qty: z.number().nonnegative(),
  ratePaise: z.number().int().nonnegative(),
  itemLeadPct: z.number().min(0).max(100).default(0), // per-item lead
});
export type EstimateItemCreate = z.infer<typeof EstimateItemCreate>;

export const EstimateItemUpdate = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(400).optional(),
  unit: z.string().min(1).max(20).optional(),
  qty: z.number().nonnegative().optional(),
  ratePaise: z.number().int().nonnegative().optional(),
  itemLeadPct: z.number().min(0).max(100).optional(),
});
export type EstimateItemUpdate = z.infer<typeof EstimateItemUpdate>;

export const EstimateBulkImportRow = z.object({
  description: z.string().min(1).max(400),
  unit: z.string().min(1).max(20),
  qty: z.number().nonnegative(),
  ratePaise: z.number().int().nonnegative(),
  itemLeadPct: z.number().min(0).max(100).default(0),
  dsrItemId: z.string().uuid().nullable().optional(),
});
export type EstimateBulkImportRow = z.infer<typeof EstimateBulkImportRow>;

export const EstimateBulkImport = z.object({
  estimateId: z.string().uuid(),
  rows: z.array(EstimateBulkImportRow).min(1).max(500),
});
export type EstimateBulkImport = z.infer<typeof EstimateBulkImport>;

export const BbsImportRow = z.object({
  barMark: z.string().min(1).max(40),
  member: z.string().max(80).optional(),
  diaMm: z.number().int().positive(),
  noOfMembers: z.number().int().positive().default(1),
  barsPerMember: z.number().int().positive().default(1),
  cuttingLengthMm: z.number().positive(),
});
export type BbsImportRow = z.infer<typeof BbsImportRow>;

export const BbsBulkImport = z.object({
  bbsId: z.string().uuid(),
  rows: z.array(BbsImportRow).min(1).max(500),
});
export type BbsBulkImport = z.infer<typeof BbsBulkImport>;

/** Line amount in paise = qty × rate × (1 + item lead%). */
export function estimateItemAmount(qty: number, ratePaise: number, itemLeadPct: number): number {
  return Math.round(qty * ratePaise * (1 + itemLeadPct / 100));
}

/** Estimate totals: subtotal of line amounts, then the whole-estimate lead. */
export function estimateTotals(
  items: { qty: number; ratePaise: number; itemLeadPct: number }[],
  leadPct: number,
): { subtotalPaise: number; totalPaise: number } {
  const subtotalPaise = items.reduce(
    (s, i) => s + estimateItemAmount(i.qty, i.ratePaise, i.itemLeadPct),
    0,
  );
  return { subtotalPaise, totalPaise: Math.round(subtotalPaise * (1 + leadPct / 100)) };
}

// --- Bar Bending Schedule ---------------------------------------------------
export const BbsCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
});
export type BbsCreate = z.infer<typeof BbsCreate>;

/** Common BBS dia in mm. */
export const BAR_DIAS = [6, 8, 10, 12, 16, 20, 25, 32] as const;

export const BbsItemCreate = z.object({
  bbsId: z.string().uuid(),
  barMark: z.string().min(1).max(40),
  member: z.string().max(80).optional(),
  diaMm: z.number().int().positive(),
  noOfMembers: z.number().int().positive().default(1),
  barsPerMember: z.number().int().positive().default(1),
  cuttingLengthMm: z.number().positive(),
});
export type BbsItemCreate = z.infer<typeof BbsItemCreate>;

/** Unit weight of a round bar, kg/m = d²/162 (d in mm). */
export function barWeightPerM(diaMm: number): number {
  return (diaMm * diaMm) / 162;
}

/** Total bars, total length (m) and steel weight (kg) for a BBS line. */
export function bbsItemTotals(input: {
  diaMm: number;
  noOfMembers: number;
  barsPerMember: number;
  cuttingLengthMm: number;
}): { totalBars: number; totalLengthM: number; weightKg: number } {
  const totalBars = input.noOfMembers * input.barsPerMember;
  const totalLengthM = (totalBars * input.cuttingLengthMm) / 1000;
  const weightKg = totalLengthM * barWeightPerM(input.diaMm);
  return {
    totalBars,
    totalLengthM: Number(totalLengthM.toFixed(3)),
    weightKg: Number(weightKg.toFixed(2)),
  };
}
