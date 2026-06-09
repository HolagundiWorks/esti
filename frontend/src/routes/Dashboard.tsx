import { Column, Grid, ClickableTile, Tag, Tile } from "@carbon/react";
import {
  Building,
  ChartColumn,
  Money,
  TaskComplete,
  UserMultiple,
  WarningAlt,
  type CarbonIconType,
} from "@carbon/icons-react";
import { Banking, ChartLine, type Pictogram, Receipt } from "@carbon/pictograms-react";
import { can, formatINRShort } from "@esti/contracts";
import { useNavigate } from "react-router-dom";
import { ClockLeavesWidget } from "../components/ClockLeavesWidget.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

// A designed accent palette (Carbon colour ramp) rotated across the
// per-phase / per-type cards so the board reads as a deliberate set.
const ACCENTS = [
  "#0f62fe", // blue 60
  "#42be65", // green 40
  "#8a3ffc", // purple 60
  "#ff832b", // orange 40
  "#08bdba", // teal 40
  "#ee5396", // magenta 50
  "#4589ff", // blue 50
  "#24a148", // green 50
  "#d12771", // magenta 60
  "#fa4d56", // red 50
];

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

function SectionHeading({ title, hint, count }: { title: string; hint?: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "28px 0 12px" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{title}</h2>
      {typeof count === "number" && (
        <span style={{ fontSize: 13, color: "var(--cds-text-secondary)" }}>{count}</span>
      )}
      {hint && (
        <span style={{ fontSize: 13, color: "var(--cds-text-secondary)", marginLeft: "auto" }}>{hint}</span>
      )}
      <div style={{ flex: hint ? 0 : 1, height: 1, background: "var(--cds-border-subtle)", alignSelf: "center" }} />
    </div>
  );
}

