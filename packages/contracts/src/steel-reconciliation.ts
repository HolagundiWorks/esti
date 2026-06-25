import { z } from "zod";

/**
 * Construction Cost OS Phase E — steel reconciliation.
 *
 * A Bar Bending Schedule (BBS) is linked into the cost spine (work package / BOQ
 * line / drawing) and rolls up by diameter and floor. A steel reconciliation then
 * compares, per diameter, the steel SCHEDULED (auto-seeded from the linked BBS),
 * the steel ISSUED (store → site) and the steel CONSUMED (measured / placed). The
 * gap `issued − consumed` is wastage; a small cutting/lap wastage is normal, more
 * needs explaining. All quantities are kilograms (the BBS already computes weight
 * via the d²/162 unit weight); these helpers are pure for unit testing.
 */

// --- Enums ------------------------------------------------------------------

export const SteelReconStatus = z.enum(["DRAFT", "FINALIZED"]);
export type SteelReconStatus = z.infer<typeof SteelReconStatus>;
export const STEEL_RECON_STATUS_LABEL: Record<SteelReconStatus, string> = {
  DRAFT: "Draft",
  FINALIZED: "Finalized",
};

export const SteelWastageSeverity = z.enum(["WITHIN_LIMIT", "WARNING", "EXCEEDED"]);
export type SteelWastageSeverity = z.infer<typeof SteelWastageSeverity>;
export const STEEL_WASTAGE_SEVERITY_LABEL: Record<SteelWastageSeverity, string> = {
  WITHIN_LIMIT: "Within limit",
  WARNING: "Watch",
  EXCEEDED: "Over limit",
};

// --- Pure helpers -----------------------------------------------------------

function round2(n: number): number {
  return Number(n.toFixed(2));
}

export interface BbsSummaryItemLike {
  diaMm: number;
  weightKg?: number | null;
  floor?: string | null;
}

/** Steel weight (kg) grouped by bar diameter, ascending by diameter. */
export function bbsDiameterSummary(
  items: BbsSummaryItemLike[],
): { diaMm: number; weightKg: number }[] {
  const byDia = new Map<number, number>();
  for (const it of items) {
    byDia.set(it.diaMm, (byDia.get(it.diaMm) ?? 0) + (it.weightKg ?? 0));
  }
  return [...byDia.entries()]
    .map(([diaMm, weightKg]) => ({ diaMm, weightKg: round2(weightKg) }))
    .sort((a, b) => a.diaMm - b.diaMm);
}

/** Steel weight (kg) grouped by floor label; blank floors fold into "—". */
export function bbsFloorSummary(
  items: BbsSummaryItemLike[],
): { floor: string; weightKg: number }[] {
  const byFloor = new Map<string, number>();
  for (const it of items) {
    const key = it.floor?.trim() ? it.floor.trim() : "—";
    byFloor.set(key, (byFloor.get(key) ?? 0) + (it.weightKg ?? 0));
  }
  return [...byFloor.entries()]
    .map(([floor, weightKg]) => ({ floor, weightKg: round2(weightKg) }))
    .sort((a, b) => a.floor.localeCompare(b.floor));
}

/**
 * Classify wastage % against site allowances. Cutting + lap losses up to ~3 %
 * are routine (warn), and ~5 % is the usual hard ceiling (exceeded). Negative
 * wastage (consumed ≥ issued) is never over-limit.
 */
export function steelWastageSeverity(
  wastagePct: number,
  opts: { warnPct?: number; exceedPct?: number } = {},
): SteelWastageSeverity {
  const warnPct = opts.warnPct ?? 3;
  const exceedPct = opts.exceedPct ?? 5;
  if (wastagePct > exceedPct) return "EXCEEDED";
  if (wastagePct > warnPct) return "WARNING";
  return "WITHIN_LIMIT";
}

/** Per-diameter variance: wastage (issued − consumed) and issued-vs-scheduled. */
export function steelReconLineVariance(input: {
  scheduledKg: number;
  issuedKg: number;
  consumedKg: number;
}): {
  wastageKg: number;
  wastagePct: number;
  issuedVsScheduledKg: number;
  issuedVsScheduledPct: number;
  severity: SteelWastageSeverity;
} {
  const wastageKg = round2(input.issuedKg - input.consumedKg);
  const wastagePct = input.issuedKg > 0 ? round2((wastageKg / input.issuedKg) * 100) : 0;
  const issuedVsScheduledKg = round2(input.issuedKg - input.scheduledKg);
  const issuedVsScheduledPct =
    input.scheduledKg > 0 ? round2((issuedVsScheduledKg / input.scheduledKg) * 100) : 0;
  return {
    wastageKg,
    wastagePct,
    issuedVsScheduledKg,
    issuedVsScheduledPct,
    severity: steelWastageSeverity(wastagePct),
  };
}

/** Σ scheduled / issued / consumed / wastage over a reconciliation's lines. */
export function steelReconTotals(
  lines: { scheduledKg: number; issuedKg: number; consumedKg: number }[],
): { scheduledKg: number; issuedKg: number; consumedKg: number; wastageKg: number } {
  const t = lines.reduce(
    (acc, l) => {
      acc.scheduledKg += l.scheduledKg;
      acc.issuedKg += l.issuedKg;
      acc.consumedKg += l.consumedKg;
      return acc;
    },
    { scheduledKg: 0, issuedKg: 0, consumedKg: 0 },
  );
  return {
    scheduledKg: round2(t.scheduledKg),
    issuedKg: round2(t.issuedKg),
    consumedKg: round2(t.consumedKg),
    wastageKg: round2(t.issuedKg - t.consumedKg),
  };
}

// --- Input schemas ----------------------------------------------------------

/** Link a BBS into the spine. Any field set to null clears that link. */
export const BbsLink = z.object({
  id: z.string().uuid(),
  workPackageId: z.string().uuid().nullable().optional(),
  boqItemId: z.string().uuid().nullable().optional(),
  drawingId: z.string().uuid().nullable().optional(),
});
export type BbsLink = z.infer<typeof BbsLink>;

export const SteelReconCreate = z.object({
  projectId: z.string().uuid(),
  workPackageId: z.string().uuid().nullable().optional(),
  bbsId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
});
export type SteelReconCreate = z.infer<typeof SteelReconCreate>;

export const SteelReconSeedFromBbs = z.object({
  reconciliationId: z.string().uuid(),
  bbsId: z.string().uuid(),
});
export type SteelReconSeedFromBbs = z.infer<typeof SteelReconSeedFromBbs>;

export const SteelReconLineInput = z.object({
  reconciliationId: z.string().uuid(),
  diaMm: z.number().int().positive(),
  scheduledKg: z.number().nonnegative().default(0),
  issuedKg: z.number().nonnegative().default(0),
  consumedKg: z.number().nonnegative().default(0),
});
export type SteelReconLineInput = z.infer<typeof SteelReconLineInput>;

export const SteelReconLineUpdate = z.object({
  id: z.string().uuid(),
  reconciliationId: z.string().uuid(),
  scheduledKg: z.number().nonnegative().optional(),
  issuedKg: z.number().nonnegative().optional(),
  consumedKg: z.number().nonnegative().optional(),
});
export type SteelReconLineUpdate = z.infer<typeof SteelReconLineUpdate>;

export const SteelReconLineRemove = z.object({
  id: z.string().uuid(),
  reconciliationId: z.string().uuid(),
});
export type SteelReconLineRemove = z.infer<typeof SteelReconLineRemove>;

export const SteelReconFinalize = z.object({
  id: z.string().uuid(),
});
export type SteelReconFinalize = z.infer<typeof SteelReconFinalize>;
