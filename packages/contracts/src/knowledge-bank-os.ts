import { z } from "zod";
import { MeasurementDerivation } from "./estimate.js";

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

// ── Brand library (manufacturers, independent of the generic material) ──────
export const KbBrandCreate = z.object({
  name: z.string().min(1).max(160),
  category: z.string().max(80).optional(),
  website: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
});
export type KbBrandCreate = z.infer<typeof KbBrandCreate>;

export const KbBrandUpdate = KbBrandCreate.partial().extend({
  id: z.string().uuid(),
});
export type KbBrandUpdate = z.infer<typeof KbBrandUpdate>;

// ── Material → brand mapping ────────────────────────────────────────────────
export const KbByMaterialInput = z.object({ materialId: z.string().uuid() });
export type KbByMaterialInput = z.infer<typeof KbByMaterialInput>;

export const KbMaterialBrandAdd = z.object({
  materialId: z.string().uuid(),
  brandId: z.string().uuid(),
  gradeOrVariant: z.string().max(160).optional(),
  qualityLevel: z.string().max(80).optional(),
  preferred: z.boolean().default(false),
});
export type KbMaterialBrandAdd = z.infer<typeof KbMaterialBrandAdd>;

export const KbMaterialBrandUpdate = z.object({
  id: z.string().uuid(),
  gradeOrVariant: z.string().max(160).nullable().optional(),
  qualityLevel: z.string().max(80).nullable().optional(),
  preferred: z.boolean().optional(),
});
export type KbMaterialBrandUpdate = z.infer<typeof KbMaterialBrandUpdate>;

// ── Specification library (method/mix variants, mapped to an item) ──────────
export const KbSpecificationCreate = z.object({
  itemId: z.string().uuid(),
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  unit: z.string().max(40).optional(),
  ratePaise: z.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
});
export type KbSpecificationCreate = z.infer<typeof KbSpecificationCreate>;

export const KbSpecificationUpdate = KbSpecificationCreate.partial().extend({
  id: z.string().uuid(),
});
export type KbSpecificationUpdate = z.infer<typeof KbSpecificationUpdate>;

export const KbByItemInput = z.object({ itemId: z.string().uuid() });
export type KbByItemInput = z.infer<typeof KbByItemInput>;

// ── Consumption recipes (specification → material / labour) ─────────────────
export const KbBySpecInput = z.object({ specificationId: z.string().uuid() });
export type KbBySpecInput = z.infer<typeof KbBySpecInput>;

export const KbSpecMaterialAdd = z.object({
  specificationId: z.string().uuid(),
  materialId: z.string().uuid(),
  quantityPerUnit: z.number().min(0).default(0),
  wastageFactor: z.number().min(0).max(10).default(0),
});
export type KbSpecMaterialAdd = z.infer<typeof KbSpecMaterialAdd>;

export const KbSpecMaterialUpdate = z.object({
  id: z.string().uuid(),
  quantityPerUnit: z.number().min(0).optional(),
  wastageFactor: z.number().min(0).max(10).optional(),
});
export type KbSpecMaterialUpdate = z.infer<typeof KbSpecMaterialUpdate>;

export const KbSpecLaborAdd = z.object({
  specificationId: z.string().uuid(),
  laborId: z.string().uuid(),
  quantityPerUnit: z.number().min(0).default(0),
});
export type KbSpecLaborAdd = z.infer<typeof KbSpecLaborAdd>;

export const KbSpecLaborUpdate = z.object({
  id: z.string().uuid(),
  quantityPerUnit: z.number().min(0),
});
export type KbSpecLaborUpdate = z.infer<typeof KbSpecLaborUpdate>;

export const KbIdInput = z.object({ id: z.string().uuid() });
export type KbIdInput = z.infer<typeof KbIdInput>;

// ── Item dependencies (KB Phase 5 / CMS-3) ───────────────────────────────────
export const KbDependencyType = z.enum(["MANDATORY", "OPTIONAL", "SEQUENCE"]);
export type KbDependencyType = z.infer<typeof KbDependencyType>;

export const KbItemDependencyCreate = z.object({
  parentItemId: z.string().uuid(),
  childItemId: z.string().uuid(),
  ratio: z.number().min(0).default(1),
  dependencyType: KbDependencyType.default("MANDATORY"),
  /** How the child's measurement is derived from the parent's (default: manual). */
  derivation: MeasurementDerivation.default("MANUAL"),
  notes: z.string().max(500).optional(),
});
export type KbItemDependencyCreate = z.infer<typeof KbItemDependencyCreate>;

export const KbItemDependencyUpdate = z.object({
  id: z.string().uuid(),
  ratio: z.number().min(0).optional(),
  dependencyType: KbDependencyType.optional(),
  derivation: MeasurementDerivation.optional(),
  notes: z.string().max(500).nullish(),
});
export type KbItemDependencyUpdate = z.infer<typeof KbItemDependencyUpdate>;

export const KbByParentItemInput = z.object({ parentItemId: z.string().uuid() });
export type KbByParentItemInput = z.infer<typeof KbByParentItemInput>;

// ── Rate analysis (approach B: a spec's rate is built up from its recipe) ─────
// A specification's applied rate (paise per spec unit) is computed from its
// material + labour consumption recipe rather than typed by hand:
//   material cost = Σ quantityPerUnit × (1 + wastageFactor) × material rate
//   labour  cost = Σ quantityPerUnit × labour rate
// Everything is integer paise per the money convention.

export type SpecMaterialLine = {
  quantityPerUnit: number;
  wastageFactor: number;
  ratePaise: number; // the material's default rate, paise per material unit
};
export type SpecLaborLine = {
  quantityPerUnit: number;
  ratePaise: number; // the labour's default rate, paise per labour unit
};

/** Material cost per spec unit (paise), wastage included. */
export function specMaterialCostPaise(lines: readonly SpecMaterialLine[]): number {
  return Math.round(
    lines.reduce((sum, m) => sum + m.quantityPerUnit * (1 + m.wastageFactor) * m.ratePaise, 0),
  );
}

/** Labour cost per spec unit (paise). */
export function specLaborCostPaise(lines: readonly SpecLaborLine[]): number {
  return Math.round(lines.reduce((sum, l) => sum + l.quantityPerUnit * l.ratePaise, 0));
}

/** Analysed rate per spec unit (paise) = material + labour build-up. */
export function specRatePaise(
  materials: readonly SpecMaterialLine[],
  labor: readonly SpecLaborLine[],
): number {
  return specMaterialCostPaise(materials) + specLaborCostPaise(labor);
}
