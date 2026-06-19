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
  Toggle,
} from "@carbon/react";
import {
  EXPENSE_BILLING_CLASS_LABEL,
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_PAYMENT_METHOD_LABEL,
  EXPENSE_STATUS_LABEL,
  ExpenseCategory,
  ExpensePaymentMethod,
  can,
  formatINR,
} from "@esti/contracts";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red" | "teal"> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  AUDITED: "teal",
  CLOSED: "green",
  REJECTED: "red",
};

type ExpenseRow = {
  id: string;
  ref: string;
  category: string;
  paymentMethod: string;
  amountPaise: number;
  expenseDate: string;
  payee: string | null;
  description: string | null;
  status: string;
};

function ExpenseFormModal({
  open,
  scope,
  projectId,
  onClose,
}: {
  open: boolean;
  scope: "OFFICE" | "PROJECT";
  projectId?: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const create = trpc.expenses.create.useMutation({
    onSuccess: () => {
      void utils.expenses.list.invalidate();
      void utils.accounts.list.invalidate();
      if (projectId) void utils.expenses.summaryByProject.invalidate({ projectId });
      onClose();
    },
  });

  const [category, setCategory] = useState<string>("MISC");
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");
  const [cashVoucher, setCashVoucher] = useState(false);
  const [billable, setBillable] = useState(false);

  const amountPaise = Math.round(parseFloat(amount || "0") * 100);

  return (
    <Modal
      open={open}
      modalHeading={scope === "OFFICE" ? "New office expense" : "New project expense"}
      primaryButtonText={create.isPending ? "Saving…" : "Save draft"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={create.isPending || !amountPaise || amountPaise <= 0}
      onRequestClose={onClose}
      onRequestSubmit={() =>
        create.mutate({
          scope,
          projectId,
          category: category as (typeof ExpenseCategory.options)[number],
          paymentMethod: (cashVoucher ? "CASH" : paymentMethod) as (typeof ExpensePaymentMethod.options)[number],
          amountPaise,
          expenseDate,
          payee: payee || undefined,
          description: description || undefined,
          billingClass: scope === "PROJECT" && billable ? "BILLABLE" : "NON_BILLABLE",
        })
      }
    >
      <Stack gap={5}>
        <Select id="exp-cat" labelText="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {ExpenseCategory.options.map((c) => (
            <SelectItem key={c} value={c} text={EXPENSE_CATEGORY_LABEL[c]} />
          ))}
        </Select>
        <TextInput
          id="exp-amt"
          labelText="Amount (₹)"
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <TextInput
          id="exp-date"
          labelText="Expense date"
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
        />
        <TextInput id="exp-payee" labelText="Payee" value={payee} onChange={(e) => setPayee(e.target.value)} />
        <TextInput
          id="exp-desc"
          labelText="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Toggle
          id="exp-cash"
          labelText="Cash voucher"
          labelA="No"
          labelB="Yes"
          toggled={cashVoucher}
          onToggle={setCashVoucher}
        />
        {!cashVoucher && (
          <Select
            id="exp-pay"
            labelText="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {ExpensePaymentMethod.options.map((m) => (
              <SelectItem key={m} value={m} text={EXPENSE_PAYMENT_METHOD_LABEL[m]} />
            ))}
          </Select>
        )}
        {scope === "PROJECT" && (
          <Toggle
            id="exp-billable"
            labelText={`Billing class — ${billable ? EXPENSE_BILLING_CLASS_LABEL.BILLABLE : EXPENSE_BILLING_CLASS_LABEL.NON_BILLABLE}`}
            labelA="Non-billable"
            labelB="Billable"
            toggled={billable}
            onToggle={setBillable}
          />
        )}
        {create.error && (
          <InlineNotification kind="error" lowContrast title="Error" subtitle={create.error.message} />
        )}
      </Stack>
    </Modal>
  );
}

