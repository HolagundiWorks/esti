import { PeriodFilterInput, resolvePeriodRange } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, eq, gte, inArray, isNotNull, isNull, lte, lt, or, sql } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { accounts, expenses, invoices, projectOffices } from "../../db/schema.js";
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

/** Running/active projects carry across financial years — never FY-hidden. */
const RUNNING_STATUSES = ["ACTIVE", "ON_HOLD"] as const;
/** A project counts as "closed" once completed/cancelled or archived. */
const CLOSED_STATUSES = ["COMPLETED", "CANCELLED"] as const;

export const accountsRouter = router({
  /**
   * Chart of accounts with balances. `period` scopes the balance to a financial
   * year (default = whatever the client passes; omitted → all-time). Balances sum
   * CLOSED expenses whose `expenseDate` falls in the period.
   */
  list: financeOps.input(PeriodFilterInput.optional()).query(async ({ ctx, input }) => {
    const rows = await ctx.db.select().from(accounts).orderBy(accounts.code);
    const range = input ? resolvePeriodRange(input) : null;
    const where = range
      ? and(
          eq(expenses.status, "CLOSED"),
          gte(expenses.expenseDate, range.from),
          lte(expenses.expenseDate, range.to),
        )
      : eq(expenses.status, "CLOSED");
    const balances = await ctx.db
      .select({
        accountId: expenses.accountId,
        balancePaise: sql<number>`coalesce(sum(${expenses.amountPaise}), 0)`.mapWith(Number),
      })
      .from(expenses)
      .where(where)
      .groupBy(expenses.accountId);

    const balanceByAccount = new Map(balances.map((b) => [b.accountId, b.balancePaise]));

    return rows.map((a) => ({
      ...a,
      balancePaise: balanceByAccount.get(a.id) ?? 0,
      periodLabel: range?.label ?? null,
    }));
  }),

  /**
   * Carry-forward for the FY-scoped accounts view: the two things a financial
   * year must NOT hide — **running projects** (active/on-hold, span years) and
   * **receivables from projects closed in prior years** (ISSUED, still-unpaid
   * invoices dated before this FY whose project is completed/cancelled/archived).
   */
  carryForward: financeOps.input(PeriodFilterInput.optional()).query(async ({ ctx, input }) => {
    const { from } = resolvePeriodRange(input ?? { preset: "CURRENT_FY" });

    // Running projects — carried into the current view regardless of when opened.
    const running = await ctx.db
      .select({
        id: projectOffices.id,
        ref: projectOffices.ref,
        title: projectOffices.title,
        status: projectOffices.status,
        contractValuePaise: projectOffices.contractValuePaise,
      })
      .from(projectOffices)
      .where(and(inArray(projectOffices.status, [...RUNNING_STATUSES]), isNull(projectOffices.archivedAt)))
      .orderBy(projectOffices.ref);

    // Receivables from closed projects of previous years: unpaid (ISSUED) invoices
    // dated before this FY, on projects that are completed/cancelled or archived.
    const priorReceivables = await ctx.db
      .select({
        id: invoices.id,
        ref: invoices.ref,
        projectId: invoices.projectId,
        projectTitle: projectOffices.title,
        netReceivablePaise: invoices.netReceivablePaise,
        dateInvoice: invoices.dateInvoice,
      })
      .from(invoices)
      .innerJoin(projectOffices, eq(invoices.projectId, projectOffices.id))
      .where(
        and(
          eq(invoices.status, "ISSUED"),
          lt(invoices.dateInvoice, from),
          or(inArray(projectOffices.status, [...CLOSED_STATUSES]), isNotNull(projectOffices.archivedAt)),
        ),
      )
      .orderBy(invoices.dateInvoice);

    const runningContractPaise = running.reduce((s, p) => s + (p.contractValuePaise ?? 0), 0);
    const priorReceivablePaise = priorReceivables.reduce(
      (s, r) => s + (r.netReceivablePaise ?? 0),
      0,
    );

    return {
      running,
      runningCount: running.length,
      runningContractPaise,
      priorReceivables,
      priorReceivableCount: priorReceivables.length,
      priorReceivablePaise,
    };
  }),
});
