import { z } from "zod";

/** Daily attendance status for architecture office staff register. */
export const ATTENDANCE_STATUS = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half day",
  WFH: "Work from home",
  ON_LEAVE: "On leave",
} as const;
export type AttendanceStatusCode = keyof typeof ATTENDANCE_STATUS;
export const AttendanceStatus = z.enum(
  Object.keys(ATTENDANCE_STATUS) as [AttendanceStatusCode, ...AttendanceStatusCode[]],
);

export const AttendanceMark = z.object({
  teamMemberId: z.string().uuid(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: AttendanceStatus,
  notes: z.string().max(300).optional(),
});
export type AttendanceMark = z.infer<typeof AttendanceMark>;

export const AttendanceDayParams = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type AttendanceDayParams = z.infer<typeof AttendanceDayParams>;

export const AttendanceListParams = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  teamMemberId: z.string().uuid().optional(),
});
export type AttendanceListParams = z.infer<typeof AttendanceListParams>;
