import { z } from "zod";
export declare const LandingAskInput: z.ZodObject<{
    prompt: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    sessionId?: string | undefined;
}, {
    prompt: string;
    sessionId?: string | undefined;
}>;
export type LandingAskInput = z.infer<typeof LandingAskInput>;
export declare const LandingAskResult: z.ZodObject<{
    answer: z.ZodString;
    model: z.ZodString;
}, "strip", z.ZodTypeAny, {
    model: string;
    answer: string;
}, {
    model: string;
    answer: string;
}>;
export type LandingAskResult = z.infer<typeof LandingAskResult>;
//# sourceMappingURL=landing.d.ts.map