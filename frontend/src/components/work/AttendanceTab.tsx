import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  ATTENDANCE_STATUS,
  type AttendanceStatusCode,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { DataState } from "../DataState.js";
import { RowActionsMenu } from "../RowActionsMenu.js";
import { StatusDot } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";
import { toISO } from "./workHelpers.js";

const STATUS_TAG: Record<AttendanceStatusCode, "green" | "red" | "blue" | "teal" | "gray"> = {
  PRESENT: "green",
  ABSENT: "red",
  HALF_DAY: "teal",
  WFH: "blue",
  ON_LEAVE: "gray",
};

export function AttendanceTab() {
  const utils = trpc.useUtils();
  const [date, setDate] = useState(() => toISO(new Date()));
  const registerQ = trpc.attendance.dayRegister.useQuery({ date });
  const [draft, setDraft] = useState<Record<string, AttendanceStatusCode>>({});

  useEffect(() => {
    const next: Record<string, AttendanceStatusCode> = {};
    for (const row of registerQ.data?.rows ?? []) {
      if (row.status) next[row.teamMemberId] = row.status as AttendanceStatusCode;
    }
    setDraft(next);
  }, [registerQ.data]);

  const mark = trpc.attendance.mark.useMutation({
    meta: { errorTitle: "Couldn't mark the attendance" },
    onSuccess: () => {
      utils.attendance.dayRegister.invalidate({ date });
      utils.dashboard.attendanceToday.invalidate();
    },
  });

  const saveAll = trpc.attendance.markDay.useMutation({
    meta: { errorTitle: "Couldn't save the attendance register" },
    onSuccess: () => {
      utils.attendance.dayRegister.invalidate({ date });
      utils.dashboard.attendanceToday.invalidate();
    },
  });

  const rows = registerQ.data?.rows ?? [];

  const statusFor = (teamMemberId: string, rowStatus: string | null | undefined): AttendanceStatusCode =>
    draft[teamMemberId] ?? (rowStatus as AttendanceStatusCode | undefined) ?? "PRESENT";

  const columns: GridColDef[] = [
    { field: "memberName", headerName: "Member", flex: 1.2, minWidth: 160 },
    { field: "memberRole", headerName: "Role", flex: 1, minWidth: 120 },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 170,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const status = statusFor(p.row.teamMemberId as string, p.row.status as string | null);
        return (
          <TextField
            id={`att-${p.row.teamMemberId}`}
            select
            size="small"
            sx={{ minWidth: 150 }}
            value={status}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                [p.row.teamMemberId as string]: e.target.value as AttendanceStatusCode,
              }))
            }
            slotProps={{ htmlInput: { "aria-label": "Status" } }}
          >
            {(Object.keys(ATTENDANCE_STATUS) as AttendanceStatusCode[]).map((k) => (
              <MenuItem key={k} value={k}>{ATTENDANCE_STATUS[k]}</MenuItem>
            ))}
          </TextField>
        );
      },
    },
    {
      field: "actions",
      headerName: "",
      flex: 1,
      minWidth: 190,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const status = statusFor(p.row.teamMemberId as string, p.row.status as string | null);
        return (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <StatusDot color={STATUS_TAG[status]} label={ATTENDANCE_STATUS[status]} />
            <RowActionsMenu
              actions={[
                {
                  label: "Save",
                  disabled: mark.isPending,
                  onClick: () =>
                    mark.mutate({
                      teamMemberId: p.row.teamMemberId as string,
                      attendanceDate: date,
                      status,
                    }),
                },
              ]}
            />
          </Stack>
        );
      },
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <TextField
          id="att-date"
          label="Date"
          type="date"
          size="small"
          value={date}
          slotProps={{ inputLabel: { shrink: true } }}
          onChange={(e) => setDate(e.target.value)}
        />
        <Button
          variant="outlined"
          disabled={saveAll.isPending || rows.length === 0}
          onClick={() =>
            saveAll.mutate({
              date,
              entries: rows.map((r) => ({
                teamMemberId: r.teamMemberId,
                status: draft[r.teamMemberId] ?? "PRESENT",
              })),
            })
          }
        >
          Save register
        </Button>
      </Stack>
      <Typography variant="body2">Daily office attendance — present, absent, half-day, WFH, or on leave. Architecture firms use a simple register, not hourly timesheets.</Typography>

      <DataState
        loading={registerQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={4}
        empty={{
          title: "No team members",
          description: "Add staff in Team before marking attendance.",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ p: 2, pb: 1 }}>{`Attendance · ${date}`}</Typography>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r) => r.teamMemberId}
            getRowHeight={() => "auto"}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </Box>
      </DataState>
    </Stack>
  );
}
