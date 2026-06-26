import { z } from "zod";

/**
 * Project OS — Pre-Project Assessment Engine (Slice C).
 *
 * Deterministic build-feasibility maths computed before a project is committed:
 * site area → permissible FAR area → setback-buildable area → ground coverage →
 * possible floors → super-builtup area → estimated project cost.
 *
 * All derived fields are pure functions of the operator inputs; the backend
 * recomputes them server-side on every upsert so the stored row is always
 * internally consistent. Money is integer paise.
 */

// --- Input schema -----------------------------------------------------------

export const PreProjectAssessmentUpsert = z.object({
  projectId: z.string().uuid(),
  siteLength: z.number().nonnegative().optional(),
  siteWidth: z.number().nonnegative().optional(),
  /** Optional manual area override (sqm) when the plot is irregular. */
  manualArea: z.number().nonnegative().nullable().optional(),
  farFactor: z.number().nonnegative(),
  frontSetback: z.number().nonnegative().default(0),
  rearSetback: z.number().nonnegative().default(0),
  leftSetback: z.number().nonnegative().default(0),
  rightSetback: z.number().nonnegative().default(0),
  groundCoveragePct: z.number().min(0).max(100),
  superBuiltupFactor: z.number().min(1).default(1.25),
  /** Construction rate in paise per sqm. */
  constructionRatePaise: z.number().int().nonnegative().default(0),
  /** Optional cost-head % split, e.g. { civil: 55, electrical: 10, ... }. */
  breakdown: z.record(z.string(), z.number()).optional(),
});
export type PreProjectAssessmentUpsert = z.infer<typeof PreProjectAssessmentUpsert>;

// --- Pure feasibility maths -------------------------------------------------

export interface AssessmentDerived {
  siteAreaSqm: number;
  permissibleFarArea: number;
  setbackBuildableArea: number;
  coverageArea: number;
  actualGroundCoverage: number;
  possibleFloors: number;
  superBuiltupArea: number;
  estimatedProjectCostPaise: number;
}

export interface AssessmentInput {
  siteLength?: number | null;
  siteWidth?: number | null;
  manualArea?: number | null;
  farFactor: number;
  frontSetback?: number | null;
  rearSetback?: number | null;
  leftSetback?: number | null;
  rightSetback?: number | null;
  groundCoveragePct: number;
  superBuiltupFactor?: number | null;
  constructionRatePaise?: number | null;
}

const n = (v: number | null | undefined): number => (typeof v === "number" && isFinite(v) ? v : 0);

/**
 * Compute every derived feasibility figure from the operator inputs.
 *
 *   siteArea            = manualArea ?? length × width
 *   permissibleFarArea  = siteArea × farFactor
 *   setbackBuildable    = (length − front − rear) × (width − left − right)   (≥0)
 *   coverageArea        = siteArea × groundCoveragePct / 100
 *   actualGroundCover   = min(setbackBuildable, coverageArea), but if no plot
 *                         dimensions are given fall back to coverageArea
 *   possibleFloors      = permissibleFarArea / actualGroundCover             (≥0)
 *   superBuiltupArea    = permissibleFarArea × superBuiltupFactor
 *   estimatedCostPaise  = round(superBuiltupArea × constructionRatePaise)
 */
export function computeAssessment(input: AssessmentInput): AssessmentDerived {
  const length = n(input.siteLength);
  const width = n(input.siteWidth);
  const computedArea = length * width;
  const siteAreaSqm = n(input.manualArea) > 0 ? n(input.manualArea) : computedArea;

  const farFactor = n(input.farFactor);
  const permissibleFarArea = siteAreaSqm * farFactor;

  const netLength = Math.max(0, length - n(input.frontSetback) - n(input.rearSetback));
  const netWidth = Math.max(0, width - n(input.leftSetback) - n(input.rightSetback));
  const setbackBuildableArea = netLength * netWidth;

  const coverageArea = (siteAreaSqm * n(input.groundCoveragePct)) / 100;

  // With no plot dimensions there is no setback envelope — use coverage alone.
  const hasDims = length > 0 && width > 0;
  const actualGroundCoverage = hasDims
    ? Math.min(setbackBuildableArea, coverageArea)
    : coverageArea;

  const possibleFloors =
    actualGroundCoverage > 0 ? permissibleFarArea / actualGroundCoverage : 0;

  const superBuiltupFactor = n(input.superBuiltupFactor) > 0 ? n(input.superBuiltupFactor) : 1;
  const superBuiltupArea = permissibleFarArea * superBuiltupFactor;

  const estimatedProjectCostPaise = Math.round(superBuiltupArea * n(input.constructionRatePaise));

  return {
    siteAreaSqm,
    permissibleFarArea,
    setbackBuildableArea,
    coverageArea,
    actualGroundCoverage,
    possibleFloors,
    superBuiltupArea,
    estimatedProjectCostPaise,
  };
}
