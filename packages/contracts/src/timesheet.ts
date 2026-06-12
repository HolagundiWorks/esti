import { z } from "zod";

export const TimesheetCreate = z.object({
  teamMemberId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().min(0.25).max(24),
  billable: z.boolean().default(false),
  description: z.string().max(500).optional(),
});
export type TimesheetCreate = z.infer<typeof TimesheetCreate>;

export const TimesheetUpdate = z.object({
  id: z.string().uuid(),
  hours: z.number().min(0.25).max(24).optional(),
  billable: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
});
export type TimesheetUpdate = z.infer<typeof TimesheetUpdate>;

export const TimesheetListParams = z.object({
  teamMemberId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  myOnly: z.boolean().default(false),
});
export type TimesheetListParams = z.infer<typeof TimesheetListParams>;
