import { z } from "zod";

/** Standard measurement UOM for Indian abstract sheets. */
export const MeasurementUom = z.enum(["SQM", "CUM", "RMT", "NOS", "KG", "LTR"]);
export type MeasurementUom = z.infer<typeof MeasurementUom>;

export const MEASUREMENT_UOM_LABEL: Record<MeasurementUom, string> = {
  SQM: "sqm",
  CUM: "cum",
  RMT: "rmt",
  NOS: "nos",
  KG: "kg",
  LTR: "ltr",
};

/** Which dimensions the estimator fills for this library item. */
export const MeasureKind = z.enum(["L", "LB", "LBH", "COUNT"]);
export type MeasureKind = z.infer<typeof MeasureKind>;

/** Plan markup kinds that can spawn this item (Phase 2). */
export const PlanMarkerKind = z.enum([
  "WALL",
  "DOOR",
  "WINDOW",
  "COLUMN",
  "HEIGHT",
  "SECTION",
  "POLYLINE",
  "COUNT",
]);
export type PlanMarkerKind = z.infer<typeof PlanMarkerKind>;

export const HeightFrom = z.enum(["STOREY", "LEVEL", "COLUMN", "WALL", "MANUAL"]);
export type HeightFrom = z.infer<typeof HeightFrom>;

export const ItemLibraryVersionStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export type ItemLibraryVersionStatus = z.infer<typeof ItemLibraryVersionStatus>;

export const ItemLibraryItem = z.object({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
  code: z.string(),
  chapter: z.string(),
  particulars: z.string(),
  uom: MeasurementUom,
  measureKind: MeasureKind,
  markerKinds: z.array(PlanMarkerKind),
  defaultBreadthMm: z.number().int().nullable(),
  defaultHeightFrom: HeightFrom,
  specCatalogItemId: z.string().uuid().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ItemLibraryItem = z.infer<typeof ItemLibraryItem>;

export const ItemLibraryVersion = z.object({
  id: z.string().uuid(),
  label: z.string(),
  status: ItemLibraryVersionStatus,
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ItemLibraryVersion = z.infer<typeof ItemLibraryVersion>;

export const CreateItemLibraryVersionInput = z.object({
  label: z.string().min(1).max(120),
});
export type CreateItemLibraryVersionInput = z.infer<typeof CreateItemLibraryVersionInput>;

export const UpsertItemLibraryItemInput = z.object({
  versionId: z.string().uuid(),
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(32),
  chapter: z.string().min(1).max(120),
  particulars: z.string().min(1).max(2000),
  uom: MeasurementUom,
  measureKind: MeasureKind,
  markerKinds: z.array(PlanMarkerKind).default([]),
  defaultBreadthMm: z.number().int().nonnegative().nullable().optional(),
  defaultHeightFrom: HeightFrom.default("MANUAL"),
  specCatalogItemId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpsertItemLibraryItemInput = z.infer<typeof UpsertItemLibraryItemInput>;
