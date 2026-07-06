import {
  Box,
  ButtonBase,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  type TaskListParams,
} from "@esti/contracts";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";
import { MONTHS, PRIORITY_TAG, toISO, WEEKDAYS } from "./workHelpers.js";

const tagSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});

type TaskRow = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  priority: string;
  projectId: string | null;
  projectRef: string | null;
  assignee: string | null;
};

function monthCells(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
}

function groupByDueDate(tasks: TaskRow[]): Map<string, TaskRow[]> {
  const map = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const list = map.get(t.dueDate) ?? [];
    list.push(t);
    map.set(t.dueDate, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }
  return map;
}

export function TaskCalendarTab() {
  const now = new Date();
  const [view, setView] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }));
  const [selectedDate, setSelectedDate] = useState(() => toISO(now));
  const [myTasks, setMyTasks] = useState(false);
  const [openOnly, setOpenOnly] = useState(true);

  const listParams: TaskListParams = { myTasks, openOnly };
  const listQ = trpc.tasks.list.useQuery(listParams);

  const tasks = useMemo(() => listQ.data ?? [], [listQ.data]);
  const byDate = useMemo(() => groupByDueDate(tasks), [tasks]);
  const unscheduled = tasks.filter((t) => !t.dueDate);
  const selectedTasks = byDate.get(selectedDate) ?? [];
  const today = toISO(new Date());
  const cells = monthCells(view.year, view.month);

  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      if (m < 0) return { year: v.year - 1, month: 11 };
      if (m > 11) return { year: v.year + 1, month: 0 };
      return { year: v.year, month: m };
    });
  }

  function isoForDay(d: number): string {
    return `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <FormControlLabel
          control={
            <Checkbox id="cal-open" checked={openOnly}
              onChange={(e) => setOpenOnly(e.target.checked)} />
          }
          label="Open only"
        />
        <FormControlLabel
          control={
            <Checkbox id="cal-mine" checked={myTasks}
              onChange={(e) => setMyTasks(e.target.checked)} />
          }
          label="My tasks"
        />
      </Stack>

      <Box sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <IconButton
              size="small"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" className="esti-grow">
              {MONTHS[view.month]} {view.year}
            </Typography>
            <IconButton
              size="small"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
            >
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
              const iso = isoForDay(d);
              const dayTasks = byDate.get(iso) ?? [];
              const selected = iso === selectedDate;
              const isToday = iso === today;
              return (
                <ButtonBase
                  key={iso}
                  className={`esti-cal-cell esti-cal-cell--task${selected ? " esti-cal-cell--selected" : ""}${isToday ? " esti-cal-cell--today" : ""}`}
                  onClick={() => setSelectedDate(iso)}
                  aria-label={`${iso}, ${dayTasks.length} tasks`}
                  sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", textAlign: "start" }}
                >
                  <span className="esti-cal-cell__day">{d}</span>
                  <div className="esti-cal-cell__tasks">
                    {dayTasks.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className={`esti-cal-task esti-cal-task--${t.priority.toLowerCase()}`}
                        title={t.title}
                      >
                        {t.title}
                      </span>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="esti-cal-task esti-cal-task--more">+{dayTasks.length - 3}</span>
                    )}
                  </div>
                </ButtonBase>
              );
            })}
          </div>
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">{selectedLabel}</Typography>
          <DataState
            loading={listQ.isLoading}
            isEmpty={selectedTasks.length === 0}
            columnCount={1}
            empty={{
              title: "No tasks due",
              description: "Nothing is scheduled for this day with the current filters.",
            }}
          >
            <Stack spacing={1}>
              {selectedTasks.map((t) => {
                const overdue = t.dueDate && t.dueDate < today && t.status !== "DONE";
                return (
                  <Stack key={t.id} direction="row" spacing={1} className="esti-cal-day-row">
                    <strong className="esti-grow">{t.title}</strong>
                    <Chip
                      size="small"
                      label={TASK_PRIORITY_LABEL[t.priority as keyof typeof TASK_PRIORITY_LABEL] ?? t.priority}
                      sx={tagSx(PRIORITY_TAG[t.priority] ?? "gray")}
                    />
                    <Chip
                      size="small"
                      label={TASK_STATUS_LABEL[t.status as keyof typeof TASK_STATUS_LABEL] ?? t.status}
                      sx={tagSx("gray")}
                    />
                    {overdue && <Chip size="small" label="Overdue" sx={tagSx("red")} />}
                    {t.projectId && (
                      <Link to={`/projects/${t.projectId}`}>{t.projectRef ?? "Project"}</Link>
                    )}
                    {t.assignee && (
                      <span className="esti-label esti-label--secondary">{t.assignee}</span>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          </DataState>
        </Stack>
      </Box>

      {unscheduled.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Typography variant="h6">No due date ({unscheduled.length})</Typography>
              {unscheduled.slice(0, 8).map((t) => (
                <Stack key={t.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <span className="esti-grow">{t.title}</span>
                  {t.projectId && (
                    <Link to={`/projects/${t.projectId}`}>{t.projectRef ?? "Project"}</Link>
                  )}
                </Stack>
              ))}
              {unscheduled.length > 8 && (
                <p className="esti-label esti-label--helper">
                  +{unscheduled.length - 8} more — set due dates on the Tasks tab
                </p>
              )}
            </Stack>
          </Box>
        </>
      )}
    </Stack>
  );
}
