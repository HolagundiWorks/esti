import {
  AiGenerateInput,
  AiGenerateCadInput,
  AiRunUpdate,
  AiSettings,
  cloudAiConfigError,
  isCadAiDraftKind,
  parseAiSettings,
  toPublicAiSettings,
} from "@esti/contracts";
import { can } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { aiRuns, orgSettings } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { runAiGateway } from "../../lib/ai/gateway.js";
import { redactPii } from "../../lib/ai/redact.js";
import { getOrgSettings } from "../../lib/settings.js";
import { demoBlocksAiDraft, demoBlocksAiSettings, DEMO_AI_DRAFT_MESSAGE, DEMO_AI_SETTINGS_MESSAGE } from "../../lib/demo-policy.js";
import { resolveCompanionCapabilities } from "../../lib/companion/capabilities.js";
import { companionWriteProcedure, ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

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

    // Preserve the stored cloud key when the form leaves it blank.
    const toStore = {
      ...input,
      cloudApiKey: input.cloudApiKey?.trim() ? input.cloudApiKey : prev.cloudApiKey,
    };

    // The cloud (bring-your-own-API) provider is Enterprise-only and needs full config.
    if (toStore.provider === "cloud") {
      await assertPlanFeature(ctx.db, "aiByoApi");
      const cerr = cloudAiConfigError(toStore);
      if (cerr) throw new TRPCError({ code: "BAD_REQUEST", message: cerr });
      if (!toStore.cloudApiKey?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "An API key is required for a cloud provider." });
      }
    }

    const [row] = await ctx.db
      .update(orgSettings)
      .set({ aiSettings: toStore })
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
    if (isCadAiDraftKind(input.kind)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "CAD AI drafts are available from ESTICAD only (ai.generateCad).",
      });
    }
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
    // The cloud (bring-your-own-API) provider is Enterprise-only.
    if (settings.provider === "cloud") await assertPlanFeature(ctx.db, "aiByoApi");

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

  /** ESTICAD companion — CAD-specific Ollama drafts with JSON proposals (Phase 13D). */
  generateCad: companionWriteProcedure.input(AiGenerateCadInput).mutation(async ({ ctx, input }) => {
    // AI/LLM/ML is Core+ only — Lite has no AI capabilities.
    await assertPlanFeature(ctx.db, "ai");
    const caps = await resolveCompanionCapabilities(ctx.db, ctx.user);
    if (!caps.ai) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          ctx.user.isDemo ?
            "ESTICAD AI is disabled on demo accounts."
          : "ESTICAD AI is disabled — enable AI Studio in Company settings.",
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
    // The cloud (bring-your-own-API) provider is Enterprise-only.
    if (settings.provider === "cloud") await assertPlanFeature(ctx.db, "aiByoApi");

    let result;
    try {
      result = await runAiGateway(ctx.db, ctx.user, settings, {
        kind: input.kind,
        projectId: input.projectId,
        drawingId: input.drawingId,
        prompt: input.prompt,
        cadContext: input.context,
      });
    } catch (e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "CAD AI generation failed",
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
        source: "esticad",
      })
      .returning();

    await writeAudit(ctx.db, {
      entity: "ai_run",
      entityId: row!.id,
      action: "GENERATE_CAD",
      actorId: ctx.user.id,
      after: {
        kind: input.kind,
        provider: result.provider,
        model: result.model,
        source: "esticad",
        deviceSessionId: ctx.deviceSessionId,
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
