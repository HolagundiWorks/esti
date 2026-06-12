import { z } from "zod";

export const DailyUpdateUpsert = z.object({
  updateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.string().max(2000).optional(),
  inProgress: z.string().max(2000).optional(),
  blockers: z.string().max(2000).optional(),
});
export type DailyUpdateUpsert = z.infer<typeof DailyUpdateUpsert>;

export const DailyUpdateListParams = z.object({
  teamMemberId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  myOnly: z.boolean().default(false),
});
export type DailyUpdateListParams = z.infer<typeof DailyUpdateListParams>;
