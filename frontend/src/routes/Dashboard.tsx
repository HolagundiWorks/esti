import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Button, ClickableTile, OverflowMenu, OverflowMenuItem, Tag, Tile } from "@carbon/react";
import { Add, Close, Edit, Save } from "@carbon/icons-react";
import {
  DASHBOARD_WIDGETS,
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardLayout,
  can,
  formatINRShort,
} from "@esti/contracts";
import { useEffect, useMemo, useState } from "react";
import GridLayout, { type Layout, WidthProvider } from "react-grid-layout";
import { useNavigate } from "react-router-dom";
import { ClockLeavesWidget } from "../components/ClockLeavesWidget.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

const Grid = WidthProvider(GridLayout);

const WIDGET_TITLE = Object.fromEntries(DASHBOARD_WIDGETS.map((w) => [w.id, w.title]));

function Stat({ label, value, helper, tag, onClick }: {
  label: string;
  value: string;
  helper?: string;
  tag?: { type: "red" | "magenta" | "blue"; text: string };
  onClick?: () => void;
}) {
  const body = (
    <>
      <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>{value}</p>
      {helper && <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{helper}</p>}
      {tag && <Tag type={tag.type} style={{ marginTop: 8 }}>{tag.text}</Tag>}
    </>
  );
  return onClick ? (
    <ClickableTile onClick={onClick} style={{ height: "100%" }}>{body}</ClickableTile>
  ) : (
    <Tile style={{ height: "100%" }}>{body}</Tile>
  );
}

