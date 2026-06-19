import { SiteInstructionCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { siteInstructions } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { assertProjectPmcEnabled } from "../../lib/settings.js";
import { enqueueJob } from "../../lib/redis.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

export const siteInstructionsRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectPmcEnabled(ctx.db, input.projectId);
      return ctx.db
        .select()
        .from(siteInstructions)
        .where(eq(siteInstructions.projectId, input.projectId))
        .orderBy(asc(siteInstructions.issuedAt));
    }),

  create: manage.input(SiteInstructionCreate).mutation(async ({ ctx, input }) => {
    await assertProjectPmcEnabled(ctx.db, input.projectId);
    const { ref } = await nextRef(ctx.db, "siteinstruction", "SI");
    const [row] = await ctx.db
      .insert(siteInstructions)
      .values({
        ref,
        projectId: input.projectId,
        contractorId: input.contractorId ?? null,
        subject: input.subject,
        body: input.body ?? null,
        issuedAt: input.issuedAt ?? new Date().toISOString().slice(0, 10),
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "site_instruction",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { ref, subject: input.subject },
    });
    return row!;
  }),

  generatePdf: manage
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectPmcEnabled(ctx.db, input.projectId);
      const [row] = await ctx.db.select().from(siteInstructions).where(eq(siteInstructions.id, input.id));
      if (!row || row.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db
        .update(siteInstructions)
        .set({ pdfStatus: "PENDING", updatedAt: new Date() })
        .where(eq(siteInstructions.id, input.id));
      await enqueueJob(
        "render_pdf",
        { target: "site_instruction", id: row.id, firm: await firmPayload(ctx.db) },
        ctx.requestId,
      );
      return { ok: true as const };
    }),
});
