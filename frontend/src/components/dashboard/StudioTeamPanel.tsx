import {
  Box,
  IconButton,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { TYPE_SCALE } from "@hcw/ui-kit";
import {
  TASK_LOAD_BAND_LABEL,
  taskLoadBand,
  type TaskLoadBand,
} from "@esti/contracts";
import { useMemo, useState } from "react";
import type { ZoneState } from "./zoneState.js";
import { CAPACITY_LABEL } from "./dashboardUi.js";
import { StatusDot } from "../StatusTag.js";
import {
  heatStyle,
  MONTHS,
  officeBand,
  toISO,
  WEEKDAYS,
} from "../work/workHelpers.js";
import { trpc } from "../../lib/trpc.js";

type TeamMember = {
  assignee: string;
  totalOpen: number;
  overdueCount: number;
  highPriorityCount?: number;
  capacity: string;
  memberId?: string;
};

type AttendanceToday = {
  present: number;
  headcount: number;
} | null;

const GRID_SX = {
  border: 0,
  backgroundColor: "transparent",
  "& .MuiDataGrid-columnHeaders": { textTransform: "uppercase" },
  "& .MuiDataGrid-row": { cursor: "default" },
} as const;

const loadPct = (c: string): number =>
  ({ OVERLOADED: 95, BUSY: 70, HEALTHY: 35 }[c] ?? 50);

function capacityZone(capacity: string): ZoneState {
  if (capacity === "OVERLOADED") return "critical";
  if (capacity === "BUSY") return "watch";
  return "stable";
}

function capacityTag(capacity: string): "red" | "magenta" | "green" {
  if (capacity === "OVERLOADED") return "red";
  if (capacity === "BUSY") return "magenta";
  return "green";
}

const bandTag = (band: TaskLoadBand) =>
  band === "heavy" ? "red" : band === "balanced" ? "teal" : "green";

type WorkloadMode = "individual" | "team";

export function StudioTeamPanel({
  members,
  attendance,
}: {
  members: TeamMember[];
  attendance: AttendanceToday;
}) {
  const [mode, setMode] = useState<WorkloadMode>("individual");
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(() => toISO(now));
  const [view, setView] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }));

  const dayQ = trpc.workload.day.useQuery({ date: selectedDate }, { enabled: mode === "individual" || mode === "team" });
  const monthQ = trpc.workload.month.useQuery(
    { year: view.year, month: view.month },
    { enabled: mode === "team" },
  );

  const overloaded = members.filter((m) => m.capacity === "OVERLOADED").length;
  const busy = members.filter((m) => m.capacity === "BUSY").length;
  const openTasks = members.reduce((sum, m) => sum + m.totalOpen, 0);
  const overdueTasks = members.reduce((sum, m) => sum + m.overdueCount, 0);

  const kpis = [
    { label: "Team", value: String(members.length), sub: attendance ? `${attendance.present}/${attendance.headcount} present` : "Members" },
    { label: "Open tasks", value: String(openTasks), sub: overdueTasks > 0 ? `${overdueTasks} overdue` : "Across roster" },
    { label: "Overloaded", value: String(overloaded), sub: busy > 0 ? `${busy} busy` : "Capacity signal" },
    {
      label: "Office today",
      value: dayQ.data ? String(dayQ.data.total) : "…",
      sub: dayQ.data ? `${dayQ.data.headcount} staff · due ${selectedDate.slice(5)}` : "Tasks due",
    },
  ];

  const capacityRows = members.slice(0, 20).map((m) => ({
    ...m,
    id: m.memberId ?? m.assignee,
  }));

  const capacityCols: GridColDef[] = [
    { field: "assignee", headerName: "Member", flex: 1, minWidth: 140 },
    { field: "totalOpen", headerName: "Open", width: 80, type: "number" },
    {
      field: "overdueCount",
      headerName: "Late",
      width: 80,
      renderCell: (p) =>
        (p.row.overdueCount ?? 0) > 0 ? (
          <StatusDot color="magenta" label={p.row.overdueCount} />
        ) : (
          <span>—</span>
        ),
    },
    {
      field: "load",
      headerName: "Load",
      width: 130,
      sortable: false,
      renderCell: (p) => {
        const st = capacityZone(p.row.capacity);
        return (
          <Box sx={{ width: 1, display: "flex", alignItems: "center", height: 1 }}>
            <LinearProgress
              variant="determinate"
              value={loadPct(p.row.capacity)}
              color={st === "critical" ? "error" : st === "watch" ? "warning" : "success"}
              sx={{ width: 1 }}
            />
          </Box>
        );
      },
    },
    {
      field: "capacity",
      headerName: "Capacity",
      width: 130,
      renderCell: (p) => (
        <StatusDot
          color={capacityTag(p.row.capacity)}
          label={CAPACITY_LABEL[p.row.capacity] ?? p.row.capacity}
        />
      ),
    },
  ];

  const peopleCols: GridColDef[] = [
    { field: "name", headerName: "Team member", flex: 1.5, minWidth: 140 },
    { field: "count", headerName: "Due today", flex: 0.5, minWidth: 90, type: "number" },
    {
      field: "band",
      headerName: "Band",
      flex: 1,
      minWidth: 110,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const band = taskLoadBand(p.row.count as number);
        return <StatusDot color={bandTag(band)} label={TASK_LOAD_BAND_LABEL[band]} />;
      },
    },
  ];

  const totalsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of monthQ.data?.days ?? []) map.set(d.date, d.total);
    return map;
  }, [monthQ.data?.days]);

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      if (m < 0) return { year: v.year - 1, month: 11 };
      if (m > 11) return { year: v.year + 1, month: 0 };
      return { year: v.year, month: m };
    });
  }

  const day = dayQ.data;
  const officeBandToday = officeBand(day?.total ?? 0, day?.headcount ?? 0);
  const avgToday =
    day && day.headcount > 0 ? (day.total / day.headcount).toFixed(1) : "—";

  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 0,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        {kpis.map((k, i) => (
          <Box
            key={k.label}
            sx={{
              p: 1.25,
              borderBottom: 1,
              borderRight: { xs: i % 2 === 0 ? 1 : 0, md: i < 3 ? 1 : 0 },
              borderLeft: { md: i > 0 ? 0 : 0 },
              borderColor: "divider",
            }}
          >
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }} noWrap>
              {k.label}
            </Typography>
            <Typography sx={{ fontWeight: 300, fontSize: TYPE_SCALE.kpi, lineHeight: 1.05 }} noWrap>
              {k.value}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {k.sub}
            </Typography>
          </Box>
        ))}
      </Box>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={mode}
        onChange={(_, v: WorkloadMode | null) => v && setMode(v)}
        aria-label="Workload view"
      >
        <ToggleButton value="individual">Individual workload</ToggleButton>
        <ToggleButton value="team">Team workload</ToggleButton>
      </ToggleButtonGroup>

      {mode === "individual" ? (
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Capacity — open tasks across the roster
            </Typography>
            {members.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No team data yet.
              </Typography>
            ) : (
              <DataGrid
                rows={capacityRows}
                columns={capacityCols}
                density="compact"
                disableRowSelectionOnClick
                hideFooter
                autoHeight
                sx={GRID_SX}
              />
            )}
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Due today — {selectedLabel}
            </Typography>
            {day && day.people.length > 0 ? (
              <DataGrid
                rows={day.people}
                columns={peopleCols}
                getRowId={(r) => r.name}
                density="compact"
                disableRowSelectionOnClick
                hideFooter
                autoHeight
                sx={GRID_SX}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No assignees with tasks due today.
              </Typography>
            )}
          </Box>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Box sx={{ p: 1.5, border: 1, borderColor: "divider" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
              <IconButton size="small" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                <ChevronLeft />
              </IconButton>
              <Typography variant="subtitle2" className="esti-grow" sx={{ textAlign: "center" }}>
                {MONTHS[view.month]} {view.year}
              </Typography>
              <IconButton size="small" aria-label="Next month" onClick={() => shiftMonth(1)}>
                <ChevronRight />
              </IconButton>
            </Stack>
            <div className="esti-cal">
              {WEEKDAYS.map((w) => (
                <div key={w} className="esti-cal-hdr">
                  {w}
                </div>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} />;
                const iso = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const cellTotal = totalsByDate.get(iso) ?? 0;
                const rawHeat = heatStyle(cellTotal);
                const selected = iso === selectedDate;
                return (
                  <div
                    key={iso}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDate(iso)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedDate(iso)}
                    className="esti-cal-cell"
                    style={{
                      outline: selected ? "2px solid var(--cds-focus)" : "1px solid var(--cds-border-subtle)",
                      backgroundColor: rawHeat.backgroundColor,
                      color: rawHeat.color,
                    }}
                  >
                    <Stack spacing={0.5}>
                      <strong>{d}</strong>
                      {cellTotal > 0 && <span>{cellTotal}</span>}
                    </Stack>
                  </div>
                );
              })}
            </div>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Office open tasks due each day — darker cells mean higher team load.
            </Typography>
          </Box>

          <Box sx={{ p: 1.5, border: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Office — {selectedLabel}</Typography>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="h5" component="span">
                  {day ? day.total : "…"}
                </Typography>
                <Typography variant="body2" color="text.secondary" component="span">
                  tasks due
                </Typography>
                <StatusDot color={bandTag(officeBandToday)} label={TASK_LOAD_BAND_LABEL[officeBandToday]} />
                <Typography variant="body2" color="text.secondary">
                  {day?.headcount ?? "—"} staff · {avgToday} avg
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
