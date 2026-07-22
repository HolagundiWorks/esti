/**
 * Control density preference — persisted per browser, applied via KitRoot.
 * Comfortable is the default; compact tightens chrome for dense data screens.
 */
import { useSyncExternalStore } from "react";
import type { DensityName } from "@hcw/ui-kit";

const KEY = "hcw-density";
const EVT = "hcw-density-change";

export function getDensity(): DensityName {
  try {
    const v = localStorage.getItem(KEY);
    return v === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable";
  }
}

export function setDensity(d: DensityName): void {
  try {
    localStorage.setItem(KEY, d);
  } catch {
    // private mode — still apply for the session via event
  }
  window.dispatchEvent(new Event(EVT));
}

export function useDensity(): DensityName {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    getDensity,
    () => "comfortable" as DensityName,
  );
}
