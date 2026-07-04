/**
 * Client–Project Intelligence (CPI) — residential onboarding questionnaire.
 * Sections save individually into a per-project JSONB map; `generateReport`
 * asks ESTI to synthesize the responses into the Client Intelligence Report
 * (Section 21), which the architect reviews, edits and saves.
 */
import { CpiReport, CpiUpsertSection, parseCpiReport } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { aiRuns, cpiResponses } from "../../db/schema.js";
import { runAiGateway } from "../../lib/ai/gateway.js";
import { parseAiSettings } from "@esti/contracts";
import { getOrgSettings } from "../../lib/settings.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { getProjectById } from "../projectoffice/queries.js";

type Db = Parameters<Parameters<typeof protectedProcedure.query>[0]>[0]["ctx"]["db"];

async function getOrCreateCpi(db: Db, projectId: string) {
  const [existing] = await db
    .select()
    .from(cpiResponses)
    .where(eq(cpiResponses.projectId, projectId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(cpiResponses)
    .values({ projectId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [raced] = await db
    .select()
    .from(cpiResponses)
    .where(eq(cpiResponses.projectId, projectId))
    .limit(1);
  return raced!;
}

export const cpiRouter = router({
  get: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getProjectById(ctx.db, input.projectId);
      return getOrCreateCpi(ctx.db, input.projectId);
    }),

  saveSection: protectedProcedure.input(CpiUpsertSection).mutation(async ({ ctx, input }) => {
    await getProjectById(ctx.db, input.projectId);
    const row = await getOrCreateCpi(ctx.db, input.projectId);
    const sections = {
      ...((row.sections as Record<string, unknown>) ?? {}),
      [input.section]: input.data,
    };
    const [updated] = await ctx.db
      .update(cpiResponses)
      .set({ sections, updatedAt: new Date() })
      .where(eq(cpiResponses.projectId, input.projectId))
      .returning();
    await writeAudit(ctx.db, {
      entity: "cpi_response",
      entityId: input.projectId,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: { section: input.section },
    });
    return updated!;
  }),

  /** ESTI drafts the Client Intelligence Report from the saved responses. */
  generateReport: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(ctx.db, input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const row = await getOrCreateCpi(ctx.db, input.projectId);
      const sections = (row.sections as Record<string, unknown>) ?? {};
      if (Object.keys(sections).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No questionnaire responses saved yet — fill in at least one section first.",
        });
      }

      await assertPlanFeature(ctx.db, "ai");
      const org = await getOrgSettings(ctx.db);
      const settings = parseAiSettings(org.aiSettings);
      if (!settings.enabled) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ESTI is not enabled for this office." });
      }

      const header = `Project: ${project.title} (${project.projectType ?? "Residential"})`;
      let result;
      try {
        result = await runAiGateway(ctx.db, ctx.user, settings, {
          kind: "CPI_REPORT",
          projectId: input.projectId,
          prompt: `${header}\n\n${JSON.stringify(sections)}`.slice(0, 24_000),
          contextQuery: input.projectId,
        });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "ESTI could not synthesize the report",
        });
      }

      const report = parseCpiReport(result.output);

      const [run] = await ctx.db
        .insert(aiRuns)
        .values({
          userId: ctx.user.id,
          projectId: input.projectId,
          kind: "CPI_REPORT",
          provider: result.provider,
          model: result.model,
          promptSummary: result.promptSummary,
          sources: result.sources,
          outputText: result.output,
          approvalState: "DRAFT",
          usedExternalApi: result.usedExternalApi ? "true" : "false",
          tokenEstimate: result.tokenEstimate != null ? String(result.tokenEstimate) : null,
        })
        .returning({ id: aiRuns.id });

      if (!report) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ESTI's answer was not a readable report — try again.",
        });
      }
      return { runId: run!.id, report };
    }),

  /** Save the (reviewed, possibly edited) report — marks the CPI complete. */
  saveReport: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), report: CpiReport }))
    .mutation(async ({ ctx, input }) => {
      await getProjectById(ctx.db, input.projectId);
      await getOrCreateCpi(ctx.db, input.projectId);
      const [updated] = await ctx.db
        .update(cpiResponses)
        .set({
          report: input.report,
          reportGeneratedAt: new Date(),
          status: "COMPLETE",
          updatedAt: new Date(),
        })
        .where(eq(cpiResponses.projectId, input.projectId))
        .returning();
      await writeAudit(ctx.db, {
        entity: "cpi_response",
        entityId: input.projectId,
        action: "REPORT_SAVED",
        actorId: ctx.user.id,
        after: { status: "COMPLETE" },
      });
      return updated!;
    }),
});
