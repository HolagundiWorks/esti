import {
  Button,
  Column,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from "@carbon/react";
import { ChevronLeft, ChevronRight } from "@carbon/icons-react";
import { TASK_LOAD_BAND_LABEL, TASK_LOAD_BAND_RANGE, taskLoadBand } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";
import { heatStyle, MONTHS, officeBand, toISO, WEEKDAYS } from "./workHelpers.js";
import { WorkloadCalendarSync } from "./WorkloadCalendarSync.js";

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

  return (
    <Grid fullWidth className="esti-dash">
      <Column lg={16} md={8} sm={4}>
        <Tile>
          <Stack gap={4}>
            <h4>Heatmap scale</h4>
            <Stack orientation="horizontal" gap={5}>
              {heatLegend.map((l) => (
                <Stack key={l.label} orientation="horizontal" gap={3}>
                  <div
                    className="esti-heat-swatch"
                    style={{ backgroundColor: l.style.backgroundColor === "transparent" ? "var(--cds-layer-accent)" : l.style.backgroundColor }}
                  />
                  <Stack gap={3}>
                    <p>{l.label}</p>
                    <p>{l.range} tasks</p>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Tile>
      </Column>

      <Column lg={16} md={8} sm={4}>
        <WorkloadCalendarSync />
      </Column>

      <Column lg={10} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={5}>
            <Stack orientation="horizontal" gap={4}>
              <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronLeft}
                iconDescription="Previous month" onClick={() => shiftMonth(-1)} />
              <h4 className="esti-grow">{MONTHS[view.month]} {view.year}</h4>
              <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronRight}
                iconDescription="Next month" onClick={() => shiftMonth(1)} />
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
                    <Stack gap={2}>
                      <strong>{d}</strong>
                      {cellTotal > 0 && <span>{cellTotal}</span>}
                    </Stack>
                  </div>
                );
              })}
            </div>
            <p>Open tasks due each day. Darker cell = higher workload.</p>
          </Stack>
        </Tile>
      </Column>

      <Column lg={6} md={8} sm={4}>
        <Stack gap={5}>
          <Tile>
            <Stack gap={4}>
              <Stack gap={2}>
                <p>Office — {selectedLabel}</p>
                <h2>{day ? total : "…"} tasks</h2>
              </Stack>
              <Stack orientation="horizontal" gap={4}>
                <Tag type={dayBand === "heavy" ? "red" : dayBand === "balanced" ? "teal" : "green"}>
                  {TASK_LOAD_BAND_LABEL[dayBand]}
                </Tag>
                <p>{headcount} staff · {avg} avg</p>
              </Stack>
            </Stack>
          </Tile>

          <Tile className="esti-fill">
            <Stack gap={4}>
              <h4>Individual workload</h4>
              {day && day.people.length > 0 ? (
                <TableContainer>
                  <Table size="sm">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Team member</TableHeader>
                        <TableHeader>Tasks</TableHeader>
                        <TableHeader>Status</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {day.people.map((p) => {
                        const band = taskLoadBand(p.count);
                        return (
                          <TableRow key={p.name}>
                            <TableCell>{p.name}</TableCell>
                            <TableCell>{p.count}</TableCell>
                            <TableCell>
                              <Tag type={band === "heavy" ? "red" : band === "balanced" ? "teal" : "green"} size="sm">
                                {TASK_LOAD_BAND_LABEL[band]}
                              </Tag>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <p>No assignees for this day.</p>
              )}
            </Stack>
          </Tile>

          <Tile>
            <Stack gap={3}>
              <h4>Workload bands</h4>
              {(["light", "balanced", "heavy"] as const).map((band) => (
                <Stack key={band} orientation="horizontal" gap={3}>
                  <Tag type={band === "heavy" ? "red" : band === "balanced" ? "teal" : "green"} size="sm">
                    {TASK_LOAD_BAND_LABEL[band]}
                  </Tag>
                  <span className="esti-grow">{TASK_LOAD_BAND_RANGE[band]}</span>
                </Stack>
              ))}
            </Stack>
          </Tile>
        </Stack>
      </Column>
    </Grid>
  );
}
