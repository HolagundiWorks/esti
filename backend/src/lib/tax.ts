/**
 * Server-side GST/TDS computation. The firm's active system is fixed config
 * (single firm) — read it from settings; defaults to REGULAR here.
 * Pure rate logic lives in @esti/contracts so the SPA shows the same numbers.
 */
import { computeGst, computeTds194j, GstSystem, type GstBreakup, type Paise } from "@esti/contracts";

// TODO: load from firm settings row; single firm so this is effectively constant.
export const ACTIVE_GST_SYSTEM: GstSystem = GstSystem.REGULAR;

export function invoiceTax(taxable: Paise, interState: boolean): GstBreakup {
  return computeGst(ACTIVE_GST_SYSTEM, taxable, interState);
}

export function tds(taxable: Paise): Paise {
  return computeTds194j(taxable);
}
