import { z } from "zod";

/**
 * Project OS — Project DNA Engine (Slice B) + Risk Scoring Engine (Slice E).
 *
 * DNA captures the pre-sales commercial constraints of a project as structured
 * enum fields (budget psychology, vastu, design language, decision makers,
 * timeline pressure, material expectation, revision tolerance). It is distinct
 * from the design-stage `projectBrief.designPrefs` — different authorship (sales
 * vs design) and a different consumer (the deterministic risk model below).
 *
 * The risk score is a pure, deterministic function of the DNA (plus the project
 * jurisdiction). It is a read model — never stored — mirroring how the cost
 * dashboard computes health on demand. No ML, no external calls.
 */

// --- Enums ------------------------------------------------------------------

export const BudgetMode = z.enum(["FLEXIBLE", "MODERATE", "STRICT", "VERY_STRICT"]);
export type BudgetMode = z.infer<typeof BudgetMode>;
export const BUDGET_MODE_LABEL: Record<BudgetMode, string> = {
  FLEXIBLE: "Flexible",
  MODERATE: "Moderate",
  STRICT: "Strict",
  VERY_STRICT: "Very strict",
};

export const VastuRequirement = z.enum(["NONE", "PARTIAL", "STRONG", "STRICT_TRADITIONAL"]);
export type VastuRequirement = z.infer<typeof VastuRequirement>;
export const VASTU_REQUIREMENT_LABEL: Record<VastuRequirement, string> = {
  NONE: "None",
  PARTIAL: "Partial",
  STRONG: "Strong",
  STRICT_TRADITIONAL: "Strict traditional",
};

export const DesignLanguage = z.enum([
  "MINIMALIST",
  "CONTEMPORARY",
  "TRADITIONAL",
  "LUXURY",
  "MODERN_TROPICAL",
  "INDUSTRIAL",
  "CUSTOM",
]);
export type DesignLanguage = z.infer<typeof DesignLanguage>;
export const DESIGN_LANGUAGE_LABEL: Record<DesignLanguage, string> = {
  MINIMALIST: "Minimalist",
  CONTEMPORARY: "Contemporary",
  TRADITIONAL: "Traditional",
  LUXURY: "Luxury",
  MODERN_TROPICAL: "Modern tropical",
  INDUSTRIAL: "Industrial",
  CUSTOM: "Custom",
};

export const DesignFlexibility = z.enum([
  "ARCHITECT_FREEDOM",
  "APPROVAL_EVERY_STAGE",
  "STRICT_REQUIREMENT",
]);
export type DesignFlexibility = z.infer<typeof DesignFlexibility>;
export const DESIGN_FLEXIBILITY_LABEL: Record<DesignFlexibility, string> = {
  ARCHITECT_FREEDOM: "Architect freedom",
  APPROVAL_EVERY_STAGE: "Approval every stage",
  STRICT_REQUIREMENT: "Strict requirement",
};

export const DecisionMakers = z.enum([
  "SINGLE_OWNER",
  "COUPLE",
  "FAMILY",
  "PARTNERS",
  "CORPORATE_COMMITTEE",
]);
export type DecisionMakers = z.infer<typeof DecisionMakers>;
export const DECISION_MAKERS_LABEL: Record<DecisionMakers, string> = {
  SINGLE_OWNER: "Single owner",
  COUPLE: "Couple",
  FAMILY: "Family",
  PARTNERS: "Partners",
  CORPORATE_COMMITTEE: "Corporate committee",
};

export const TimelineCriticality = z.enum(["FLEXIBLE", "MODERATE", "STRICT", "URGENT"]);
export type TimelineCriticality = z.infer<typeof TimelineCriticality>;
export const TIMELINE_CRITICALITY_LABEL: Record<TimelineCriticality, string> = {
  FLEXIBLE: "Flexible",
  MODERATE: "Moderate",
  STRICT: "Strict",
  URGENT: "Urgent",
};

export const MaterialExpectation = z.enum(["ECONOMY", "MID_RANGE", "PREMIUM", "ULTRA_PREMIUM"]);
export type MaterialExpectation = z.infer<typeof MaterialExpectation>;
export const MATERIAL_EXPECTATION_LABEL: Record<MaterialExpectation, string> = {
  ECONOMY: "Economy",
  MID_RANGE: "Mid range",
  PREMIUM: "Premium",
  ULTRA_PREMIUM: "Ultra premium",
};

