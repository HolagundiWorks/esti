export type WellnessStep = {
  key: string;
  name: string;
  durationSec: number;
  cue: string;
};

/** Short desk-friendly stretch sequence (~2 min). */
export const STRETCH_ROUTINE: WellnessStep[] = [
  { key: "neck", name: "Neck roll", durationSec: 20, cue: "Slow circles — five each way" },
  { key: "shoulders", name: "Shoulder rolls", durationSec: 20, cue: "Roll shoulders back, then forward" },
  { key: "wrists", name: "Wrist release", durationSec: 15, cue: "Extend one arm, flex the wrist gently" },
  { key: "stand", name: "Stand & reach", durationSec: 25, cue: "Stand, reach arms overhead, breathe" },
];

/** Screen-relief eye exercises (~1.5 min). */
export const EYE_ROUTINE: WellnessStep[] = [
  { key: "far", name: "20-20-20", durationSec: 20, cue: "Look at something far away — relax focus" },
  { key: "blink", name: "Slow blinks", durationSec: 15, cue: "Close gently for two seconds, then open" },
  { key: "figure8", name: "Figure eight", durationSec: 20, cue: "Trace a lazy ∞ with your eyes only" },
  { key: "palm", name: "Palming", durationSec: 20, cue: "Cup warm palms over closed eyes" },
];

export const WELLNESS_OPEN_EVENT = "esti:wellness-open";
export const WELLNESS_REMINDER_EVENT = "esti:wellness-reminder";

export type WellnessSection = "breathe" | "stretch" | "eyes";

export type WellnessReminderPayload = {
  kind: "stretch" | "eyes";
  title: string;
  subtitle: string;
};

export function openWellness(section: WellnessSection): void {
  window.dispatchEvent(new CustomEvent(WELLNESS_OPEN_EVENT, { detail: { section } }));
}

export function pushWellnessReminder(payload: WellnessReminderPayload): void {
  window.dispatchEvent(new CustomEvent(WELLNESS_REMINDER_EVENT, { detail: payload }));
}
