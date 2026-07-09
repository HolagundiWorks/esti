import { z } from "zod";

/** Versioned specification catalogue (project spec sheet shape). */
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
});
export type SpecCatalogItemCreate = z.infer<typeof SpecCatalogItemCreate>;
