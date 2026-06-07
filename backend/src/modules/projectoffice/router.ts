import { ListParams, ProjectOfficeCreate, ProjectSiteUpdate, coaStagePlan } from "@esti/contracts";
import { desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { phases, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const projectOfficeRouter = router({
  list: protectedProcedure.input(ListParams).query(async ({ ctx, input }) => {
    const where = input.search ? ilike(projectOffices.title, `%${input.search}%`) : undefined;
    return ctx.db
      .select()
      .from(projectOffices)
      .where(where)
      .orderBy(desc(projectOffices.createdAt))
      .limit(input.limit)
      .offset(input.offset);
  }),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const rows = await ctx.db.select().from(projectOffices).where(eq(projectOffices.id, input.id)).limit(1);
    return rows[0] ?? null;
  }),

  create: protectedProcedure.input(ProjectOfficeCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "projectoffice", "PRJ");
    // Project + its COA phase plan are created atomically.
    const row = await ctx.db.transaction(async (tx) => {
      const [p] = await tx
        .insert(projectOffices)
        .values({
          ref,
          title: input.title,
          projectType: input.projectType,
          jurisdiction: input.jurisdiction,
          clientId: input.clientId ?? null,
          state: input.state ?? null,
          district: input.district ?? null,
          city: input.city ?? null,
          pin: input.pin ?? null,
          siteAddress: input.siteAddress ?? null,
          siteAreaSqm: input.siteAreaSqm ?? null,
          contractValuePaise: input.contractValuePaise,
          dateStart: input.dateStart ?? null,
        })
        .returning();
      await tx.insert(phases).values(
        coaStagePlan().map((s, i) => ({
          projectId: p!.id,
          code: s.code,
          label: s.label,
          billingPct: s.stagePct,
          sortOrder: (i + 1) * 10,
        })),
      );
      return p!;
    });
    await writeAudit(ctx.db, { entity: "projectoffice", entityId: row.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row;
  }),

  updateSite: protectedProcedure.input(ProjectSiteUpdate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(projectOffices)
      .set({
        siteAddress: input.siteAddress ?? null,
        siteAreaSqm: input.siteAreaSqm ?? null,
      })
      .where(eq(projectOffices.id, input.id))
      .returning();
    return row ?? null;
  }),
});
