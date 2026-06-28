// Rate Book (DSR) + Rate Analysis reference contracts. Estimation/BOQ/BBS were
// removed (Estimation OS teardown); these reference-data schemas remain for the
// Knowledge Bank and a future estimation rebuild.
import { z } from "zod";
import {
  DsrImportRow,
  parseDsrCsvText,
  type DsrImportCsv,
} from "@hcw/master-dsr-kit/schemas";
export { DsrImportRow, parseDsrCsvText, type DsrImportCsv };

// --- Rate Book --------------------------------------------------------------
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

// --- Rate Analysis (Phase 6) ------------------------------------------------

export const RateComponentCategory = z.enum(["MATERIAL", "LABOUR", "MACHINERY", "SUNDRY"]);
export type RateComponentCategory = z.infer<typeof RateComponentCategory>;
export const RATE_COMPONENT_CATEGORY_LABEL: Record<RateComponentCategory, string> = {
  MATERIAL: "Material",
  LABOUR: "Labour",
  MACHINERY: "Machinery",
  SUNDRY: "Sundry",
};

export const RateAnalysisStatus = z.enum(["DRAFT", "PUBLISHED"]);
export type RateAnalysisStatus = z.infer<typeof RateAnalysisStatus>;

export const RateComponentInput = z.object({
  category: RateComponentCategory.default("MATERIAL"),
  description: z.string().min(1).max(400),
  unit: z.string().min(1).max(20),
  qty: z.number().positive(),
  ratePaise: z.number().int().nonnegative(),
  sortOrder: z.number().int().default(0),
});
export type RateComponentInput = z.infer<typeof RateComponentInput>;

export const RateAnalysisCreate = z.object({
  code: z.string().min(1).max(40),
  description: z.string().min(1).max(400),
  unit: z.string().min(1).max(20),
  dsrVersionId: z.string().uuid().nullable().optional(),
  overheadPct: z.number().min(0).max(100).default(0),
  components: z.array(RateComponentInput).optional(),
});
export type RateAnalysisCreate = z.infer<typeof RateAnalysisCreate>;

export const RateComponentCreate = RateComponentInput.extend({
  rateAnalysisId: z.string().uuid(),
});
export type RateComponentCreate = z.infer<typeof RateComponentCreate>;

export const RateComponentUpdate = z.object({
  id: z.string().uuid(),
  category: RateComponentCategory.optional(),
  description: z.string().min(1).max(400).optional(),
  unit: z.string().min(1).max(20).optional(),
  qty: z.number().positive().optional(),
  ratePaise: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
});
export type RateComponentUpdate = z.infer<typeof RateComponentUpdate>;

/** Component amount in paise = qty Ã— ratePaise. */
export function rateComponentAmount(qty: number, ratePaise: number): number {
  return Math.round(qty * ratePaise);
}

/** Analysed rate = direct cost Ã— (1 + overheadPct / 100). */
export function analysedRate(directCostPaise: number, overheadPct: number): number {
  return Math.round(directCostPaise * (1 + overheadPct / 100));
}

