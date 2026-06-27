import {
  ExpenseCreate,
  ExpenseListParams,
  ExpenseMarkRecovered,
  ExpenseUpdate,
  clampListLimit,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { accounts, expenses, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";
import { ensureAccountByCode, getAccountByCode } from "./accounts.js";

const manageExpense = capabilityProcedure("invoice:manage");
const auditExpense = capabilityProcedure("reports:view");

async function getExpenseOrThrow(db: Parameters<typeof getAccountByCode>[0], id: string) {
  const [row] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found" });
  return row;
}

async function defaultAccountId(
  db: Parameters<typeof getAccountByCode>[0],
  scope: string,
  paymentMethod: string,
) {
  // Lazily provision the default account so a firm that never seeded its chart
  // of accounts can still record an expense (instead of a 500 "Account not seeded").
  if (paymentMethod === "CASH") {
    return (await ensureAccountByCode(db, "CASH")).id;
  }
  const code = scope === "PROJECT" ? "PROJECT_EXPENSE" : "OFFICE_EXPENSE";
  return (await ensureAccountByCode(db, code)).id;
}

function recoveryForCreate(scope: string, billingClass: string) {
  if (scope === "PROJECT" && billingClass === "BILLABLE") return "PENDING" as const;
  return "NA" as const;
}

export const expensesRouter = router({
  list: protectedProcedure.input(ExpenseListParams.optional()).query(async ({ ctx, input }) => {
    const conditions = [];
    if (input?.scope) conditions.push(eq(expenses.scope, input.scope));
    if (input?.projectId) conditions.push(eq(expenses.projectId, input.projectId));
    if (input?.category) conditions.push(eq(expenses.category, input.category));
    if (input?.billingClass) conditions.push(eq(expenses.billingClass, input.billingClass));
    if (input?.recoveryStatus) conditions.push(eq(expenses.recoveryStatus, input.recoveryStatus));
    if (input?.status) conditions.push(eq(expenses.status, input.status));
    if (input?.paymentMethod) conditions.push(eq(expenses.paymentMethod, input.paymentMethod));
    if (input?.dateFrom) conditions.push(gte(expenses.expenseDate, input.dateFrom));
    if (input?.dateTo) conditions.push(lte(expenses.expenseDate, input.dateTo));
    if (input?.accountCode) {
      const acct = await getAccountByCode(ctx.db, input.accountCode);
      if (acct) conditions.push(eq(expenses.accountId, acct.id));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    return ctx.db
      .select({
        id: expenses.id,
        ref: expenses.ref,
        scope: expenses.scope,
        projectId: expenses.projectId,
        projectTitle: projectOffices.title,
        billingClass: expenses.billingClass,
        category: expenses.category,
        paymentMethod: expenses.paymentMethod,
        accountId: expenses.accountId,
        amountPaise: expenses.amountPaise,
        expenseDate: expenses.expenseDate,
        payee: expenses.payee,
        description: expenses.description,
        status: expenses.status,
        recoveryStatus: expenses.recoveryStatus,
        recoveredOnInvoiceId: expenses.recoveredOnInvoiceId,
        createdAt: expenses.createdAt,
      })
      .from(expenses)
      .leftJoin(projectOffices, eq(projectOffices.id, expenses.projectId))
      .where(where)
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
      .limit(clampListLimit(input?.limit));
  }),

  create: manageExpense.input(ExpenseCreate).mutation(async ({ ctx, input }) => {
    if (input.scope === "PROJECT" && !input.projectId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required for project expenses" });
    }
    if (input.scope === "OFFICE" && input.projectId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Office expenses cannot be project-linked" });
    }

    const billingClass = input.scope === "OFFICE" ? "NON_BILLABLE" : (input.billingClass ?? "NON_BILLABLE");
    const accountId =
      input.accountId ??
      (await defaultAccountId(ctx.db, input.scope, input.paymentMethod));
    const { ref } = await nextRef(ctx.db, "expense", "EXP");

    const [row] = await ctx.db
      .insert(expenses)
      .values({
        ref,
        scope: input.scope,
        projectId: input.projectId ?? null,
        billingClass,
        category: input.category,
        paymentMethod: input.paymentMethod,
        accountId,
        amountPaise: input.amountPaise,
        expenseDate: input.expenseDate,
        payee: input.payee ?? null,
        description: input.description ?? null,
        receiptKey: input.receiptKey ?? null,
        recoveryStatus: recoveryForCreate(input.scope, billingClass),
        status: "DRAFT",
      })
      .returning();

    await writeAudit(ctx.db, {
      entity: "expense",
      entityId: row!.id,
      action: "created",
      actorId: ctx.user.id,
      after: row,
    });

    return row!;
  }),

  update: manageExpense.input(ExpenseUpdate).mutation(async ({ ctx, input }) => {
    const existing = await getExpenseOrThrow(ctx.db, input.id);
    if (existing.status !== "DRAFT") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft expenses can be edited" });
    }

    const billingClass =
      existing.scope === "OFFICE"
        ? "NON_BILLABLE"
        : (input.billingClass ?? existing.billingClass);

    const [row] = await ctx.db
      .update(expenses)
      .set({
        category: input.category ?? existing.category,
        paymentMethod: input.paymentMethod ?? existing.paymentMethod,
        accountId: input.accountId ?? existing.accountId,
        billingClass,
        amountPaise: input.amountPaise ?? existing.amountPaise,
        expenseDate: input.expenseDate ?? existing.expenseDate,
        payee: input.payee !== undefined ? input.payee : existing.payee,
        description: input.description !== undefined ? input.description : existing.description,
        receiptKey: input.receiptKey !== undefined ? input.receiptKey : existing.receiptKey,
        recoveryStatus: recoveryForCreate(existing.scope, billingClass),
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, input.id))
      .returning();

    await writeAudit(ctx.db, {
      entity: "expense",
      entityId: row!.id,
      action: "updated",
      actorId: ctx.user.id,
      before: existing,
      after: row,
    });

    return row!;
  }),

  submit: manageExpense
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getExpenseOrThrow(ctx.db, input.id);
      if (existing.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft expenses can be submitted" });
      }

      const [row] = await ctx.db
        .update(expenses)
        .set({
          status: "SUBMITTED",
          submittedById: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, input.id))
        .returning();

      await writeAudit(ctx.db, {
        entity: "expense",
        entityId: row!.id,
        action: "submitted",
        actorId: ctx.user.id,
        before: existing,
        after: row,
      });

      return row!;
    }),

  audit: auditExpense
    .input(
      z.object({
        id: z.string().uuid(),
        approved: z.boolean(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getExpenseOrThrow(ctx.db, input.id);
      if (existing.status !== "SUBMITTED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only submitted expenses can be audited" });
      }

      const [row] = await ctx.db
        .update(expenses)
        .set({
          status: input.approved ? "AUDITED" : "REJECTED",
          auditedById: ctx.user.id,
          auditedAt: new Date(),
          notes: input.notes ?? null,
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, input.id))
        .returning();

      await writeAudit(ctx.db, {
        entity: "expense",
        entityId: row!.id,
        action: input.approved ? "audited" : "rejected",
        actorId: ctx.user.id,
        before: existing,
        after: row,
      });

      return row!;
    }),

  close: auditExpense
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getExpenseOrThrow(ctx.db, input.id);
      if (existing.status !== "AUDITED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only audited expenses can be closed" });
      }

      const [row] = await ctx.db
        .update(expenses)
        .set({
          status: "CLOSED",
          closedById: ctx.user.id,
          closedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, input.id))
        .returning();

      await writeAudit(ctx.db, {
        entity: "expense",
        entityId: row!.id,
        action: "closed",
        actorId: ctx.user.id,
        before: existing,
        after: row,
      });

      return row!;
    }),

  markRecovered: auditExpense.input(ExpenseMarkRecovered).mutation(async ({ ctx, input }) => {
    const existing = await getExpenseOrThrow(ctx.db, input.id);
    if (existing.status !== "CLOSED" || existing.billingClass !== "BILLABLE") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only closed billable expenses can be marked recovered",
      });
    }

    const [row] = await ctx.db
      .update(expenses)
      .set({
        recoveryStatus: input.recoveryStatus,
        recoveredOnInvoiceId: input.recoveredOnInvoiceId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, input.id))
      .returning();

    await writeAudit(ctx.db, {
      entity: "expense",
      entityId: row!.id,
      action: "recovery_updated",
      actorId: ctx.user.id,
      before: existing,
      after: row,
    });

    return row!;
  }),

  summaryByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          billingClass: expenses.billingClass,
          category: expenses.category,
          recoveryStatus: expenses.recoveryStatus,
          status: expenses.status,
          totalPaise: sql<number>`coalesce(sum(${expenses.amountPaise}), 0)`.mapWith(Number),
        })
        .from(expenses)
        .where(
          and(eq(expenses.scope, "PROJECT"), eq(expenses.projectId, input.projectId), eq(expenses.status, "CLOSED")),
        )
        .groupBy(expenses.billingClass, expenses.category, expenses.recoveryStatus, expenses.status);

      let nonBillablePaise = 0;
      let billablePendingPaise = 0;
      let billableRecoveredPaise = 0;

      for (const r of rows) {
        if (r.billingClass === "NON_BILLABLE") {
          nonBillablePaise += r.totalPaise;
        } else if (r.recoveryStatus === "PENDING") {
          billablePendingPaise += r.totalPaise;
        } else if (r.recoveryStatus === "INVOICED") {
          billableRecoveredPaise += r.totalPaise;
        }
      }

      const [project] = await ctx.db
        .select({ contractValuePaise: projectOffices.contractValuePaise })
        .from(projectOffices)
        .where(eq(projectOffices.id, input.projectId))
        .limit(1);

      return {
        nonBillablePaise,
        billablePendingPaise,
        billableRecoveredPaise,
        contractValuePaise: project?.contractValuePaise ?? 0,
        byCategory: rows,
      };
    }),
});
