import { z } from "zod";

/**
 * Construction Cost OS — Goods Receipt Note (GRN) + Material Reconciliation (ref 5.17).
 *
 * A GRN records every physical delivery of materials to site against a work
 * package.  Each delivery has a header (vendor, challan date, delivery note
 * reference) and one or more line items that can be linked to a specific
 * work-package BOQ item for automated reconciliation.
 *
 * Material reconciliation compares, per work-package item:
 *   contractedQty  — approvedQty + variationQty on the work-package item
 *   receivedQty    — Σ GRN items linked to this work-package item
 *   billedQty      — Σ approved measurement records for this item
 *
 * From these three quantities the read model derives:
 *   onSiteQty         = max(0, received − billed)   — arrived but not yet certified
 *   pendingDeliveryQty = max(0, contracted − received) — not yet on site
 *
 * Everything is additive read-only (the reconciliation writes nothing).
 */

// --- Enums ------------------------------------------------------------------

export const GrnStatus = z.enum(["DRAFT", "VERIFIED"]);
export type GrnStatus = z.infer<typeof GrnStatus>;

export const GRN_STATUS_LABEL: Record<GrnStatus, string> = {
  DRAFT: "Draft",
  VERIFIED: "Verified",
};

export const GRN_STATUS_TAG: Record<GrnStatus, "gray" | "green"> = {
  DRAFT: "gray",
  VERIFIED: "green",
};

/** Delivery coverage status for a work-package item in the reconciliation. */
export const MaterialReconStatus = z.enum([
  "NOT_STARTED",   // nothing received yet
  "IN_PROGRESS",   // partial delivery
  "FULLY_RECEIVED", // contracted qty arrived on site
  "OVER_RECEIVED",  // more arrived than contracted
]);
export type MaterialReconStatus = z.infer<typeof MaterialReconStatus>;

export const MATERIAL_RECON_STATUS_LABEL: Record<MaterialReconStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "Partially received",
  FULLY_RECEIVED: "Fully received",
  OVER_RECEIVED: "Over-received",
};

export const MATERIAL_RECON_STATUS_TAG: Record<
  MaterialReconStatus,
  "magenta" | "blue" | "green" | "red"
> = {
  NOT_STARTED: "magenta",
  IN_PROGRESS: "blue",
  FULLY_RECEIVED: "green",
  OVER_RECEIVED: "red",
};

// --- Input schemas ----------------------------------------------------------

export const GrnCreate = z.object({
  projectId: z.string().uuid(),
  workPackageId: z.string().uuid().nullable().optional(),
  deliveryDate: z.string().min(1),   // ISO date string YYYY-MM-DD
  vendorName: z.string().min(1).max(200),
  deliveryNoteRef: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});
export type GrnCreate = z.infer<typeof GrnCreate>;

