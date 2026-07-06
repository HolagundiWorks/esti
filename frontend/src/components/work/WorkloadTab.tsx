import {
  Box,
  Chip,
  Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import { TASK_LOAD_BAND_LABEL, TASK_LOAD_BAND_RANGE, taskLoadBand, type TaskLoadBand } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";
import { heatStyle, MONTHS, officeBand, toISO, WEEKDAYS } from "./workHelpers.js";
import { WorkloadCalendarSync } from "./WorkloadCalendarSync.js";

const tagSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});

const bandTag = (band: TaskLoadBand) =>
  band === "heavy" ? "red" : band === "balanced" ? "teal" : "green";

export function WorkloadTab() {
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(() => toISO(now));
  const [view, setView] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }));

  const dayQ  = trpc.workload.day.useQuery({ date: selectedDate });
  const monthQ = trpc.workload.month.useQuery({ year: view.year, month: view.month });

  const day       = dayQ.data;
  const headcount = day?.headcount ?? 0;
  const total     = day?.total ?? 0;
  const avg       = headcount > 0 ? (total / headcount).toFixed(1) : "—";
  const dayBand   = officeBand(total, headcount);

  const totalsByDate   = new Map<string, number>();
  for (const d of monthQ.data?.days ?? []) totalsByDate.set(d.date, d.total);

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth  = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      if (m < 0)  return { year: v.year - 1, month: 11 };
      if (m > 11) return { year: v.year + 1, month: 0 };
      return { year: v.year, month: m };
    });
  }

  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const heatLegend = [
    { label: "No tasks",  style: heatStyle(0),  range: "0" },
    { label: "Light",     style: heatStyle(1),  range: "1–2" },
    { label: "Moderate",  style: heatStyle(3),  range: "3–5" },
    { label: "Heavy",     style: heatStyle(6),  range: "6–8" },
    { label: "Overloaded",style: heatStyle(9),  range: "9+" },
  ];

  const peopleColumns: GridColDef[] = [
    { field: "name", headerName: "Team member", flex: 1.5, minWidth: 140 },
    { field: "count", headerName: "Tasks", flex: 0.5, minWidth: 70 },
    {
      field: "band",
      headerName: "Status",
      flex: 1,
      minWidth: 110,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const band = taskLoadBand(p.row.count as number);
        return <Chip size="small" label={TASK_LOAD_BAND_LABEL[band]} sx={tagSx(bandTag(band))} />;
      },
    },
  ];

  return (
    <Grid container spacing={2} className="esti-dash">
      <Grid size={{ xs: 12 }}>
        <Box sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6">Heatmap scale</Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
              {heatLegend.map((l) => (
                <Stack key={l.label} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <div
                    className="esti-heat-swatch"
                    style={{ backgroundColor: l.style.backgroundColor === "transparent" ? "var(--cds-layer-accent)" : l.style.backgroundColor }}
                  />
                  <Stack spacing={0.5}>
                    <p>{l.label}</p>
                    <p>{l.range} tasks</p>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <WorkloadCalendarSync />
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <Box className="esti-fill" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <IconButton size="small" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" className="esti-grow">{MONTHS[view.month]} {view.year}</Typography>
              <IconButton size="small" aria-label="Next month" onClick={() => shiftMonth(1)}>
                <ChevronRight />
              </IconButton>
            </Stack>
            <div className="esti-cal">
              {WEEKDAYS.map((w) => (
                <div key={w} className="esti-cal-hdr">{w}</div>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} />;
                const iso = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const cellTotal = totalsByDate.get(iso) ?? 0;
                const rawHeat   = heatStyle(cellTotal);
                const selected  = iso === selectedDate;
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
            <Typography variant="body2">Open tasks due each day. Darker cell = higher workload.</Typography>
          </Stack>
        </Box>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Stack spacing={2}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1.5}>
              <Stack spacing={0.5}>
                <p>Office — {selectedLabel}</p>
                <Typography variant="h4">{day ? total : "…"} tasks</Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Chip label={TASK_LOAD_BAND_LABEL[dayBand]} sx={tagSx(bandTag(dayBand))} />
                <p>{headcount} staff · {avg} avg</p>
              </Stack>
            </Stack>
          </Box>

          <Box className="esti-fill" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant="h6">Individual workload</Typography>
              {day && day.people.length > 0 ? (
                <DataGrid
                  rows={day.people}
                  columns={peopleColumns}
                  getRowId={(r) => r.name}
                  getRowHeight={() => "auto"}
                  density="compact"
                  disableRowSelectionOnClick
                  hideFooter
                  autoHeight
                />
              ) : (
                <p>No assignees for this day.</p>
              )}
            </Stack>
          </Box>

          <Box sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Typography variant="h6">Workload bands</Typography>
              {(["light", "balanced", "heavy"] as const).map((band) => (
                <Stack key={band} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Chip size="small" label={TASK_LOAD_BAND_LABEL[band]} sx={tagSx(bandTag(band))} />
                  <span className="esti-grow">{TASK_LOAD_BAND_RANGE[band]}</span>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Grid>
    </Grid>
  );
}
