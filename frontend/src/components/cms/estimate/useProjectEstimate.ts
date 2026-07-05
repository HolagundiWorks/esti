/**
 * Project-scoped estimate selection + re-cost, shared across the Cost Management
 * estimate tabs (Estimation · BOQ · BBS). The selected estimate id lives in the
 * `?est=` URL param, so picking one in the Estimation tab is reflected in BOQ and
 * BBS. React Query caches the recost, so the three tabs share one fetch.
 *
 * Returns plain derived values (not the raw tRPC query objects) so the inferred
 * type stays portable.
 */
import type { CostedEstimate } from "@esti/contracts";
import { useSearchParams } from "react-router-dom";
import { trpc } from "../../../lib/trpc.js";

export interface EstimateListItem {
  id: string;
  title: string;
  projectId: string | null;
  sourceRateBookName: string | null;
  checksum: string | null;
  createdAt: string | Date;
}
export interface RateBookMeta {
  code: string;
  name: string;
  entryCount: number;
  projectOverrides: number;
}
export interface ProjectEstimate {
  estimates: EstimateListItem[];
  selectedId: string | null;
  setSelected: (id: string | null) => void;
  costed: CostedEstimate | null;
  rateBook: RateBookMeta | null;
  loading: boolean;
}

export function useProjectEstimate(projectId: string): ProjectEstimate {
  const [sp, setSp] = useSearchParams();
  const listQuery = trpc.estimates.list.useQuery({ projectId }, { enabled: !!projectId });
  const estimates = (listQuery.data ?? []) as EstimateListItem[];
  const selectedId = sp.get("est") ?? estimates[0]?.id ?? null;

  const recost = trpc.estimates.recost.useQuery({ id: selectedId ?? "", projectId }, { enabled: !!selectedId });

  const setSelected = (id: string | null) => {
    const next = new URLSearchParams(sp);
    if (id) next.set("est", id);
    else next.delete("est");
    setSp(next, { replace: true });
  };

  return {
    estimates,
    selectedId,
    setSelected,
    costed: recost.data?.costed ?? null,
    rateBook: recost.data?.rateBook ?? null,
    loading: listQuery.isLoading || (!!selectedId && recost.isLoading),
  };
}
