import { z } from "zod";

/** Purchase-order status lifecycle. */
export const PoStatus = z.enum(["DRAFT", "ISSUED", "RECEIVED", "CANCELLED"]);
export type PoStatus = z.infer<typeof PoStatus>;

/** A single PO line: quantity × rate. Optional link to project spec / catalogue. */
export const PoItemInput = z.object({
  description: z.string().min(1).max(300),
  unit: z.string().max(20).optional(),
  qty: z.number().nonnegative(),
  ratePaise: z.number().int().nonnegative(),
  specItemId: z.string().uuid().optional(),
  catalogItemId: z.string().uuid().optional(),
});
export type PoItemInput = z.infer<typeof PoItemInput>;

export const PurchaseOrderCreate = z.object({
  projectId: z.string().uuid(),
  vendor: z.string().max(200).optional(),
  title: z.string().max(200).optional(),
  datePo: z.string().date().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(PoItemInput).min(1, "Add at least one line item"),
});
export type PurchaseOrderCreate = z.infer<typeof PurchaseOrderCreate>;

/** Line amount in paise (qty × rate, rounded to the nearest paisa). */
export function poLineAmountPaise(qty: number, ratePaise: number): number {
  return Math.round(qty * ratePaise);
}
