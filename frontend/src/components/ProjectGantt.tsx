/**
 * Programme Gantt — layout aligned with Carbon Gantt chart specs
 * (https://carbondesignsystem.com/data-visualization/gantt-charts/).
 * Carbon Charts does not ship Gantt yet; this is a custom Carbon-token implementation.
 */
import { ChevronDown, ChevronRight } from "@carbon/icons-react";
import { InlineLoading, IconButton, Stack, Tag, Tile } from "@carbon/react";
import { MILESTONE_STATUS_LABEL, type MilestoneStatus } from "@esti/contracts";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "../lib/trpc.js";

type GanttRow = {
  id: string;
  kind: "phase" | "milestone" | "task";
  label: string;
  start: string;
  end: string;
  status: string;
  phaseId?: string;
  assignee?: string | null;
  children?: GanttRow[];
};

const KIND_TAG: Record<GanttRow["kind"], "blue" | "purple" | "teal"> = {
  phase: "blue",
  milestone: "purple",
  task: "teal",
};

/** Contrasting bar colours for adjacent rows (Carbon design recommendation). */
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

function formatShortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function groupGanttRows(rows: GanttRow[]): GanttRow[] {
  const phases = rows.filter((r) => r.kind === "phase");
  const byPhase = new Map<string, GanttRow[]>();
  const orphans: GanttRow[] = [];

  for (const row of rows) {
    if (row.kind === "phase") continue;
    if (row.phaseId) {
      const list = byPhase.get(row.phaseId) ?? [];
      list.push(row);
      byPhase.set(row.phaseId, list);
    } else {
      orphans.push(row);
    }
  }

  const grouped = phases.map((phase) => ({
    ...phase,
    children: (byPhase.get(phase.id) ?? []).sort((a, b) => a.start.localeCompare(b.start)),
  }));

  return [...grouped, ...orphans.map((o) => ({ ...o, children: [] as GanttRow[] }))];
}

function flattenVisibleRows(groups: GanttRow[], expanded: Set<string>): GanttRow[] {
  const out: GanttRow[] = [];
  for (const group of groups) {
    out.push(group);
    if (group.kind === "phase" && group.children?.length && expanded.has(group.id)) {
      out.push(...group.children);
    }
  }
  return out;
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

function statusLabel(row: GanttRow): string {
  if (row.kind === "milestone") {
    return MILESTONE_STATUS_LABEL[row.status as MilestoneStatus] ?? row.status;
  }
  if (row.status === "DONE") return "Done";
  if (row.status === "COMPLETE") return "Complete";
  if (row.status === "IN_PROGRESS") return "In progress";
  if (row.status === "NOT_STARTED") return "Not started";
  return row.status;
}

export function ProjectGantt({ projectId, enabled = true }: { projectId: string; enabled?: boolean }) {
  const ganttQ = trpc.programme.gantt.useQuery({ projectId }, { enabled, retry: false });

  const grouped = useMemo(
    () => (ganttQ.data ? groupGanttRows(ganttQ.data.rows as GanttRow[]) : []),
    [ganttQ.data],
  );

  const phaseIdsWithChildren = useMemo(
    () =>
      grouped
        .filter((g) => g.kind === "phase" && (g.children?.length ?? 0) > 0)
        .map((g) => g.id)
        .join(","),
    [grouped],
  );

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!phaseIdsWithChildren) return;
    setExpanded(new Set(phaseIdsWithChildren.split(",").filter(Boolean)));
  }, [phaseIdsWithChildren]);

  const visibleRows = useMemo(() => flattenVisibleRows(grouped, expanded), [grouped, expanded]);

  if (ganttQ.isLoading) return <InlineLoading description="Loading timeline…" />;
  if (ganttQ.isError) {
    return (
      <p>
        Timeline unavailable — restart the backend so <code>programme.gantt</code> is registered,
        then run migrations (<code>pnpm db:migrate</code>).
      </p>
    );
  }
  if (!ganttQ.data) return <p>Timeline unavailable.</p>;

  const { rangeStart, rangeEnd } = ganttQ.data;
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

  function togglePhase(phaseId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  }

  if (visibleRows.length === 0) {
    return (
      <Tile className="esti-gantt esti-gantt--empty">
        <p>Add phases, dated milestones, or tasks with due dates to populate the timeline.</p>
      </Tile>
    );
  }

  return (
    <Stack gap={4}>
      <p className="esti-gantt__intro">
        Delivery timeline — task cards and schedule bars per{" "}
        <a
          href="https://carbondesignsystem.com/data-visualization/gantt-charts/"
          target="_blank"
          rel="noreferrer"
        >
          Carbon Gantt guidance
        </a>
        . {formatShortDate(rangeStart)} → {formatShortDate(rangeEnd)}.
      </p>

      <div className="esti-gantt" role="region" aria-label="Project Gantt chart">
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
          {visibleRows.map((row, index) => {
            const isChild = !!row.phaseId && row.kind !== "phase";
            const group = grouped.find((g) => g.id === row.phaseId);
            const hasChildren = row.kind === "phase" && (row.children?.length ?? 0) > 0;
            const isExpanded = expanded.has(row.id);
            const barColor = BAR_COLORS[index % BAR_COLORS.length];
            const isMilestone = row.kind === "milestone" || row.start === row.end;
            const isDone = row.status === "DONE" || row.status === "COMPLETE";

            return (
              <div
                key={`${row.kind}-${row.id}`}
                className={`esti-gantt__row${isChild ? " esti-gantt__row--child" : ""}`}
              >
                <div className="esti-gantt__card-col">
                  <Tile
                    className={`esti-gantt__card${isChild ? " esti-gantt__card--sub" : ""}`}
                  >
                    <div className="esti-gantt__card-inner">
                      {hasChildren ? (
                        <IconButton
                          kind="ghost"
                          size="sm"
                          className="esti-gantt__expand"
                          label={isExpanded ? "Collapse sub-tasks" : "Expand sub-tasks"}
                          aria-expanded={isExpanded}
                          onClick={() => togglePhase(row.id)}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </IconButton>
                      ) : (
                        <span className="esti-gantt__expand esti-gantt__expand--spacer" aria-hidden />
                      )}
                      <div className="esti-gantt__card-text">
                        <div className="esti-gantt__card-title">
                          <Tag type={KIND_TAG[row.kind]} size="sm">
                            {row.kind}
                          </Tag>
                          <span>{row.label}</span>
                        </div>
                        <p className="esti-gantt__card-meta">
                          {formatShortDate(row.start)}
                          {row.start !== row.end ? ` – ${formatShortDate(row.end)}` : ""}
                          {" · "}
                          {statusLabel(row)}
                          {row.assignee ? ` · ${row.assignee}` : ""}
                          {isChild && group ? ` · ${group.label}` : ""}
                        </p>
                      </div>
                    </div>
                  </Tile>
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
                    {isMilestone ? (
                      <span
                        className="esti-gantt__milestone"
                        style={{
                          left: `${leftPct(row.start)}%`,
                          color: barColor,
                          opacity: isDone ? 0.55 : 1,
                        }}
                        title={`${row.label} · ${row.start}`}
                      />
                    ) : (
                      <span
                        className={`esti-gantt__bar esti-gantt__bar--${row.kind}`}
                        style={{
                          left: `${leftPct(row.start)}%`,
                          width: `${widthPct(row.start, row.end)}%`,
                          backgroundColor: barColor,
                          opacity: isDone ? 0.55 : 0.9,
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
