import { z } from "zod";
import { TaskClassification, TASK_CLASSIFICATION_LABEL } from "./task.js";

/** Billable vs non-billable — same vocabulary as Work tasks. */
export const ExpenseBillingClass = TaskClassification;
export type ExpenseBillingClass = z.infer<typeof ExpenseBillingClass>;
export const EXPENSE_BILLING_CLASS_LABEL = TASK_CLASSIFICATION_LABEL;

export const ExpenseScope = z.enum(["OFFICE", "PROJECT"]);
export type ExpenseScope = z.infer<typeof ExpenseScope>;

export const ExpenseCategory = z.enum([
  "TRAVEL",
  "FOOD",
  "ACCOMMODATION",
  "MISC",
  "INVOICING_COST",
]);
export type ExpenseCategory = z.infer<typeof ExpenseCategory>;

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  TRAVEL: "Travel",
  FOOD: "Food",
  ACCOMMODATION: "Accommodation",
  MISC: "Misc",
  INVOICING_COST: "Invoicing costs",
};

export const ExpensePaymentMethod = z.enum(["CASH", "BANK", "CARD", "UPI"]);
export type ExpensePaymentMethod = z.infer<typeof ExpensePaymentMethod>;

export const EXPENSE_PAYMENT_METHOD_LABEL: Record<ExpensePaymentMethod, string> = {
  CASH: "Cash",
  BANK: "Bank transfer",
  CARD: "Card",
  UPI: "UPI",
};

export const ExpenseStatus = z.enum([
  "DRAFT",
  "SUBMITTED",
  "AUDITED",
  "CLOSED",
  "REJECTED",
]);
export type ExpenseStatus = z.infer<typeof ExpenseStatus>;

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  AUDITED: "Audited",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

export const ExpenseRecoveryStatus = z.enum([
  "NA",
  "PENDING",
  "INVOICED",
  "WRITTEN_OFF",
]);
export type ExpenseRecoveryStatus = z.infer<typeof ExpenseRecoveryStatus>;

export const EXPENSE_RECOVERY_STATUS_LABEL: Record<ExpenseRecoveryStatus, string> = {
  NA: "N/A",
  PENDING: "Pending recovery",
  INVOICED: "Recovered on invoice",
  WRITTEN_OFF: "Written off",
};

export const AccountKind = z.enum(["OPERATING", "EXPENSE", "CASH"]);
export type AccountKind = z.infer<typeof AccountKind>;

export const ExpenseCreate = z.object({
  scope: ExpenseScope,
  projectId: z.string().uuid().optional(),
  billingClass: ExpenseBillingClass.optional(),
  category: ExpenseCategory,
  paymentMethod: ExpensePaymentMethod,
  accountId: z.string().uuid().optional(),
  amountPaise: z.number().int().positive(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payee: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  receiptKey: z.string().max(500).optional(),
});

export const ExpenseUpdate = z.object({
  id: z.string().uuid(),
  category: ExpenseCategory.optional(),
  paymentMethod: ExpensePaymentMethod.optional(),
  accountId: z.string().uuid().optional(),
  billingClass: ExpenseBillingClass.optional(),
  amountPaise: z.number().int().positive().optional(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payee: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  receiptKey: z.string().max(500).nullable().optional(),
});

export const ExpenseListParams = z.object({
  scope: ExpenseScope.optional(),
  projectId: z.string().uuid().optional(),
  category: ExpenseCategory.optional(),
  billingClass: ExpenseBillingClass.optional(),
  recoveryStatus: ExpenseRecoveryStatus.optional(),
  status: ExpenseStatus.optional(),
  paymentMethod: ExpensePaymentMethod.optional(),
  accountCode: z.string().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

export const ExpenseMarkRecovered = z.object({
  id: z.string().uuid(),
  recoveryStatus: z.enum(["INVOICED", "WRITTEN_OFF"]),
  recoveredOnInvoiceId: z.string().uuid().optional(),
});
