/**
 * Council of Architecture (India) — Scale of Charges and Conditions of
 * Engagement. See docs/esti/INDIA-PROFILE.md.
 *
 * These percentages reflect COA's published scale. The scale is revised
 * periodically — treat this table as effective-dated reference data and verify
 * against the current official COA circular before relying on it for billing.
 *
 * The fee is a percentage of the **cost of works** (construction cost,
 * EXCLUDING land). Money is paise (see money.ts).
 */
import { type Paise, roundToRupee } from "./money.js";

export const CoaWorkCategory = {
  RESIDENTIAL_INDIVIDUAL: "RESIDENTIAL_INDIVIDUAL", // individual / independent house
  HOUSING_SINGLE_BLOCK: "HOUSING_SINGLE_BLOCK", // single-block housing ≤ 0.5 ha
  GROUP_HOUSING_SMALL: "GROUP_HOUSING_SMALL", // 0.5–2.5 ha
  GROUP_HOUSING_MEDIUM: "GROUP_HOUSING_MEDIUM", // 2.5–5 ha
  GROUP_HOUSING_LARGE: "GROUP_HOUSING_LARGE", // > 5 ha
  NON_HOUSING: "NON_HOUSING", // all non-housing buildings
  INTERIORS: "INTERIORS",
  CONSERVATION: "CONSERVATION", // conservation / retrofit / alteration
  LANDSCAPE: "LANDSCAPE",
  URBAN_DESIGN: "URBAN_DESIGN",
  SITE_DEVELOPMENT: "SITE_DEVELOPMENT",
  REPEAT_SAME_CAMPUS: "REPEAT_SAME_CAMPUS",
  REPEAT_DIFFERENT_SITE: "REPEAT_DIFFERENT_SITE",
} as const;
export type CoaWorkCategory = (typeof CoaWorkCategory)[keyof typeof CoaWorkCategory];

/** COA minimum professional fee, as a % of cost of works. */
export const COA_MIN_FEE_PCT: Record<CoaWorkCategory, number> = {
  RESIDENTIAL_INDIVIDUAL: 7.5,
  HOUSING_SINGLE_BLOCK: 5.0,
  GROUP_HOUSING_SMALL: 3.5,
  GROUP_HOUSING_MEDIUM: 2.5,
  GROUP_HOUSING_LARGE: 2.0,
  NON_HOUSING: 5.0,
  INTERIORS: 7.5,
  CONSERVATION: 7.5,
  LANDSCAPE: 7.5,
  URBAN_DESIGN: 1.0,
  SITE_DEVELOPMENT: 2.5,
  REPEAT_SAME_CAMPUS: 2.5,
  REPEAT_DIFFERENT_SITE: 3.5,
};

/** Documentation & Communication charge — % of the professional fee. */
export const COA_DOC_COMM_PCT = 10;
/** Contractor payment-certificate verification — % of cost of works (optional). */
export const COA_CONTRACTOR_VERIFY_PCT = 1;

/**
 * COA Conditions of Engagement — stages with the cumulative % of total fee
 * payable on completion of each stage. `stagePct` is the per-stage share.
 */
export const COA_STAGES = [
  { code: "BRIEF", label: "Client's brief (retainer)", cumulativePct: 5 },
  { code: "CONCEPT", label: "Concept design", cumulativePct: 10 },
  { code: "PRELIMINARY", label: "Preliminary design & estimate", cumulativePct: 20 },
  { code: "APPROVALS", label: "Drawings for statutory approvals", cumulativePct: 35 },
  { code: "WORKING_TENDER", label: "Working drawings & tender documents", cumulativePct: 45 },
  { code: "CONTRACTOR", label: "Appointment of contractors", cumulativePct: 55 },
  { code: "CONSTRUCTION", label: "Construction / site supervision", cumulativePct: 90 },
  { code: "COMPLETION", label: "Completion", cumulativePct: 100 },
] as const;
export type CoaStageCode = (typeof COA_STAGES)[number]["code"];

/** Per-stage billing % derived from the cumulative schedule (sums to 100). */
export function coaStagePlan(): { code: CoaStageCode; label: string; stagePct: number }[] {
  let prev = 0;
  return COA_STAGES.map((s) => {
    const stagePct = s.cumulativePct - prev;
    prev = s.cumulativePct;
    return { code: s.code, label: s.label, stagePct };
  });
}

/** COA minimum fee for a work category against the cost of works (paise). */
export function coaMinimumFee(category: CoaWorkCategory, costOfWorksPaise: Paise): Paise {
  return roundToRupee(Math.round((costOfWorksPaise * COA_MIN_FEE_PCT[category]) / 100));
}

/** Ratio of a quoted fee to the COA minimum (e.g. 0.87 = "87% of COA scale"). */
export function coaRatio(quotedPaise: Paise, minimumPaise: Paise): number {
  return minimumPaise === 0 ? 0 : quotedPaise / minimumPaise;
}

/** True if a quoted fee is below the COA minimum (a compliance flag, not a block). */
export function isBelowCoaMinimum(quotedPaise: Paise, minimumPaise: Paise): boolean {
  return quotedPaise < minimumPaise;
}
