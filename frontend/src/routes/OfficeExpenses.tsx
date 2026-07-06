import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  EXPENSE_BILLING_CLASS_LABEL,
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_PAYMENT_METHOD_LABEL,
  EXPENSE_STATUS_LABEL,
  ExpenseCategory,
  ExpensePaymentMethod,
  can,
  formatINR,
  resolvePeriodRange,
  type PeriodFilterInput,
} from "@esti/contracts";
import type { ReactNode } from "react";
import { useState } from "react";
import { AccountsCarryForward } from "../components/accounting/AccountsCarryForward.js";
import { RailLayout } from "../components/RailLayout.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

const DEFAULT_PERIOD: PeriodFilterInput = { preset: "CURRENT_FY" };

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red" | "teal"> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  AUDITED: "teal",
  CLOSED: "green",
  REJECTED: "red",
};

/** Status badge rendered over the Carbon `--cds-tag-*` token vars (exact colours). */
function TagChip({ color, label }: { color: string; label: ReactNode }) {
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        backgroundColor: `var(--cds-tag-background-${color})`,
        color: `var(--cds-tag-color-${color})`,
      }}
    />
  );
}

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{scope === "OFFICE" ? "New office expense" : "New project expense"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            id="exp-cat"
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {ExpenseCategory.options.map((c) => (
              <MenuItem key={c} value={c}>{EXPENSE_CATEGORY_LABEL[c]}</MenuItem>
            ))}
          </TextField>
          <TextField
            id="exp-amt"
            label="Amount (₹)"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <TextField
            id="exp-date"
            label="Expense date"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
          <TextField id="exp-payee" label="Payee" value={payee} onChange={(e) => setPayee(e.target.value)} />
          <TextField
            id="exp-desc"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <FormControlLabel
            control={<Switch checked={cashVoucher} onChange={(e) => setCashVoucher(e.target.checked)} />}
            label="Cash voucher"
          />
          {!cashVoucher && (
            <TextField
              id="exp-pay"
              select
              label="Payment method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {ExpensePaymentMethod.options.map((m) => (
                <MenuItem key={m} value={m}>{EXPENSE_PAYMENT_METHOD_LABEL[m]}</MenuItem>
              ))}
            </TextField>
          )}
          {scope === "PROJECT" && (
            <FormControlLabel
              control={<Switch checked={billable} onChange={(e) => setBillable(e.target.checked)} />}
              label={`Billing class — ${billable ? EXPENSE_BILLING_CLASS_LABEL.BILLABLE : EXPENSE_BILLING_CLASS_LABEL.NON_BILLABLE}`}
            />
          )}
          {create.error && <Alert severity="error">{create.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={create.isPending || !amountPaise || amountPaise <= 0}
          onClick={() =>
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
          {create.isPending ? "Saving…" : "Save draft"}
        </Button>
      </DialogActions>
    </Dialog>
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

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.8, minWidth: 110 },
    { field: "expenseDate", headerName: "Date", flex: 0.8, minWidth: 120 },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) =>
        EXPENSE_CATEGORY_LABEL[row.category as keyof typeof EXPENSE_CATEGORY_LABEL] ?? row.category,
    },
    { field: "payee", headerName: "Payee", flex: 1, minWidth: 140, valueGetter: (v) => v ?? "—" },
    {
      field: "amountPaise",
      headerName: "Amount",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => formatINR(p.row.amountPaise),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: (p) => (
        <TagChip
          color={STATUS_TAG[p.row.status] ?? "gray"}
          label={EXPENSE_STATUS_LABEL[p.row.status as keyof typeof EXPENSE_STATUS_LABEL] ?? p.row.status}
        />
      ),
    },
    {
      field: "actions",
      headerName: "",
      flex: 1,
      minWidth: 200,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <>
          {canManage && p.row.status === "DRAFT" && (
            <Button variant="text" size="small" disabled={submit.isPending} onClick={() => submit.mutate({ id: p.row.id })}>
              Submit
            </Button>
          )}
          {canAudit && p.row.status === "SUBMITTED" && (
            <>
              <Button variant="text" size="small" disabled={audit.isPending} onClick={() => audit.mutate({ id: p.row.id, approved: true })}>
                Audit
              </Button>
              <Button variant="text" color="error" size="small" disabled={audit.isPending} onClick={() => audit.mutate({ id: p.row.id, approved: false })}>
                Reject
              </Button>
            </>
          )}
          {canAudit && p.row.status === "AUDITED" && (
            <Button variant="text" size="small" disabled={close.isPending} onClick={() => close.mutate({ id: p.row.id })}>
              Close
            </Button>
          )}
        </>
      ),
    },
  ];

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      density="compact"
      disableRowSelectionOnClick
      hideFooter
      autoHeight
    />
  );
}

