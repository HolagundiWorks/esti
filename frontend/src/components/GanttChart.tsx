/**
 * Shared Carbon-spec Gantt layout
 * (https://carbondesignsystem.com/data-visualization/gantt-charts/).
 * Presentation migrated to Material UI; the custom bar/track rendering and
 * `--cds-*` token colours are unchanged.
 */
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import { Box, IconButton, Stack } from "@mui/material";
import type { ReactNode } from "react";
import { StatusDot } from "./StatusTag.js";

export type GanttChartRow = {
  id: string;
  label: string;
  tag?: { text: string; type: "blue" | "purple" | "teal" | "gray" | "red" | "magenta" };
  meta: string;
  start: string;
  end: string;
  isMilestone?: boolean;
  isDone?: boolean;
  isCritical?: boolean;
  actualStart?: string | null;
  actualEnd?: string | null;
  indent?: boolean;
  expandable?: { expanded: boolean; onToggle: () => void };
};

const BAR_COLORS = [
  "var(--cds-support-info)",
  "var(--cds-support-success)",
  "var(--cds-support-warning)",
  "var(--cds-support-error)",
  "var(--cds-link-primary)",
] as const;

const MS_DAY = 86_400_000;

function parseDay(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getTime();
}

export function formatGanttShortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildMonthTicks(rangeStart: string, rangeEnd: string): { label: string; leftPct: number }[] {
  const start = parseDay(rangeStart);
  const end = parseDay(rangeEnd);
  const span = Math.max(end - start, MS_DAY);
  const ticks: { label: string; leftPct: number }[] = [];
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  while (cursor.getTime() <= end + MS_DAY * 31) {
    const t = cursor.getTime();
    if (t >= start - MS_DAY && t <= end + MS_DAY) {
      ticks.push({
        label: cursor.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        leftPct: Math.min(100, Math.max(0, ((t - start) / span) * 100)),
      });
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return ticks;
}

export function GanttChart({
  intro,
  rangeStart,
  rangeEnd,
  rows,
  ariaLabel = "Gantt chart",
  emptyMessage = "No schedule rows to display.",
}: {
  intro?: ReactNode;
  rangeStart: string;
  rangeEnd: string;
  rows: GanttChartRow[];
  ariaLabel?: string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <Box className="esti-gantt esti-gantt--empty">
        <p>{emptyMessage}</p>
      </Box>
    );
  }

  const startMs = parseDay(rangeStart);
  const endMs = parseDay(rangeEnd);
  const span = Math.max(endMs - startMs, MS_DAY);
  const ticks = buildMonthTicks(rangeStart, rangeEnd);

  function leftPct(date: string) {
    return Math.min(100, Math.max(0, ((parseDay(date) - startMs) / span) * 100));
  }

  function widthPct(start: string, end: string) {
    const w = ((parseDay(end) - parseDay(start)) / span) * 100;
    return Math.max(w, start === end ? 0.8 : w);
  }

  return (
    <Stack spacing={1.5}>
      {intro}
      <div className="esti-gantt" role="region" aria-label={ariaLabel}>
        <div className="esti-gantt__header">
          <div className="esti-gantt__card-col">
            <span className="esti-gantt__col-label">Work items</span>
          </div>
          <div className="esti-gantt__timeline-col">
            <div className="esti-gantt__axis">
              {ticks.map((tick) => (
                <span
                  key={`${tick.label}-${tick.leftPct}`}
                  className="esti-gantt__axis-tick"
                  style={{ left: `${tick.leftPct}%` }}
                >
                  {tick.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="esti-gantt__body">
          {rows.map((row, index) => {
            const barColor =
              row.isCritical ? "var(--cds-support-error)" : BAR_COLORS[index % BAR_COLORS.length];
            const isMilestone = row.isMilestone ?? row.start === row.end;
            const opacity = row.isDone ? 0.55 : 0.9;

            return (
              <div
                key={row.id}
                className={`esti-gantt__row${row.indent ? " esti-gantt__row--child" : ""}`}
              >
                <div className="esti-gantt__card-col">
                  <Box className={`esti-gantt__card${row.indent ? " esti-gantt__card--sub" : ""}`}>
                    <div className="esti-gantt__card-inner">
                      {row.expandable ? (
                        <IconButton
                          size="small"
                          className="esti-gantt__expand"
                          aria-label={row.expandable.expanded ? "Collapse row" : "Expand row"}
                          aria-expanded={row.expandable.expanded}
                          onClick={row.expandable.onToggle}
                        >
                          {row.expandable.expanded ?
                            <ExpandMore sx={{ fontSize: 16 }} />
                          : <ChevronRight sx={{ fontSize: 16 }} />}
                        </IconButton>
                      ) : (
                        <span className="esti-gantt__expand esti-gantt__expand--spacer" aria-hidden />
                      )}
                      <div className="esti-gantt__card-text">
                        <div className="esti-gantt__card-title">
                          {row.tag && (
                            <StatusDot color={row.tag.type} label={row.tag.text} />
                          )}
                          <span>{row.label}</span>
                        </div>
                        <p className="esti-gantt__card-meta">{row.meta}</p>
                      </div>
                    </div>
                  </Box>
                </div>
                <div className="esti-gantt__timeline-col">
                  <div className="esti-gantt__track" aria-hidden>
                    {ticks.map((tick) => (
                      <span
                        key={`grid-${row.id}-${tick.leftPct}`}
                        className="esti-gantt__grid-line"
                        style={{ left: `${tick.leftPct}%` }}
                      />
                    ))}
                    {row.actualStart && row.actualEnd && (
                      <span
                        className="esti-gantt__bar esti-gantt__bar--task"
                        style={{
                          left: `${leftPct(row.actualStart)}%`,
                          width: `${widthPct(row.actualStart, row.actualEnd)}%`,
                          backgroundColor: "var(--cds-border-strong-01)",
                          opacity: 0.65,
                          top: "62%",
                          height: "0.4rem",
                        }}
                        title={`Actual: ${row.actualStart} – ${row.actualEnd}`}
                      />
                    )}
                    {isMilestone ? (
                      <span
                        className="esti-gantt__milestone"
                        style={{
                          left: `${leftPct(row.start)}%`,
                          color: barColor,
                          opacity,
                        }}
                        title={`${row.label} · ${row.start}`}
                      />
                    ) : (
                      <span
                        className="esti-gantt__bar esti-gantt__bar--phase"
                        style={{
                          left: `${leftPct(row.start)}%`,
                          width: `${widthPct(row.start, row.end)}%`,
                          backgroundColor: barColor,
                          opacity,
                        }}
                        title={`${row.label} · ${row.start} – ${row.end}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Stack>
  );
}
