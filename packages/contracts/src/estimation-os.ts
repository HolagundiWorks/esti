import { z } from "zod";

// Estimation OS contracts. See docs/esti/ESTIMATION-OS.md. Money is integer paise.

export const EstimateStatus = z.enum(["DRAFT", "FINALIZED"]);
export type EstimateStatus = z.infer<typeof EstimateStatus>;

export const EstimateCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(160),
});
export type EstimateCreate = z.infer<typeof EstimateCreate>;

export const EstimateRename = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(160),
});
export type EstimateRename = z.infer<typeof EstimateRename>;

export const EstimateSetStatus = z.object({
  id: z.string().uuid(),
  status: EstimateStatus,
});
export type EstimateSetStatus = z.infer<typeof EstimateSetStatus>;

export const EstimateByProjectInput = z.object({ projectId: z.string().uuid() });
export type EstimateByProjectInput = z.infer<typeof EstimateByProjectInput>;

export const EstimateIdInput = z.object({ id: z.string().uuid() });
export type EstimateIdInput = z.infer<typeof EstimateIdInput>;

/** Add a line. If specificationId is given, the backend snapshots its
 *  description / unit / rate; an explicit ratePaise overrides the snapshot. */
export const EstimateLineAdd = z.object({
  estimateId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  specificationId: z.string().uuid().optional(),
  description: z.string().max(300).optional(),
  unit: z.string().max(40).optional(),
  quantity: z.number().min(0).default(0),
  ratePaise: z.number().int().min(0).optional(),
});
export type EstimateLineAdd = z.infer<typeof EstimateLineAdd>;

export const EstimateLineUpdate = z.object({
  id: z.string().uuid(),
  description: z.string().max(300).optional(),
  unit: z.string().max(40).nullable().optional(),
  quantity: z.number().min(0).optional(),
  ratePaise: z.number().int().min(0).optional(),
});
export type EstimateLineUpdate = z.infer<typeof EstimateLineUpdate>;

/** Deterministic line amount in paise — quantity × rate, rounded to the paisa. */
export function computeLineAmount(quantity: number, ratePaise: number): number {
  return Math.round(quantity * ratePaise);
}

/** Sum of line amounts (paise). */
export function estimateTotalPaise(lines: { amountPaise: number }[]): number {
  return lines.reduce((sum, l) => sum + l.amountPaise, 0);
}
