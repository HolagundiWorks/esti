/**
 * Single-firm profile (HCW). ESTI is a single-firm AORMS — this is fixed config,
 * not a per-tenant record. It appears on every issued document; the COA
 * registration number is the firm's mandatory Legal ID. Edit here to rebrand.
 */
export interface FirmProfile {
  legalName: string;
  tradeName: string;
  coaRegNo: string;
  gstin: string;
  pan: string;
  state: string;
  addressLines: string[];
  email: string;
  phone: string;
}

export const FIRM_PROFILE: FirmProfile = {
  legalName: "Holagundi Consulting Works",
  tradeName: "HCW",
  coaRegNo: "CA/0000/2026",
  gstin: "29AAAAA0000A1Z5",
  pan: "AAAAA0000A",
  state: "Karnataka",
  addressLines: ["Bengaluru, Karnataka 560001"],
  email: "studio@hcw.in",
  phone: "+91 80 0000 0000",
};
