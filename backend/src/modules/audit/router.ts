import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { audit, users } from "../../db/schema.js";
import { ownerProcedure, router } from "../../trpc/trpc.js";

const AuditListInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(100).default(25),
  entity: z.string().trim().max(100).optional(),
  action: z.string().trim().max(100).optional(),
  search: z.string().trim().max(200).optional(),
});

export const auditRouter = router({
  list: ownerProcedure.input(AuditListInput).query(async ({ ctx, input }) => {
    const search = input.search ? `%${input.search}%` : undefined;
    const where = and(
      input.entity ? eq(audit.entity, input.entity) : undefined,
      input.action ? eq(audit.action, input.action) : undefined,
      search
        ? or(
            ilike(audit.entity, search),
            ilike(audit.action, search),
            ilike(users.fullName, search),
            ilike(users.email, search),
          )
        : undefined,
    );

    const [rows, totalRows, entities, actions] = await Promise.all([
      ctx.db
        .select({
          id: audit.id,
          entity: audit.entity,
          entityId: audit.entityId,
          action: audit.action,
          actorId: audit.actorId,
          actorName: users.fullName,
          actorEmail: users.email,
          before: audit.before,
          after: audit.after,
          createdAt: audit.createdAt,
        })
        .from(audit)
        .leftJoin(users, eq(audit.actorId, users.id))
        .where(where)
        .orderBy(desc(audit.createdAt), desc(audit.id))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      ctx.db
        .select({ value: count() })
        .from(audit)
        .leftJoin(users, eq(audit.actorId, users.id))
        .where(where),
      ctx.db.selectDistinct({ value: audit.entity }).from(audit).orderBy(asc(audit.entity)),
      ctx.db.selectDistinct({ value: audit.action }).from(audit).orderBy(asc(audit.action)),
    ]);

    return {
      rows,
      total: totalRows[0]?.value ?? 0,
      filters: {
        entities: entities.map((row) => row.value),
        actions: actions.map((row) => row.value),
      },
    };
  }),
});
