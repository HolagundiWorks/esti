/**
 * Colour-scheme preference — persisted per browser, applied live via the app
 * MuiRoot wrapper. Light is the shipped brand; dark/highContrast are
 * PREVIEW-GRADE (kit schemes are palette+recipe complete, but SCSS chrome is
 * still light-tuned) — the Settings selector labels them accordingly.
 */
import { useSyncExternalStore } from "react";
import type { SchemeName } from "@hcw/ui-kit";

const KEY = "hcw-scheme";
const EVT = "hcw-scheme-change";

export function getScheme(): SchemeName {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "highContrast" ? v : "light";
  } catch {
    return "light";
  }
}

export function setScheme(s: SchemeName): void {
  try {
    localStorage.setItem(KEY, s);
  } catch {
    // storage unavailable (private mode) — scheme still applies for the session
  }
  window.dispatchEvent(new Event(EVT));
}

export function useScheme(): SchemeName {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    getScheme,
    () => "light" as SchemeName,
  );
}
