import { z } from "zod";

/**
 * Contractor register (roadmap Phase 7). Construction contractors the office
 * invites to tenders and tracks on site — distinct from design consultants.
 * Each carries a trade category, statutory ids (GST/PAN) and a simple
 * performance record (quality / timeliness / safety, 1–5).
 */
export const CONTRACTOR_CATEGORIES = {
  CIVIL: "Civil / RCC",
  STRUCTURAL_STEEL: "Structural steel",
  MEP: "MEP",
  ELECTRICAL: "Electrical",
  PLUMBING: "Plumbing",
  HVAC: "HVAC",
  INTERIOR: "Interior / fit-out",
  FACADE: "Facade / glazing",
  WATERPROOFING: "Waterproofing",
  FLOORING: "Flooring",
  PAINTING: "Painting",
  LANDSCAPE: "Landscape",
  GENERAL: "General contractor",
  OTHER: "Other",
} as const;
export type ContractorCategoryCode = keyof typeof CONTRACTOR_CATEGORIES;
export const ContractorCategory = z.enum(
  Object.keys(CONTRACTOR_CATEGORIES) as [ContractorCategoryCode, ...ContractorCategoryCode[]],
);
export type ContractorCategory = z.infer<typeof ContractorCategory>;

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

export const ContractorCreate = z.object({
  name: z.string().trim().min(1).max(200),
  category: ContractorCategory,
  companyName: z.string().trim().max(200).optional(),
  contactPerson: z.string().trim().max(120).optional(),
  gstin,
  pan,
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
});
export type ContractorCreate = z.infer<typeof ContractorCreate>;

export const ContractorUpdate = ContractorCreate.partial().extend({
  id: z.string().uuid(),
  active: z.boolean().optional(),
});
export type ContractorUpdate = z.infer<typeof ContractorUpdate>;

const rating = z.number().int().min(1).max(5);
export const ContractorRating = z.object({
  id: z.string().uuid(),
  qualityRating: rating.optional(),
  timelinessRating: rating.optional(),
  safetyRating: rating.optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type ContractorRating = z.infer<typeof ContractorRating>;

/** Average of the three ratings present (0 if none), rounded to 1 decimal. */
export function contractorScore(c: {
  qualityRating?: number | null;
  timelinessRating?: number | null;
  safetyRating?: number | null;
}): number {
  const vals = [c.qualityRating, c.timelinessRating, c.safetyRating].filter(
    (v): v is number => typeof v === "number" && v > 0,
  );
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
