import { ProgressReportCreate, ProgressReportUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { progressReports, snags } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { assertProjectPmcEnabled } from "../../lib/settings.js";
import { enqueueJob } from "../../lib/redis.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

export const progressReportsRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectPmcEnabled(ctx.db, input.projectId);
      return ctx.db
        .select()
        .from(progressReports)
        .where(eq(progressReports.projectId, input.projectId))
        .orderBy(desc(progressReports.periodEnd));
    }),

  createDraft: manage.input(ProgressReportCreate).mutation(async ({ ctx, input }) => {
    await assertProjectPmcEnabled(ctx.db, input.projectId);
    const openSnags = await ctx.db
      .select({ id: snags.id })
      .from(snags)
      .where(and(eq(snags.projectId, input.projectId), ne(snags.status, "CLOSED")));
    const [row] = await ctx.db
      .insert(progressReports)
      .values({
        projectId: input.projectId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        narrative: input.narrative ?? null,
        physicalProgressPct: input.physicalProgressPct ?? null,
        scheduleProgressPct: input.physicalProgressPct ?? 0,
        openSnagCount: openSnags.length,
        openRfiCount: 0,
        status: "DRAFT",
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "progress_report",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { periodStart: input.periodStart, periodEnd: input.periodEnd },
    });
    return row!;
  }),

  update: manage.input(ProgressReportUpdate).mutation(async ({ ctx, input }) => {
    await assertProjectPmcEnabled(ctx.db, input.projectId);
    const [before] = await ctx.db
      .select()
      .from(progressReports)
      .where(eq(progressReports.id, input.id));
    if (!before || before.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    if (before.status === "ISSUED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Issued reports cannot be edited" });
    }
    const [row] = await ctx.db
      .update(progressReports)
      .set({
        ...(input.narrative !== undefined ? { narrative: input.narrative } : {}),
        ...(input.physicalProgressPct !== undefined ?
          { physicalProgressPct: input.physicalProgressPct }
        : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(progressReports.id, input.id), eq(progressReports.projectId, input.projectId)))
      .returning();
    return row!;
  }),

  generatePdf: manage
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectPmcEnabled(ctx.db, input.projectId);
      const [row] = await ctx.db
        .select()
        .from(progressReports)
        .where(eq(progressReports.id, input.id));
      if (!row || row.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db
        .update(progressReports)
        .set({ pdfStatus: "PENDING", status: "ISSUED", updatedAt: new Date() })
        .where(eq(progressReports.id, input.id));
      await enqueueJob(
        "render_pdf",
        { target: "progress_report", id: row.id, firm: await firmPayload(ctx.db) },
        ctx.requestId,
      );
      await writeAudit(ctx.db, {
        entity: "progress_report",
        entityId: input.id,
        action: "ISSUE",
        actorId: ctx.user.id,
      });
      return { ok: true as const };
    }),
});
