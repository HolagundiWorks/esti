/**
 * AORMS-Consultancy — Phase 0 "Living record" (engineering consultancies).
 * `consultancy.engagements.*` + `consultancy.deliverables.*` — the engagement
 * spine and the deliverable register everything later (sign-off chains, TQs,
 * fee stages) attaches to. Design: docs/esti/AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md.
 */
import {
  ConsDeliverableCreate,
  ConsDeliverableUpdate,
  ConsEngagementCreate,
  ConsEngagementUpdate,
} from "@esti/contracts";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { consDeliverables, consEngagements } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

const engagementsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.select().from(consEngagements).orderBy(desc(consEngagements.updatedAt)),
  ),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(consEngagements)
        .where(eq(consEngagements.id, input.id));
      if (!row) return null;
      const deliverables = await ctx.db
        .select()
        .from(consDeliverables)
        .where(eq(consDeliverables.engagementId, input.id))
        .orderBy(asc(consDeliverables.code));
      return { ...row, deliverables };
    }),

  create: manage.input(ConsEngagementCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(consEngagements).values(input).returning();
    await writeAudit(ctx.db, { entity: "cons_engagement", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: manage.input(ConsEngagementUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const [row] = await ctx.db
      .update(consEngagements)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(consEngagements.id, id))
      .returning();
    await writeAudit(ctx.db, { entity: "cons_engagement", entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consEngagements).where(eq(consEngagements.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_engagement", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

const deliverablesRouter = router({
  listByEngagement: protectedProcedure
    .input(z.object({ engagementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consDeliverables)
        .where(eq(consDeliverables.engagementId, input.engagementId))
        .orderBy(asc(consDeliverables.code)),
    ),

  create: manage.input(ConsDeliverableCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(consDeliverables).values(input).returning();
    await writeAudit(ctx.db, { entity: "cons_deliverable", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: manage.input(ConsDeliverableUpdate).mutation(async ({ ctx, input }) => {
    const { id, status, ...rest } = input;
    const [row] = await ctx.db
      .update(consDeliverables)
      .set({
        ...rest,
        ...(status
          ? {
              status,
              // Record the issue moment; Phase 1's sign-off chain will gate it.
              ...(status === "ISSUED" ? { issuedAt: new Date() } : {}),
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(consDeliverables.id, id))
      .returning();
    await writeAudit(ctx.db, { entity: "cons_deliverable", entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consDeliverables).where(eq(consDeliverables.id, input.id));
    await writeAudit(ctx.db, { entity: "cons_deliverable", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});

export const consultancyRouter = router({
  engagements: engagementsRouter,
  deliverables: deliverablesRouter,
});
