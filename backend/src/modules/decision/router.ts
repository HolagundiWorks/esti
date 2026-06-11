import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { DECISION_TRANSITIONS, DecisionState } from "@esti/contracts";
import { decisions } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const decisionInput = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2).max(200),
  rationale: z.string().min(2).max(4000),
  state: DecisionState.default("DRAFT"),
  revisionCategory: z.enum(["MINOR", "MAJOR", "CRITICAL"]).optional(),
  impact: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
  ownerName: z.string().max(120).optional(),
  reviewDeadline: z.string().date().optional(),
  linkedObjectType: z.string().max(80).optional(),
  linkedObjectId: z.string().max(120).optional(),
});

export const decisionRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(decisions)
        .where(eq(decisions.projectId, input.projectId))
        .orderBy(desc(decisions.createdAt));
    }),

  create: protectedProcedure.input(decisionInput).mutation(async ({ ctx, input }) => {
    const row = await ctx.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(decisions)
        .values({
          projectId: input.projectId,
          title: input.title,
          rationale: input.rationale,
          state: input.state,
          revisionCategory: input.revisionCategory ?? null,
          impact: input.impact,
          ownerName: input.ownerName ?? null,
          reviewDeadline: input.reviewDeadline ?? null,
          linkedObjectType: input.linkedObjectType ?? null,
          linkedObjectId: input.linkedObjectId ?? null,
          actorId: ctx.user.id,
          actorName: ctx.user.fullName,
          approval: "PENDING",
          status: "OPEN",
        })
        .returning();
      await writeActivity(tx, {
        projectId: input.projectId,
        objectType: "decision",
        objectId: created!.id,
        eventType: "decision.created",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "STAFF",
        summary: created!.title,
        metadata: created,
      });
      await writeAudit(tx, {
        entity: "decision",
        entityId: created!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: created,
      });
      return created!;
    });
    return row;
  }),

  update: protectedProcedure
    .input(
      decisionInput.extend({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(decisions).where(eq(decisions.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Decision not found" });
      const row = await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(decisions)
          .set({
            title: input.title,
            rationale: input.rationale,
            state: input.state,
            revisionCategory: input.revisionCategory ?? null,
            impact: input.impact,
            ownerName: input.ownerName ?? null,
            reviewDeadline: input.reviewDeadline ?? null,
            linkedObjectType: input.linkedObjectType ?? null,
            linkedObjectId: input.linkedObjectId ?? null,
            updatedAt: new Date(),
          })
          .where(eq(decisions.id, input.id))
          .returning();
        await writeActivity(tx, {
          projectId: updated!.projectId,
          objectType: "decision",
          objectId: updated!.id,
          eventType: "decision.updated",
          actorId: ctx.user.id,
          actorName: ctx.user.fullName,
          visibility: "STAFF",
          summary: updated!.title,
          metadata: { before, after: updated },
        });
        await writeAudit(tx, {
          entity: "decision",
          entityId: input.id,
          action: "UPDATE",
          actorId: ctx.user.id,
          before,
          after: updated,
        });
        return updated!;
      });
      return row;
    }),

  /** Perform a CRIF state transition on a decision. */
  transition: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        toState: DecisionState,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(decisions).where(eq(decisions.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Decision not found" });

      const fromState = (before.state ?? "OPEN") as DecisionState;
      const allowed = DECISION_TRANSITIONS[fromState] ?? [];
      if (!allowed.includes(input.toState)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Transition from ${fromState} to ${input.toState} is not allowed`,
        });
      }

      const isLocking = input.toState === "LOCKED";
      const row = await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(decisions)
          .set({
            state: input.toState,
            lockedAt: isLocking ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(decisions.id, input.id))
          .returning();
        await writeActivity(tx, {
          projectId: updated!.projectId,
          objectType: "decision",
          objectId: updated!.id,
          eventType: "decision.transitioned",
          actorId: ctx.user.id,
          actorName: ctx.user.fullName,
          visibility: "STAFF",
          summary: `${updated!.title}: ${fromState} → ${input.toState}`,
          metadata: { fromState, toState: input.toState },
        });
        await writeAudit(tx, {
          entity: "decision",
          entityId: input.id,
          action: "UPDATE",
          actorId: ctx.user.id,
          before,
          after: updated,
        });
        return updated!;
      });
      return row;
    }),
});
