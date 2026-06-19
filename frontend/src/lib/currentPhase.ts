export type DerivedPhaseStageStatus = "Complete" | "Active" | "Pending";

/** Stage status derived from sort order vs project's current phase. */
export function derivePhaseStageStatus(
  phaseIndex: number,
  currentIndex: number,
): DerivedPhaseStageStatus {
  if (currentIndex < 0) return phaseIndex === 0 ? "Active" : "Pending";
  if (phaseIndex === currentIndex) return "Active";
  if (phaseIndex < currentIndex) return "Complete";
  return "Pending";
}

export const PHASE_STAGE_TAG: Record<DerivedPhaseStageStatus, "green" | "blue" | "gray"> = {
  Complete: "green",
  Active: "blue",
  Pending: "gray",
};