export function OfficeExpenses() {
  const { user } = useAuth();
  const canManage = can(user?.role, "invoice:manage");
  const canAudit = can(user?.role, "reports:view");
  const [period, setPeriod] = useState<PeriodFilterInput>(DEFAULT_PERIOD);
  const range = resolvePeriodRange(period);
  const listQ = trpc.expenses.list.useQuery({
    scope: "OFFICE",
    dateFrom: range.from,
    dateTo: range.to,
    limit: 200,
  });
  const [open, setOpen] = useState(false);

  return (
    <>
      <RailLayout
        title="Office expenses"
        description="Firm overhead not tied to a single project. Always non-billable — separate from client GST invoices."
        aside={
          <Stack spacing={1.5}>
            {canManage && (
              <Button variant="contained" fullWidth onClick={() => setOpen(true)}>
                New expense
              </Button>
            )}
            <AccountsCarryForward period={period} onPeriodChange={setPeriod} />
          </Stack>
        }
      >
        {listQ.isLoading && <Typography variant="body2">Loading…</Typography>}
        {listQ.data && (
          <ExpenseTable rows={listQ.data as ExpenseRow[]} canManage={canManage} canAudit={canAudit} />
        )}
      </RailLayout>
      {open && <ExpenseFormModal open scope="OFFICE" onClose={() => setOpen(false)} />}
    </>
  );
}

export function CashBook() {
  const { user } = useAuth();
  const canManage = can(user?.role, "invoice:manage");
  const canAudit = can(user?.role, "reports:view");
  const [period, setPeriod] = useState<PeriodFilterInput>(DEFAULT_PERIOD);
  const range = resolvePeriodRange(period);
  const accountsQ = trpc.accounts.list.useQuery(period);
  const cashAccount = accountsQ.data?.find((a) => a.code === "CASH");
  const listQ = trpc.expenses.list.useQuery({
    paymentMethod: "CASH",
    accountCode: "CASH",
    dateFrom: range.from,
    dateTo: range.to,
    limit: 200,
  });
  const [open, setOpen] = useState(false);

  return (
    <>
      <RailLayout
        title="Cash book"
        description="Petty cash and physical cash outflows. Balance reflects closed cash vouchers in the selected financial year."
        aside={
          <Stack spacing={1.5}>
            {canManage && (
              <Button variant="contained" fullWidth onClick={() => setOpen(true)}>
                New cash voucher
              </Button>
            )}
            <AccountsCarryForward period={period} onPeriodChange={setPeriod} />
            {cashAccount && (
              <Typography variant="body2" className="esti-label">
                <strong>Cash balance ({range.label}):</strong> {formatINR(cashAccount.balancePaise)}
              </Typography>
            )}
          </Stack>
        }
      >
        {listQ.isLoading && <Typography variant="body2">Loading…</Typography>}
        {listQ.data && (
          <ExpenseTable rows={listQ.data as ExpenseRow[]} canManage={canManage} canAudit={canAudit} />
        )}
      </RailLayout>
      {open && <ExpenseFormModal open scope="OFFICE" onClose={() => setOpen(false)} />}
    </>
  );
}
