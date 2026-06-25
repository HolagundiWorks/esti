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
  // Optional spec → rate-book mapping (the analysed rate item to cost against).
  rateItemId: z.string().uuid().nullable().optional(),
});
export type SpecCatalogItemCreate = z.infer<typeof SpecCatalogItemCreate>;

/** Set or clear the persisted spec → rate-book mapping for a catalogue item. */
export const SpecCatalogItemSetRate = z.object({
  id: z.string().uuid(),
  rateItemId: z.string().uuid().nullable(),
});
export type SpecCatalogItemSetRate = z.infer<typeof SpecCatalogItemSetRate>;
