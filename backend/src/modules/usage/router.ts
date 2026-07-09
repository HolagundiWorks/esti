/**
 * Usage-earned AORMS identity (Phase 34).
 *
 * The frontend heartbeats `ping` every USAGE_PING_INTERVAL_MS while the app
 * tab is visible; each ping credits the clamped real elapsed time since the
 * previous ping (contracts: usageCreditMinutes) so idle/asleep gaps never
 * inflate the total. At AORMS_ID_USAGE_MINUTES the user may generate their
 * permanent AORMS-U handle — invited, never forced.
 */
import {
  AORMS_ID_USAGE_MINUTES,
  type UsageStatus,
  aormsIdEligible,
  usageCreditMinutes,
  usageDaysUsed,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { usageStats, users } from "../../db/schema.js";
import { env } from "../../env.js";
import {
  delegationEnabled,
  generateIdentityAtPlatform,
  identityLookupConfigured,
} from "../../lib/identityDelegate.js";
import { mintPublicIdForEmail } from "../../licensing-platform/modules/auth/service.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

/** Can this install mint AORMS-U handles at all (in-process or via the hub)? */
function identityMintConfigured(): boolean {
  return env.ESTI_UNIFIED_ACCOUNTS || (delegationEnabled() && identityLookupConfigured());
}

export const usageRouter = router({
  /** Heartbeat — credits clamped elapsed active time. Fired while the tab is visible. */
  ping: protectedProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    const [stat] = await ctx.db
      .select()
      .from(usageStats)
      .where(eq(usageStats.userId, ctx.user.id))
      .limit(1);
    if (!stat) {
      await ctx.db
        .insert(usageStats)
        .values({ userId: ctx.user.id, minutes: 0, lastPingAt: now })
        .onConflictDoNothing();
      return { minutes: 0 };
    }
    const credit = usageCreditMinutes(stat.lastPingAt, now);
    const [updated] = await ctx.db
      .update(usageStats)
      .set({ minutes: sql`${usageStats.minutes} + ${credit}`, lastPingAt: now })
      .where(eq(usageStats.userId, ctx.user.id))
      .returning({ minutes: usageStats.minutes });
    return { minutes: updated?.minutes ?? stat.minutes + credit };
  }),

  /** Usage + identity status for the signed-in user (drives the 100-hr prompt). */
  status: protectedProcedure.query(async ({ ctx }): Promise<UsageStatus> => {
    const [stat] = await ctx.db
      .select()
      .from(usageStats)
      .where(eq(usageStats.userId, ctx.user.id))
      .limit(1);
    const [me] = await ctx.db
      .select({ aormsId: users.accountPublicId })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);
    const minutes = stat?.minutes ?? 0;
    const eligible = aormsIdEligible(minutes);
    return {
      minutes,
      requiredMinutes: AORMS_ID_USAGE_MINUTES,
      eligible,
      aormsId: me?.aormsId ?? null,
      promptDismissed: Boolean(stat?.idPromptDismissedAt),
      daysUsed: usageDaysUsed(stat?.createdAt, new Date()),
      canGenerate: identityMintConfigured(),
    };
  }),

  /** Snooze the generate prompt — Profile keeps the button available. */
  dismissIdPrompt: protectedProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    await ctx.db
      .insert(usageStats)
      .values({ userId: ctx.user.id, minutes: 0, idPromptDismissedAt: now })
      .onConflictDoUpdate({
        target: usageStats.userId,
        set: { idPromptDismissedAt: now },
      });
    return { ok: true };
  }),

  /**
   * Generate the permanent AORMS-U handle — allowed once 100 hours of active
   * use are on the clock. Idempotent: an already-linked handle is returned
   * untouched (the handle never changes).
   */
  generateAormsId: protectedProcedure.mutation(async ({ ctx }) => {
    const [me] = await ctx.db
      .select({ aormsId: users.accountPublicId, email: users.email, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);
    if (!me) throw new TRPCError({ code: "NOT_FOUND" });
    if (me.aormsId) return { publicId: me.aormsId };

    const [stat] = await ctx.db
      .select({ minutes: usageStats.minutes })
      .from(usageStats)
      .where(eq(usageStats.userId, ctx.user.id))
      .limit(1);
    if (!aormsIdEligible(stat?.minutes ?? 0)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your AORMS ID unlocks after 100 hours of active use.",
      });
    }

    let publicId: string | null = null;
    if (env.ESTI_UNIFIED_ACCOUNTS) {
      // Single-box: the platform account store lives in this process.
      publicId = await mintPublicIdForEmail(me.email, me.fullName);
    } else if (delegationEnabled() && identityLookupConfigured()) {
      publicId = await generateIdentityAtPlatform(me.email, me.fullName);
    }
    if (!publicId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No identity platform is configured for this install.",
      });
    }

    await ctx.db
      .update(users)
      .set({ accountPublicId: publicId })
      .where(eq(users.id, ctx.user.id));
    return { publicId };
  }),
});
