/**
 * India GST profile — hardcoded, non-configurable. See docs/esti/INDIA-PROFILE.md.
 * The firm operates under exactly one GST system at a time.
 */
import { pct, roundToRupee, type Paise } from "./money.js";

export const GstSystem = {
  /** Turnover <= 20L (10L special states); not registered; no GST on invoices. */
  NOT_APPLICABLE: "NOT_APPLICABLE",
  /** Annual billing < 40L; flat 6% of bill (CGST 3% + SGST 3%); no ITC; issues a Bill of Supply. */
  COMPOSITION: "COMPOSITION",
  /** Default registered service practice; 18%; issues a Tax Invoice. */
  REGULAR: "REGULAR",
} as const;
export type GstSystem = (typeof GstSystem)[keyof typeof GstSystem];

export const GST_RATES = {
  COMPOSITION: 6, // CGST 3% + SGST 3%; borne by the firm, not collected from client
  REGULAR: 18, // SAC 998321–998339
} as const;

export const TDS_194J_RATE = 10; // % on professional fees

/** SAC codes for architectural services — all at 18% (Regular). */
export const SAC_CODES = [
  { code: "998321", label: "Architectural advisory / consultancy services" },
  { code: "998322", label: "Architectural services for residential building projects" },
  { code: "998323", label: "Architectural services for non-residential building projects" },
  { code: "998324", label: "Historical restoration architectural services" },
  { code: "998325", label: "Urban planning services" },
  { code: "998327", label: "Project site master planning services" },
  { code: "998328", label: "Landscape architectural services and advisory" },
  { code: "998339", label: "Project management services for construction projects" },
] as const;
export type SacCode = (typeof SAC_CODES)[number]["code"];
export const DEFAULT_SAC_RESIDENTIAL: SacCode = "998322";
export const DEFAULT_SAC_NON_RESIDENTIAL: SacCode = "998323";

export type DocumentKind = "TAX_INVOICE" | "BILL_OF_SUPPLY" | "INVOICE";

export interface GstBreakup {
  system: GstSystem;
  documentKind: DocumentKind;
  taxable: Paise;
  cgst: Paise;
  sgst: Paise;
  igst: Paise;
  gstTotal: Paise;
  /** For composition: tax the firm pays (not added to the invoice total). */
  compositionLevy: Paise;
  grandTotal: Paise;
}

/**
 * Compute GST for a taxable value under the firm's active system.
 * @param interState true if client state differs from the firm's GSTIN state.
 */
export function computeGst(
  system: GstSystem,
  taxable: Paise,
  interState: boolean,
): GstBreakup {
  if (system === GstSystem.NOT_APPLICABLE) {
    return zero(system, "INVOICE", taxable);
  }
  if (system === GstSystem.COMPOSITION) {
    const levy = roundToRupee(pct(taxable, GST_RATES.COMPOSITION));
    return { ...zero(system, "BILL_OF_SUPPLY", taxable), compositionLevy: levy };
  }
  // REGULAR
  const total = roundToRupee(pct(taxable, GST_RATES.REGULAR));
  const igst = interState ? total : 0;
  const cgst = interState ? 0 : Math.round(total / 2);
  const sgst = interState ? 0 : total - cgst;
  return {
    system,
    documentKind: "TAX_INVOICE",
    taxable,
    cgst,
    sgst,
    igst,
    gstTotal: total,
    compositionLevy: 0,
    grandTotal: taxable + total,
  };
}

export function computeTds194j(taxable: Paise): Paise {
  return roundToRupee(pct(taxable, TDS_194J_RATE));
}

function zero(system: GstSystem, documentKind: DocumentKind, taxable: Paise): GstBreakup {
  return {
    system,
    documentKind,
    taxable,
    cgst: 0,
    sgst: 0,
    igst: 0,
    gstTotal: 0,
    compositionLevy: 0,
    grandTotal: taxable,
  };
}
