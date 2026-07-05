import { z } from "zod";

// Rate Book — the office schedule of rates (code · description · unit · rate).
// Money is integer paise.

export const RateBookCreate = z.object({
  code: z.string().min(1).max(60),
  description: z.string().min(1).max(400),
  unit: z.string().min(1).max(40),
  ratePaise: z.number().int().min(0),
  notes: z.string().max(1000).optional(),
});
export type RateBookCreate = z.infer<typeof RateBookCreate>;

export const RateBookUpdate = RateBookCreate.partial().extend({
  id: z.string().uuid(),
});
export type RateBookUpdate = z.infer<typeof RateBookUpdate>;

export const RateBookIdInput = z.object({ id: z.string().uuid() });
export type RateBookIdInput = z.infer<typeof RateBookIdInput>;
