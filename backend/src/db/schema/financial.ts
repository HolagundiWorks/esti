import { clients } from "./org-auth.js";
import { phases, projectOffices } from "./project.js";
import {
  bigint,
  boolean,
  createdAt,
  date,
  doublePrecision,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  updatedAt,
  uuid,
} from "./_helpers.js";

/** Purchase orders (simple quantity × rate procurement, per project). */
export const purchaseOrders = pgTable("esti_purchaseorder", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  vendor: text("vendor"),
  title: text("title"),
  status: text("status").notNull().default("DRAFT"),
  datePo: date("date_po"),
  notes: text("notes"),
  totalPaise: bigint("total_paise", { mode: "number" }).notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Purchase-order line item — quantity × rate = amount. */
export const poItems = pgTable("esti_po_item", {
  id: id(),
  poId: uuid("po_id")
    .notNull()
    .references(() => purchaseOrders.id),
  description: text("description").notNull(),
  unit: text("unit"),
  qty: doublePrecision("qty").notNull().default(0),
  ratePaise: bigint("rate_paise", { mode: "number" }).notNull().default(0),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** India GST/TDS invoices — phase-linked; stores the computed tax snapshot. */
export const invoices = pgTable("esti_invoice", {
  id: id(),
  ref: text("ref").notNull().unique(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  phaseId: uuid("phase_id").references(() => phases.id),
  clientId: uuid("client_id").references(() => clients.id),
  status: text("status").notNull().default("DRAFT"),
  gstSystem: text("gst_system").notNull(),
  documentKind: text("document_kind").notNull(),
  sac: text("sac"),
  interState: boolean("inter_state").notNull().default(false),
  tdsApplicable: boolean("tds_applicable").notNull().default(true),
  taxablePaise: bigint("taxable_paise", { mode: "number" })
    .notNull()
    .default(0),
  cgstPaise: bigint("cgst_paise", { mode: "number" }).notNull().default(0),
  sgstPaise: bigint("sgst_paise", { mode: "number" }).notNull().default(0),
  igstPaise: bigint("igst_paise", { mode: "number" }).notNull().default(0),
  gstTotalPaise: bigint("gst_total_paise", { mode: "number" })
    .notNull()
    .default(0),
  compositionLevyPaise: bigint("composition_levy_paise", { mode: "number" })
    .notNull()
    .default(0),
  tdsPaise: bigint("tds_paise", { mode: "number" }).notNull().default(0),
  grandTotalPaise: bigint("grand_total_paise", { mode: "number" })
    .notNull()
    .default(0),
  netReceivablePaise: bigint("net_receivable_paise", { mode: "number" })
    .notNull()
    .default(0),
  dateInvoice: date("date_invoice"),
  notes: text("notes"),
  pdfKey: text("pdf_key"),
  pdfStatus: text("pdf_status").notNull().default("NONE"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Bank-statement reconciliation batches + matched/unmatched line results. */
export const reconciliations = pgTable("esti_reconcile", {
  id: id(),
  ref: text("ref").notNull().unique(),
  label: text("label").notNull(),
  fileName: text("file_name").notNull(),
  fileHash: text("file_hash").notNull(),
  storageKey: text("storage_key").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("PENDING"),
  rowCount: integer("row_count").notNull().default(0),
  matchedCount: integer("matched_count").notNull().default(0),
  unmatchedCount: integer("unmatched_count").notNull().default(0),
  totalCreditPaise: bigint("total_credit_paise", { mode: "number" })
    .notNull()
    .default(0),
  matchedCreditPaise: bigint("matched_credit_paise", { mode: "number" })
    .notNull()
    .default(0),
  lines: jsonb("lines"),
  columnMapping: jsonb("column_mapping"),
  errorText: text("error_text"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