/** A compact horizontal-bar distribution board (label + count). */
function DistroBoard({ title, items, emptyText }: { title: string; items: { label: string; count: number }[]; emptyText?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Tile style={{ height: "100%", overflow: "auto" }}>
      <p style={{ fontSize: 12, color: "var(--cds-text-secondary)", marginBottom: 8 }}>{title}</p>
      {items.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{emptyText ?? "No data"}</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((it) => (
            <div key={it.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{it.label}</span>
                <strong>{it.count}</strong>
              </div>
              <div style={{ height: 6, background: "var(--cds-layer-accent)", borderRadius: 3 }}>
                <div style={{ height: 6, width: `${(it.count / max) * 100}%`, background: "var(--cds-button-primary)", borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Tile>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const summary = trpc.dashboard.summary.useQuery();
  const boardsQ = trpc.dashboard.boards.useQuery();
  const tasksQ = trpc.tasks.list.useQuery({ openOnly: true });
  const alertsQ = trpc.notifications.list.useQuery();
  const layoutQ = trpc.dashboard.layout.useQuery();
  const saveLayout = trpc.dashboard.saveLayout.useMutation({
    onSuccess: () => utils.dashboard.layout.invalidate(),
  });

  const [edit, setEdit] = useState(false);
  const [layout, setLayout] = useState<DashboardLayout>([]);

  // Widgets this user is allowed to see (capability-gated catalogue).
  const allowed = useMemo(
    () => DASHBOARD_WIDGETS.filter((w) => !w.capability || can(user?.role, w.capability)),
    [user?.role],
  );
  const allowedIds = useMemo(() => new Set<string>(allowed.map((w) => w.id)), [allowed]);

  // Seed from the saved layout (or the default), dropping any widget the user
  // may no longer access.
  useEffect(() => {
    if (layoutQ.isLoading) return;
    const saved = (layoutQ.data as DashboardLayout | null) ?? null;
    const base = saved && saved.length > 0 ? saved : DEFAULT_DASHBOARD_LAYOUT;
    setLayout(base.filter((it) => allowedIds.has(it.i)));
  }, [layoutQ.data, layoutQ.isLoading, allowedIds]);

  const s = summary.data;
  const placed = new Set(layout.map((l) => l.i));
  const addable = allowed.filter((w) => !placed.has(w.id));

  function renderWidget(id: string) {
    switch (id) {
      case "clock":
        return <ClockLeavesWidget />;
      case "projects":
        return (
          <Stat
            label="Projects"
            value={String(s?.projects.total ?? "…")}
            helper={`${s?.projects.byStatus.ACTIVE ?? 0} active · ${s?.projects.byStatus.ENQUIRY ?? 0} enquiry`}
            onClick={edit ? undefined : () => navigate("/projects")}
          />
        );
      case "invoices":
        return (
          <Stat
            label="Outstanding (net of TDS)"
            value={s ? formatINRShort(s.invoices.outstandingPaise) : "…"}
            helper={s ? `${formatINRShort(s.invoices.collectedPaise)} collected` : undefined}
          />
        );
      case "permits":
        return (
          <Stat
            label="Permits"
            value={String(s?.permits.open ?? "…")}
            helper={`open of ${s?.permits.total ?? 0}`}
            tag={s?.permits.overdue ? { type: "red", text: `${s.permits.overdue} overdue` } : undefined}
          />
        );
      case "fees":
        return (
          <Stat
            label="Fee proposals"
            value={String(s?.feeProposals.total ?? "…")}
            tag={s?.feeProposals.belowMinimum ? { type: "magenta", text: `${s.feeProposals.belowMinimum} below COA min` } : undefined}
          />
        );
      case "tasks":
        return (
          <Stat
            label="Open tasks"
            value={String(tasksQ.data?.length ?? "…")}
            helper="across all projects"
            onClick={edit ? undefined : () => navigate("/tasks")}
          />
        );
      case "alerts":
        return (
          <Stat
            label="Alerts"
            value={String(alertsQ.data?.length ?? "…")}
            helper="compliance & deadlines"
            onClick={edit ? undefined : () => navigate("/alerts")}
          />
        );
      case "hr":
        return (
          <Stat
            label="Headcount"
            value={String(s?.hr?.headcount ?? "…")}
            helper={`${s?.hr?.pendingLeaves ?? 0} leaves pending`}
            onClick={edit ? undefined : () => navigate("/hr")}
          />
        );
      case "projectsByPhase":
        return <DistroBoard title="Projects by phase" items={(boardsQ.data?.byPhase ?? []).map((r) => ({ label: r.label, count: r.count }))} />;
      case "projectsByType":
        return <DistroBoard title="Projects by type" items={(boardsQ.data?.byType ?? []).map((r) => ({ label: r.type, count: r.count }))} />;
      case "workload":
        return <DistroBoard title="Workload — open tasks" items={(boardsQ.data?.workload ?? []).map((r) => ({ label: r.assignee, count: r.count }))} emptyText="No assigned open tasks" />;
      case "tasksToday":
        return (
          <Stat
            label="Tasks due today"
            value={String(boardsQ.data?.tasksDueToday ?? "…")}
            helper="due today or overdue, not done"
            onClick={edit ? undefined : () => navigate("/tasks")}
          />
        );
      case "onLeave":
        return (
          <Stat
            label="On leave today"
            value={String(boardsQ.data?.onLeaveToday ?? "…")}
            helper="approved leave covering today"
            onClick={edit ? undefined : () => navigate("/hr")}
          />
        );
      default:
        return <Tile>Unknown widget</Tile>;
    }
  }

  function addWidget(id: string) {
    const def = DASHBOARD_WIDGETS.find((w) => w.id === id);
    if (!def) return;
    setLayout((prev) => [...prev, { i: id, x: 0, y: Infinity as unknown as number, w: def.w, h: def.h }]);
  }

  function removeWidget(id: string) {
    setLayout((prev) => prev.filter((l) => l.i !== id));
  }

  function onLayoutChange(next: Layout[]) {
    if (!edit) return;
    setLayout(next.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));
  }

  function save() {
    // Clamp to the contract bounds (RGL can leave Infinity y on new widgets).
    const clean: DashboardLayout = layout.map((l) => ({
      i: l.i,
      x: Math.max(0, Math.min(11, l.x)),
      y: Number.isFinite(l.y) ? Math.max(0, Math.min(200, l.y)) : 200,
      w: Math.max(1, Math.min(12, l.w)),
      h: Math.max(1, Math.min(12, l.h)),
    }));
    saveLayout.mutate(clean, { onSuccess: () => setEdit(false) });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <h1>Office dashboard</h1>
          <p style={{ color: "var(--cds-text-secondary)" }}>
            {edit ? "Drag to move, drag a corner to resize, × to remove." : "Architectural Office Resource Management System"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {edit && addable.length > 0 && (
            <OverflowMenu renderIcon={Add} flipped aria-label="Add widget" iconDescription="Add widget">
              {addable.map((w) => (
                <OverflowMenuItem key={w.id} itemText={w.title} onClick={() => addWidget(w.id)} />
              ))}
            </OverflowMenu>
          )}
          {edit ? (
            <>
              <Button kind="ghost" size="sm" onClick={() => { setEdit(false); utils.dashboard.layout.invalidate(); }}>
                Cancel
              </Button>
              <Button size="sm" renderIcon={Save} disabled={saveLayout.isPending} onClick={save}>
                Save layout
              </Button>
            </>
          ) : (
            <Button kind="tertiary" size="sm" renderIcon={Edit} onClick={() => setEdit(true)}>
              Customise
            </Button>
          )}
        </div>
      </div>

      <Grid
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={72}
        margin={[16, 16]}
        isDraggable={edit}
        isResizable={edit}
        draggableHandle=".widget-drag"
        onLayoutChange={onLayoutChange}
      >
        {layout.map((item) => (
          <div key={item.i} style={{ overflow: "hidden" }}>
            {edit && (
              <div
                className="widget-drag"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "move",
                  fontSize: 12,
                  padding: "2px 4px",
                  color: "var(--cds-text-secondary)",
                  background: "var(--cds-layer-accent)",
                }}
              >
                <span>{WIDGET_TITLE[item.i] ?? item.i}</span>
                <Button kind="ghost" size="sm" hasIconOnly iconDescription="Remove" renderIcon={Close} onClick={() => removeWidget(item.i)} />
              </div>
            )}
            <div style={{ height: edit ? "calc(100% - 28px)" : "100%" }}>{renderWidget(item.i)}</div>
          </div>
        ))}
      </Grid>
    </div>
  );
}
