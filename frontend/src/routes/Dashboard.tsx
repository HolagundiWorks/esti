import {
  ClickableTile,
  Column,
  Grid,
  ProgressBar,
  Stack,
  Tag,
  Tile,
} from "@carbon/react";
import { Banking, ChartLine, type Pictogram, Receipt } from "@carbon/pictograms-react";
import { can, formatINRShort } from "@esti/contracts";
import { useNavigate } from "react-router-dom";
import { ClockLeavesWidget } from "../components/ClockLeavesWidget.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

/** Friendlier labels for the raw project-type enum values. */
const TYPE_LABEL: Record<string, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  INSTITUTIONAL: "Institutional",
  INDUSTRIAL: "Industrial",
  HOSPITALITY: "Hospitality",
  HEALTHCARE: "Healthcare",
  RETAIL: "Retail",
  MIXED_USE: "Mixed use",
  URBAN_DESIGN: "Urban design",
  INTERIOR: "Interior",
  LANDSCAPE: "Landscape",
  OTHER: "Other",
};

/** Days from today (local) until an ISO yyyy-mm-dd date. */
function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Next occurrence of a fixed day-of-month at/after today (rolls to next month). */
function nextMonthlyDue(day: number): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let y = now.getFullYear();
  let m = now.getMonth();
  if (now.getDate() > day) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return isoDate(y, m, day);
}

/** Next quarterly TDS-return due date (31 Jul / 31 Oct / 31 Jan / 31 May). */
function nextTdsReturnDue(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadlines = [
    { m: 6, d: 31 },
    { m: 9, d: 31 },
    { m: 0, d: 31 },
    { m: 4, d: 31 },
  ];
  const y = now.getFullYear();
  const cands: Date[] = [];
  for (const off of [0, 1]) {
    for (const dl of deadlines) cands.push(new Date(y + off, dl.m, dl.d));
  }
  cands.sort((a, b) => a.getTime() - b.getTime());
  const next = cands.find((c) => c.getTime() >= now.getTime()) ?? cands[0]!;
  return isoDate(next.getFullYear(), next.getMonth(), next.getDate());
}

function dueTagType(days: number): "red" | "magenta" | "blue" {
  return days <= 3 ? "red" : days <= 7 ? "magenta" : "blue";
}

function dueLabel(days: number): string {
  return days === 0 ? "Due today" : days < 0 ? `${-days}d overdue` : `${days}d left`;
}