/** Top-level KPI tile: big number, label, an accent icon chip, optional tag. */
function KpiTile({ label, value, helper, icon: Icon, accent, tag, onClick, delay }: {
  label: string;
  value: string;
  helper?: string;
  icon: CarbonIconType;
  accent: string;
  tag?: { type: "red" | "magenta" | "blue" | "green"; text: string };
  onClick?: () => void;
  delay: number;
}) {
  return (
    <ClickableTile onClick={onClick} className="dash-widget" style={{ height: "100%", animationDelay: `${delay}ms` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, color: "var(--cds-text-secondary)" }}>{label}</p>
          <p style={{ fontSize: "2.25rem", fontWeight: 600, lineHeight: 1.15, fontVariantNumeric: "tabular-nums" }}>{value}</p>
          {helper && <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{helper}</p>}
          {tag && <Tag type={tag.type} size="sm" style={{ marginTop: 8 }}>{tag.text}</Tag>}
        </div>
        <div
          style={{
            flexShrink: 0,
            width: 40,
            height: 40,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${accent}1f`,
            color: accent,
          }}
        >
          <Icon size={20} />
        </div>
      </div>
    </ClickableTile>
  );
}

/** One card representing a single phase or project type, with a share bar. */
function CountCard({ label, count, total, accent, delay, onClick }: {
  label: string;
  count: number;
  total: number;
  accent: string;
  delay: number;
  onClick?: () => void;
}) {
  const share = total > 0 ? Math.round((count / total) * 100) : 0;
  const body = (
    <>
      <div style={{ height: 4, borderRadius: 2, background: accent, marginBottom: 12, width: 36 }} />
      <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
      <p style={{ fontSize: "2rem", fontWeight: 600, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>{count}</p>
      <div style={{ height: 6, background: "var(--cds-layer-accent)", borderRadius: 3, marginTop: 10 }}>
        <div className="dash-bar-fill" style={{ height: 6, width: `${share}%`, background: accent, borderRadius: 3 }} />
      </div>
      <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", marginTop: 6 }}>{share}% of projects</p>
    </>
  );
  return onClick ? (
    <ClickableTile onClick={onClick} className="dash-widget" style={{ height: "100%", animationDelay: `${delay}ms` }}>{body}</ClickableTile>
  ) : (
    <Tile className="dash-widget" style={{ height: "100%", animationDelay: `${delay}ms` }}>{body}</Tile>
  );
}

/** Horizontal-bar distribution board (label + value + animated bar). */
function BarBoard({ title, items, emptyText, format, delay }: {
  title: string;
  items: { label: string; count: number }[];
  emptyText?: string;
  format?: (n: number) => string;
  delay: number;
}) {
  const fmt = format ?? ((n: number) => String(n));
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Tile className="dash-widget" style={{ height: "100%", animationDelay: `${delay}ms` }}>
      <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", marginBottom: 12 }}>{title}</p>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--cds-text-secondary)" }}>{emptyText ?? "No data"}</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((it, i) => (
            <div key={it.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{it.label}</span>
                <strong style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(it.count)}</strong>
              </div>
              <div style={{ height: 8, background: "var(--cds-layer-accent)", borderRadius: 4 }}>
                <div className="dash-bar-fill" style={{ height: 8, width: `${(it.count / max) * 100}%`, background: ACCENTS[i % ACCENTS.length], borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Tile>
  );
}

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
    if (m > 11) { m = 0; y += 1; }
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

/** A board listing statutory filing deadlines with a days-remaining countdown. */
function FilingDueBoard({ title, Pictogram, rows, delay }: {
  title: string;
  Pictogram: Pictogram;
  rows: { label: string; iso: string }[];
  delay: number;
}) {
  const fmtDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return (
    <Tile className="dash-widget" style={{ height: "100%", animationDelay: `${delay}ms` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Pictogram width={28} height={28} />
        <p style={{ fontSize: 13, color: "var(--cds-text-secondary)" }}>{title}</p>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((r) => {
          const days = daysUntil(r.iso);
          const tagType = days <= 3 ? "red" : days <= 7 ? "magenta" : "blue";
          return (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
                <div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{fmtDate(r.iso)}</div>
              </div>
              <Tag type={tagType} size="sm">{days === 0 ? "today" : days < 0 ? `${-days}d ago` : `${days}d`}</Tag>
            </div>
          );
        })}
      </div>
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
        <ChartLine width={44} height={44} />
        <div>
          <h1>Office dashboard</h1>
          <p style={{ color: "var(--cds-text-secondary)" }}>
            {(user?.fullName ? `Welcome, ${user.fullName.split(" ")[0]} · ` : "")}{today}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <Grid narrow className="dash-grid" style={{ marginTop: 16 }}>
        <Column sm={4} md={4} lg={4} style={{ marginBottom: 16 }}>
          <KpiTile
            label="Projects"
            value={String(totalProjects || (s ? 0 : "…"))}
            helper={`${s?.projects.byStatus.ACTIVE ?? 0} active · ${s?.projects.byStatus.ENQUIRY ?? 0} enquiry`}
            icon={Building}
            accent={ACCENTS[0]!}
            onClick={() => navigate("/projects")}
            delay={0}
          />
        </Column>
        <Column sm={4} md={4} lg={4} style={{ marginBottom: 16 }}>
          <KpiTile
            label="Outstanding (net of TDS)"
            value={s ? formatINRShort(s.invoices.outstandingPaise) : "…"}
            helper={s ? `${formatINRShort(s.invoices.collectedPaise)} collected` : undefined}
            icon={Money}
            accent={ACCENTS[1]!}
            onClick={() => navigate("/invoices")}
            delay={50}
          />
        </Column>
        <Column sm={4} md={4} lg={4} style={{ marginBottom: 16 }}>
          <KpiTile
            label="Tasks due today"
            value={String(b?.tasksDueToday ?? "…")}
            helper="due today or overdue"
            icon={TaskComplete}
            accent={ACCENTS[3]!}
            onClick={() => navigate("/tasks")}
            delay={100}
          />
        </Column>
        <Column sm={4} md={4} lg={4} style={{ marginBottom: 16 }}>
          {canHr ? (
            <KpiTile
              label="On leave today"
              value={String(b?.onLeaveToday ?? "…")}
              helper={`${s?.hr?.headcount ?? 0} on the team`}
              icon={UserMultiple}
              accent={ACCENTS[2]!}
              onClick={() => navigate("/hr")}
              delay={150}
            />
          ) : (
            <KpiTile
              label="Permits open"
              value={String(s?.permits.open ?? "…")}
              helper={`of ${s?.permits.total ?? 0} total`}
              icon={WarningAlt}
              accent={ACCENTS[5]!}
              tag={s?.permits.overdue ? { type: "red", text: `${s.permits.overdue} overdue` } : undefined}
              delay={150}
            />
          )}
        </Column>
      </Grid>

      {/* Projects by phase — one card per phase */}
      <SectionHeading title="Projects by phase" count={byPhase.length} hint="current engagement stage" />
      {byPhase.length === 0 ? (
        <Tile><p style={{ color: "var(--cds-text-secondary)" }}>No active project phases yet.</p></Tile>
      ) : (
        <Grid narrow className="dash-grid">
          {byPhase.map((p, i) => (
            <Column key={p.code} sm={4} md={4} lg={4} style={{ marginBottom: 16 }}>
              <CountCard label={p.label} count={p.count} total={totalProjects} accent={ACCENTS[i % ACCENTS.length]!} delay={i * 40} onClick={() => navigate("/projects")} />
            </Column>
          ))}
        </Grid>
      )}

      {/* Projects by type — one card per type */}
      <SectionHeading title="Projects by type" count={byType.length} hint="building use" />
      {byType.length === 0 ? (
        <Tile><p style={{ color: "var(--cds-text-secondary)" }}>No projects yet.</p></Tile>
      ) : (
        <Grid narrow className="dash-grid">
          {byType.map((t, i) => (
            <Column key={t.type} sm={4} md={4} lg={4} style={{ marginBottom: 16 }}>
              <CountCard label={TYPE_LABEL[t.type] ?? t.type} count={t.count} total={totalProjects} accent={ACCENTS[(i + 2) % ACCENTS.length]!} delay={i * 40} onClick={() => navigate("/projects")} />
            </Column>
          ))}
        </Grid>
      )}

      {/* Operations & compliance */}
      <SectionHeading title="Operations & compliance" hint="today" />
      <Grid narrow className="dash-grid">
        <Column sm={4} md={4} lg={4} style={{ marginBottom: 16 }}>
          <ClockLeavesWidget />
        </Column>
        <Column sm={4} md={4} lg={4} style={{ marginBottom: 16 }}>
          <FilingDueBoard
            title="GST filing due"
            Pictogram={Receipt}
            rows={[
              { label: "GSTR-1 (outward)", iso: nextMonthlyDue(11) },
              { label: "GSTR-3B (summary)", iso: nextMonthlyDue(20) },
            ]}
            delay={50}
          />
        </Column>
        <Column sm={4} md={4} lg={4} style={{ marginBottom: 16 }}>
          <FilingDueBoard
            title="TDS filing due"
            Pictogram={Banking}
            rows={[
              { label: "TDS payment (challan)", iso: nextMonthlyDue(7) },
              { label: "TDS return (quarterly)", iso: nextTdsReturnDue() },
            ]}
            delay={100}
          />
        </Column>
        <Column sm={4} md={4} lg={4} style={{ marginBottom: 16 }}>
          <BarBoard
            title="Workload — open tasks"
            items={(b?.workload ?? []).map((r) => ({ label: r.assignee, count: r.count }))}
            emptyText="No assigned open tasks"
            delay={150}
          />
        </Column>
      </Grid>

      {/* Receivables — fees managers only */}
      {canFees && (
        <Grid narrow className="dash-grid">
          <Column sm={4} md={8} lg={8} style={{ marginBottom: 16 }}>
            <BarBoard
              title="Receivables aging (outstanding)"
              format={(n) => formatINRShort(n)}
              items={[
                { label: "0–30 days", count: b?.receivablesAging.d0_30 ?? 0 },
                { label: "31–60 days", count: b?.receivablesAging.d31_60 ?? 0 },
                { label: "60+ days", count: b?.receivablesAging.d60p ?? 0 },
              ]}
              delay={0}
            />
          </Column>
          <Column sm={4} md={8} lg={8} style={{ marginBottom: 16 }}>
            <Tile className="dash-widget" style={{ height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <ChartColumn size={20} style={{ color: ACCENTS[6] }} />
                <p style={{ fontSize: 13, color: "var(--cds-text-secondary)" }}>Fee proposals</p>
              </div>
              <p style={{ fontSize: "2rem", fontWeight: 600, lineHeight: 1.2 }}>{s?.feeProposals.total ?? "…"}</p>
              {s?.feeProposals.belowMinimum ? (
                <Tag type="magenta" size="sm" style={{ marginTop: 8 }}>{s.feeProposals.belowMinimum} below COA minimum</Tag>
              ) : (
                <p style={{ fontSize: 12, color: "var(--cds-text-secondary)", marginTop: 8 }}>All at or above COA minimum.</p>
              )}
            </Tile>
          </Column>
        </Grid>
      )}
    </div>
  );
}
