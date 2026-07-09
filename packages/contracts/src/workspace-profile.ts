import { z } from "zod";
import { GstType } from "./firm.js";
import { IndianState } from "./account-profile.js";

/** Critical workspace profile captured once after upgrade (existing users). */
export const WorkspaceProfileCompletion = z.object({
  fullName: z.string().trim().min(2).max(200),
  designation: z.string().trim().min(1).max(120),
  companyName: z.string().trim().min(2).max(200).optional(),
  coaRegNo: z.string().trim().min(1).max(40).optional(),
  phone1: z.string().trim().min(8).max(40).optional(),
  email: z.string().trim().email().optional(),
  city: z.string().trim().min(2).max(80).optional(),
  state: IndianState.optional(),
  gstType: GstType.optional(),
  gstin: z.string().trim().max(20).optional(),
});

export type WorkspaceProfileCompletion = z.infer<typeof WorkspaceProfileCompletion>;
