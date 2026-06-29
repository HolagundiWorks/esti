import {
  FarRuleCreate,
  SetbackRuleCreate,
  NbcRuleCreate,
  FireRuleCreate,
  RegulationCreate,
} from "@esti/contracts";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  complianceFar,
  complianceSetback,
  complianceNbc,
  complianceFire,
  complianceRegulation,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

// Compliance reference data — editable by L4+ (write); readable by any staff.
const manage = capabilityProcedure("write");
const idInput = z.object({ id: z.string().uuid() });

/**
 * Builds list/create/update/remove for one compliance area table. The create zod
 * schema doubles as the update body (all-optional via `.partial()`).
 */
function crudFor(table: any, createSchema: z.ZodObject<any>, entity: string) {
  return {
    list: protectedProcedure.query(({ ctx }) =>
      ctx.db.select().from(table).orderBy(desc(table.updatedAt)),
    ),
    create: manage.input(createSchema).mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(table).values(input).returning();
      await writeAudit(ctx.db, { entity, entityId: (row as { id: string }).id, action: "CREATE", actorId: ctx.user.id, after: row });
      return row;
    }),
    update: manage
      .input(createSchema.partial().extend({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...rest } = input as { id: string } & Record<string, unknown>;
        const [row] = await ctx.db
          .update(table)
          .set({ ...rest, updatedAt: new Date() })
          .where(eq(table.id, id))
          .returning();
        await writeAudit(ctx.db, { entity, entityId: id, action: "UPDATE", actorId: ctx.user.id, after: row });
        return row;
      }),
    remove: manage.input(idInput).mutation(async ({ ctx, input }) => {
      await ctx.db.delete(table).where(eq(table.id, input.id));
      await writeAudit(ctx.db, { entity, entityId: input.id, action: "DELETE", actorId: ctx.user.id });
      return { ok: true };
    }),
  };
}

export const complianceRouter = router({
  far: router(crudFor(complianceFar, FarRuleCreate, "compliance_far")),
  setback: router(crudFor(complianceSetback, SetbackRuleCreate, "compliance_setback")),
  nbc: router(crudFor(complianceNbc, NbcRuleCreate, "compliance_nbc")),
  fire: router(crudFor(complianceFire, FireRuleCreate, "compliance_fire")),
  regulation: router(crudFor(complianceRegulation, RegulationCreate, "compliance_regulation")),
});
