import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { masterPlans } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

// Master plans are reference files; rows are created by the /upload/master-plan route.
const manage = capabilityProcedure("write");

export const masterPlanRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(masterPlans).orderBy(desc(masterPlans.createdAt));
    return Promise.all(
      rows.map(async (r) => ({
        ...r,
        url: r.fileKey ? await presignedGet(r.fileKey).catch(() => null) : null,
      })),
    );
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(masterPlans).where(eq(masterPlans.id, input.id));
    if (!row) return { ok: true };
    if (row.fileKey) await removeObject(row.fileKey).catch(() => {});
    await ctx.db.delete(masterPlans).where(eq(masterPlans.id, input.id));
    await writeAudit(ctx.db, { entity: "master_plan", entityId: input.id, action: "DELETE", actorId: ctx.user.id, before: row });
    return { ok: true };
  }),
});
