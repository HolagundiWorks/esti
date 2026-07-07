import { z } from "zod";

/**
 * Wellness system — breathing patterns (shared by the floating dock module) and
 * firm-level break schedule. Hydration cadence is a per-user, device-local
 * preference (see the frontend `wellnessPrefs`), so it isn't modelled here.
 */

/** A guided breathing pattern. Phase lengths are seconds; `hold`/`holdOut` may be 0. */
export interface BreathingPattern {
  key: "relax" | "focus" | "sleep" | "anxiety" | "daily";
  name: string;
  /** Short "what it's for" line. */
  goal: string;
  inhale: number;
  hold: number; // after inhale
  exhale: number;
  holdOut: number; // after exhale (0 for most)
  /** As-published guidance for how long to keep going. */
  durationLabel: string;
  /** Suggested session length that drives the built-in timer, in seconds. */
  sessionSeconds: number;
}

/** The five patterns from the wellness spec (ranges resolved to sensible values). */
export const BREATHING_PATTERNS: readonly BreathingPattern[] = [
  {
    key: "relax",
    name: "Relaxation & stress reduction",
    goal: "Settle the body and lower stress",
    inhale: 4,
    hold: 2,
    exhale: 6,
    holdOut: 0,
    durationLabel: "5–10 min",
    sessionSeconds: 5 * 60,
  },
  {
    key: "focus",
    name: "Better focus",
    goal: "Steady the mind before deep work",
    inhale: 4,
    hold: 4,
    exhale: 4,
    holdOut: 0,
    durationLabel: "2–5 min",
    sessionSeconds: 3 * 60,
  },
  {
    key: "sleep",
    name: "Sleep",
    goal: "Wind down — the classic 4-7-8",
    inhale: 4,
    hold: 7,
    exhale: 8,
    holdOut: 0,
    durationLabel: "4–8 cycles",
    sessionSeconds: 6 * (4 + 7 + 8), // ~6 cycles
  },
  {
    key: "anxiety",
    name: "Anxiety relief",
    goal: "Longer exhale to calm a racing mind",
    inhale: 4,
    hold: 0,
    exhale: 6,
    holdOut: 0,
    durationLabel: "3–10 min",
    sessionSeconds: 4 * 60,
  },
  {
    key: "daily",
    name: "General daily breathing",
    goal: "Resonant, coherent breathing — anytime",
    inhale: 5.5,
    hold: 0,
    exhale: 5.5,
    holdOut: 0,
    durationLabel: "5–20 min",
    sessionSeconds: 5 * 60,
  },
] as const;

export function breathingPattern(key: string): BreathingPattern {
  return BREATHING_PATTERNS.find((p) => p.key === key) ?? BREATHING_PATTERNS[0]!;
}

/** One full breath cycle length (seconds) for a pattern. */
export function cycleSeconds(p: BreathingPattern): number {
  return p.inhale + p.hold + p.exhale + p.holdOut;
}

// ── Firm break schedule (orgSettings.wellness) ────────────────────────────────
/** "HH:MM" 24h local time, or null when unset. */
const TimeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24h HH:MM")
  .nullable();

export const WellnessSettings = z.object({
  /** Mid-morning / afternoon snack break reminder time. */
  snackBreak: TimeOfDay.default(null),
  /** Lunch break reminder time. */
  lunchBreak: TimeOfDay.default(null),
});
export type WellnessSettings = z.infer<typeof WellnessSettings>;

export const DEFAULT_WELLNESS_SETTINGS: WellnessSettings = { snackBreak: null, lunchBreak: null };
