import { RepoSourceCreate, RepoSourceUpdate, normalizePlainToMarkdown, repoIngestMarkdown } from "@esti/contracts";
import { desc, eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { repoSections, repoSources } from "../../db/schema.js";
import { runEomsRepoProcessing } from "../../lib/ai/eoms-repo.js";
import { writeAudit } from "../../lib/audit.js";
import { demoBlocksAiDraft, DEMO_AI_DRAFT_MESSAGE } from "../../lib/demo-policy.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");
const idInput = z.object({ id: z.string().uuid() });

export const knowledgeBankPortalRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(repoSources).orderBy(desc(repoSources.updatedAt));
    return Promise.all(
      rows.map(async (r) => ({
        ...r,
        fileUrl: r.fileKey ? await presignedGet(r.fileKey).catch(() => null) : null,
        sectionCount: (
          await ctx.db
            .select({ id: repoSections.id })
            .from(repoSections)
            .where(eq(repoSections.sourceId, r.id))
        ).length,
      })),
    );
  }),

  get: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
    const [src] = await ctx.db.select().from(repoSources).where(eq(repoSources.id, input.id));
    if (!src) throw new TRPCError({ code: "NOT_FOUND", message: "Source not found" });
    const sections = await ctx.db
      .select()
      .from(repoSections)
      .where(eq(repoSections.sourceId, input.id))
      .orderBy(asc(repoSections.seq));
    return {
      ...src,
      fileUrl: src.fileKey ? await presignedGet(src.fileKey).catch(() => null) : null,
      sections,
    };
  }),

  create: manage.input(RepoSourceCreate).mutation(async ({ ctx, input }) => {
    const markdownText = normalizePlainToMarkdown(input.rawText);
    const [row] = await ctx.db
      .insert(repoSources)
      .values({
        title: input.title,
        author: input.author,
        category: input.category,
        rawText: input.rawText,
        markdownText,
        convertStatus: "READY",
        status: "DRAFT",
        createdBy: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "repo_source",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  update: manage.input(RepoSourceUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const [existing] = await ctx.db.select().from(repoSources).where(eq(repoSources.id, id));
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (existing.status === "PUBLISHED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Unpublish before editing a published source.",
      });
    }
    const patch: Record<string, unknown> = { ...rest, updatedAt: new Date(), status: "DRAFT", processError: null };
    if (rest.rawText !== undefined) {
      patch.markdownText = normalizePlainToMarkdown(rest.rawText);
      patch.convertStatus = "READY";
      patch.convertError = null;
    }
    const [row] = await ctx.db
      .update(repoSources)
      .set(patch)
      .where(eq(repoSources.id, id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "repo_source",
      entityId: id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  remove: manage.input(idInput).mutation(async ({ ctx, input }) => {
    const [src] = await ctx.db.select().from(repoSources).where(eq(repoSources.id, input.id));
    if (src?.fileKey) await removeObject(src.fileKey).catch(() => {});
    await ctx.db.delete(repoSources).where(eq(repoSources.id, input.id));
    await writeAudit(ctx.db, {
      entity: "repo_source",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
    });
    return { ok: true };
  }),

  /** EOMS — rephrase source text and build reviewable library sections. */
  processWithEoms: manage.input(idInput).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "ai");
    if (demoBlocksAiDraft(ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: DEMO_AI_DRAFT_MESSAGE });
    }

    const [src] = await ctx.db.select().from(repoSources).where(eq(repoSources.id, input.id));
    if (!src) throw new TRPCError({ code: "NOT_FOUND" });
    if (src.convertStatus === "PROCESSING") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "PDF is still converting to Markdown. Wait for conversion to finish.",
      });
    }
    const markdown = repoIngestMarkdown(src);
    if (!markdown || markdown.length < 200) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Add at least 200 characters of source markdown before running EOMS.",
      });
    }

    await ctx.db
      .update(repoSources)
      .set({ status: "PROCESSING", processError: null, updatedAt: new Date() })
      .where(eq(repoSources.id, input.id));

    try {
      const result = await runEomsRepoProcessing(ctx.db, {
        title: src.title,
        author: src.author,
        rawText: markdown,
      });

      await ctx.db.delete(repoSections).where(eq(repoSections.sourceId, input.id));
      if (result.sections.length) {
        await ctx.db.insert(repoSections).values(
          result.sections.map((s, seq) => ({
            sourceId: input.id,
            seq,
            title: s.title,
            summary: s.summary,
            rephrased: s.rephrased,
          })),
        );
      }

      const [row] = await ctx.db
        .update(repoSources)
        .set({
          status: "REVIEW",
          executiveSummary: result.executiveSummary,
          processedAt: new Date(),
          processError: null,
          updatedAt: new Date(),
        })
        .where(eq(repoSources.id, input.id))
        .returning();

      await writeAudit(ctx.db, {
        entity: "repo_source",
        entityId: input.id,
        action: "EOMS_PROCESS",
        actorId: ctx.user.id,
        after: { sectionCount: result.sections.length, provider: result.provider },
      });

      return row!;
    } catch (err) {
      const message = err instanceof Error ? err.message : "EOMS processing failed";
      await ctx.db
        .update(repoSources)
        .set({ status: "FAILED", processError: message, updatedAt: new Date() })
        .where(eq(repoSources.id, input.id));
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
    }
  }),

  publish: manage.input(idInput).mutation(async ({ ctx, input }) => {
    const [src] = await ctx.db.select().from(repoSources).where(eq(repoSources.id, input.id));
    if (!src) throw new TRPCError({ code: "NOT_FOUND" });
    if (src.status !== "REVIEW" && src.status !== "PUBLISHED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Run EOMS processing and review sections before publishing.",
      });
    }
    const [row] = await ctx.db
      .update(repoSources)
      .set({ status: "PUBLISHED", publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(repoSources.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "repo_source",
      entityId: input.id,
      action: "PUBLISH",
      actorId: ctx.user.id,
    });
    return row!;
  }),

  unpublish: manage.input(idInput).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(repoSources)
      .set({ status: "REVIEW", publishedAt: null, updatedAt: new Date() })
      .where(eq(repoSources.id, input.id))
      .returning();
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await writeAudit(ctx.db, {
      entity: "repo_source",
      entityId: input.id,
      action: "UNPUBLISH",
      actorId: ctx.user.id,
    });
    return row;
  }),
});
