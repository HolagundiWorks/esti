import { ClientLogCreate } from "@esti/contracts";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { clientLogs, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const clientLogRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(clientLogs)
        .where(eq(clientLogs.projectId, input.projectId))
        .orderBy(desc(clientLogs.occurredAt), desc(clientLogs.createdAt));
    }),

  create: protectedProcedure.input(ClientLogCreate).mutation(async ({ ctx, input }) => {
    // Denormalise the client from the project so the timeline is client-aware.
    const [proj] = await ctx.db
      .select({ clientId: projectOffices.clientId })
      .from(projectOffices)
      .where(eq(projectOffices.id, input.projectId));

    const [row] = await ctx.db
      .insert(clientLogs)
      .values({
        projectId: input.projectId,
        clientId: proj?.clientId ?? null,
        kind: input.kind,
        occurredAt: input.occurredAt,
        subject: input.subject,
        body: input.body ?? null,
        followUpDate: input.followUpDate ?? null,
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "clientlog",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(clientLogs).where(eq(clientLogs.id, input.id));
      return { ok: true };
    }),
});
