import { users } from "./org-auth.js";
import { projectOffices } from "./project.js";
import { invoices } from "./financial.js";
import {
  bigint,
  boolean,
  createdAt,
  date,
  id,
  pgTable,
  text,
  timestamp,
  updatedAt,
  uuid,
} from "./_helpers.js";

/** Lightweight chart of accounts (firm-scoped, single-tenant). */
export const accounts = pgTable("esti_account", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: createdAt(),
});

/** Expense voucher — office or project scope; separate from client GST invoices. */
export const expenses = pgTable("esti_expense", {
  id: id(),
  ref: text("ref").notNull().unique(),
  scope: text("scope").notNull(),
  projectId: uuid("project_id").references(() => projectOffices.id),
  billingClass: text("billing_class").notNull().default("NON_BILLABLE"),
  category: text("category").notNull(),
  paymentMethod: text("payment_method").notNull(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
  expenseDate: date("expense_date").notNull(),
  payee: text("payee"),
  description: text("description"),
  receiptKey: text("receipt_key"),
  status: text("status").notNull().default("DRAFT"),
  recoveryStatus: text("recovery_status").notNull().default("NA"),
  recoveredOnInvoiceId: uuid("recovered_on_invoice_id").references(() => invoices.id),
  submittedById: uuid("submitted_by_id").references(() => users.id),
  auditedById: uuid("audited_by_id").references(() => users.id),
  closedById: uuid("closed_by_id").references(() => users.id),
  auditedAt: timestamp("audited_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
