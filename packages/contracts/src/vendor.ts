import { z } from "zod";

/**
 * Vendor register — material suppliers the practice sources from (distinct from
 * contractors, who execute work, and consultants, who design). Each carries a
 * material-supply category, statutory ids (GST/PAN) and a simple performance
 * record (quality / reliability / pricing, 1–5). Vendor price records build a
 * historical rate book per vendor / material — the seed for the KB vendor-rate
 * resolution ladder.
 */
export const VENDOR_CATEGORIES = {
  CEMENT: "Cement & binders",
  STEEL: "Steel & reinforcement",
  AGGREGATES: "Aggregates & sand",
  BRICKS_BLOCKS: "Bricks & blocks",
  RMC: "Ready-mix concrete",
  TILES_STONE: "Tiles & stone",
  SANITARY: "Sanitaryware & CP fittings",
  ELECTRICAL: "Electrical supplies",
  PLUMBING: "Plumbing supplies",
  PAINTS: "Paints & finishes",
  WOOD_PLY: "Wood & ply",
  GLASS_ALU: "Glass & aluminium",
  HARDWARE: "Hardware & fasteners",
  WATERPROOFING: "Waterproofing materials",
  GENERAL: "General supplier",
  OTHER: "Other",
} as const;
export type VendorCategoryCode = keyof typeof VENDOR_CATEGORIES;
export const VendorCategory = z.enum(
  Object.keys(VENDOR_CATEGORIES) as [VendorCategoryCode, ...VendorCategoryCode[]],
);
export type VendorCategory = z.infer<typeof VendorCategory>;

const gstin = z
  .string()
  .trim()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/, "Invalid GSTIN")
  .optional()
  .or(z.literal(""));
const pan = z
  .string()
  .trim()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN")
  .optional()
  .or(z.literal(""));

export const VendorCreate = z.object({
  name: z.string().trim().min(1).max(200),
  category: VendorCategory,
  companyName: z.string().trim().max(200).optional(),
  contactPerson: z.string().trim().max(120).optional(),
  gstin,
  pan,
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
});
export type VendorCreate = z.infer<typeof VendorCreate>;

export const VendorUpdate = VendorCreate.partial().extend({
  id: z.string().uuid(),
  active: z.boolean().optional(),
});
export type VendorUpdate = z.infer<typeof VendorUpdate>;

const rating = z.number().int().min(1).max(5);
export const VendorRating = z.object({
  id: z.string().uuid(),
  qualityRating: rating.optional(),
  reliabilityRating: rating.optional(),
  pricingRating: rating.optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type VendorRating = z.infer<typeof VendorRating>;

/** Average of the three ratings present (0 if none), rounded to 1 decimal. */
export function vendorScore(v: {
  qualityRating?: number | null;
  reliabilityRating?: number | null;
  pricingRating?: number | null;
}): number {
  const vals = [v.qualityRating, v.reliabilityRating, v.pricingRating].filter(
    (n): n is number => typeof n === "number" && n > 0,
  );
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

// ── Vendor price records (pricing history) ──────────────────────────────────
export const VendorPriceSource = z.enum(["QUOTE", "INVOICE", "MANUAL"]);
export type VendorPriceSource = z.infer<typeof VendorPriceSource>;

export const VendorPriceCreate = z.object({
  vendorId: z.string().uuid(),
  materialName: z.string().trim().min(1).max(200),
  unit: z.string().trim().min(1).max(40),
  ratePaise: z.number().int().min(0),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  source: VendorPriceSource.default("MANUAL"),
  notes: z.string().trim().max(1000).optional(),
});
export type VendorPriceCreate = z.infer<typeof VendorPriceCreate>;

export const VendorByIdInput = z.object({ id: z.string().uuid() });
export type VendorByIdInput = z.infer<typeof VendorByIdInput>;

export const VendorPricesByVendorInput = z.object({ vendorId: z.string().uuid() });
export type VendorPricesByVendorInput = z.infer<typeof VendorPricesByVendorInput>;

export const VendorPriceHistoryInput = z.object({
  materialName: z.string().trim().min(1).max(200).optional(),
});
export type VendorPriceHistoryInput = z.infer<typeof VendorPriceHistoryInput>;

// ── Vendor quotations (quote document + lines + comparison) ──────────────────
export const VendorQuoteStatus = z.enum(["RECEIVED", "ACCEPTED", "REJECTED"]);
export type VendorQuoteStatus = z.infer<typeof VendorQuoteStatus>;

export const VendorQuoteLineInput = z.object({
  materialName: z.string().trim().min(1).max(200),
  unit: z.string().trim().min(1).max(40),
  ratePaise: z.number().int().min(0),
});
export type VendorQuoteLineInput = z.infer<typeof VendorQuoteLineInput>;

export const VendorQuoteCreate = z.object({
  vendorId: z.string().uuid(),
  ref: z.string().trim().min(1).max(80),
  quoteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().trim().max(1000).optional(),
  lines: z.array(VendorQuoteLineInput).min(1).max(2000),
});
export type VendorQuoteCreate = z.infer<typeof VendorQuoteCreate>;

export const VendorQuotesByVendorInput = z.object({ vendorId: z.string().uuid() });
export type VendorQuotesByVendorInput = z.infer<typeof VendorQuotesByVendorInput>;

export const VendorQuoteCompareInput = z.object({
  materialName: z.string().trim().min(1).max(200).optional(),
});
export type VendorQuoteCompareInput = z.infer<typeof VendorQuoteCompareInput>;

/** One row of the cross-vendor comparison — cheapest first. */
export type VendorQuoteComparisonRow = {
  vendorId: string;
  vendorName: string;
  quoteId: string;
  quoteRef: string;
  quoteDate: string;
  unit: string;
  ratePaise: number;
  isLowest: boolean;
};
