import { z } from "zod";

// Cost Management System contracts. See docs/esti/COST-MANAGEMENT-SYSTEM.md.
// Money is integer paise; length dimensions are entered in millimetres.

export const CmsMeasurementType = z.enum(["VOLUME", "AREA", "LENGTH", "COUNT"]);
export type CmsMeasurementType = z.infer<typeof CmsMeasurementType>;

export const CmsLocationKind = z.enum([
  "ZONE",
  "BUILDING",
  "FLOOR",
  "ROOM",
  "SECTION",
]);
export type CmsLocationKind = z.infer<typeof CmsLocationKind>;

export const CmsDimensions = z.object({
  length: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  thickness: z.number().min(0).optional(),
  nos: z.number().min(0).optional(),
});
export type CmsDimensions = z.infer<typeof CmsDimensions>;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Element base quantity from dimensions (length dims in mm) → the spec unit.
 *  VOLUME = L×H×T (mm³→m³) · AREA = L×H (mm²→m²) · LENGTH = L (mm→m) · COUNT = nos. */
export function computeQuantity(
  type: CmsMeasurementType,
  dims: CmsDimensions,
): number {
  const L = dims.length ?? 0;
  const H = dims.height ?? 0;
  const T = dims.thickness ?? 0;
  const N = dims.nos ?? 0;
  switch (type) {
    case "VOLUME":
      return round4((L * H * T) / 1e9);
    case "AREA":
      return round4((L * H) / 1e6);
    case "LENGTH":
      return round4(L / 1000);
    case "COUNT":
      return round4(N);
  }
}

/** Deterministic amount (paise) — quantity × rate, rounded to the paisa. */
export function cmsAmountPaise(quantity: number, ratePaise: number): number {
  return Math.round(quantity * ratePaise);
}

// ── Location (spatial tree) ─────────────────────────────────────────────────
export const CmsLocationCreate = z.object({
  projectId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  kind: CmsLocationKind,
  name: z.string().min(1).max(160),
});
export type CmsLocationCreate = z.infer<typeof CmsLocationCreate>;

export const CmsLocationUpdate = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(160).optional(),
  parentId: z.string().uuid().nullable().optional(),
});
export type CmsLocationUpdate = z.infer<typeof CmsLocationUpdate>;

// ── Element ─────────────────────────────────────────────────────────────────
export const CmsElementCreate = z.object({
  projectId: z.string().uuid(),
  parentElementId: z.string().uuid().optional(),
  locationId: z.string().uuid().nullable().optional(),
  gridRef: z.string().max(80).optional(),
  itemId: z.string().uuid().optional(),
  specificationId: z.string().uuid().optional(),
  description: z.string().max(300).optional(),
  measurementType: CmsMeasurementType.default("VOLUME"),
  dimensions: CmsDimensions.default({}),
  ratePaise: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
});
export type CmsElementCreate = z.infer<typeof CmsElementCreate>;

export const CmsElementUpdate = z.object({
  id: z.string().uuid(),
  description: z.string().max(300).optional(),
  locationId: z.string().uuid().nullable().optional(),
  gridRef: z.string().max(80).nullable().optional(),
  measurementType: CmsMeasurementType.optional(),
  dimensions: CmsDimensions.optional(),
  ratePaise: z.number().int().min(0).optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type CmsElementUpdate = z.infer<typeof CmsElementUpdate>;

export const CmsByProjectInput = z.object({ projectId: z.string().uuid() });
export type CmsByProjectInput = z.infer<typeof CmsByProjectInput>;

export const CmsIdInput = z.object({ id: z.string().uuid() });
export type CmsIdInput = z.infer<typeof CmsIdInput>;

// ── BOQ ──────────────────────────────────────────────────────────────────────
/** A BOQ line: elements grouped by item + spec, summing qty and amount. */
export type CmsBoqLine = {
  itemId: string | null;
  specificationId: string | null;
  description: string;
  unit: string | null;
  totalQuantity: number;
  ratePaise: number;
  totalAmountPaise: number;
  elementCount: number;
};

// ── Final Estimation Set ─────────────────────────────────────────────────────
/** Snapshot stored in esti_cms_final_set.snapshot_json */
export type CmsFinalSetSnapshot = {
  elements: Array<{
    code: string;
    description: string;
    quantity: number;
    unit: string | null;
    ratePaise: number;
    amountPaise: number;
    locationName: string | null;
  }>;
  boq: CmsBoqLine[];
  totalPaise: number;
};

export const CmsFinalSetCreate = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
});
export type CmsFinalSetCreate = z.infer<typeof CmsFinalSetCreate>;

// ── Work Orders (CMS-5) ──────────────────────────────────────────────────────
export const CmsWorkOrderStatus = z.enum(["DRAFT", "ISSUED", "CLOSED"]);
export type CmsWorkOrderStatus = z.infer<typeof CmsWorkOrderStatus>;

export const CmsWorkOrderCreate = z.object({
  projectId: z.string().uuid(),
  contractorId: z.string().uuid(),
  ref: z.string().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  scope: z.string().max(1000).optional(),
});
export type CmsWorkOrderCreate = z.infer<typeof CmsWorkOrderCreate>;

export const CmsWorkOrderUpdate = z.object({
  id: z.string().uuid(),
  ref: z.string().min(1).max(80).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scope: z.string().max(1000).nullable().optional(),
});
export type CmsWorkOrderUpdate = z.infer<typeof CmsWorkOrderUpdate>;

export const CmsWoItemCreate = z.object({
  workOrderId: z.string().uuid(),
  description: z.string().min(1).max(300),
  unit: z.string().max(40),
  agreedRatePaise: z.number().int().min(0),
  specificationId: z.string().uuid().optional(),
});
export type CmsWoItemCreate = z.infer<typeof CmsWoItemCreate>;

export const CmsWoItemUpdate = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(300).optional(),
  unit: z.string().max(40).optional(),
  agreedRatePaise: z.number().int().min(0).optional(),
});
export type CmsWoItemUpdate = z.infer<typeof CmsWoItemUpdate>;

export const CmsWoByProjectInput = z.object({ projectId: z.string().uuid() });
export type CmsWoByProjectInput = z.infer<typeof CmsWoByProjectInput>;

export const CmsWoIssueInput = z.object({ id: z.string().uuid() });
export type CmsWoIssueInput = z.infer<typeof CmsWoIssueInput>;

// ── Site Measurement Book ────────────────────────────────────────────────────
export const CmsMeasurementStatus = z.enum(["DRAFT", "VERIFIED"]);
export type CmsMeasurementStatus = z.infer<typeof CmsMeasurementStatus>;

export const CmsMeasurementCreate = z.object({
  projectId: z.string().uuid(),
  elementId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  description: z.string().max(300).optional(),
  executedQty: z.number().min(0),
  remarks: z.string().max(1000).optional(),
});
export type CmsMeasurementCreate = z.infer<typeof CmsMeasurementCreate>;

export const CmsMeasurementByElement = z.object({ elementId: z.string().uuid() });
export type CmsMeasurementByElement = z.infer<typeof CmsMeasurementByElement>;

/** Per-element cumulative read-model (VERIFIED measurements only). */
export type CmsElementMeasurementSummary = {
  elementId: string;
  elementCode: string;
  elementDescription: string;
  estimatedQty: number;
  unit: string | null;
  cumulativeVerifiedQty: number;
  percentComplete: number;
};
