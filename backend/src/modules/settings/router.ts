import { eq } from "drizzle-orm";
import { z } from "zod";
import { orgSettings } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { getOrgSettings } from "../../lib/settings.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

export const settingsRouter = router({
  /** Office feature flags — any staff member may read. */
  get: protectedProcedure.query(async ({ ctx }) => getOrgSettings(ctx.db)),

  /** Toggle the optional Team & HR module (owner only). */
  setHrEnabled: ownerProcedure
    .input(z.object({ hrEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const current = await getOrgSettings(ctx.db);
      const [row] = await ctx.db
        .update(orgSettings)
        .set({ hrEnabled: input.hrEnabled })
        .where(eq(orgSettings.id, current.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "settings",
        entityId: current.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: { hrEnabled: current.hrEnabled },
        after: { hrEnabled: input.hrEnabled },
      });
      return row!;
    }),
});
