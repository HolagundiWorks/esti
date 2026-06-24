import { planAllows, type Plan, type PlanFeature } from "@esti/contracts";
import { trpc } from "./trpc.js";

/**
 * Current firm edition + feature gate, for the workspace UI. Reads `settings.get`
 * (staff-only) — react-query dedupes with the App-level settings query, so this is
 * free to call from any staff component. Defaults LITE until loaded.
 */
export function usePlan(): {
  plan: Plan;
  isLoading: boolean;
  allows: (feature: PlanFeature) => boolean;
} {
  const settingsQ = trpc.settings.get.useQuery(undefined, { staleTime: 60_000 });
  const plan = (settingsQ.data?.plan as Plan | undefined) ?? "LITE";
  return {
    plan,
    isLoading: settingsQ.isLoading,
    allows: (feature: PlanFeature) => planAllows(plan, feature),
  };
}