/** A board listing statutory filing deadlines with a days-remaining countdown. */
function FilingDueBoard({ title, Pictogram, rows }: {
  title: string;
  Pictogram: Pictogram;
  rows: { label: string; iso: string }[];
}) {
  const fmtDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <Stack orientation="horizontal" gap={4}>
          <Pictogram width={32} height={32} />
          <h4>{title}</h4>
        </Stack>
        <Stack gap={4}>
          {rows.map((r) => {
            const days = daysUntil(r.iso);
            return (
              <Stack key={r.label} orientation="horizontal" gap={4}>
                <div className="esti-grow">
                  <p>{r.label}</p>
                  <p>{fmtDate(r.iso)}</p>
                </div>
                <Tag type={dueTagType(days)}>{dueLabel(days)}</Tag>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Tile>
  );
}

/** A distribution board: one labelled Carbon ProgressBar per row. */
function DistroBoard({ title, rows, max, format, emptyText }: {
  title: string;
  rows: { label: string; value: number }[];
  max: number;
  format?: (n: number) => string;
  emptyText?: string;
}) {
  const fmt = format ?? ((n: number) => String(n));
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <h4>{title}</h4>
        {rows.length === 0 ? (
          <p>{emptyText ?? "No data"}</p>
        ) : (
          <Stack gap={5}>
            {rows.map((r) => (
              <ProgressBar
                key={r.label}
                label={r.label}
                helperText={fmt(r.value)}
                value={r.value}
                max={Math.max(1, max)}
                size="small"
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Tile>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const summary = trpc.dashboard.summary.useQuery();
  const boardsQ = trpc.dashboard.boards.useQuery();

  const s = summary.data;
  const b = boardsQ.data;
  const totalProjects = s?.projects.total ?? 0;
  const byPhase = b?.byPhase ?? [];
  const byType = b?.byType ?? [];

  const canFees = can(user?.role, "fees:manage");
  const canHr = can(user?.role, "hr:manage");

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const agingMax =
    (b?.receivablesAging.d0_30 ?? 0) +
    (b?.receivablesAging.d31_60 ?? 0) +
    (b?.receivablesAging.d60p ?? 0);
  const workloadMax = Math.max(1, ...(b?.workload ?? []).map((w) => w.count));

  return (
    <Grid fullWidth className="esti-dash">
      {/* Header — title at left, clock/leave widget pinned top-right */}
      <Column lg={12} md={6} sm={4}>
        <Stack orientation="horizontal" gap={5}>
          <ChartLine width={44} height={44} />
          <div>
            <h1>Office dashboard</h1>
            <p>
              {user?.fullName ? `Welcome, ${user.fullName.split(" ")[0]} · ` : ""}
              {today}
            </p>
          </div>
        </Stack>
      </Column>
      <Column lg={4} md={2} sm={4}>
        <ClockLeavesWidget />
      </Column>

      {/* KPI tiles */}
      <Column lg={4} md={4} sm={4}>
        <ClickableTile className="esti-fill" onClick={() => navigate("/projects")}>
          <Stack gap={3}>
            <p>Projects</p>
            <h2>{totalProjects || (s ? 0 : "…")}</h2>
            <Stack orientation="horizontal" gap={3}>
              <Tag type="blue">{s?.projects.byStatus.ACTIVE ?? 0} active</Tag>
              <Tag type="gray">{s?.projects.byStatus.ENQUIRY ?? 0} enquiry</Tag>
            </Stack>
          </Stack>
        </ClickableTile>
      </Column>
      <Column lg={4} md={4} sm={4}>
        <ClickableTile className="esti-fill" onClick={() => navigate("/invoices")}>
          <Stack gap={3}>
            <p>Outstanding (net of TDS)</p>
            <h2>{s ? formatINRShort(s.invoices.outstandingPaise) : "…"}</h2>
            <Tag type="green">{s ? `${formatINRShort(s.invoices.collectedPaise)} collected` : "—"}</Tag>
          </Stack>
        </ClickableTile>
      </Column>
      <Column lg={4} md={4} sm={4}>
        <ClickableTile className="esti-fill" onClick={() => navigate("/tasks")}>
          <Stack gap={3}>
            <p>Tasks due today</p>
            <h2>{b?.tasksDueToday ?? "…"}</h2>
            <Tag type="gray">due today or overdue</Tag>
          </Stack>
        </ClickableTile>
      </Column>
      <Column lg={4} md={4} sm={4}>
        {canHr ? (
          <ClickableTile className="esti-fill" onClick={() => navigate("/hr")}>
            <Stack gap={3}>
              <p>On leave today</p>
              <h2>{b?.onLeaveToday ?? "…"}</h2>
              <Tag type="purple">{s?.hr?.headcount ?? 0} on the team</Tag>
            </Stack>
          </ClickableTile>
        ) : (
          <Tile className="esti-fill">
            <Stack gap={3}>
              <p>Permits open</p>
              <h2>{s?.permits.open ?? "…"}</h2>
              {s?.permits.overdue ? (
                <Tag type="red">{s.permits.overdue} overdue</Tag>
              ) : (
                <Tag type="gray">of {s?.permits.total ?? 0} total</Tag>
              )}
            </Stack>
          </Tile>
        )}
      </Column>

      {/* One board per phase */}
      {byPhase.map((p) => (
        <Column key={p.code} lg={4} md={4} sm={4}>
          <ClickableTile className="esti-fill" onClick={() => navigate("/projects")}>
            <Stack gap={3}>
              <p>{p.label}</p>
              <h2>{p.count}</h2>
              <ProgressBar
                label={p.label}
                hideLabel
                helperText={`${totalProjects > 0 ? Math.round((p.count / totalProjects) * 100) : 0}% of projects`}
                value={p.count}
                max={Math.max(1, totalProjects)}
                size="small"
              />
            </Stack>
          </ClickableTile>
        </Column>
      ))}

      {/* One board per project type */}
      {byType.map((t) => (
        <Column key={t.type} lg={4} md={4} sm={4}>
          <ClickableTile className="esti-fill" onClick={() => navigate("/projects")}>
            <Stack gap={3}>
              <p>{TYPE_LABEL[t.type] ?? t.type}</p>
              <h2>{t.count}</h2>
              <ProgressBar
                label={TYPE_LABEL[t.type] ?? t.type}
                hideLabel
                helperText={`${totalProjects > 0 ? Math.round((t.count / totalProjects) * 100) : 0}% of projects`}
                value={t.count}
                max={Math.max(1, totalProjects)}
                size="small"
              />
            </Stack>
          </ClickableTile>
        </Column>
      ))}

      {/* Statutory filing deadlines */}
      <Column lg={4} md={4} sm={4}>
        <FilingDueBoard
          title="GST filing due"
          Pictogram={Receipt}
          rows={[
            { label: "GSTR-1 (outward)", iso: nextMonthlyDue(11) },
            { label: "GSTR-3B (summary)", iso: nextMonthlyDue(20) },
          ]}
        />
      </Column>
      <Column lg={4} md={4} sm={4}>
        <FilingDueBoard
          title="TDS filing due"
          Pictogram={Banking}
          rows={[
            { label: "TDS payment (challan)", iso: nextMonthlyDue(7) },
            { label: "TDS return (quarterly)", iso: nextTdsReturnDue() },
          ]}
        />
      </Column>

      {/* Workload */}
      <Column lg={4} md={4} sm={4}>
        <DistroBoard
          title="Workload — open tasks"
          rows={(b?.workload ?? []).map((r) => ({ label: r.assignee, value: r.count }))}
          max={workloadMax}
          emptyText="No assigned open tasks"
        />
      </Column>

      {/* Receivables — fees managers only */}
      {canFees && (
        <Column lg={4} md={4} sm={4}>
          <DistroBoard
            title="Receivables aging"
            rows={[
              { label: "0–30 days", value: b?.receivablesAging.d0_30 ?? 0 },
              { label: "31–60 days", value: b?.receivablesAging.d31_60 ?? 0 },
              { label: "60+ days", value: b?.receivablesAging.d60p ?? 0 },
            ]}
            max={agingMax}
            format={(n) => formatINRShort(n)}
          />
        </Column>
      )}
    </Grid>
  );
}
