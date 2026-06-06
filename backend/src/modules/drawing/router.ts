import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { drawings } from "../../db/schema.js";
import { presignedGet } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const drawingRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(drawings)
        .where(eq(drawings.projectId, input.projectId))
        .orderBy(desc(drawings.createdAt));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(drawings).where(eq(drawings.id, input.id));
      if (!row) return null;
      // Surface a short-lived SVG URL only once the worker has produced one.
      const svgUrl = row.svgKey ? await presignedGet(row.svgKey).catch(() => null) : null;
      return { ...row, svgUrl };
    }),
});
