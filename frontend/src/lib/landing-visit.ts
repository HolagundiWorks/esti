/**
 * Landing-page visit counter — records one session per browser tab visit.
 * Uses `health.landingVisits` + `recordLandingVisit` so older backends skip silently.
 */
import { useEffect, useRef } from "react";
import { trpc } from "../lib/trpc.js";

const SESSION_KEY = "esti-landing-visit-recorded";

export function useLandingVisitCounter() {
  const utils = trpc.useUtils();
  const attemptedRef = useRef(false);
  // Public marketing page — backend may be absent (visual CI, static preview).
  // Never toast on failure; the counter is optional chrome.
  const health = trpc.health.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    meta: { silent: true },
  });
  const record = trpc.recordLandingVisit.useMutation({
    meta: { silent: true },
    onSuccess: (data) => {
      utils.health.setData(undefined, (prev) =>
        prev ? { ...prev, landingVisits: data.visits } : prev,
      );
    },
  });

  const visits = health.data?.landingVisits;
  const supported = visits !== undefined;

  useEffect(() => {
    if (!supported || attemptedRef.current || sessionStorage.getItem(SESSION_KEY)) return;
    attemptedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    record.mutate(undefined);
  }, [supported, record]);

  return supported ? visits : undefined;
}

export function formatVisitCount(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}
