import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { formatINR, parseRupeeInput } from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { RailLayout } from "../components/RailLayout.js";
import { StatusDot } from "../components/StatusTag.js";
import { PayslipPdfCell } from "../components/PayslipPdfCell.js";
import { useCapabilities } from "../lib/capabilities.js";
import { trpc } from "../lib/trpc.js";

/** Finance › Payroll — monthly payslips (relocated from HR). */
export function Payroll() {
  const utils = trpc.useUtils();
  const { canSalary } = useCapabilities();
  const payrollQ = trpc.payroll.list.useQuery();
  const teamQ = trpc.team.list.useQuery();
  const team = teamQ.data ?? [];

  const markPaid = trpc.payroll.markPaid.useMutation({
    onSuccess: () => utils.payroll.list.invalidate(),
  });

  const [open, setOpen] = useState(false);
  const [py, setPy] = useState({ teamMemberId: "", month: "", gross: "", deductions: "" });
  const generate = trpc.payroll.generate.useMutation({
    onSuccess: () => {
      utils.payroll.list.invalidate();
      setOpen(false);
      setPy({ teamMemberId: "", month: "", gross: "", deductions: "" });
    },
  });

  const rows = payrollQ.data ?? [];

  const columns: GridColDef[] = [
    { field: "name", headerName: "Member", flex: 1, minWidth: 140 },
    { field: "month", headerName: "Month", flex: 0.8, minWidth: 110 },
    ...(canSalary
      ? ([
          {
            field: "grossPaise",
            headerName: "Gross",
            flex: 0.8,
            minWidth: 120,
            renderCell: (p) => formatINR(p.row.grossPaise, { paise: false }),
          },
          {
            field: "deductionsPaise",
            headerName: "Deductions",
            flex: 0.8,
            minWidth: 120,
            renderCell: (p) => formatINR(p.row.deductionsPaise, { paise: false }),
          },
          {
            field: "netPaise",
            headerName: "Net",
            flex: 0.8,
            minWidth: 120,
            renderCell: (p) => formatINR(p.row.netPaise, { paise: false }),
          },
        ] as GridColDef[])
      : []),
    {
      field: "paid",
      headerName: "Status",
      flex: 0.8,
      minWidth: 130,
      sortable: false,
      renderCell: (p) => (
        <StatusDot
          color={p.row.paid ? "green" : "gray"}
          label={p.row.paid ? `Paid ${p.row.paidDate ?? ""}` : "Unpaid"}
        />
      ),
    },
    {
      field: "action",
      headerName: "Action",
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      filterable: false,
      renderCell: (p) =>
        !p.row.paid ? (
          <Button variant="text" size="small" onClick={() => markPaid.mutate({ id: p.row.id })}>
            Mark paid
          </Button>
        ) : null,
    },
    {
      field: "slip",
      headerName: "Slip",
      flex: 1,
      minWidth: 160,
      sortable: false,
      filterable: false,
      renderCell: (p) => <PayslipPdfCell payslipId={p.row.id} initialStatus={p.row.pdfStatus} />,
    },
  ];

  return (
    <>
      <RailLayout
        title="Payroll"
        description="Monthly payslips — gross, deductions and net pay."
        aside={
          <Stack spacing={1.5}>
            <Button variant="contained" fullWidth disabled={team.length === 0} onClick={() => setOpen(true)}>
              Generate payslip
            </Button>
          </Stack>
        }
      >
        <DataState
          loading={payrollQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={5}
          empty={{ title: "No payslips", description: "Generate a monthly payslip for a team member." }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </DataState>
      </RailLayout>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Generate payslip</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="py-m"
              select
              label="Member"
              value={py.teamMemberId}
              onChange={(e) => setPy((f) => ({ ...f, teamMemberId: e.target.value }))}
            >
              <MenuItem value="">Select…</MenuItem>
              {team.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="py-month"
              label="Month (YYYY-MM)"
              placeholder="2026-06"
              value={py.month}
              onChange={(e) => setPy((f) => ({ ...f, month: e.target.value }))}
            />
            {canSalary && (
              <TextField
                id="py-gross"
                label="Gross (₹) — defaults to monthly salary"
                value={py.gross}
                onChange={(e) => setPy((f) => ({ ...f, gross: e.target.value }))}
              />
            )}
            {canSalary && (
              <TextField
                id="py-ded"
                label="Deductions (₹)"
                value={py.deductions}
                onChange={(e) => setPy((f) => ({ ...f, deductions: e.target.value }))}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!py.teamMemberId || !/^\d{4}-\d{2}$/.test(py.month) || generate.isPending}
            onClick={() =>
              generate.mutate({
                teamMemberId: py.teamMemberId,
                month: py.month,
                grossPaise: py.gross ? parseRupeeInput(py.gross) : undefined,
                deductionsPaise: py.deductions ? parseRupeeInput(py.deductions) : 0,
              })
            }
          >
            {generate.isPending ? "Generating…" : "Generate"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
