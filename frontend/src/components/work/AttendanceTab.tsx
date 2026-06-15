import {
  Button,
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
} from "@carbon/react";
import {
  ATTENDANCE_STATUS,
  type AttendanceStatusCode,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { DataState } from "../DataState.js";
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
    onSuccess: () => {
      utils.attendance.dayRegister.invalidate({ date });
      utils.dashboard.attendanceToday.invalidate();
    },
  });

  const saveAll = trpc.attendance.markDay.useMutation({
    onSuccess: () => {
      utils.attendance.dayRegister.invalidate({ date });
      utils.dashboard.attendanceToday.invalidate();
    },
  });

  const rows = registerQ.data?.rows ?? [];

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={5}>
        <TextInput
          id="att-date"
          labelText="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Button
          kind="secondary"
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
      <p>Daily office attendance — present, absent, half-day, WFH, or on leave. Architecture firms use a simple register, not hourly timesheets.</p>

      <DataState
        loading={registerQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={4}
        empty={{
          title: "No team members",
          description: "Add staff in Team before marking attendance.",
        }}
      >
        <TableContainer title={`Attendance · ${date}`}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Member</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const status = draft[r.teamMemberId] ?? (r.status as AttendanceStatusCode | undefined) ?? "PRESENT";
                return (
                  <TableRow key={r.teamMemberId}>
                    <TableCell>{r.memberName}</TableCell>
                    <TableCell>{r.memberRole}</TableCell>
                    <TableCell>
                      <Select
                        id={`att-${r.teamMemberId}`}
                        labelText="Status"
                        hideLabel
                        size="sm"
                        value={status}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            [r.teamMemberId]: e.target.value as AttendanceStatusCode,
                          }))
                        }
                      >
                        {(Object.keys(ATTENDANCE_STATUS) as AttendanceStatusCode[]).map((k) => (
                          <SelectItem key={k} value={k} text={ATTENDANCE_STATUS[k]} />
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Stack orientation="horizontal" gap={2}>
                        <Tag type={STATUS_TAG[status]} size="sm">
                          {ATTENDANCE_STATUS[status]}
                        </Tag>
                        <Button
                          kind="ghost"
                          size="sm"
                          disabled={mark.isPending}
                          onClick={() =>
                            mark.mutate({
                              teamMemberId: r.teamMemberId,
                              attendanceDate: date,
                              status,
                            })
                          }
                        >
                          Save
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
    </Stack>
  );
}
