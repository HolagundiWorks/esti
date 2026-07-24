/**
 * Pre-construction R&O — opportunity register + design phase gates.
 * Consultancy scope only (docs/esti/AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md).
 */
import {
  ConsOpportunityCreate,
  ConsOpportunityUpdate,
  ConsPhaseGateUpsert,
  canDecidePhaseGate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { consOpportunities, consPhaseGates } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

export const opportunitiesRouter = router({
  listByEngagement: protectedProcedure
    .input(z.object({ engagementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consOpportunities)
        .where(eq(consOpportunities.engagementId, input.engagementId))
        .orderBy(desc(consOpportunities.createdAt)),
    ),

  create: manage.input(ConsOpportunityCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(consOpportunities).values(input).returning();
    await writeAudit(ctx.db, {
      entity: "cons_opportunity",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  update: manage.input(ConsOpportunityUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const [row] = await ctx.db
      .update(consOpportunities)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(consOpportunities.id, id))
      .returning();
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await writeAudit(ctx.db, {
      entity: "cons_opportunity",
      entityId: id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consOpportunities).where(eq(consOpportunities.id, input.id));
    await writeAudit(ctx.db, {
      entity: "cons_opportunity",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
    });
    return { ok: true as const };
  }),
});

export const phaseGatesRouter = router({
  listByEngagement: protectedProcedure
    .input(z.object({ engagementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consPhaseGates)
        .where(eq(consPhaseGates.engagementId, input.engagementId))
        .orderBy(asc(consPhaseGates.gateKey)),
    ),

  upsert: manage.input(ConsPhaseGateUpsert).mutation(async ({ ctx, input }) => {
    const gate = canDecidePhaseGate({
      decision: input.decision,
      checklist: input.checklist,
    });
    if (!gate.ok)
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: gate.reason });

    const decided =
      input.decision === "PENDING"
        ? { decidedBy: null as string | null, decidedByName: null as string | null, decidedAt: null as Date | null }
        : {
            decidedBy: ctx.user.id,
            decidedByName: ctx.user.fullName,
            decidedAt: new Date(),
          };

    const [existing] = await ctx.db
      .select()
      .from(consPhaseGates)
      .where(
        and(
          eq(consPhaseGates.engagementId, input.engagementId),
          eq(consPhaseGates.gateKey, input.gateKey),
        ),
      )
      .limit(1);

    if (existing) {
      const [row] = await ctx.db
        .update(consPhaseGates)
        .set({
          phaseId: input.phaseId ?? existing.phaseId,
          checklist: input.checklist,
          decision: input.decision,
          notes: input.notes ?? existing.notes,
          ...decided,
          updatedAt: new Date(),
        })
        .where(eq(consPhaseGates.id, existing.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "cons_phase_gate",
        entityId: existing.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }

    const [row] = await ctx.db
      .insert(consPhaseGates)
      .values({
        engagementId: input.engagementId,
        gateKey: input.gateKey,
        phaseId: input.phaseId,
        checklist: input.checklist,
        decision: input.decision,
        notes: input.notes,
        ...decided,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "cons_phase_gate",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),
});
