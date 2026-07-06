import {
  Alert,
  AlertTitle,
  Box,
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

const chipSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});

const shrink = { slotProps: { inputLabel: { shrink: true } } } as const;

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

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.8, minWidth: 110 },
    { field: "expenseDate", headerName: "Date", flex: 0.8, minWidth: 110 },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      minWidth: 120,
      renderCell: (p) =>
        EXPENSE_CATEGORY_LABEL[p.row.category as keyof typeof EXPENSE_CATEGORY_LABEL] ?? p.row.category,
    },
    {
      field: "billingClass",
      headerName: "Billing",
      flex: 1,
      minWidth: 110,
      renderCell: (p) =>
        EXPENSE_BILLING_CLASS_LABEL[p.row.billingClass as keyof typeof EXPENSE_BILLING_CLASS_LABEL] ??
        p.row.billingClass,
    },
    {
      field: "amountPaise",
      headerName: "Amount",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => formatINR(p.row.amountPaise),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.9,
      minWidth: 110,
      renderCell: (p) => (
        <Chip
          size="small"
          sx={chipSx(STATUS_TAG[p.row.status] ?? "gray")}
          label={EXPENSE_STATUS_LABEL[p.row.status as keyof typeof EXPENSE_STATUS_LABEL] ?? p.row.status}
        />
      ),
    },
    {
      field: "recoveryStatus",
      headerName: "Recovery",
      flex: 1,
      minWidth: 120,
      renderCell: (p) =>
        EXPENSE_RECOVERY_STATUS_LABEL[
          p.row.recoveryStatus as keyof typeof EXPENSE_RECOVERY_STATUS_LABEL
        ] ?? p.row.recoveryStatus,
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      flex: 1,
      minWidth: 150,
      renderCell: (p) => (
        <>
          {canManage && p.row.status === "DRAFT" && (
            <Button variant="text" size="small" onClick={() => submit.mutate({ id: p.row.id })}>
              Submit
            </Button>
          )}
          {canAudit && p.row.status === "SUBMITTED" && (
            <Button variant="text" size="small" onClick={() => audit.mutate({ id: p.row.id, approved: true })}>
              Audit
            </Button>
          )}
          {canAudit && p.row.status === "AUDITED" && (
            <Button variant="text" size="small" onClick={() => close.mutate({ id: p.row.id })}>
              Close
            </Button>
          )}
          {canAudit &&
            p.row.status === "CLOSED" &&
            p.row.billingClass === "BILLABLE" &&
            p.row.recoveryStatus === "PENDING" && (
              <Button variant="text" size="small" onClick={() => setRecoverId(p.row.id)}>
                Mark recovered
              </Button>
            )}
        </>
      ),
    },
  ];

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" component="h4">Project expenses</Typography>
      <p>Site travel, food, accommodation, and misc — tracked separately from client GST invoices.</p>

      {summaryQ.data && (
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", my: 2 }}>
          <Box sx={{ minWidth: 180, p: 2, border: 1, borderColor: "divider" }}>
            <div>Non-billable spend</div>
            <strong>{formatINR(summaryQ.data.nonBillablePaise)}</strong>
          </Box>
          <Box sx={{ minWidth: 180, p: 2, border: 1, borderColor: "divider" }}>
            <div>Billable (pending recovery)</div>
            <strong>{formatINR(summaryQ.data.billablePendingPaise)}</strong>
          </Box>
          <Box sx={{ minWidth: 180, p: 2, border: 1, borderColor: "divider" }}>
            <div>Billable (recovered)</div>
            <strong>{formatINR(summaryQ.data.billableRecoveredPaise)}</strong>
          </Box>
          {summaryQ.data.contractValuePaise > 0 && (
            <Box sx={{ minWidth: 180, p: 2, border: 1, borderColor: "divider" }}>
              <div>Contract value (info)</div>
              <strong>{formatINR(summaryQ.data.contractValuePaise)}</strong>
            </Box>
          )}
        </Box>
      )}

      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        {(["ALL", "BILLABLE", "NON_BILLABLE", "PENDING_RECOVERY"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "contained" : "outlined"}
            size="small"
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
          <Button size="small" variant="contained" onClick={() => setOpen(true)}>
            New expense
          </Button>
        )}
      </Stack>

      <DataGrid
        rows={listQ.data ?? []}
        columns={columns}
        density="compact"
        disableRowSelectionOnClick
        hideFooter
        autoHeight
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New project expense</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="pe-cat"
              select
              label="Category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              fullWidth
            >
              {ExpenseCategory.options.map((c) => (
                <MenuItem key={c} value={c}>
                  {EXPENSE_CATEGORY_LABEL[c]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="pe-amt"
              label="Amount (₹)"
              type="number"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              fullWidth
            />
            <TextField
              id="pe-date"
              label="Expense date"
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
              fullWidth
              {...shrink}
            />
            <FormControlLabel
              control={
                <Switch
                  id="pe-billable"
                  checked={form.billable}
                  onChange={(e) => setForm((f) => ({ ...f, billable: e.target.checked }))}
                />
              }
              label="Client-recoverable (billable)"
            />
            <FormControlLabel
              control={
                <Switch
                  id="pe-cash"
                  checked={form.cashVoucher}
                  onChange={(e) => setForm((f) => ({ ...f, cashVoucher: e.target.checked }))}
                />
              }
              label="Cash voucher"
            />
            {create.error && (
              <Alert severity="error">
                <AlertTitle>Error</AlertTitle>
                {create.error.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={create.isPending || !amountPaise}
            onClick={() =>
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
            {create.isPending ? "Saving…" : "Save draft"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!recoverId} onClose={() => setRecoverId(null)} fullWidth maxWidth="xs">
        <DialogTitle>Mark billable expense recovered</DialogTitle>
        <DialogContent>
          <p>Link to a client invoice ref manually in v1, or mark as recovered once absorbed into a GST invoice.</p>
          <TextField
            id="pe-inv"
            label="Invoice ref (optional note)"
            value={invoiceRef}
            onChange={(e) => setInvoiceRef(e.target.value)}
            fullWidth
          />
          <Button
            variant="text"
            color="error"
            sx={{ mt: 1.5 }}
            onClick={() =>
              recoverId &&
              markRecovered.mutate({ id: recoverId, recoveryStatus: "WRITTEN_OFF" })
            }
          >
            Write off instead
          </Button>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setRecoverId(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!recoverId) return;
              markRecovered.mutate({
                id: recoverId,
                recoveryStatus: "INVOICED",
              });
            }}
          >
            Mark invoiced
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
