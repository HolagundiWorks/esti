import { z } from "zod";

/**
 * Project OS — Negotiation Engine (Slice H).
 *
 * Tracks commercial negotiation as a sequence of rounds against a draft project
 * (optionally tied to a specific fee proposal). Each round records the fee delta
 * (paise), scope/timeline asks, the discount requested, and both sides' written
 * positions. A deterministic conversion-probability estimate is advisory only.
 */

export const NegotiationOutcome = z.enum(["ONGOING", "AGREED", "STALLED", "WITHDRAWN"]);
export type NegotiationOutcome = z.infer<typeof NegotiationOutcome>;

export const NEGOTIATION_OUTCOME_LABEL: Record<NegotiationOutcome, string> = {
  ONGOING: "Ongoing",
  AGREED: "Agreed",
  STALLED: "Stalled",
  WITHDRAWN: "Withdrawn",
};

export const NEGOTIATION_OUTCOME_TAG: Record<
  NegotiationOutcome,
  "blue" | "green" | "magenta" | "gray"
> = {
  ONGOING: "blue",
  AGREED: "green",
  STALLED: "magenta",
  WITHDRAWN: "gray",
};

export const NegotiationAddRound = z.object({
  projectId: z.string().uuid(),
  feeProposalId: z.string().uuid().nullable().optional(),
  /** Fee delta from the previous round in paise (negative = discount given). */
  feeChangePaise: z.number().int().default(0),
  scopeChanges: z.string().max(2000).optional(),
  timelineChanges: z.string().max(2000).optional(),
  discountRequestedPct: z.number().min(0).max(100).default(0),
  architectResponse: z.string().max(2000).optional(),
  clientResponse: z.string().max(2000).optional(),
  outcome: NegotiationOutcome.default("ONGOING"),
});
export type NegotiationAddRound = z.infer<typeof NegotiationAddRound>;

export const NegotiationSetOutcome = z.object({
  id: z.string().uuid(),
  outcome: NegotiationOutcome,
});
export type NegotiationSetOutcome = z.infer<typeof NegotiationSetOutcome>;

/**
 * Deterministic conversion probability (0–100). Confidence erodes with each
 * extra round and with the cumulative discount conceded. Advisory only.
 *
 *   probability = clamp(0..100, 80 − rounds × 10 − totalDiscountPct × 2)
 */
export function conversionProbability(input: {
  rounds: number;
  totalDiscountPct: number;
}): number {
  const raw = 80 - input.rounds * 10 - input.totalDiscountPct * 2;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
