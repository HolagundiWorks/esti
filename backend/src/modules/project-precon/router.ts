/**
 * AORMS-Studio — pre-construction R&O on a project office.
 * Risk + opportunity registers + design phase gates (not construction PM).
 */
import {
  ProjectOpportunityCreate,
  ProjectOpportunityUpdate,
  ProjectPhaseGateUpsert,
  ProjectRiskCreate,
  ProjectRiskUpdate,
  canDecidePhaseGate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  projectOpportunities,
  projectPhaseGates,
  projectRisks,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";
import { getProjectById } from "../projectoffice/queries.js";

const manage = capabilityProcedure("write");

export const projectPreconRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getProjectById(ctx.db, input.projectId);
      const [risks, opportunities, phaseGates] = await Promise.all([
        ctx.db
          .select()
          .from(projectRisks)
          .where(eq(projectRisks.projectId, input.projectId))
          .orderBy(desc(projectRisks.createdAt)),
        ctx.db
          .select()
          .from(projectOpportunities)
          .where(eq(projectOpportunities.projectId, input.projectId))
          .orderBy(desc(projectOpportunities.createdAt)),
        ctx.db
          .select()
          .from(projectPhaseGates)
          .where(eq(projectPhaseGates.projectId, input.projectId))
          .orderBy(asc(projectPhaseGates.gateKey)),
      ]);
      return { risks, opportunities, phaseGates };
    }),

  createRisk: manage.input(ProjectRiskCreate).mutation(async ({ ctx, input }) => {
    await getProjectById(ctx.db, input.projectId);
    const [row] = await ctx.db
      .insert(projectRisks)
      .values({
        ...input,
        residualLikelihood: input.residualLikelihood ?? input.likelihood,
        residualImpact: input.residualImpact ?? input.impact,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "project_risk",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  updateRisk: manage.input(ProjectRiskUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const [row] = await ctx.db
      .update(projectRisks)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(projectRisks.id, id))
      .returning();
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return row;
  }),

  removeRisk: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(projectRisks).where(eq(projectRisks.id, input.id));
    return { ok: true as const };
  }),

  createOpportunity: manage.input(ProjectOpportunityCreate).mutation(async ({ ctx, input }) => {
    await getProjectById(ctx.db, input.projectId);
    const [row] = await ctx.db.insert(projectOpportunities).values(input).returning();
    await writeAudit(ctx.db, {
      entity: "project_opportunity",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  updateOpportunity: manage
    .input(ProjectOpportunityUpdate)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(projectOpportunities)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(projectOpportunities.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  removeOpportunity: manage
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(projectOpportunities).where(eq(projectOpportunities.id, input.id));
      return { ok: true as const };
    }),

  upsertPhaseGate: manage.input(ProjectPhaseGateUpsert).mutation(async ({ ctx, input }) => {
    await getProjectById(ctx.db, input.projectId);
    const gate = canDecidePhaseGate({
      decision: input.decision,
      checklist: input.checklist,
    });
    if (!gate.ok)
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: gate.reason });

    const decided =
      input.decision === "PENDING"
        ? {
            decidedBy: null as string | null,
            decidedByName: null as string | null,
            decidedAt: null as Date | null,
          }
        : {
            decidedBy: ctx.user.id,
            decidedByName: ctx.user.fullName,
            decidedAt: new Date(),
          };

    const [existing] = await ctx.db
      .select()
      .from(projectPhaseGates)
      .where(
        and(
          eq(projectPhaseGates.projectId, input.projectId),
          eq(projectPhaseGates.gateKey, input.gateKey),
        ),
      )
      .limit(1);

    if (existing) {
      const [row] = await ctx.db
        .update(projectPhaseGates)
        .set({
          phaseId: input.phaseId ?? existing.phaseId,
          checklist: input.checklist,
          decision: input.decision,
          notes: input.notes ?? existing.notes,
          ...decided,
          updatedAt: new Date(),
        })
        .where(eq(projectPhaseGates.id, existing.id))
        .returning();
      return row!;
    }

    const [row] = await ctx.db
      .insert(projectPhaseGates)
      .values({
        projectId: input.projectId,
        gateKey: input.gateKey,
        phaseId: input.phaseId,
        checklist: input.checklist,
        decision: input.decision,
        notes: input.notes,
        ...decided,
      })
      .returning();
    return row!;
  }),
});