function ExpenseTable({
  rows,
  canManage,
  canAudit,
}: {
  rows: ExpenseRow[];
  canManage: boolean;
  canAudit: boolean;
}) {
  const utils = trpc.useUtils();
  const submit = trpc.expenses.submit.useMutation({
    onSuccess: () => void utils.expenses.list.invalidate(),
  });
  const audit = trpc.expenses.audit.useMutation({
    onSuccess: () => {
      void utils.expenses.list.invalidate();
      void utils.accounts.list.invalidate();
    },
  });
  const close = trpc.expenses.close.useMutation({
    onSuccess: () => {
      void utils.expenses.list.invalidate();
      void utils.accounts.list.invalidate();
    },
  });

  return (
    <TableContainer>
      <Table size="md">
        <TableHead>
          <TableRow>
            <TableHeader>Ref</TableHeader>
            <TableHeader>Date</TableHeader>
            <TableHeader>Category</TableHeader>
            <TableHeader>Payee</TableHeader>
            <TableHeader>Amount</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader></TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.ref}</TableCell>
              <TableCell>{r.expenseDate}</TableCell>
              <TableCell>{EXPENSE_CATEGORY_LABEL[r.category as keyof typeof EXPENSE_CATEGORY_LABEL] ?? r.category}</TableCell>
              <TableCell>{r.payee ?? "—"}</TableCell>
              <TableCell>{formatINR(r.amountPaise)}</TableCell>
              <TableCell>
                <Tag type={STATUS_TAG[r.status] ?? "gray"} size="sm">
                  {EXPENSE_STATUS_LABEL[r.status as keyof typeof EXPENSE_STATUS_LABEL] ?? r.status}
                </Tag>
              </TableCell>
              <TableCell>
                {canManage && r.status === "DRAFT" && (
                  <Button kind="ghost" size="sm" disabled={submit.isPending} onClick={() => submit.mutate({ id: r.id })}>
                    Submit
                  </Button>
                )}
                {canAudit && r.status === "SUBMITTED" && (
                  <>
                    <Button kind="ghost" size="sm" disabled={audit.isPending} onClick={() => audit.mutate({ id: r.id, approved: true })}>
                      Audit
                    </Button>
                    <Button kind="danger--ghost" size="sm" disabled={audit.isPending} onClick={() => audit.mutate({ id: r.id, approved: false })}>
                      Reject
                    </Button>
                  </>
                )}
                {canAudit && r.status === "AUDITED" && (
                  <Button kind="ghost" size="sm" disabled={close.isPending} onClick={() => close.mutate({ id: r.id })}>
                    Close
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function OfficeExpenses() {
  const { user } = useAuth();
  const canManage = can(user?.role, "invoice:manage");
  const canAudit = can(user?.role, "reports:view");
  const listQ = trpc.expenses.list.useQuery({ scope: "OFFICE", limit: 200 });
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Office expenses"
        description="Firm overhead not tied to a single project. Always non-billable — separate from client GST invoices."
        actions={
          canManage ? (
            <Button onClick={() => setOpen(true)}>New expense</Button>
          ) : undefined
        }
      />
      {listQ.isLoading && <p>Loading…</p>}
      {listQ.data && (
        <ExpenseTable rows={listQ.data as ExpenseRow[]} canManage={canManage} canAudit={canAudit} />
      )}
      {open && <ExpenseFormModal open scope="OFFICE" onClose={() => setOpen(false)} />}
    </div>
  );
}

export function CashBook() {
  const { user } = useAuth();
  const canManage = can(user?.role, "invoice:manage");
  const canAudit = can(user?.role, "reports:view");
  const accountsQ = trpc.accounts.list.useQuery();
  const cashAccount = accountsQ.data?.find((a) => a.code === "CASH");
  const listQ = trpc.expenses.list.useQuery({
    paymentMethod: "CASH",
    accountCode: "CASH",
    limit: 200,
  });
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Cash book"
        description="Petty cash and physical cash outflows. Balance reflects closed cash vouchers only."
        actions={
          canManage ? (
            <Button onClick={() => setOpen(true)}>New cash voucher</Button>
          ) : undefined
        }
      />
      {cashAccount && (
        <p style={{ marginBottom: 16 }}>
          <strong>Cash balance (closed):</strong> {formatINR(cashAccount.balancePaise)}
        </p>
      )}
      {listQ.isLoading && <p>Loading…</p>}
      {listQ.data && (
        <ExpenseTable rows={listQ.data as ExpenseRow[]} canManage={canManage} canAudit={canAudit} />
      )}
      {open && <ExpenseFormModal open scope="OFFICE" onClose={() => setOpen(false)} />}
    </div>
  );
}
