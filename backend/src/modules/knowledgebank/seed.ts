import { SeedActivationInput } from "@esti/contracts";
import { z } from "zod";
import { writeAudit } from "../../lib/audit.js";
import {
  activateOfficialSeedPacks,
  listSeedActivations,
  OFFICIAL_SEED_CITIES,
  OFFICIAL_SEED_PACKS,
} from "../../lib/kbSeedService.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

export const kbSeedRouter = router({
  listOfficialPacks: protectedProcedure.query(() => ({
    maintainer: "Holagundi Consulting Works",
    cities: OFFICIAL_SEED_CITIES,
    packs: OFFICIAL_SEED_PACKS,
  })),

  listActivations: protectedProcedure.query(async ({ ctx }) => listSeedActivations(ctx.db)),

  activateOfficial: ownerProcedure.input(SeedActivationInput).mutation(async ({ ctx, input }) => {
    const result = await activateOfficialSeedPacks(ctx.db, input);
    await writeAudit(ctx.db, {
      entity: "kb_seed",
      entityId: "official",
      action: "ACTIVATE",
      actorId: ctx.user.id,
      after: result,
    });
    return result;
  }),

  deactivateOfficial: ownerProcedure
    .input(
      z.object({
        kind: z.enum(["DSR", "COMPLIANCE"]),
        entityId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { dsrVersions, bbmpRuleSets } = await import("../../db/schema.js");
      const { eq } = await import("drizzle-orm");
      const { TRPCError } = await import("@trpc/server");

      if (input.kind === "DSR") {
        const [row] = await ctx.db
          .select()
          .from(dsrVersions)
          .where(eq(dsrVersions.id, input.entityId));
        if (!row || row.origin !== "HCW_OFFICIAL") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Official DSR activation not found" });
        }
        if (row.active) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Deactivate the version before removing official seed",
          });
        }
        await ctx.db.delete(dsrVersions).where(eq(dsrVersions.id, input.entityId));
      } else {
        const [row] = await ctx.db
          .select()
          .from(bbmpRuleSets)
          .where(eq(bbmpRuleSets.id, input.entityId));
        if (!row || row.origin !== "HCW_OFFICIAL") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Official compliance activation not found" });
        }
        if (row.active) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Deactivate the rule set before removing official seed",
          });
        }
        await ctx.db.delete(bbmpRuleSets).where(eq(bbmpRuleSets.id, input.entityId));
      }

      await writeAudit(ctx.db, {
        entity: "kb_seed",
        entityId: input.entityId,
        action: "DELETE",
        actorId: ctx.user.id,
        before: input,
      });
      return { ok: true };
    }),
});
