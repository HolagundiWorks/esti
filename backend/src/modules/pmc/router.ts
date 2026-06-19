import { PmcProjectParams } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { requirePmcEnabled } from "../../lib/settings.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { buildPmcPortfolio, buildPmcSummary } from "./readModels.js";

export const pmcRouter = router({
  summary: protectedProcedure.input(PmcProjectParams).query(async ({ ctx, input }) => {
    await requirePmcEnabled(ctx.db);
    const summary = await buildPmcSummary(ctx.db, input.projectId);
    if (!summary) throw new TRPCError({ code: "NOT_FOUND" });
    if (!summary.enabled) {
      throw new TRPCError({ code: "FORBIDDEN", message: "PMC is not enabled for this project" });
    }
    return summary;
  }),

  /** Lightweight status for UI gating without throwing when project PMC is off. */
  status: protectedProcedure.input(PmcProjectParams).query(async ({ ctx, input }) => {
    const summary = await buildPmcSummary(ctx.db, input.projectId);
    if (!summary) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      firmPmcEnabled: summary.firmPmcEnabled,
      projectPmcEnabled: summary.projectPmcEnabled,
      enabled: summary.enabled,
    };
  }),

  portfolio: protectedProcedure.query(async ({ ctx }) => {
    await requirePmcEnabled(ctx.db);
    return buildPmcPortfolio(ctx.db, ctx.user);
  }),
});
