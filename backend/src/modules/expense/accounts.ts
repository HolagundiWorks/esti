import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { accounts, expenses } from "../../db/schema.js";
import { capabilityProcedure, router } from "../../trpc/trpc.js";

// Company cash book is L2 (Management / finance:ops) and above only.
const financeOps = capabilityProcedure("finance:ops");

/**
 * Default chart of accounts — the system rows the cash book / expense flows rely
 * on. Mirrors the seed in migration 0065; kept here so the app can self-heal a
 * firm whose accounts were never seeded instead of 500-ing ("Account not seeded").
 */
const DEFAULT_ACCOUNTS: Record<string, { name: string; kind: string }> = {
  MAIN: { name: "Main operating", kind: "OPERATING" },
  OFFICE_EXPENSE: { name: "Office expenses", kind: "EXPENSE" },
  CASH: { name: "Cash / petty cash", kind: "CASH" },
  PROJECT_EXPENSE: { name: "Project expenses", kind: "EXPENSE" },
};

export async function getAccountByCode(db: DB, code: string) {
  const [row] = await db.select().from(accounts).where(eq(accounts.code, code)).limit(1);
  return row ?? null;
}

/** Insert the default chart of accounts (idempotent). Used by the demo seed. */
export async function ensureDefaultAccounts(db: DB): Promise<void> {
  await db
    .insert(accounts)
    .values(
      Object.entries(DEFAULT_ACCOUNTS).map(([code, def]) => ({
        code,
        name: def.name,
        kind: def.kind,
        isSystem: true,
      })),
    )
    .onConflictDoNothing({ target: accounts.code });
}

/**
 * Fetch an account by code, lazily creating it from the known defaults when the
 * firm's chart of accounts was never seeded. Throws only for an unrecognised
 * code (a programming error), never for an un-seeded firm.
 */
export async function ensureAccountByCode(db: DB, code: string) {
  const existing = await getAccountByCode(db, code);
  if (existing) return existing;

  const def = DEFAULT_ACCOUNTS[code];
  if (!def) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Unknown account code: ${code}`,
    });
  }

  await db
    .insert(accounts)
    .values({ code, name: def.name, kind: def.kind, isSystem: true })
    .onConflictDoNothing({ target: accounts.code });

  // Re-read so we return the row whether we inserted it or lost a create race.
  const row = await getAccountByCode(db, code);
  if (!row) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Account provisioning failed" });
  }
  return row;
}

export const accountsRouter = router({
  list: financeOps.query(async ({ ctx }) => {
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
