import {
  BylawCalcInput,
  PostConstructionActuals,
  computeBylawEnvelope,
  computePostConstructionAudit,
  computePreConstructionPotential,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { bylawCalcs, complianceCalculations } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { loadActiveBbmpRuleCatalog } from "../../lib/bbmpRules.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { syncComplianceBuiltUpToBrief } from "../project-brief/helpers.js";

export const bylawCalcRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(bylawCalcs)
        .where(eq(bylawCalcs.projectId, input.projectId));
      return row ?? null;
    }),

  /** Pre-construction development potential — shared rule engine, authoritative save. */
  save: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), input: BylawCalcInput }))
    .mutation(async ({ ctx, input }) => {
      const catalog = await loadActiveBbmpRuleCatalog(ctx.db);
      const result = computeBylawEnvelope(input.input, catalog);
      const preConstruction = computePreConstructionPotential(input.input, catalog);
      const bbmpRuleSetId = catalog.ruleSetId ?? null;
      const now = new Date();
      const payload = {
        ...result,
        preConstruction,
      };
      const ruleVersion = catalog.label ?? catalog.ruleSetId ?? "bbmp-2003-default";
      const [existing] = await ctx.db
        .select()
        .from(bylawCalcs)
        .where(eq(bylawCalcs.projectId, input.projectId));
      if (existing) {
        const [row] = await ctx.db
          .update(bylawCalcs)
          .set({
            input: input.input,
            result: payload,
            bbmpRuleSetId,
            precomputedAt: now,
          })
          .where(eq(bylawCalcs.id, existing.id))
          .returning();
        await writeAudit(ctx.db, {
          entity: "bylawcalc",
          entityId: existing.id,
          action: "UPDATE",
          actorId: ctx.user.id,
          before: existing,
          after: row,
        });
        if (result.permissibleBuiltup > 0) {
          await syncComplianceBuiltUpToBrief(ctx.db, input.projectId, result.permissibleBuiltup);
        }
        await ctx.db.insert(complianceCalculations).values({
          projectId: input.projectId,
          mode: "PRE_PROJECT_PLANNING",
          authority: "BBMP",
          city: "bangalore",
          ruleVersion,
          bbmpRuleSetId,
          inputJson: input.input,
          resultJson: payload,
          overallStatus: "FEASIBLE_WITH_CONSTRAINTS",
        });
        return row!;
      }
      const [row] = await ctx.db
        .insert(bylawCalcs)
        .values({
          projectId: input.projectId,
          input: input.input,
          result: payload,
          bbmpRuleSetId,
          precomputedAt: now,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "bylawcalc",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      if (result.permissibleBuiltup > 0) {
        await syncComplianceBuiltUpToBrief(ctx.db, input.projectId, result.permissibleBuiltup);
      }
      await ctx.db.insert(complianceCalculations).values({
        projectId: input.projectId,
        mode: "PRE_PROJECT_PLANNING",
        authority: "BBMP",
        city: "bangalore",
        ruleVersion,
        bbmpRuleSetId,
        inputJson: input.input,
        resultJson: payload,
        overallStatus: "FEASIBLE_WITH_CONSTRAINTS",
      });
      return row!;
    }),

  /** Post-construction compliance audit — compares actuals against pre-construction allowed values. */
  savePostConstruction: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        actuals: PostConstructionActuals,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(bylawCalcs)
        .where(eq(bylawCalcs.projectId, input.projectId));
      if (!existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Save pre-construction development potential before running post-construction audit.",
        });
      }
      const catalog = await loadActiveBbmpRuleCatalog(ctx.db);
      const preInput = BylawCalcInput.parse(existing.input);
      const audit = computePostConstructionAudit(preInput, input.actuals, catalog);
      const ruleVersion = catalog.label ?? catalog.ruleSetId ?? "bbmp-2003-default";
      const now = new Date();
      const [row] = await ctx.db
        .update(bylawCalcs)
        .set({
          postconstructionInput: input.actuals,
          postconstructionAudit: audit,
          postcomputedAt: now,
        })
        .where(eq(bylawCalcs.id, existing.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "bylawcalc",
        entityId: existing.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: {
          postconstructionInput: existing.postconstructionInput,
          postconstructionAudit: existing.postconstructionAudit,
        },
        after: {
          postconstructionInput: row!.postconstructionInput,
          postconstructionAudit: row!.postconstructionAudit,
        },
      });
      await ctx.db.insert(complianceCalculations).values({
        projectId: input.projectId,
        mode: "POST_PROJECT_AUDIT",
        authority: "BBMP",
        city: "bangalore",
        ruleVersion,
        bbmpRuleSetId: catalog.ruleSetId ?? null,
        inputJson: {
          preProject: preInput,
          actual: input.actuals,
        },
        resultJson: audit,
        overallStatus: audit.overallStatus,
      });
      return row!;
    }),
});
