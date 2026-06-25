import { z } from "zod";

export const KnowledgeItemStatus = z.enum([
  "DRAFT",
  "REVIEW",
  "PUBLISHED",
  "SUPERSEDED",
]);
export type KnowledgeItemStatus = z.infer<typeof KnowledgeItemStatus>;

export const KNOWLEDGE_STATUS_LABEL: Record<KnowledgeItemStatus, string> = {
  DRAFT: "Draft",
  REVIEW: "Under review",
  PUBLISHED: "Published",
  SUPERSEDED: "Superseded",
};

export const KNOWLEDGE_STATUS_TAG: Record<
  KnowledgeItemStatus,
  "gray" | "blue" | "green" | "red"
> = { DRAFT: "gray", REVIEW: "blue", PUBLISHED: "green", SUPERSEDED: "red" };

export const StructuralElementFamily = z.enum([
  "BEAM",
  "COLUMN",
  "SLAB",
  "FOOTING",
]);
export type StructuralElementFamily = z.infer<typeof StructuralElementFamily>;

export const ReinforcementRole = z.enum([
  "MAIN",
  "DISTRIBUTION",
  "STIRRUP",
  "TIE",
  "ADDITIONAL",
  "DOWEL",
]);
export type ReinforcementRole = z.infer<typeof ReinforcementRole>;

export const ReinforcementArrangement = z
  .object({
    role: ReinforcementRole,
    barMark: z.string().min(1).max(40),
    diaMm: z.number().int().positive(),
    count: z.number().int().positive().optional(),
    spacingMm: z.number().positive().optional(),
    zone: z.string().max(80).optional(),
    shapeCode: z.string().max(20).optional(),
    coverMm: z.number().nonnegative(),
    lapLengthMm: z.number().nonnegative().default(0),
    hookLengthMm: z.number().nonnegative().default(0),
    notes: z.string().max(500).optional(),
  })
  .refine((row) => row.count !== undefined || row.spacingMm !== undefined, {
    message: "Provide a bar count or spacing",
  });
export type ReinforcementArrangement = z.infer<typeof ReinforcementArrangement>;

export const StructuralElementTemplate = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  family: StructuralElementFamily,
  type: z.string().min(1).max(80),
  version: z.string().min(1).max(40),
  description: z.string().max(500).optional(),
  geometry: z.record(z.string(), z.number().nonnegative()),
  reinforcement: z.array(ReinforcementArrangement).min(1),
  sourceCitation: z.string().max(500).optional(),
});
export type StructuralElementTemplate = z.infer<
  typeof StructuralElementTemplate
>;
export const StructuralElementTemplateCreate = StructuralElementTemplate;

export const SpecificationProcurementStandard = z.object({
  code: z.string().min(1).max(40),
  title: z.string().min(1).max(160),
  version: z.string().min(1).max(40),
  projectTags: z.array(z.string().min(1).max(80)),
  approvedAlternatives: z.array(z.string().min(1).max(160)).default([]),
  issueChecks: z.array(z.string().min(1).max(240)).default([]),
  specificationText: z.string().min(1),
  purchaseOrderDescription: z.string().min(1),
  unit: z.string().min(1).max(20),
  dsrItemCode: z.string().max(40).optional(),
  sourceCitation: z.string().max(500).optional(),
});
export type SpecificationProcurementStandard = z.infer<
  typeof SpecificationProcurementStandard
>;
export const SpecificationProcurementStandardCreate =
  SpecificationProcurementStandard;

/** Knowledge Bank: versioned specification catalogue row (project spec sheet shape). */
export const SpecCatalogVersionCreate = z.object({
  label: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
});
export type SpecCatalogVersionCreate = z.infer<typeof SpecCatalogVersionCreate>;

export const SpecCatalogItemCreate = z.object({
  versionId: z.string().uuid(),
  category: z.string().max(120).optional(),
  item: z.string().min(1).max(200),
  make: z.string().max(120).optional(),
  specification: z.string().max(500).optional(),
  finish: z.string().max(120).optional(),
  remarks: z.string().max(300).optional(),
  // Optional spec → rate-book mapping (the DSR/analysed rate item to cost against).
  rateItemId: z.string().uuid().nullable().optional(),
});
export type SpecCatalogItemCreate = z.infer<typeof SpecCatalogItemCreate>;

/** Set or clear the persisted spec → rate-book mapping for a catalogue item. */
export const SpecCatalogItemSetRate = z.object({
  id: z.string().uuid(),
  rateItemId: z.string().uuid().nullable(),
});
export type SpecCatalogItemSetRate = z.infer<typeof SpecCatalogItemSetRate>;
