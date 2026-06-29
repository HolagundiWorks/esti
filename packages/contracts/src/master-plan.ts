import { z } from "zod";

// Studio › Libraries › Master Plan Library.
export const MasterPlanCategory = z.enum(["PDF", "DWG", "ZONING", "DEVELOPMENT"]);
export type MasterPlanCategory = z.infer<typeof MasterPlanCategory>;

/** Allowed master-plan file types and size cap. */
export const MASTER_PLAN_EXTENSIONS = [".pdf", ".dwg", ".dxf"] as const;
export const MASTER_PLAN_MAX_BYTES = 50 * 1024 * 1024;
