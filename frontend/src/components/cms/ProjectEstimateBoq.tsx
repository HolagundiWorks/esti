/**
 * Cost Management › BOQ — the grouped bill of quantities for the project's
 * selected estimate (re-cost against the office ± project rate book). Replaces
 * the previous placeholder BOQ. Selection is shared via `?est=`.
 */
import { BoqTab, NoEstimate } from "./estimate/estimateViews.js";
import { useProjectEstimate } from "./estimate/useProjectEstimate.js";

export function ProjectEstimateBoq({ projectId }: { projectId: string }) {
  const { costed, loading } = useProjectEstimate(projectId);
  if (!costed) return <NoEstimate loading={loading} />;
  return <BoqTab c={costed} />;
}
