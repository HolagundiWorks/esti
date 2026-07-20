import {
  AiGenerateInput,
  AiRunUpdate,
  AiSettings,
  MAX_CLOUD_API_KEY_CHARS,
  cloudAiConfigError,
  parseAiSettings,
  toPublicAiSettings,
} from "@esti/contracts";
import { can } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { aiRuns, orgSettings } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { runAiGateway } from "../../lib/ai/gateway.js";
import { redactPii } from "../../lib/ai/redact.js";
import { getOrgSettings } from "../../lib/settings.js";
import { sealSecret } from "../../lib/secretBox.js";
import { demoBlocksAiDraft, demoBlocksAiSettings, DEMO_AI_DRAFT_MESSAGE, DEMO_AI_SETTINGS_MESSAGE } from "../../lib/demo-policy.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

function canEditAi(role: string): boolean {
  return role === "OWNER" || role === "PARTNER";
}

export const aiRouter = router({
  settings: protectedProcedure.query(async ({ ctx }) => {
    const org = await getOrgSettings(ctx.db);
    const parsed = parseAiSettings(org.aiSettings);
    return {
      // Redact the cloud BYO-API secret — expose only a configured flag.
      ...toPublicAiSettings(parsed),
      /** ESTI agent (Alt+A) — read-only Q&A from live AORMS data. */
      agentEnabled: parsed.enabled,
      /** AI Studio document drafts — off on demo. */
      draftsEnabled: parsed.enabled && !ctx.user.isDemo,
      ollamaDefaultUrl:
        parsed.ollamaBaseUrl?.trim() ||
        process.env.OLLAMA_BASE_URL?.trim() ||
        "http://127.0.0.1:11434",
    };
  }),

  setSettings: ownerProcedure.input(AiSettings).mutation(async ({ ctx, input }) => {
    // AI/LLM/ML is Core+ only — Lite cannot enable it.
    await assertPlanFeature(ctx.db, "ai");
    if (demoBlocksAiSettings(ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: DEMO_AI_SETTINGS_MESSAGE });
    }
    const org = await getOrgSettings(ctx.db);
    const prev = parseAiSettings(org.aiSettings);

    if (input.cloudApiKey && input.cloudApiKey.length > MAX_CLOUD_API_KEY_CHARS) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `That API key is longer than ${MAX_CLOUD_API_KEY_CHARS} characters — check it was pasted correctly.`,
      });
    }

    // Preserve the stored cloud key when the form leaves it blank.
    //
    // `prev.cloudApiKey` is the OPENED key. If it could not be opened (a rotated
    // SESSION_SECRET), getOrgSettings reports it absent — and blindly carrying
    // that "absent" forward would destroy ciphertext that a restored secret
    // could still recover. So only treat a blank submission as "keep" when
    // there is genuinely nothing stored, and otherwise make the user re-enter.
    const storedRaw = (org.aiSettings as { cloudApiKey?: unknown } | null)?.cloudApiKey;
    const hasUnreadableKey = typeof storedRaw === "string" && !prev.cloudApiKey;
    if (hasUnreadableKey && !input.cloudApiKey?.trim() && input.provider === "cloud") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "The stored API key can no longer be decrypted (SESSION_SECRET changed). Re-enter the key to continue using a cloud provider.",
      });
    }

    const toStore = {
      ...input,
      cloudApiKey: input.cloudApiKey?.trim() ? input.cloudApiKey : prev.cloudApiKey,
    };

    // The cloud (bring-your-own-API) provider is open to every account but needs full config.
    if (toStore.provider === "cloud") {
      const cerr = cloudAiConfigError(toStore);
      if (cerr) throw new TRPCError({ code: "BAD_REQUEST", message: cerr });
      if (!toStore.cloudApiKey?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "An API key is required for a cloud provider." });
      }
    }

    // Seal the BYO key at rest; getOrgSettings opens it on read.
    const sealed = {
      ...toStore,
      cloudApiKey: toStore.cloudApiKey?.trim() ? sealSecret(toStore.cloudApiKey) : undefined,
    };
    const [row] = await ctx.db
      .update(orgSettings)
      .set({ aiSettings: sealed })
      .where(eq(orgSettings.id, org.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "settings",
      entityId: org.id,
      action: "AI_SETTINGS",
      actorId: ctx.user.id,
      after: { ...toPublicAiSettings(toStore) },
    });
    return toPublicAiSettings(parseAiSettings(row!.aiSettings));
  }),

  listRuns: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = input.projectId
        ? eq(aiRuns.projectId, input.projectId)
        : eq(aiRuns.userId, ctx.user.id);
      return ctx.db
        .select()
        .from(aiRuns)
        .where(where)
        .orderBy(desc(aiRuns.createdAt))
        .limit(input.limit);
    }),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(aiRuns).where(eq(aiRuns.id, input.id));
    if (!row) return null;
    if (row.userId !== ctx.user.id && !canEditAi(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return row;
  }),

  generate: protectedProcedure.input(AiGenerateInput).mutation(async ({ ctx, input }) => {
    // AI/LLM/ML is Core+ only — Lite has no AI capabilities.
    await assertPlanFeature(ctx.db, "ai");
    if (demoBlocksAiDraft(ctx.user, input.mode)) {
      throw new TRPCError({ code: "FORBIDDEN", message: DEMO_AI_DRAFT_MESSAGE });
    }
    if (!can(ctx.user.role, "write") && input.mode !== "agent") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Document drafts require write access — use the ESTI agent for questions.",
      });
    }
    const org = await getOrgSettings(ctx.db);
    const settings = parseAiSettings(org.aiSettings);
    if (!settings.enabled) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "AI Studio is disabled — enable in Company settings",
      });
    }

    let result;
    try {
      result = await runAiGateway(ctx.db, ctx.user, settings, input);
    } catch (e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "AI generation failed",
      });
    }

    const outputText = settings.redactPii ? redactPii(result.output) : result.output;

    const [row] = await ctx.db
      .insert(aiRuns)
      .values({
        userId: ctx.user.id,
        projectId: input.projectId ?? null,
        kind: input.kind,
        provider: result.provider,
        model: result.model,
        promptSummary: result.promptSummary,
        sources: result.sources,
        outputText,
        approvalState: "DRAFT",
        usedExternalApi: result.usedExternalApi ? "true" : "false",
        tokenEstimate: result.tokenEstimate != null ? String(result.tokenEstimate) : null,
        source: "aorms",
      })
      .returning();

    // P3.4 — increment monthly hosted token counter (BYO-API calls excluded).
    if (!result.usedExternalApi && result.tokenEstimate) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      await ctx.db
        .update(orgSettings)
        .set({
          aiTokensThisMonth: sql`
            CASE
              WHEN "ai_tokens_month_start" IS NULL
                OR date_trunc('month', "ai_tokens_month_start") < date_trunc('month', now())
              THEN ${result.tokenEstimate}
              ELSE "ai_tokens_this_month" + ${result.tokenEstimate}
            END`,
          aiTokensMonthStart: sql`
            CASE
              WHEN "ai_tokens_month_start" IS NULL
                OR date_trunc('month', "ai_tokens_month_start") < date_trunc('month', now())
              THEN ${monthStart.toISOString()}::timestamptz
              ELSE "ai_tokens_month_start"
            END`,
        });
    }

    await writeAudit(ctx.db, {
      entity: "ai_run",
      entityId: row!.id,
      action: "GENERATE",
      actorId: ctx.user.id,
      after: {
        kind: input.kind,
        provider: result.provider,
        model: result.model,
        usedExternalApi: result.usedExternalApi,
        sourceCount: result.sources.length,
      },
    });

    return {
      runId: row!.id,
      kind: row!.kind,
      provider: row!.provider,
      model: row!.model,
      output: row!.outputText,
      sources: result.sources,
      approvalState: row!.approvalState,
      usedExternalApi: result.usedExternalApi,
    };
  }),


  updateRun: protectedProcedure.input(AiRunUpdate).mutation(async ({ ctx, input }) => {
    if (ctx.user.isDemo) {
      throw new TRPCError({ code: "FORBIDDEN", message: DEMO_AI_DRAFT_MESSAGE });
    }
    const [before] = await ctx.db.select().from(aiRuns).where(eq(aiRuns.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    if (before.userId !== ctx.user.id && !canEditAi(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    if (before.approvalState === "ISSUED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Issued AI draft is locked" });
    }

    const org = await getOrgSettings(ctx.db);
    const settings = parseAiSettings(org.aiSettings);
    const outputText =
      input.output !== undefined ?
        settings.redactPii ?
          redactPii(input.output)
        : input.output
      : before.outputText;

    const [row] = await ctx.db
      .update(aiRuns)
      .set({
        ...(input.output !== undefined ? { outputText } : {}),
        ...(input.approvalState !== undefined ? { approvalState: input.approvalState } : {}),
      })
      .where(eq(aiRuns.id, input.id))
      .returning();

    await writeAudit(ctx.db, {
      entity: "ai_run",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before: { approvalState: before.approvalState },
      after: { approvalState: row!.approvalState },
    });
    return row!;
  }),
});
