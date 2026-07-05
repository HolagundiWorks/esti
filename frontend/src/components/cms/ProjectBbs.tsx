/**
 * Cost Management › BBS — the Bar Bending Schedule (steel by diameter) for the
 * project's selected estimate. Weights come from the .aormsest (computed by the
 * BBS engine in the Estimate app); priced by the rate book. Selection shared
 * via `?est=`.
 */
import { NoEstimate, SteelTab } from "./estimate/estimateViews.js";
import { useProjectEstimate } from "./estimate/useProjectEstimate.js";

export function ProjectBbs({ projectId }: { projectId: string }) {
  const { costed, loading } = useProjectEstimate(projectId);
  if (!costed) return <NoEstimate loading={loading} />;
  return <SteelTab c={costed} />;
}
