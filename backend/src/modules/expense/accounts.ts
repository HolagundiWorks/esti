import { clampListLimit } from "@esti/contracts";
import { and, eq, sql } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { accounts, expenses } from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export async function getAccountByCode(db: DB, code: string) {
  const [row] = await db.select().from(accounts).where(eq(accounts.code, code)).limit(1);
  return row ?? null;
}

export const accountsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(accounts).orderBy(accounts.code);
    const balances = await ctx.db
      .select({
        accountId: expenses.accountId,
        balancePaise: sql<number>`coalesce(sum(${expenses.amountPaise}), 0)`.mapWith(Number),
      })
      .from(expenses)
      .where(eq(expenses.status, "CLOSED"))
      .groupBy(expenses.accountId);

    const balanceByAccount = new Map(balances.map((b) => [b.accountId, b.balancePaise]));

    return rows.map((a) => ({
      ...a,
      balancePaise: balanceByAccount.get(a.id) ?? 0,
    }));
  }),
});
