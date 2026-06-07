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

// --- Editable firm profile (Phase 8) ---------------------------------------
import { z } from "zod";
import { GstSystem } from "./gst.js";

/** Solo practitioner or a partnership. */
export const FirmType = z.enum(["SOLO", "PARTNERSHIP"]);
export type FirmType = z.infer<typeof FirmType>;

/** Firm GST registration type — selects the invoice GST behaviour (ADR-12). */
export const GstType = z.nativeEnum(GstSystem);
export type GstType = z.infer<typeof GstType>;

export const PhoneType = z.enum(["MOBILE", "OFFICE", "HOME", "FAX"]);
export type PhoneType = z.infer<typeof PhoneType>;

const phone = z.string().max(40).optional().or(z.literal(""));

/** Company-level profile (single firm). Solo architect details live here too. */
export const FirmUpdate = z.object({
  companyName: z.string().min(1).max(200),
  firmType: FirmType,
  gstType: GstType,
  gstin: z.string().max(20).optional().or(z.literal("")),
  // Solo architect (also the primary signatory for a partnership cover block).
  architectName: z.string().max(200).optional().or(z.literal("")),
  coaRegNo: z.string().max(40).optional().or(z.literal("")),
  pan: z.string().max(15).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone1Type: PhoneType.optional(),
  phone1: phone,
  phone2Type: PhoneType.optional(),
  phone2: phone,
  addressLine1: z.string().max(200).optional().or(z.literal("")),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  pincode: z.string().max(10).optional().or(z.literal("")),
  district: z.string().max(80).optional().or(z.literal("")),
  state: z.string().max(80).optional().or(z.literal("")),
});
export type FirmUpdate = z.infer<typeof FirmUpdate>;

/** One partner in a partnership firm (includes DIN). */
export const PartnerInput = z.object({
  name: z.string().min(1).max(200),
  coaRegNo: z.string().max(40).optional().or(z.literal("")),
  pan: z.string().max(15).optional().or(z.literal("")),
  din: z.string().max(21).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone1Type: PhoneType.optional(),
  phone1: phone,
  phone2Type: PhoneType.optional(),
  phone2: phone,
  addressLine1: z.string().max(200).optional().or(z.literal("")),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  pincode: z.string().max(10).optional().or(z.literal("")),
  district: z.string().max(80).optional().or(z.literal("")),
  state: z.string().max(80).optional().or(z.literal("")),
});
export type PartnerInput = z.infer<typeof PartnerInput>;

export const PartnerCreate = PartnerInput;
export const PartnerUpdate = PartnerInput.extend({ id: z.string().uuid() });
export type PartnerUpdate = z.infer<typeof PartnerUpdate>;