export const RevisionTolerance = z.enum(["LOW", "MODERATE", "HIGH", "UNLIMITED"]);
export type RevisionTolerance = z.infer<typeof RevisionTolerance>;
export const REVISION_TOLERANCE_LABEL: Record<RevisionTolerance, string> = {
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
  UNLIMITED: "Unlimited",
};

// --- Input schema -----------------------------------------------------------

export const ProjectDnaUpsert = z.object({
  projectId: z.string().uuid(),
  budgetMode: BudgetMode,
  vastuRequirement: VastuRequirement,
  designLanguage: DesignLanguage,
  designFlexibility: DesignFlexibility,
  decisionMakers: DecisionMakers,
  timelineCriticality: TimelineCriticality,
  materialExpectation: MaterialExpectation,
  revisionTolerance: RevisionTolerance,
  customNotes: z.string().max(4000).optional(),
});
export type ProjectDnaUpsert = z.infer<typeof ProjectDnaUpsert>;

// --- Risk scoring (Slice E) -------------------------------------------------

export const RiskBand = z.enum(["LOW", "MODERATE", "COMPLEX", "HIGH_FRICTION"]);
export type RiskBand = z.infer<typeof RiskBand>;
export const RISK_BAND_LABEL: Record<RiskBand, string> = {
  LOW: "Low risk",
  MODERATE: "Moderate risk",
  COMPLEX: "Complex project",
  HIGH_FRICTION: "High-friction project",
};
export const RISK_BAND_TAG: Record<RiskBand, "green" | "teal" | "purple" | "red"> = {
  LOW: "green",
  MODERATE: "teal",
  COMPLEX: "purple",
  HIGH_FRICTION: "red",
};

export interface RiskFactor {
  key: string;
  label: string;
  points: number;
}

export interface RiskScore {
  score: number; // 0–100 (clamped)
  band: RiskBand;
  factors: RiskFactor[];
}

/** Jurisdictions treated as regulatory-complex (adds the §8 +15 weight). */
export const COMPLEX_JURISDICTIONS: ReadonlySet<string> = new Set([
  "BBMP",
  "BDA",
  "BMRDA",
  "CMDA",
  "HMDA",
  "MMRDA",
  "PMRDA",
  "GHMC",
]);

export function riskBandFor(score: number): RiskBand {
  if (score < 30) return "LOW";
  if (score < 60) return "MODERATE";
  if (score < 80) return "COMPLEX";
  return "HIGH_FRICTION";
}

export interface RiskScoreInput {
  budgetMode: BudgetMode;
  vastuRequirement: VastuRequirement;
  designFlexibility: DesignFlexibility;
  decisionMakers: DecisionMakers;
  timelineCriticality: TimelineCriticality;
  revisionTolerance: RevisionTolerance;
  jurisdiction?: string | null;
}

/**
 * Deterministic project-complexity score (0–100) from the DNA + jurisdiction.
 * Weights mirror the Project OS spec §8. Higher = more friction expected.
 */
export function computeRiskScore(input: RiskScoreInput): RiskScore {
  const factors: RiskFactor[] = [];

  if (input.budgetMode === "STRICT" || input.budgetMode === "VERY_STRICT") {
    factors.push({ key: "budget", label: "Strict budget", points: 20 });
  }
  if (input.vastuRequirement === "STRONG" || input.vastuRequirement === "STRICT_TRADITIONAL") {
    factors.push({ key: "vastu", label: "Strict Vastu", points: 15 });
  }
  if (input.timelineCriticality === "URGENT") {
    factors.push({ key: "timeline", label: "Urgent timeline", points: 15 });
  }
  if (input.revisionTolerance === "HIGH" || input.revisionTolerance === "UNLIMITED") {
    factors.push({ key: "revision", label: "High revision probability", points: 15 });
  }
  if (
    input.decisionMakers === "FAMILY" ||
    input.decisionMakers === "PARTNERS" ||
    input.decisionMakers === "CORPORATE_COMMITTEE"
  ) {
    factors.push({ key: "decision", label: "Multiple decision makers", points: 10 });
  }
  if (input.designFlexibility === "STRICT_REQUIREMENT") {
    factors.push({ key: "design", label: "Strict design language", points: 10 });
  }
  if (input.jurisdiction && COMPLEX_JURISDICTIONS.has(input.jurisdiction.toUpperCase())) {
    factors.push({ key: "regulatory", label: "Regulatory complexity", points: 15 });
  }

  const raw = factors.reduce((s, f) => s + f.points, 0);
  const score = Math.min(100, raw);
  return { score, band: riskBandFor(score), factors };
}
