import { useEffect, useRef } from "react";
import { pushToast } from "../../lib/toast.js";
import { trpc } from "../../lib/trpc.js";
import { useWellnessPrefs } from "../../lib/wellnessPrefs.js";

/**
 * Global wellness reminders, mounted once (on the floating dock). Hydration is a
 * per-user interval (device-local pref); snack/lunch breaks fire at the firm's
 * configured times. Delivered as gentle toasts.
 */
export function useWellnessReminders(): void {
  const prefs = useWellnessPrefs();
  const settingsQ = trpc.settings.get.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const wellness = (settingsQ.data as { wellness?: { snackBreak: string | null; lunchBreak: string | null } } | undefined)?.wellness;

  // Hydration — repeat every N minutes while enabled.
  useEffect(() => {
    if (!prefs.hydrationEnabled) return;
    const ms = Math.max(1, prefs.hydrationMin) * 60_000;
    const id = window.setInterval(() => {
      pushToast({ kind: "info", title: "Time to hydrate 💧", subtitle: "Take a sip of water." });
    }, ms);
    return () => window.clearInterval(id);
  }, [prefs.hydrationEnabled, prefs.hydrationMin]);

  // Snack / lunch breaks — fire once per slot per day at the firm's HH:MM.
  const fired = useRef<Record<string, string>>({});
  useEffect(() => {
    const snack = wellness?.snackBreak ?? null;
    const lunch = wellness?.lunchBreak ?? null;
    if (!snack && !lunch) return;
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const day = now.toDateString();
      const fire = (slot: string, time: string | null, title: string, subtitle: string) => {
        if (time && time === hhmm && fired.current[slot] !== day) {
          fired.current[slot] = day;
          pushToast({ kind: "info", title, subtitle });
        }
      };
      fire("snack", snack, "Snack break 🍎", "Step away for a few minutes.");
      fire("lunch", lunch, "Lunch break 🍽️", "Time for lunch — rest and refuel.");
    };
    check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, [wellness?.snackBreak, wellness?.lunchBreak]);
}
