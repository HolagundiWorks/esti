/**
 * GST place of supply for an architecture practice.
 *
 * Services supplied *directly in relation to immovable property* — which is
 * what architectural and design work on a site is — take their place of supply
 * from where the property is situated, under IGST Act s.12(3)(a). It is NOT the
 * recipient's registered address, which is the general s.12(2) rule and the
 * intuitive-but-wrong answer.
 *
 * That distinction decides the tax heads: place of supply in the firm's own
 * state means CGST + SGST, anywhere else means IGST. Get it wrong and the
 * amount can still look right while the heads and the GSTR-1 filing are wrong,
 * with s.77 CGST / s.19 IGST then requiring the correct tax to be paid afresh
 * and the wrong one reclaimed.
 *
 * Not every engagement is property-related (a competition entry, general
 * advisory), so this derives a default and the caller may override it — see
 * `placeOfSupplyMismatch`.
 */

/** GST state codes — the first two digits of a GSTIN. */
export const GST_STATE_CODES: Record<string, string> = {
  "Jammu and Kashmir": "01",
  "Himachal Pradesh": "02",
  Punjab: "03",
  Chandigarh: "04",
  Uttarakhand: "05",
  Haryana: "06",
  Delhi: "07",
  Rajasthan: "08",
  "Uttar Pradesh": "09",
  Bihar: "10",
  Sikkim: "11",
  "Arunachal Pradesh": "12",
  Nagaland: "13",
  Manipur: "14",
  Mizoram: "15",
  Tripura: "16",
  Meghalaya: "17",
  Assam: "18",
  "West Bengal": "19",
  Jharkhand: "20",
  Odisha: "21",
  Chhattisgarh: "22",
  "Madhya Pradesh": "23",
  Gujarat: "24",
  "Dadra and Nagar Haveli and Daman and Diu": "26",
  Maharashtra: "27",
  Karnataka: "29",
  Goa: "30",
  Lakshadweep: "31",
  Kerala: "32",
  "Tamil Nadu": "33",
  Puducherry: "34",
  "Andaman and Nicobar Islands": "35",
  Telangana: "36",
  "Andhra Pradesh": "37",
  Ladakh: "38",
};

const CODE_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(GST_STATE_CODES).map(([name, code]) => [code, name]),
);

function normalise(state: string | null | undefined): string | null {
  const s = state?.trim();
  return s ? s : null;
}

/** GST state code for a state name, or null if unrecognised. */
export function gstStateCode(state: string | null | undefined): string | null {
  const s = normalise(state);
  if (!s) return null;
  if (GST_STATE_CODES[s]) return GST_STATE_CODES[s]!;
  const hit = Object.keys(GST_STATE_CODES).find((k) => k.toLowerCase() === s.toLowerCase());
  return hit ? GST_STATE_CODES[hit]! : null;
}

/** State encoded in a GSTIN's first two digits, or null if unparseable. */
export function stateFromGstin(gstin: string | null | undefined): string | null {
  const g = gstin?.trim();
  if (!g || g.length < 2) return null;
  return CODE_TO_STATE[g.slice(0, 2)] ?? null;
}

export type PlaceOfSupply = {
  /** State name, or null when nothing reliable was available. */
  state: string | null;
  /** True when the place of supply is outside the firm's state → IGST. */
  interState: boolean;
  /** Which input decided it, for the audit trail and the UI explanation. */
  basis: "SITE" | "CLIENT" | "UNKNOWN";
};

/**
 * Derive the place of supply.
 *
 * Site state wins (s.12(3)(a)). Client state is a fallback only when the
 * project has no state recorded — it is the wrong rule for property-related
 * work, so the basis is returned and the caller should surface it.
 */
export function derivePlaceOfSupply(input: {
  firmState?: string | null;
  firmGstin?: string | null;
  projectState?: string | null;
  clientState?: string | null;
  clientGstin?: string | null;
}): PlaceOfSupply {
  const firm = normalise(input.firmState) ?? stateFromGstin(input.firmGstin);
  const site = normalise(input.projectState);
  const client = normalise(input.clientState) ?? stateFromGstin(input.clientGstin);

  const state = site ?? client ?? null;
  const basis: PlaceOfSupply["basis"] = site ? "SITE" : client ? "CLIENT" : "UNKNOWN";
  if (!state || !firm) return { state, interState: false, basis: state ? basis : "UNKNOWN" };

  const a = gstStateCode(firm);
  const b = gstStateCode(state);
  // Compare by GST code when both resolve, else fall back to a name match so an
  // unlisted state still behaves sensibly.
  const interState = a && b ? a !== b : firm.toLowerCase() !== state.toLowerCase();
  return { state, interState, basis };
}

/**
 * A warning when the operator's chosen tax treatment disagrees with the
 * derived one, else null. Deliberately advisory: the override is legitimate for
 * work not tied to immovable property.
 */
export function placeOfSupplyMismatch(
  derived: PlaceOfSupply,
  chosenInterState: boolean,
): string | null {
  if (derived.basis === "UNKNOWN" || derived.interState === chosenInterState) return null;
  const where = derived.basis === "SITE" ? "the project site" : "the client";
  return derived.interState
    ? `${derived.state} (${where}) is outside your state, so this would normally be IGST. You have selected CGST + SGST.`
    : `${derived.state} (${where}) is in your state, so this would normally be CGST + SGST. You have selected IGST.`;
}
