import { TrialRequestInput } from "@esti/contracts";
import { desc } from "drizzle-orm";
import { notifyBetaRequestSubmitted } from "../../lib/mail/beta-request-mail.js";
import { enforceRateLimit } from "../../lib/ratelimit.js";
import { trialRequests } from "../../db/schema/marketing.js";
import { ownerProcedure, publicProcedure, router } from "../../trpc/trpc.js";

export const marketingRouter = router({
  /** Public landing form — stores lead and emails hi@aorms.in for beta provisioning. */
  submitTrialRequest: publicProcedure.input(TrialRequestInput).mutation(async ({ ctx, input }) => {
    await enforceRateLimit("beta-request-ip", ctx.ip, 5, 3600);
    await enforceRateLimit("beta-request-email", input.workEmail.toLowerCase(), 3, 86400);

    const [row] = await ctx.db
      .insert(trialRequests)
      .values({
        fullName: input.fullName,
        workEmail: input.workEmail.toLowerCase(),
        mobile: input.mobile,
        companyName: input.companyName,
        role: input.role,
        practiceType: input.practiceType ?? null,
        teamSize: input.teamSize ?? null,
        locations: input.locations ?? null,
        interestedModules: input.interestedModules,
        currentTools: input.currentTools,
        painPoints: input.painPoints,
        improvementNotes: input.improvementNotes ?? null,
        trialPreference: input.trialPreference,
        timeline: input.timeline ?? null,
      })
      .returning({ id: trialRequests.id, createdAt: trialRequests.createdAt });

    await notifyBetaRequestSubmitted(input, {
      id: row!.id,
      createdAt: row!.createdAt,
    });

    return {
      ok: true as const,
      id: row!.id,
      createdAt: row!.createdAt.toISOString(),
    };
  }),

  /** Owner-only — recent beta leads (Company ops). */
  listTrialRequests: ownerProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: trialRequests.id,
        fullName: trialRequests.fullName,
        workEmail: trialRequests.workEmail,
        mobile: trialRequests.mobile,
        companyName: trialRequests.companyName,
        role: trialRequests.role,
        trialPreference: trialRequests.trialPreference,
        timeline: trialRequests.timeline,
        createdAt: trialRequests.createdAt,
      })
      .from(trialRequests)
      .orderBy(desc(trialRequests.createdAt))
      .limit(50);
  }),
});
