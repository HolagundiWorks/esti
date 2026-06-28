import { z } from "zod";

// Construction Knowledge Bank OS contracts. See
// docs/esti/CONSTRUCTION-KNOWLEDGE-BANK.md. Money fields are integer paise.

// ── Material library ────────────────────────────────────────────────────────
export const KbMaterialCreate = z.object({
  name: z.string().min(1).max(160),
  unit: z.string().min(1).max(40),
  category: z.string().max(80).optional(),
  wastageFactor: z.number().min(0).max(10).default(0),
  density: z.number().min(0).nullable().optional(),
  defaultRatePaise: z.number().int().min(0).default(0),
  notes: z.string().max(1000).optional(),
});
export type KbMaterialCreate = z.infer<typeof KbMaterialCreate>;

export const KbMaterialUpdate = KbMaterialCreate.partial().extend({
  id: z.string().uuid(),
});
export type KbMaterialUpdate = z.infer<typeof KbMaterialUpdate>;

// ── Labor library ───────────────────────────────────────────────────────────
export const KbLaborCreate = z.object({
  name: z.string().min(1).max(160),
  unit: z.string().min(1).max(40),
  rateType: z.string().max(40).optional(),
  productivityFactor: z.number().min(0).nullable().optional(),
  defaultRatePaise: z.number().int().min(0).default(0),
  notes: z.string().max(1000).optional(),
});
export type KbLaborCreate = z.infer<typeof KbLaborCreate>;

export const KbLaborUpdate = KbLaborCreate.partial().extend({
  id: z.string().uuid(),
});
export type KbLaborUpdate = z.infer<typeof KbLaborUpdate>;

// ── Item library ────────────────────────────────────────────────────────────
export const KbItemCreate = z.object({
  name: z.string().min(1).max(160),
  category: z.string().max(80).optional(),
  unit: z.string().min(1).max(40),
  description: z.string().max(1000).optional(),
});
export type KbItemCreate = z.infer<typeof KbItemCreate>;

export const KbItemUpdate = KbItemCreate.partial().extend({
  id: z.string().uuid(),
});
export type KbItemUpdate = z.infer<typeof KbItemUpdate>;

// ── Specification library (method/mix variants, mapped to an item) ──────────
export const KbSpecificationCreate = z.object({
  itemId: z.string().uuid(),
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  isDefault: z.boolean().default(false),
});
export type KbSpecificationCreate = z.infer<typeof KbSpecificationCreate>;

export const KbSpecificationUpdate = KbSpecificationCreate.partial().extend({
  id: z.string().uuid(),
});
export type KbSpecificationUpdate = z.infer<typeof KbSpecificationUpdate>;

export const KbByItemInput = z.object({ itemId: z.string().uuid() });
export type KbByItemInput = z.infer<typeof KbByItemInput>;

export const KbIdInput = z.object({ id: z.string().uuid() });
export type KbIdInput = z.infer<typeof KbIdInput>;
