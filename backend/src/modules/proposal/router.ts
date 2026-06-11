import { ProposalCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { projectOffices, proposals } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { requireUnissuedDocument } from "../../lib/retention.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

// Proposals quote the fee — Partner/Owner only, consistent with fee proposals.
const manage = capabilityProcedure("fees:manage");

export const proposalRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db.select().from(proposals).where(eq(proposals.projectId, input.projectId)).orderBy(desc(proposals.createdAt)),
    ),

  /** All proposals across projects (office-wide Office view). */
  listAll: protectedProcedure.query(async ({ ctx }) =>
    ctx.db
      .select({
        id: proposals.id,
        ref: proposals.ref,
        projectId: proposals.projectId,
        projectRef: projectOffices.ref,
        projectTitle: projectOffices.title,
        workType: proposals.workType,
        feePaise: proposals.feePaise,
        status: proposals.status,
        pdfStatus: proposals.pdfStatus,
      })
      .from(proposals)
      .innerJoin(projectOffices, eq(projectOffices.id, proposals.projectId))
      .orderBy(desc(proposals.createdAt))
      .limit(300),
  ),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(proposals).where(eq(proposals.id, input.id));
    if (!row) return null;
    const pdfUrl = row.pdfKey ? await presignedGet(row.pdfKey).catch(() => null) : null;
    return { ...row, pdfUrl };
  }),

  create: manage.input(ProposalCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "proposal", "PRP");
    const [row] = await ctx.db
      .insert(proposals)
      .values({
        ref,
        projectId: input.projectId,
        workType: input.workType,
        scope: input.scope ?? null,
        feePaise: input.feePaise,
        notes: input.notes ?? null,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "proposal", entityId: row!.id, action: "CREATE", actorId: ctx.user.id });
    return row!;
  }),

  generatePdf: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(proposals).where(eq(proposals.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.update(proposals).set({ pdfStatus: "PENDING" }).where(eq(proposals.id, input.id));
    await enqueueJob("render_pdf", { target: "proposal", id: row.id, firm: await firmPayload(ctx.db) }, ctx.requestId);
    await writeAudit(ctx.db, {
      entity: "proposal",
      entityId: input.id,
      action: "PDF_REQUEST",
      actorId: ctx.user.id,
      before: { pdfStatus: row.pdfStatus },
      after: { pdfStatus: "PENDING" },
    });
    return { ok: true };
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(proposals).where(eq(proposals.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    requireUnissuedDocument(row, "Proposal");
    if (row?.pdfKey) await removeObject(row.pdfKey);
    await ctx.db.delete(proposals).where(eq(proposals.id, input.id));
    await writeAudit(ctx.db, {
      entity: "proposal",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
      before: row,
    });
    return { ok: true };
  }),
});
