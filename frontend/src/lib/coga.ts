/**
 * COGA calm-mode preference — larger hit targets + one type step.
 * Persisted per browser; KitRoot sets `data-hcw-coga` for chrome recipes.
 */
import { useSyncExternalStore } from "react";
import type { CogaMode } from "@hcw/ui-kit";

const KEY = "hcw-coga";
const EVT = "hcw-coga-change";

export function getCoga(): CogaMode {
  try {
    const v = localStorage.getItem(KEY);
    return v === "calm" ? "calm" : "default";
  } catch {
    return "default";
  }
}

export function setCoga(mode: CogaMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // private mode — still apply for the session via event
  }
  window.dispatchEvent(new Event(EVT));
}

export function useCoga(): CogaMode {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    getCoga,
    () => "default" as CogaMode,
  );
}
