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

/**
 * s.194J(B) second proviso: no deduction where the aggregate of professional
 * fees credited or paid to the payee in the financial year does not exceed
 * ₹30,000. The threshold is per payer per FY, on the fee value — GST charged
 * separately is excluded (CBDT Circular 23/2017).
 */
export const TDS_194J_THRESHOLD_PAISE = 30_000_00;

/**
 * Whether TDS applies to a new invoice, given what this client has already
 * been billed this financial year.
 *
 * Once the aggregate crosses the threshold, s.194J bites on the whole amount
 * — including the earlier invoices that were under it — so the caller is told
 * both that it applies and how much backlog is now catchable.
 */
export function tds194jApplies(input: {
  /** Fee value (excluding GST) already invoiced to this client this FY. */
  priorTaxablePaise: Paise;
  /** Fee value (excluding GST) of the invoice being raised. */
  taxablePaise: Paise;
}): { applies: boolean; aggregatePaise: Paise; crossesNow: boolean } {
  const aggregate = input.priorTaxablePaise + input.taxablePaise;
  const applies = aggregate > TDS_194J_THRESHOLD_PAISE;
  return {
    applies,
    aggregatePaise: aggregate,
    crossesNow: applies && input.priorTaxablePaise <= TDS_194J_THRESHOLD_PAISE,
  };
}

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
 *
 * @param interState place of supply is outside the firm's state, so IGST
 *   applies instead of CGST+SGST. For architectural services on immovable
 *   property this follows the SITE's state under IGST Act s.12(3)(a), not the
 *   client's registered address — see `placeOfSupplyState` in the invoice
 *   module, which derives it.
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

  /**
   * CGST s.170 rounds a tax amount to the nearest rupee, and GSTR-1 carries
   * CGST and SGST as separate amounts — so each head is rounded in its own
   * right rather than halving a rounded total. Halving produced half-rupee
   * heads that are not lawful tax amounts: ₹5,616 taxable printed
   * "CGST @ 9% ₹505.50", and the two heads summed to ₹1 more than computing
   * them separately. gstTotal stays the sum of the heads actually charged.
   */
  if (interState) {
    const igst = roundToRupee(pct(taxable, GST_RATES.REGULAR));
    return {
      system,
      documentKind: "TAX_INVOICE",
      taxable,
      cgst: 0,
      sgst: 0,
      igst,
      gstTotal: igst,
      compositionLevy: 0,
      grandTotal: taxable + igst,
    };
  }
  const half = GST_RATES.REGULAR / 2;
  const cgst = roundToRupee(pct(taxable, half));
  const sgst = roundToRupee(pct(taxable, half));
  const total = cgst + sgst;
  return {
    system,
    documentKind: "TAX_INVOICE",
    taxable,
    cgst,
    sgst,
    igst: 0,
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
