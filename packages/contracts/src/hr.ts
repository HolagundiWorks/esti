import { z } from "zod";

/** Leave management (optional HR module). */
export const LEAVE_TYPES = {
  CASUAL: "Casual",
  SICK: "Sick",
  EARNED: "Earned / privilege",
  UNPAID: "Unpaid (LOP)",
  COMP_OFF: "Comp-off",
} as const;
export type LeaveTypeCode = keyof typeof LEAVE_TYPES;
export const LeaveType = z.enum(Object.keys(LEAVE_TYPES) as [LeaveTypeCode, ...LeaveTypeCode[]]);

export const LeaveStatus = z.enum(["REQUESTED", "APPROVED", "REJECTED"]);
export type LeaveStatus = z.infer<typeof LeaveStatus>;

export const LeaveCreate = z.object({
  teamMemberId: z.string().uuid(),
  type: LeaveType,
  fromDate: z.string(),
  toDate: z.string(),
  days: z.number().positive(),
  reason: z.string().max(500).optional(),
});
export type LeaveCreate = z.infer<typeof LeaveCreate>;

export const LeaveStatusUpdate = z.object({
  id: z.string().uuid(),
  status: LeaveStatus,
});
export type LeaveStatusUpdate = z.infer<typeof LeaveStatusUpdate>;

/** Monthly payroll. Net = gross − deductions; gross defaults to member salary. */
export const PayslipCreate = z.object({
  teamMemberId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
  grossPaise: z.number().int().nonnegative().optional(),
  deductionsPaise: z.number().int().nonnegative().default(0),
  notes: z.string().max(500).optional(),
});
export type PayslipCreate = z.infer<typeof PayslipCreate>;

export const PayslipMarkPaid = z.object({ id: z.string().uuid() });
export type PayslipMarkPaid = z.infer<typeof PayslipMarkPaid>;
