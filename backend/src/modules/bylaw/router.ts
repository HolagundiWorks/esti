import { BYLAW_PARAMETERS, BylawCreate, BylawUpdate } from "@esti/contracts";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { bylaws } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const bylawRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(bylaws)
        .where(eq(bylaws.projectId, input.projectId))
        .orderBy(asc(bylaws.createdAt));
    }),

  create: protectedProcedure.input(BylawCreate).mutation(async ({ ctx, input }) => {
    const meta = BYLAW_PARAMETERS[input.parameter];
    const [row] = await ctx.db
      .insert(bylaws)
      .values({
        projectId: input.projectId,
        parameter: input.parameter,
        unit: meta.unit,
        direction: meta.direction,
        permittedValue: input.permittedValue,
        proposedValue: input.proposedValue ?? null,
        clause: input.clause ?? null,
        remarks: input.remarks ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "bylaw",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  update: protectedProcedure.input(BylawUpdate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(bylaws)
      .set({
        ...(input.permittedValue !== undefined ? { permittedValue: input.permittedValue } : {}),
        ...(input.proposedValue !== undefined ? { proposedValue: input.proposedValue } : {}),
        ...(input.clause !== undefined ? { clause: input.clause } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
      })
      .where(eq(bylaws.id, input.id))
      .returning();
    return row ?? null;
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(bylaws).where(eq(bylaws.id, input.id));
      return { ok: true };
    }),
});
