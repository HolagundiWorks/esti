import { useEffect, useRef } from "react";
import { pushToast } from "../../lib/toast.js";
import { trpc } from "../../lib/trpc.js";
import { useWellnessPrefs } from "../../lib/wellnessPrefs.js";
import { pushWellnessReminder } from "./wellnessExercises.js";

/**
 * Global wellness reminders, mounted once (on the taskbar). Hydration is a
 * per-user interval (device-local pref); snack/lunch breaks fire at the firm's
 * configured times. Stretch and eye breaks use animated banners; hydration uses
 * gentle toasts.
 */
export function useWellnessReminders(): void {
  const prefs = useWellnessPrefs();
  const settingsQ = trpc.settings.get.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const wellness = (settingsQ.data as { wellness?: { snackBreak: string | null; lunchBreak: string | null } } | undefined)?.wellness;

  useEffect(() => {
    if (!prefs.hydrationEnabled) return;
    const ms = Math.max(1, prefs.hydrationMin) * 60_000;
    const id = window.setInterval(() => {
      pushToast({ kind: "info", title: "Time to hydrate 💧", subtitle: "Take a sip of water." });
    }, ms);
    return () => window.clearInterval(id);
  }, [prefs.hydrationEnabled, prefs.hydrationMin]);

  useEffect(() => {
    if (!prefs.stretchEnabled) return;
    const ms = Math.max(1, prefs.stretchMin) * 60_000;
    const id = window.setInterval(() => {
      pushWellnessReminder({
        kind: "stretch",
        title: "Stretch break",
        subtitle: "Neck, shoulders, wrists — two minutes at your desk.",
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [prefs.stretchEnabled, prefs.stretchMin]);

  useEffect(() => {
    if (!prefs.eyeExerciseEnabled) return;
    const ms = Math.max(1, prefs.eyeExerciseMin) * 60_000;
    const id = window.setInterval(() => {
      pushWellnessReminder({
        kind: "eyes",
        title: "Eye break",
        subtitle: "Look away from the screen — rest your eyes.",
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [prefs.eyeExerciseEnabled, prefs.eyeExerciseMin]);

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
