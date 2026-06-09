// Daily task-load guideline for staff workload balancing.
//
// Per-person tasks due in a day:
//   0–2  → "light"     (under-utilised)
//   3–5  → "balanced"  (healthy)
//   6+   → "heavy"      (overloaded)

export type TaskLoadBand = "light" | "balanced" | "heavy";

/** Classify a per-person daily task count into a workload band. */
export function taskLoadBand(count: number): TaskLoadBand {
  if (count >= 6) return "heavy";
  if (count >= 3) return "balanced";
  return "light";
}

export const TASK_LOAD_BAND_LABEL: Record<TaskLoadBand, string> = {
  light: "Light",
  balanced: "Balanced",
  heavy: "Overloaded",
};

/** Human-readable range text for each band (for legends/tooltips). */
export const TASK_LOAD_BAND_RANGE: Record<TaskLoadBand, string> = {
  light: "0–2 tasks",
  balanced: "3–5 tasks",
  heavy: "6+ tasks",
};
