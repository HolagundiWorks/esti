import { z } from "zod";

/**
 * Project OS — Feasibility Report Engine (Slice D).
 *
 * A feasibility report is a snapshot of the pre-project assessment at a point in
 * time, rendered to a branded PDF for the architect-client discussion. The whole
 * computed result is frozen into `snapshot` so the PDF is an exact reproduction
 * of what was on screen at generation time (mirrors the cost-report pattern).
 * A `shareToken` enables an anonymous read link for the client.
 */

export const FeasibilityGenerate = z.object({
  projectId: z.string().uuid(),
  /** Optional estimated timeline string for the report (e.g. "14–16 months"). */
  estimatedTimeline: z.string().max(120).optional(),
  /** Optional compliance percentage 0–100 for the report header. */
  compliancePct: z.number().min(0).max(100).optional(),
});
export type FeasibilityGenerate = z.infer<typeof FeasibilityGenerate>;

/** The frozen report payload stored in `esti_feasibility_report.snapshot`. */
export interface FeasibilitySnapshot {
  projectRef: string;
  projectTitle: string;
  siteAreaSqm: number;
  permissibleFarArea: number;
  setbackBuildableArea: number;
  actualGroundCoverage: number;
  possibleFloors: number;
  superBuiltupArea: number;
  estimatedProjectCostPaise: number;
  constructionRatePaise: number;
  estimatedTimeline: string | null;
  compliancePct: number | null;
  breakdown: Record<string, number> | null;
  generatedAt: string;
}