export const GrnUpdate = z.object({
  id: z.string().uuid(),
  workPackageId: z.string().uuid().nullable().optional(),
  deliveryDate: z.string().min(1).optional(),
  vendorName: z.string().min(1).max(200).optional(),
  deliveryNoteRef: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type GrnUpdate = z.infer<typeof GrnUpdate>;

export const GrnItemCreate = z.object({
  grnId: z.string().uuid(),
  workPackageItemId: z.string().uuid().nullable().optional(),
  description: z.string().min(1).max(300),
  unit: z.string().min(1).max(30),
  qtyReceived: z.number().positive(),
  unitRatePaise: z.number().int().nonnegative().nullable().optional(),
});
export type GrnItemCreate = z.infer<typeof GrnItemCreate>;

export const GrnItemUpdate = z.object({
  id: z.string().uuid(),
  grnId: z.string().uuid(),
  workPackageItemId: z.string().uuid().nullable().optional(),
  description: z.string().min(1).max(300).optional(),
  unit: z.string().min(1).max(30).optional(),
  qtyReceived: z.number().positive().optional(),
  unitRatePaise: z.number().int().nonnegative().nullable().optional(),
});
export type GrnItemUpdate = z.infer<typeof GrnItemUpdate>;

export const GrnVerify = z.object({ id: z.string().uuid() });
export type GrnVerify = z.infer<typeof GrnVerify>;

// --- Pure helpers -----------------------------------------------------------

const EPSILON = 1e-6;

/** Classify a work-package item's delivery coverage. */
export function materialReconStatusFor(input: {
  contractedQty: number;
  receivedQty: number;
}): MaterialReconStatus {
  const { contractedQty, receivedQty } = input;
  if (receivedQty < EPSILON) return "NOT_STARTED";
  if (receivedQty > contractedQty + EPSILON) return "OVER_RECEIVED";
  if (receivedQty >= contractedQty - EPSILON) return "FULLY_RECEIVED";
  return "IN_PROGRESS";
}

export interface MaterialReconItemLike {
  workPackageItemId: string;
  workPackageId: string;
  workPackageRef: string;
  workPackageName: string;
  contractor: string | null;
  description: string;
  unit: string;
  costHead: string | null;
  contractedQty: number;
  receivedQty: number;
  billedQty: number;
  ratePaise: number;
}

export interface MaterialReconItem {
  workPackageItemId: string;
  workPackageId: string;
  workPackageRef: string;
  workPackageName: string;
  contractor: string | null;
  description: string;
  unit: string;
  costHead: string;
  contractedQty: number;
  receivedQty: number;
  billedQty: number;
  onSiteQty: number;
  pendingDeliveryQty: number;
  ratePaise: number;
  contractedValuePaise: number;
  receivedValuePaise: number;
  billedValuePaise: number;
  status: MaterialReconStatus;
}

export interface MaterialReconTotals {
  itemCount: number;
  contractedValuePaise: number;
  receivedValuePaise: number;
  billedValuePaise: number;
  onSiteValuePaise: number;
  pendingDeliveryValuePaise: number;
}

export interface MaterialReconciliation {
  items: MaterialReconItem[];
  totals: MaterialReconTotals;
}

/** Uncategorised cost head label (mirrors procurement-forecast). */
export const UNCATEGORISED_COST_HEAD_GRN = "Uncategorised";

/**
 * Summarise material reconciliation from raw work-package-item rows with
 * aggregated received/billed quantities.  Items with zero contracted qty AND
 * zero received qty are excluded (nothing to show). Items are returned ordered
 * by pendingDeliveryValuePaise desc so the most urgent procurement gaps float.
 */
export function summarizeMaterialRecon(rows: MaterialReconItemLike[]): MaterialReconciliation {
  const items: MaterialReconItem[] = rows
    .filter((r) => r.contractedQty > EPSILON || r.receivedQty > EPSILON)
    .map((r) => {
      const onSiteQty = Math.max(0, r.receivedQty - r.billedQty);
      const pendingDeliveryQty = Math.max(0, r.contractedQty - r.receivedQty);
      return {
        workPackageItemId: r.workPackageItemId,
        workPackageId: r.workPackageId,
        workPackageRef: r.workPackageRef,
        workPackageName: r.workPackageName,
        contractor: r.contractor,
        description: r.description,
        unit: r.unit,
        costHead: r.costHead?.trim() ? r.costHead.trim() : UNCATEGORISED_COST_HEAD_GRN,
        contractedQty: r.contractedQty,
        receivedQty: r.receivedQty,
        billedQty: r.billedQty,
        onSiteQty,
        pendingDeliveryQty,
        ratePaise: r.ratePaise,
        contractedValuePaise: Math.round(r.contractedQty * r.ratePaise),
        receivedValuePaise: Math.round(r.receivedQty * r.ratePaise),
        billedValuePaise: Math.round(r.billedQty * r.ratePaise),
        status: materialReconStatusFor({ contractedQty: r.contractedQty, receivedQty: r.receivedQty }),
      };
    })
    .sort(
      (a, b) =>
        b.pendingDeliveryQty * b.ratePaise - a.pendingDeliveryQty * a.ratePaise ||
        a.workPackageRef.localeCompare(b.workPackageRef),
    );

  const totals: MaterialReconTotals = {
    itemCount: items.length,
    contractedValuePaise: items.reduce((s, it) => s + it.contractedValuePaise, 0),
    receivedValuePaise: items.reduce((s, it) => s + it.receivedValuePaise, 0),
    billedValuePaise: items.reduce((s, it) => s + it.billedValuePaise, 0),
    onSiteValuePaise: items.reduce((s, it) => s + Math.round(it.onSiteQty * it.ratePaise), 0),
    pendingDeliveryValuePaise: items.reduce(
      (s, it) => s + Math.round(it.pendingDeliveryQty * it.ratePaise),
      0,
    ),
  };

  return { items, totals };
}
