import { SnagCreate, SnagUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { snags } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

export const snagsRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {      return ctx.db
        .select()
        .from(snags)
        .where(eq(snags.projectId, input.projectId))
        .orderBy(asc(snags.dueDate), asc(snags.createdAt));
    }),

  create: manage.input(SnagCreate).mutation(async ({ ctx, input }) => {    const { ref } = await nextRef(ctx.db, "snag", "SNG");
    const [row] = await ctx.db
      .insert(snags)
      .values({
        projectId: input.projectId,
        ref,
        location: input.location ?? null,
        trade: input.trade ?? null,
        description: input.description,
        dueDate: input.dueDate ?? null,
        status: "OPEN",
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "snag",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { ref, projectId: input.projectId },
    });
    return row!;
  }),

  update: manage.input(SnagUpdate).mutation(async ({ ctx, input }) => {    const [before] = await ctx.db.select().from(snags).where(eq(snags.id, input.id));
    if (!before || before.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const closedAt =
      input.status === "CLOSED" && before.status !== "CLOSED" ? new Date()
      : input.status && input.status !== "CLOSED" ? null
      : before.closedAt;
    const [row] = await ctx.db
      .update(snags)
      .set({
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.trade !== undefined ? { trade: input.trade } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status, closedAt } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(snags.id, input.id), eq(snags.projectId, input.projectId)))
      .returning();
    await writeAudit(ctx.db, {
      entity: "snag",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before: { status: before.status },
      after: { status: row!.status },
    });
    return row!;
  }),

  remove: manage
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {      const [before] = await ctx.db.select().from(snags).where(eq(snags.id, input.id));
      if (!before || before.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.delete(snags).where(eq(snags.id, input.id));
      await writeAudit(ctx.db, {
        entity: "snag",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before: { ref: before.ref },
      });
      return { ok: true as const };
    }),
});
