import {
  Button,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
  Tile,
  Toggle,
} from "@carbon/react";
import {
  EXPENSE_BILLING_CLASS_LABEL,
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_PAYMENT_METHOD_LABEL,
  EXPENSE_RECOVERY_STATUS_LABEL,
  EXPENSE_STATUS_LABEL,
  ExpenseCategory,
  ExpensePaymentMethod,
  can,
  formatINR,
} from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red" | "teal"> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  AUDITED: "teal",
  CLOSED: "green",
  REJECTED: "red",
};

type Filter = "ALL" | "BILLABLE" | "NON_BILLABLE" | "PENDING_RECOVERY";

export function ProjectExpenses({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canManage = can(user?.role, "invoice:manage");
  const canAudit = can(user?.role, "reports:view");
  const utils = trpc.useUtils();
  const summaryQ = trpc.expenses.summaryByProject.useQuery({ projectId });
  const [filter, setFilter] = useState<Filter>("ALL");
  const listQ = trpc.expenses.list.useQuery({
    scope: "PROJECT",
    projectId,
    billingClass: filter === "BILLABLE" ? "BILLABLE" : filter === "NON_BILLABLE" ? "NON_BILLABLE" : undefined,
    recoveryStatus: filter === "PENDING_RECOVERY" ? "PENDING" : undefined,
    limit: 200,
  });

  const [open, setOpen] = useState(false);
  const [recoverId, setRecoverId] = useState<string | null>(null);
  const [invoiceRef, setInvoiceRef] = useState("");

  const create = trpc.expenses.create.useMutation({
    onSuccess: () => {
      void utils.expenses.list.invalidate();
      void utils.expenses.summaryByProject.invalidate({ projectId });
      setOpen(false);
    },
  });
  const submit = trpc.expenses.submit.useMutation({
    onSuccess: () => void utils.expenses.list.invalidate(),
  });
  const audit = trpc.expenses.audit.useMutation({
    onSuccess: () => {
      void utils.expenses.list.invalidate();
      void utils.expenses.summaryByProject.invalidate({ projectId });
    },
  });
  const close = trpc.expenses.close.useMutation({
    onSuccess: () => {
      void utils.expenses.list.invalidate();
      void utils.expenses.summaryByProject.invalidate({ projectId });
    },
  });
  const markRecovered = trpc.expenses.markRecovered.useMutation({
    onSuccess: () => {
      void utils.expenses.list.invalidate();
      void utils.expenses.summaryByProject.invalidate({ projectId });
      setRecoverId(null);
      setInvoiceRef("");
    },
  });

  const [form, setForm] = useState({
    category: "TRAVEL",
    paymentMethod: "BANK",
    amount: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    payee: "",
    description: "",
    cashVoucher: false,
    billable: false,
  });

  const amountPaise = Math.round(parseFloat(form.amount || "0") * 100);

  return (
    <div style={{ marginTop: "var(--cds-spacing-06)" }}>
      <h4>Project expenses</h4>
      <p>Site travel, food, accommodation, and misc — tracked separately from client GST invoices.</p>

      {summaryQ.data && (
        <div style={{ display: "flex", gap: "var(--cds-spacing-04)", flexWrap: "wrap", margin: "var(--cds-spacing-05) 0" }}>
          <Tile style={{ minWidth: 180 }}>
            <div>Non-billable spend</div>
            <strong>{formatINR(summaryQ.data.nonBillablePaise)}</strong>
          </Tile>
          <Tile style={{ minWidth: 180 }}>
            <div>Billable (pending recovery)</div>
            <strong>{formatINR(summaryQ.data.billablePendingPaise)}</strong>
          </Tile>
          <Tile style={{ minWidth: 180 }}>
            <div>Billable (recovered)</div>
            <strong>{formatINR(summaryQ.data.billableRecoveredPaise)}</strong>
          </Tile>
          {summaryQ.data.contractValuePaise > 0 && (
            <Tile style={{ minWidth: 180 }}>
              <div>Contract value (info)</div>
              <strong>{formatINR(summaryQ.data.contractValuePaise)}</strong>
            </Tile>
          )}
        </div>
      )}

      <Stack orientation="horizontal" gap={3} style={{ marginBottom: "var(--cds-spacing-04)" }}>
        {(["ALL", "BILLABLE", "NON_BILLABLE", "PENDING_RECOVERY"] as const).map((f) => (
          <Button
            key={f}
            kind={filter === f ? "primary" : "tertiary"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "ALL"
              ? "All"
              : f === "PENDING_RECOVERY"
                ? "Pending recovery"
                : EXPENSE_BILLING_CLASS_LABEL[f]}
          </Button>
        ))}
        {canManage && (
          <Button size="sm" onClick={() => setOpen(true)}>
            New expense
          </Button>
        )}
      </Stack>

      <TableContainer>
        <Table size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Category</TableHeader>
              <TableHeader>Billing</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Recovery</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(listQ.data ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.ref}</TableCell>
                <TableCell>{r.expenseDate}</TableCell>
                <TableCell>
                  {EXPENSE_CATEGORY_LABEL[r.category as keyof typeof EXPENSE_CATEGORY_LABEL] ?? r.category}
                </TableCell>
                <TableCell>
                  {EXPENSE_BILLING_CLASS_LABEL[r.billingClass as keyof typeof EXPENSE_BILLING_CLASS_LABEL] ??
                    r.billingClass}
                </TableCell>
                <TableCell>{formatINR(r.amountPaise)}</TableCell>
                <TableCell>
                  <Tag type={STATUS_TAG[r.status] ?? "gray"} size="sm">
                    {EXPENSE_STATUS_LABEL[r.status as keyof typeof EXPENSE_STATUS_LABEL] ?? r.status}
                  </Tag>
                </TableCell>
                <TableCell>
                  {EXPENSE_RECOVERY_STATUS_LABEL[r.recoveryStatus as keyof typeof EXPENSE_RECOVERY_STATUS_LABEL] ??
                    r.recoveryStatus}
                </TableCell>
                <TableCell>
                  {canManage && r.status === "DRAFT" && (
                    <Button kind="ghost" size="sm" onClick={() => submit.mutate({ id: r.id })}>
                      Submit
                    </Button>
                  )}
                  {canAudit && r.status === "SUBMITTED" && (
                    <Button kind="ghost" size="sm" onClick={() => audit.mutate({ id: r.id, approved: true })}>
                      Audit
                    </Button>
                  )}
                  {canAudit && r.status === "AUDITED" && (
                    <Button kind="ghost" size="sm" onClick={() => close.mutate({ id: r.id })}>
                      Close
                    </Button>
                  )}
                  {canAudit &&
                    r.status === "CLOSED" &&
                    r.billingClass === "BILLABLE" &&
                    r.recoveryStatus === "PENDING" && (
                      <Button kind="ghost" size="sm" onClick={() => setRecoverId(r.id)}>
                        Mark recovered
                      </Button>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        modalHeading="New project expense"
        primaryButtonText={create.isPending ? "Saving…" : "Save draft"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={create.isPending || !amountPaise}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            scope: "PROJECT",
            projectId,
            category: form.category as (typeof ExpenseCategory.options)[number],
            paymentMethod: (form.cashVoucher ? "CASH" : form.paymentMethod) as (typeof ExpensePaymentMethod.options)[number],
            amountPaise,
            expenseDate: form.expenseDate,
            payee: form.payee || undefined,
            description: form.description || undefined,
            billingClass: form.billable ? "BILLABLE" : "NON_BILLABLE",
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="pe-cat"
            labelText="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {ExpenseCategory.options.map((c) => (
              <SelectItem key={c} value={c} text={EXPENSE_CATEGORY_LABEL[c]} />
            ))}
          </Select>
          <TextInput
            id="pe-amt"
            labelText="Amount (₹)"
            type="number"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <TextInput
            id="pe-date"
            labelText="Expense date"
            type="date"
            value={form.expenseDate}
            onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
          />
          <Toggle
            id="pe-billable"
            labelText="Client-recoverable (billable)"
            labelA="Non-billable"
            labelB="Billable"
            toggled={form.billable}
            onToggle={(checked) => setForm((f) => ({ ...f, billable: checked }))}
          />
          <Toggle
            id="pe-cash"
            labelText="Cash voucher"
            labelA="No"
            labelB="Yes"
            toggled={form.cashVoucher}
            onToggle={(checked) => setForm((f) => ({ ...f, cashVoucher: checked }))}
          />
          {create.error && (
            <InlineNotification kind="error" lowContrast title="Error" subtitle={create.error.message} />
          )}
        </Stack>
      </Modal>

      <Modal
        open={!!recoverId}
        modalHeading="Mark billable expense recovered"
        primaryButtonText="Mark invoiced"
        secondaryButtonText="Cancel"
        onRequestClose={() => setRecoverId(null)}
        onRequestSubmit={() => {
          if (!recoverId) return;
          markRecovered.mutate({
            id: recoverId,
            recoveryStatus: "INVOICED",
          });
        }}
      >
        <p>Link to a client invoice ref manually in v1, or mark as recovered once absorbed into a GST invoice.</p>
        <TextInput
          id="pe-inv"
          labelText="Invoice ref (optional note)"
          value={invoiceRef}
          onChange={(e) => setInvoiceRef(e.target.value)}
        />
        <Button
          kind="danger--ghost"
          style={{ marginTop: "var(--cds-spacing-04)" }}
          onClick={() =>
            recoverId &&
            markRecovered.mutate({ id: recoverId, recoveryStatus: "WRITTEN_OFF" })
          }
        >
          Write off instead
        </Button>
      </Modal>
    </div>
  );
}
