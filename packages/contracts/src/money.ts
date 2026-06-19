/**
 * Money is stored and computed as an integer number of **paise** (1 rupee = 100
 * paise). Never use floating point for money. See ARCHITECTURE ADR-05.
 */
export type Paise = number;

/** Round a rupee amount (in paise) to the nearest whole rupee, half-up. */
export function roundToRupee(paise: Paise): Paise {
  const rupees = Math.floor(paise / 100);
  const rem = paise - rupees * 100;
  return (rem >= 50 ? rupees + 1 : rupees) * 100;
}

/** Apply a percentage (e.g. 18 for 18%) to a paise amount, rounded to paise. */
export function pct(paise: Paise, percent: number): Paise {
  return Math.round((paise * percent) / 100);
}

/** Group an integer string in the Indian system: 12,34,567. */
function groupIndian(intStr: string): string {
  if (intStr.length <= 3) return intStr;
  const last3 = intStr.slice(-3);
  const rest = intStr.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

/** Format paise as ₹ with Indian grouping, e.g. ₹1,23,45,678.50 */
export function formatINR(paise: Paise, opts: { paise?: boolean } = {}): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const p = abs - rupees * 100;
  const main = "₹" + sign + groupIndian(String(rupees));
  return opts.paise === false ? main : `${main}.${String(p).padStart(2, "0")}`;
}

/** Short Indian form: ₹1.23 Cr / ₹45.60 L / ₹12.3k / ₹999. */
export function formatINRShort(paise: Paise): string {
  const rupees = paise / 100;
  const abs = Math.abs(rupees);
  if (abs >= 1e7) return `₹${(rupees / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(rupees / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) {
    const k = rupees / 1e3;
    return `₹${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return formatINR(paise, { paise: false });
}

/** Parse a rupee string ("1,23,456.50") into paise. */
export function parseINR(input: string): Paise {
  const cleaned = input.replace(/[₹,\s]/g, "");
  const value = Number.parseFloat(cleaned || "0");
  if (Number.isNaN(value)) throw new Error(`Invalid amount: ${input}`);
  return Math.round(value * 100);
}

/** Parse form input into paise; empty or invalid input → 0 (no throw). */
export function parseRupeeInput(input: string): Paise {
  const cleaned = String(input ?? "").replace(/[₹,\s]/g, "");
  if (!cleaned) return 0;
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}
