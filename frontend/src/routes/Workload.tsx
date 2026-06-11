import {
  Button,
  ClickableTile,
  Column,
  DatePicker,
  DatePickerInput,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from "@carbon/react";
import {
  CheckmarkFilled,
  ChevronLeft,
  ChevronRight,
  ErrorFilled,
  WarningAltFilled,
  type CarbonIconType,
} from "@carbon/icons-react";
import {
  TASK_LOAD_BAND_LABEL,
  TASK_LOAD_BAND_RANGE,
  type TaskLoadBand,
  taskLoadBand,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const BAND_ICON: Record<TaskLoadBand, CarbonIconType> = {
  light: WarningAltFilled,
  balanced: CheckmarkFilled,
  heavy: ErrorFilled,
};
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Office workload band from a per-person average (rounds to nearest task). */
function officeBand(total: number, headcount: number): TaskLoadBand {
  const per = headcount > 0 ? total / headcount : total;
  return taskLoadBand(Math.round(per));
}

function BandMark({ band, size = 16 }: { band: TaskLoadBand; size?: number }) {
  const Icon = BAND_ICON[band];
  return <Icon size={size} />;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Workload() {
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(() => toISO(now));
  const [view, setView] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));

  const dayQ = trpc.workload.day.useQuery({ date: selectedDate });
  const monthQ = trpc.workload.month.useQuery({
    year: view.year,
    month: view.month,
  });

  const day = dayQ.data;
  const headcount = day?.headcount ?? 0;
  const total = day?.total ?? 0;
  const dayBand = officeBand(total, headcount);
  const avg = headcount > 0 ? (total / headcount).toFixed(1) : "—";

  // Calendar maths
  const monthHeadcount = monthQ.data?.headcount ?? 0;
  const totalsByDate = new Map<string, number>();
  for (const d of monthQ.data?.days ?? []) totalsByDate.set(d.date, d.total);
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

  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  return (
    <Grid fullWidth className="esti-dash">
      {/* Header + day picker */}
      <Column lg={10} md={5} sm={4}>
        <h1>Workload</h1>
        <p>
          Daily task load per person and across the office, with a month
          calendar.
        </p>
      </Column>
      <Column lg={6} md={3} sm={4}>
        <DatePicker
          datePickerType="single"
          dateFormat="Y-m-d"
          value={selectedDate}
          onChange={(dates: Date[]) => {
            if (dates[0]) {
              setSelectedDate(toISO(dates[0]));
              setView({
                year: dates[0].getFullYear(),
                month: dates[0].getMonth(),
              });
            }
          }}
        >
          <DatePickerInput
            id="wl-date"
            labelText="Day"
            placeholder="yyyy-mm-dd"
            size="lg"
          />
        </DatePicker>
      </Column>

      {/* Office cumulative */}
      <Column lg={4} md={4} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={3}>
            <p>Office workload — {selectedLabel}</p>
            <h2>{day ? total : "…"}</h2>
            <Stack orientation="horizontal" gap={3}>
              <BandMark band={dayBand} />
              <span>{TASK_LOAD_BAND_LABEL[dayBand]}</span>
            </Stack>
            <p>
              {headcount} staff · {avg} tasks/person avg
            </p>
          </Stack>
        </Tile>
      </Column>

      {/* Guideline legend */}
      <Column lg={4} md={4} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={4}>
            <h4>Workload guideline</h4>
            <Stack gap={3}>
              {(["light", "balanced", "heavy"] as const).map((band) => (
                <Stack key={band} orientation="horizontal" gap={3}>
                  <BandMark band={band} />
                  <span className="esti-grow">
                    {TASK_LOAD_BAND_LABEL[band]}
                  </span>
                  <span>{TASK_LOAD_BAND_RANGE[band]}</span>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Tile>
      </Column>

      {/* Individual workload */}
      <Column lg={8} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={4}>
            <h4>Individual workload</h4>
            {day && day.people.length > 0 ? (
              <TableContainer title="" description="">
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
                            <Stack orientation="horizontal" gap={3}>
                              <BandMark band={band} />
                              <span>{TASK_LOAD_BAND_LABEL[band]}</span>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <p>No assignees or team members to show for this day.</p>
            )}
          </Stack>
        </Tile>
      </Column>

      {/* Calendar */}
      <Column lg={16} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={5}>
            <Stack orientation="horizontal" gap={4}>
              <Button
                kind="ghost"
                size="sm"
                hasIconOnly
                renderIcon={ChevronLeft}
                iconDescription="Previous month"
                onClick={() => shiftMonth(-1)}
              />
              <h4 className="esti-grow">
                {MONTHS[view.month]} {view.year}
              </h4>
              <Button
                kind="ghost"
                size="sm"
                hasIconOnly
                renderIcon={ChevronRight}
                iconDescription="Next month"
                onClick={() => shiftMonth(1)}
              />
            </Stack>

            <div className="esti-cal">
              {WEEKDAYS.map((w) => (
                <div key={w} style={{ padding: "4px 0" }}>
                  {w}
                </div>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} />;
                const iso = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const cellTotal = totalsByDate.get(iso) ?? 0;
                const band = officeBand(cellTotal, monthHeadcount);
                const selected = iso === selectedDate;
                return (
                  <ClickableTile
                    key={iso}
                    onClick={() => setSelectedDate(iso)}
                    style={{
                      minHeight: 76,
                      outline: selected
                        ? "2px solid var(--cds-focus)"
                        : undefined,
                    }}
                  >
                    <Stack gap={2}>
                      <span>{d}</span>
                      {cellTotal > 0 && (
                        <Stack orientation="horizontal" gap={2}>
                          <BandMark band={band} />
                          <strong>{cellTotal}</strong>
                        </Stack>
                      )}
                    </Stack>
                  </ClickableTile>
                );
              })}
            </div>
            <p>
              Calendar marks the total open tasks due each day, shaded by the
              office workload band.
            </p>
          </Stack>
        </Tile>
      </Column>
    </Grid>
  );
}
