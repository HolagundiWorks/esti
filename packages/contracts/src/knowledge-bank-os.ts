import { z } from "zod";

// Knowledge Bank items — the office item library. (Materials, labour, brands,
// recipes and the spec rate-analysis "approach B" were removed with the
// estimation teardown; only the Items library survives here.)

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

export const KbIdInput = z.object({ id: z.string().uuid() });
export type KbIdInput = z.infer<typeof KbIdInput>;
