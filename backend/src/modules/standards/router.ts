import { StandardCreate, StandardDiscipline, StandardUpdate } from "@esti/contracts";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { standardFiles, standards } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

export const standardsRouter = router({
  /** Standards for one discipline, each with its attached files (download URLs). */
  listByDiscipline: protectedProcedure
    .input(z.object({ discipline: StandardDiscipline }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(standards)
        .where(eq(standards.discipline, input.discipline))
        .orderBy(desc(standards.updatedAt));
      const ids = rows.map((r) => r.id);
      const files = ids.length
        ? await ctx.db.select().from(standardFiles).orderBy(asc(standardFiles.createdAt))
        : [];
      return Promise.all(
        rows.map(async (r) => ({
          ...r,
          files: await Promise.all(
            files
              .filter((f) => f.standardId === r.id)
              .map(async (f) => ({ ...f, url: await presignedGet(f.fileKey).catch(() => null) })),
          ),
        })),
      );
    }),

  create: manage.input(StandardCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(standards).values(input).returning();
    await writeAudit(ctx.db, { entity: "standard", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  update: manage.input(StandardUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const [row] = await ctx.db
      .update(standards)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(standards.id, id))
      .returning();
    await writeAudit(ctx.db, { entity: "standard", entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const files = await ctx.db.select().from(standardFiles).where(eq(standardFiles.standardId, input.id));
    for (const f of files) if (f.fileKey) await removeObject(f.fileKey).catch(() => {});
    await ctx.db.delete(standards).where(eq(standards.id, input.id));
    await writeAudit(ctx.db, { entity: "standard", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),

  removeFile: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [f] = await ctx.db.select().from(standardFiles).where(eq(standardFiles.id, input.id));
    if (!f) return { ok: true };
    if (f.fileKey) await removeObject(f.fileKey).catch(() => {});
    await ctx.db.delete(standardFiles).where(eq(standardFiles.id, input.id));
    await writeAudit(ctx.db, { entity: "standard_file", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),
});
