import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { LEAVE_TYPES, type LeaveTypeCode, formatINR, parseRupeeInput } from "@esti/contracts";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PayslipPdfCell } from "../components/PayslipPdfCell.js";
import { RailLayout } from "../components/RailLayout.js";
import { trpc } from "../lib/trpc.js";
import { useCapabilities } from "../lib/capabilities.js";
import { StaffProfilesTab } from "../components/hr/StaffProfilesTab.js";
import { ApplicationsTab } from "../components/hr/ApplicationsTab.js";

const LEAVE_TAG: Record<string, "blue" | "green" | "red"> = {
  REQUESTED: "blue",
  APPROVED: "green",
  REJECTED: "red",
};
const thisMonth = () => new Date().toISOString().slice(0, 7);

function TagChip({ color, label }: { color: string; label: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: `var(--cds-tag-background-${color})`,
        color: `var(--cds-tag-color-${color})`,
      }}
    />
  );
}

export function Hr({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { canSalary } = useCapabilities();
  const utils = trpc.useUtils();
  const teamQ = trpc.team.list.useQuery();
  const leavesQ = trpc.leaves.list.useQuery();
  const payrollQ = trpc.payroll.list.useQuery();
  const attTodayQ = trpc.attendance.dayRegister.useQuery({
    date: new Date().toISOString().slice(0, 10),
  });
  const team = (teamQ.data ?? []).filter((m) => m.active);

  const [tab, setTab] = useState(0);

  const setLeave = trpc.leaves.setStatus.useMutation({
    onSuccess: () => utils.leaves.list.invalidate(),
  });
  const markPaid = trpc.payroll.markPaid.useMutation({
    onSuccess: () => utils.payroll.list.invalidate(),
  });

  // Leave request modal
  const [lvOpen, setLvOpen] = useState(false);
  const [lv, setLv] = useState({
    teamMemberId: "",
    type: "CASUAL" as LeaveTypeCode,
    fromDate: "",
    toDate: "",
    days: "1",
    reason: "",
  });
  const createLeave = trpc.leaves.create.useMutation({
    onSuccess: () => {
      utils.leaves.list.invalidate();
      setLvOpen(false);
      setLv({
        teamMemberId: "",
        type: "CASUAL",
        fromDate: "",
        toDate: "",
        days: "1",
        reason: "",
      });
    },
  });

  // Payslip generate modal
  const [pyOpen, setPyOpen] = useState(false);
  const [py, setPy] = useState({
    teamMemberId: "",
    month: thisMonth(),
    gross: "",
    deductions: "",
  });
  const generate = trpc.payroll.generate.useMutation({
    onSuccess: () => {
      utils.payroll.list.invalidate();
      setPyOpen(false);
      setPy({
        teamMemberId: "",
        month: thisMonth(),
        gross: "",
        deductions: "",
      });
    },
  });

  const leaveColumns: GridColDef[] = [
    { field: "name", headerName: "Member", flex: 1, minWidth: 140 },
    {
      field: "type",
      headerName: "Type",
      flex: 1,
      minWidth: 120,
      valueGetter: (_v, row) => LEAVE_TYPES[row.type as LeaveTypeCode] ?? row.type,
    },
    { field: "fromDate", headerName: "From", width: 120 },
    { field: "toDate", headerName: "To", width: 120 },
    { field: "days", headerName: "Days", width: 90 },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (p) => <TagChip color={LEAVE_TAG[p.row.status] ?? "blue"} label={p.row.status} />,
    },
    {
      field: "action",
      headerName: "Action",
      sortable: false,
      filterable: false,
      minWidth: 180,
      flex: 1,
      renderCell: (p) =>
        p.row.status === "REQUESTED" ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", height: 1 }}>
            <Button
              variant="text"
              size="small"
              onClick={() => setLeave.mutate({ id: p.row.id, status: "APPROVED" })}
            >
              Approve
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => setLeave.mutate({ id: p.row.id, status: "REJECTED" })}
            >
              Reject
            </Button>
          </Stack>
        ) : null,
    },
  ];

  const payrollColumns: GridColDef[] = [
    { field: "name", headerName: "Member", flex: 1, minWidth: 140 },
    { field: "month", headerName: "Month", width: 120 },
    ...(canSalary
      ? ([
          {
            field: "grossPaise",
            headerName: "Gross",
            width: 130,
            valueGetter: (v: number) => formatINR(v, { paise: false }),
          },
          {
            field: "deductionsPaise",
            headerName: "Deductions",
            width: 130,
            valueGetter: (v: number) => formatINR(v, { paise: false }),
          },
          {
            field: "netPaise",
            headerName: "Net",
            width: 130,
            valueGetter: (v: number) => formatINR(v, { paise: false }),
          },
        ] as GridColDef[])
      : []),
    {
      field: "status",
      headerName: "Status",
      minWidth: 160,
      flex: 1,
      renderCell: (p) => (
        <TagChip
          color={p.row.paid ? "green" : "gray"}
          label={p.row.paid ? `Paid ${p.row.paidDate ?? ""}` : "Unpaid"}
        />
      ),
    },
    {
      field: "action",
      headerName: "Action",
      sortable: false,
      filterable: false,
      width: 130,
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
      sortable: false,
      filterable: false,
      width: 140,
      renderCell: (p) => <PayslipPdfCell payslipId={p.row.id} initialStatus={p.row.pdfStatus} />,
    },
  ];

  return (
    <>
      <RailLayout
        title="HR"
        description="Leave management, payroll, staff profiles, and the hiring pipeline."
        tabs={
          <Tabs
            orientation="vertical"
            value={tab}
            onChange={(_e, v) => setTab(v)}
            aria-label="HR sections"
          >
            <Tab label="Operations" />
            <Tab label="Staff profiles" />
            <Tab label="Applications" />
          </Tabs>
        }
      >
      {/* ── Operations panel ── */}
      {tab === 0 && (
        <Stack spacing={3}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
              Today&apos;s attendance
            </Typography>
            <Button variant="text" size="small" onClick={() => navigate("/tasks?tab=attendance")}>
              Open register
            </Button>
          </Box>
          <Typography variant="body2">
            {(attTodayQ.data?.rows ?? []).filter((r) => r.status === "PRESENT" || r.status === "HALF_DAY").length} present /{" "}
            {(attTodayQ.data?.rows ?? []).length} staff · mark daily status in Work → Attendance.
          </Typography>

          {/* Leaves */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
              Leaves
            </Typography>
            <Button
              variant="contained"
              size="small"
              disabled={team.length === 0}
              onClick={() => setLvOpen(true)}
            >
              Request leave
            </Button>
          </Box>
          <Box sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Leave register</Typography>
              <DataGrid
                rows={leavesQ.data ?? []}
                columns={leaveColumns}
                loading={leavesQ.isLoading}
                density="compact"
                disableRowSelectionOnClick
                hideFooter
                autoHeight
              />
            </Stack>
          </Box>

          {/* Payroll */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
              Payroll
            </Typography>
            <Button
              variant="contained"
              size="small"
              disabled={team.length === 0}
              onClick={() => setPyOpen(true)}
            >
              Generate payslip
            </Button>
          </Box>
          <Box sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Payslips</Typography>
              <Typography variant="caption" color="text.secondary">
                Monthly salary — net of deductions
              </Typography>
              <DataGrid
                rows={payrollQ.data ?? []}
                columns={payrollColumns}
                loading={payrollQ.isLoading}
                density="compact"
                disableRowSelectionOnClick
                hideFooter
                autoHeight
              />
            </Stack>
          </Box>
        </Stack>
      )}

      {/* ── Staff profiles panel ── */}
      {tab === 1 && <StaffProfilesTab />}

      {/* ── Applications panel ── */}
      {tab === 2 && <ApplicationsTab />}
      </RailLayout>

      {/* Leave modal */}
      <Dialog open={lvOpen} onClose={() => setLvOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Request leave</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="lv-m"
              select
              label="Member"
              value={lv.teamMemberId}
              onChange={(e) => setLv((f) => ({ ...f, teamMemberId: e.target.value }))}
            >
              <MenuItem value="">Select…</MenuItem>
              {team.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="lv-t"
              select
              label="Type"
              value={lv.type}
              onChange={(e) => setLv((f) => ({ ...f, type: e.target.value as LeaveTypeCode }))}
            >
              {(Object.keys(LEAVE_TYPES) as LeaveTypeCode[]).map((k) => (
                <MenuItem key={k} value={k}>{LEAVE_TYPES[k]}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="lv-f"
              label="From"
              type="date"
              value={lv.fromDate}
              onChange={(e) => setLv((f) => ({ ...f, fromDate: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              id="lv-to"
              label="To"
              type="date"
              value={lv.toDate}
              onChange={(e) => setLv((f) => ({ ...f, toDate: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              id="lv-d"
              label="Days"
              type="number"
              value={lv.days}
              onChange={(e) => setLv((f) => ({ ...f, days: e.target.value }))}
            />
            <TextField
              id="lv-r"
              label="Reason (optional)"
              value={lv.reason}
              onChange={(e) => setLv((f) => ({ ...f, reason: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setLvOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!lv.teamMemberId || !lv.fromDate || !lv.toDate || createLeave.isPending}
            onClick={() =>
              createLeave.mutate({
                teamMemberId: lv.teamMemberId,
                type: lv.type,
                fromDate: lv.fromDate,
                toDate: lv.toDate,
                days: Number(lv.days) || 1,
                reason: lv.reason || undefined,
              })
            }
          >
            {createLeave.isPending ? "Saving…" : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payslip modal */}
      <Dialog open={pyOpen} onClose={() => setPyOpen(false)} fullWidth maxWidth="sm">
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
              id="py-mo"
              label="Month (YYYY-MM)"
              value={py.month}
              onChange={(e) => setPy((f) => ({ ...f, month: e.target.value }))}
            />
            {canSalary && (
              <TextField
                id="py-g"
                label="Gross (₹ — blank = member salary)"
                type="number"
                value={py.gross}
                onChange={(e) => setPy((f) => ({ ...f, gross: e.target.value }))}
              />
            )}
            {canSalary && (
              <TextField
                id="py-d"
                label="Deductions (₹)"
                type="number"
                value={py.deductions}
                onChange={(e) => setPy((f) => ({ ...f, deductions: e.target.value }))}
              />
            )}
            {generate.error && (
              <Typography variant="body2" color="error">{generate.error.message}</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setPyOpen(false)}>Cancel</Button>
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
            {generate.isPending ? "Saving…" : "Generate"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
