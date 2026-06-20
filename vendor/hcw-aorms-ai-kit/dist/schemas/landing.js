import { z } from "zod";
export const LandingAskInput = z.object({
    prompt: z.string().trim().min(2).max(500),
    sessionId: z.string().trim().min(8).max(64).optional(),
});
export const LandingAskResult = z.object({
    answer: z.string(),
    model: z.string(),
});
