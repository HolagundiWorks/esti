import { z } from "zod";

/**
 * Usage-earned AORMS identity (Phase 34).
 *
 * Individual accounts are created without a portable AORMS-U handle. The
 * workspace tracks *active app time* (the frontend heartbeats while the tab is
 * visible); once an account crosses {@link AORMS_ID_USAGE_MINUTES} it is
 * invited — never forced — to generate its permanent AORMS ID.
 */

/** Active usage required before the AORMS ID can be generated: 100 hours. */
export const AORMS_ID_USAGE_MINUTES = 100 * 60;

/** How often the frontend heartbeats while the app is visible. */
export const USAGE_PING_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Max minutes a single ping may credit. A ping credits the real elapsed time
 * since the previous ping, clamped to this — so a laptop that slept for a week
 * between pings credits 10 minutes, not a week.
 */
export const USAGE_PING_MAX_CREDIT_MINUTES = 10;

/**
 * Minutes of active use a ping earns: elapsed time since the previous ping,
 * clamped to [0, USAGE_PING_MAX_CREDIT_MINUTES]. The first ping (no previous)
 * starts the clock and credits nothing.
 */
export function usageCreditMinutes(lastPingAt: Date | null | undefined, now: Date): number {
  if (!lastPingAt) return 0;
  const elapsedMin = (now.getTime() - lastPingAt.getTime()) / 60_000;
  if (elapsedMin <= 0) return 0;
  return Math.min(Math.round(elapsedMin), USAGE_PING_MAX_CREDIT_MINUTES);
}

/** Has this account earned the right to generate its AORMS ID? */
export function aormsIdEligible(minutes: number): boolean {
  return minutes >= AORMS_ID_USAGE_MINUTES;
}

/**
 * Days of use before the Apply-for-unique-ID button appears (greyed until the
 * hour gate is earned) — a deliberate curiosity teaser, not an unlock.
 */
export const AORMS_ID_TEASER_DAYS = 5;

/** Whole calendar days since the account's first active use. */
export function usageDaysUsed(firstUsedAt: Date | null | undefined, now: Date): number {
  if (!firstUsedAt) return 0;
  const elapsed = now.getTime() - firstUsedAt.getTime();
  return elapsed <= 0 ? 0 : Math.floor(elapsed / 86_400_000);
}

/** Should the (possibly greyed) Apply-for-unique-ID button be visible? */
export function aormsIdTeaserVisible(daysUsed: number): boolean {
  return daysUsed >= AORMS_ID_TEASER_DAYS;
}

/** SPA-facing usage/identity status (trpc `usage.status`). */
export const UsageStatus = z.object({
  minutes: z.number(),
  requiredMinutes: z.number(),
  eligible: z.boolean(),
  /** The generated AORMS-U handle, or null while unearned/undecided. */
  aormsId: z.string().nullable(),
  /** True once the user snoozed the generate prompt (Profile keeps the button). */
  promptDismissed: z.boolean(),
  /** Whole days since first active use — drives the Apply-button teaser. */
  daysUsed: z.number(),
  /** False when no identity platform is reachable — hide the prompt entirely. */
  canGenerate: z.boolean(),
});
export type UsageStatus = z.infer<typeof UsageStatus>;
