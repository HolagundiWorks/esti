import { PermitCreate, PermitUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { permits } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const permitRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(permits)
        .where(eq(permits.projectId, input.projectId))
        .orderBy(asc(permits.dateDue));
    }),

  create: protectedProcedure.input(PermitCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "permit", "PRM");
    const [row] = await ctx.db
      .insert(permits)
      .values({
        ref,
        projectId: input.projectId,
        permitType: input.permitType,
        authority: input.authority,
        applicationNo: input.applicationNo ?? null,
        dateDue: input.dateDue ?? null,
        portalUrl: input.portalUrl ?? null,
        remarks: input.remarks ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "permit",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  update: protectedProcedure.input(PermitUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(permits).where(eq(permits.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .update(permits)
      .set({
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.applicationNo !== undefined ? { applicationNo: input.applicationNo } : {}),
        ...(input.dateSubmitted !== undefined ? { dateSubmitted: input.dateSubmitted } : {}),
        ...(input.dateApproved !== undefined ? { dateApproved: input.dateApproved } : {}),
        ...(input.dateDue !== undefined ? { dateDue: input.dateDue } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
      })
      .where(eq(permits.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "permit",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before,
      after: row,
    });
    return row!;
  }),
});
