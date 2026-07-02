import { EngagementCreate, EngagementPayment, EngagementStatusUpdate, ProjectCursorListParams, clampListLimit } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { consultants, engagements } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { buildCursorPage, cursorWhere } from "../../lib/cursorPage.js";
import { requireProject } from "../../lib/projectScope.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const engagementRouter = router({
  listByProject: protectedProcedure
    .input(ProjectCursorListParams)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: engagements.id,
          consultantId: engagements.consultantId,
          consultantName: consultants.name,
          discipline: consultants.discipline,
          scope: engagements.scope,
          agreedFeePaise: engagements.agreedFeePaise,
          paidPaise: engagements.paidPaise,
          status: engagements.status,
          createdAt: engagements.createdAt,
        })
        .from(engagements)
        .innerJoin(consultants, eq(consultants.id, engagements.consultantId))
        .where(
          and(
            eq(engagements.projectId, input.projectId),
            cursorWhere(input.cursor, engagements.createdAt, engagements.id),
          ),
        )
        .orderBy(desc(engagements.createdAt), desc(engagements.id))
        .limit(clampListLimit(input.limit) + 1);
      return buildCursorPage(rows, input.limit);
    }),

  create: protectedProcedure.input(EngagementCreate).mutation(async ({ ctx, input }) => {
    await requireProject(ctx.db, input.projectId);
    const [row] = await ctx.db
      .insert(engagements)
      .values({
        projectId: input.projectId,
        consultantId: input.consultantId,
        scope: input.scope ?? null,
        agreedFeePaise: input.agreedFeePaise,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "engagement",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  recordPayment: protectedProcedure
    .input(EngagementPayment)
    .mutation(async ({ ctx, input }) => {
      const [cur] = await ctx.db.select().from(engagements).where(eq(engagements.id, input.id));
      if (!cur) throw new TRPCError({ code: "NOT_FOUND" });
      const paidPaise = cur.paidPaise + input.amountPaise;
      const [row] = await ctx.db
        .update(engagements)
        .set({ paidPaise })
        .where(eq(engagements.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "engagement",
        entityId: input.id,
        action: "PAYMENT",
        actorId: ctx.user.id,
        before: { paidPaise: cur.paidPaise },
        after: { paidPaise, amountPaise: input.amountPaise },
      });
      return row!;
    }),

  updateStatus: protectedProcedure
    .input(EngagementStatusUpdate)
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(engagements).where(eq(engagements.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      const [row] = await ctx.db
        .update(engagements)
        .set({ status: input.status })
        .where(eq(engagements.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "engagement",
        entityId: input.id,
        action: "STATUS_UPDATE",
        actorId: ctx.user.id,
        before: { status: before.status },
        after: { status: row!.status },
      });
      return row!;
    }),
});
