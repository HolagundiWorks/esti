import { useEffect, useState } from "react";

/**
 * Per-user, device-local wellness preferences (localStorage). Hydration cadence
 * is personal and doesn't need to sync across devices, so it lives here rather
 * than on the server. Firm break times (snack/lunch) come from `settings.get`.
 */
export interface WellnessPrefs {
  hydrationEnabled: boolean;
  hydrationMin: number; // reminder interval, minutes
  pattern: string; // last-used breathing pattern key
}

const KEY = "esti.wellness.prefs";
const EVENT = "esti:wellness-prefs";
const DEFAULTS: WellnessPrefs = { hydrationEnabled: false, hydrationMin: 15, pattern: "relax" };

export function getWellnessPrefs(): WellnessPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<WellnessPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

export function setWellnessPrefs(patch: Partial<WellnessPrefs>): void {
  const next = { ...getWellnessPrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage disabled — keep in-memory only */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Reactive read of the wellness prefs (syncs across tabs + in-app writers). */
export function useWellnessPrefs(): WellnessPrefs {
  const [prefs, setPrefs] = useState<WellnessPrefs>(getWellnessPrefs);
  useEffect(() => {
    const refresh = () => setPrefs(getWellnessPrefs());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return prefs;
}
