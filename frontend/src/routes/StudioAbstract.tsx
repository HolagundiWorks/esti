/**
 * AORMS Studio Abstract — home screen of the system.
 *
 * Tabs: STUDIO ABSTRACT · LEAD REGISTER · PROJECT ABSTRACT · FINANCIAL ABSTRACT ·
 *       TEAM ABSTRACT · WORK REGISTER · APPROVAL REGISTER · SUMMARY SHEETS ·
 *       OFFICE LOG   (ESTI is embedded per-screen as "ESTI Observation", not a tab)
 *
 * Route: /  (root)
 * tRPC: dashboard.home bundle (KPIs, Action Center, financial/project health)
 */
import {
  Button,
  Column,
  Grid,
  InlineNotification,
  InlineLoading,
  ProgressBar,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
  Tile,
} from "@carbon/react";
import { can, formatINRShort } from "@esti/contracts";
import { Send } from "@carbon/icons-react";
import { useState, Fragment, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AiDraftPanel } from "../components/AiStudio.js";
import {
  AbstractScreenShell,
  ActivePressureList,
  CurrentStateBlock,
  EstiObservationPanel,
  EvidenceActionBlock,
  RegisterSnapshot,
  ScreenHeader,
  type EvidenceRow,
  type Pressure,
  type SnapshotRow,
} from "../components/dashboard/abstractShell.js";
import {
  CAPACITY_LABEL,
  CAPACITY_TAG,
  HEALTH_LABEL,
  HEALTH_TAG,
  nextTdsReturnDue,
} from "../components/dashboard/dashboardUi.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { Leads } from "./Leads.js";

// ── Zone state ────────────────────────────────────────────────────────────────

type ZoneState = "stable" | "watch" | "friction" | "critical" | "inactive";

const SHAPE: Record<ZoneState, string> = {
  stable: "●", watch: "▲", friction: "◆", critical: "■", inactive: "○",
};

const ZCOLOR: Record<ZoneState, string> = {
  stable:   "var(--cds-support-success)",
  watch:    "var(--cds-support-warning)",
  friction: "var(--cds-support-warning-minor)",
  critical: "var(--cds-support-error)",
  inactive: "var(--cds-text-disabled)",
};

// Identity colours per tile — Carbon tag-background tokens
const TILE_COLOR: Record<string, string> = {
  CLIENT:  "var(--cds-interactive)",
  FINANCE: "var(--cds-tag-background-purple)",
  PROJECT: "var(--cds-tag-background-teal)",
  TEAM:    "var(--cds-tag-background-cyan)",
};

// Team load colours and capacity bar mapping — shared by DetailRow / ScreenProjects / ScreenTeam
const LOAD_COLOR: Record<string, string> = {
  OVERLOADED: "var(--cds-support-error)",
  HIGH:       "var(--cds-support-warning-minor)",
  MODERATE:   "var(--cds-support-warning)",
  AVAILABLE:  "var(--cds-support-success)",
};
const loadPct = (c: string): number =>
  ({ OVERLOADED: 95, HIGH: 75, MODERATE: 55, AVAILABLE: 30 }[c] ?? 50);

const CLIENT_LABEL:  Record<ZoneState, string> = {
  stable: "RESPONSIVE",  watch: "WAITING",    friction: "BLOCKED",           critical: "INTERVENTION REQUIRED", inactive: "NO SIGNAL",
};
const FINANCE_LABEL: Record<ZoneState, string> = {
  stable: "HEALTHY",     watch: "WATCH",       friction: "RECOVERY REQUIRED", critical: "AT RISK",               inactive: "RESTRICTED",
};
const PROJECT_LABEL: Record<ZoneState, string> = {
  stable: "STABLE",      watch: "WATCH",       friction: "SLIPPING",          critical: "CRITICAL",              inactive: "NO PROJECTS",
};
const TEAM_LABEL:    Record<ZoneState, string> = {
  stable: "BALANCED",    watch: "UNDER LOAD",  friction: "OVERLOADED",        critical: "CAPACITY EXHAUSTED",    inactive: "NO DATA",
};

// ── State derivation ──────────────────────────────────────────────────────────

function clientState(pendingCount: number, maxWaitDays: number): ZoneState {
  if (pendingCount === 0) return "stable";
  if (maxWaitDays > 14 || pendingCount >= 5) return "critical";
  if (maxWaitDays > 7  || pendingCount >= 3) return "friction";
  return "watch";
}

function financeState(outstandingPaise: number, overdue30dPaise: number, canSee: boolean): ZoneState {
  if (!canSee) return "inactive";
  if (overdue30dPaise > 5_000_000)  return "critical";
  if (overdue30dPaise > 1_000_000 || outstandingPaise > 20_000_000) return "friction";
  if (overdue30dPaise > 0 || outstandingPaise > 5_000_000) return "watch";
  return "stable";
}

function projectState(total: number, atRisk: number): ZoneState {
  if (total === 0) return "inactive";
  if (atRisk >= 3) return "critical";
  if (atRisk >= 2) return "friction";
  if (atRisk >= 1) return "watch";
  return "stable";
}

function teamState(overloaded: number, total: number, hrEnabled: boolean): ZoneState {
  if (!hrEnabled || total === 0) return "inactive";
  if (overloaded >= total / 2)  return "critical";
  if (overloaded >= 2)          return "friction";
  if (overloaded === 1)         return "watch";
  return "stable";
}

function officeHealth(cs: ZoneState, fs: ZoneState, ps: ZoneState, ts: ZoneState): number {
  const p: Record<ZoneState, number> = { critical: 50, friction: 30, watch: 15, stable: 0, inactive: 0 };
  return Math.max(0, Math.round(100 - (p[cs] * 0.25 + p[fs] * 0.30 + p[ps] * 0.25 + p[ts] * 0.20)));
}

function healthBand(score: number): { label: string; color: string } {
  if (score >= 88) return { label: "Stable",              color: "var(--cds-support-success)" };
  if (score >= 72) return { label: "Flowing",             color: "var(--cds-interactive)" };
  if (score >= 55) return { label: "Review soon",         color: "var(--cds-support-warning)" };
  if (score >= 38) return { label: "Needs attention",     color: "var(--cds-support-warning-minor)" };
  return               { label: "Owner action needed", color: "var(--cds-support-error)" };
}

// ── Health percentages ────────────────────────────────────────────────────────

function clientHealthPct(pendingCount: number, maxWaitDays: number, blocked: number): number {
  if (pendingCount === 0 && blocked === 0) return 92;
  let score = 100;
  score -= Math.min(pendingCount * 7, 25);
  score -= Math.min(maxWaitDays * 1.5, 30);
  score -= blocked * 12;
  return Math.max(8, Math.round(score));
}

function financeHealthPct(outstandingPaise: number, overduePaise: number, canSee: boolean): number {
  if (!canSee) return 0;
  if (outstandingPaise === 0) return 95;
  const overdueRatio = overduePaise / Math.max(outstandingPaise, 1);
  return Math.max(8, Math.round(100 - overdueRatio * 75 - (outstandingPaise > 20_000_000 ? 15 : 0)));
}

function projectHealthPct(total: number, atRisk: number, delayed: number): number {
  if (total === 0) return 0;
  return Math.max(8, Math.round(100 - (atRisk / total) * 60 - (delayed / total) * 25));
}

function teamHealthPct(overloaded: number, total: number, leaveCount: number, hrEnabled: boolean): number {
  if (!hrEnabled || total === 0) return 0;
  return Math.max(8, Math.round(100 - (overloaded / total) * 70 - Math.min(leaveCount / total, 0.5) * 20));
}

// ── GST status ────────────────────────────────────────────────────────────────

function gstStatus(): { label: string; daysUntil: number; state: "stable" | "watch" | "friction" } {
  const today    = new Date();
  const m        = today.getMonth();
  const y        = today.getFullYear();
  const todayMs  = today.getTime();
  const cands    = [new Date(y,m,11), new Date(y,m,20), new Date(y,m+1,11), new Date(y,m+1,20)];
  const next     = cands.find((d) => d.getTime() > todayMs) ?? cands[2]!;
  const days     = Math.ceil((next.getTime() - todayMs) / 86_400_000);
  if (days <= 3) return { label: "DUE SOON", daysUntil: days, state: "friction" };
  if (days <= 7) return { label: `${days}d`,  daysUntil: days, state: "watch"    };
  return               { label: "OK",          daysUntil: days, state: "stable"   };
}

// ── Attention vector ──────────────────────────────────────────────────────────

interface AttnResult {
  issue:      string;
  action:     string;
  chain:      Array<{ id: string; on: boolean }>;
  chainColor: string;
}

function deriveAttn({
  cs, fs, ps, ts,
  pendingCount, maxWaitDays, riskProjects,
  overduePaise, billingReadyCount, overloadedCount,
}: {
  cs: ZoneState; fs: ZoneState; ps: ZoneState; ts: ZoneState;
  pendingCount: number; maxWaitDays: number;
  riskProjects: Array<{ ref: string }>;
  overduePaise: number; billingReadyCount: number; overloadedCount: number;
}): AttnResult {

  if (pendingCount > 0 && riskProjects.length > 0 && billingReadyCount > 0)
    return {
      issue:  `Client approval delay cascading into ${riskProjects.length > 1 ? `${riskProjects.length} projects` : (riskProjects[0]?.ref ?? "active delivery")} — billing queue blocked`,
      action: "Escalate pending client approvals today",
      chain:  [{ id: "CLIENTS", on: true }, { id: "PROJECTS", on: true }, { id: "FINANCE", on: true }, { id: "TEAM", on: false }],
      chainColor: ZCOLOR["friction"],
    };

  if (pendingCount > 0 && riskProjects.length > 0)
    return {
      issue:  `Client approval pending ${maxWaitDays > 0 ? `(${maxWaitDays}d oldest)` : ""} — ${riskProjects.length} project${riskProjects.length > 1 ? "s" : ""} at delivery risk`,
      action: "Follow up on client response to unblock delivery",
      chain:  [{ id: "CLIENTS", on: true }, { id: "PROJECTS", on: true }, { id: "FINANCE", on: false }, { id: "TEAM", on: false }],
      chainColor: ZCOLOR[cs === "critical" ? "critical" : "friction"],
    };

  if (fs === "critical" || fs === "friction")
    return {
      issue:  `${formatINRShort(overduePaise)} overdue — collection delay increasing`,
      action: "Contact clients on overdue invoices before end of week",
      chain:  [{ id: "CLIENTS", on: false }, { id: "PROJECTS", on: false }, { id: "FINANCE", on: true }, { id: "TEAM", on: false }],
      chainColor: ZCOLOR[fs],
    };

  if (overloadedCount > 0 && riskProjects.length > 0)
    return {
      issue:  `${overloadedCount} member${overloadedCount > 1 ? "s" : ""} overloaded — delivery risk spreading to ${riskProjects.length} project${riskProjects.length > 1 ? "s" : ""}`,
      action: "Redistribute task load before delivery deadlines",
      chain:  [{ id: "CLIENTS", on: false }, { id: "PROJECTS", on: true }, { id: "FINANCE", on: false }, { id: "TEAM", on: true }],
      chainColor: ZCOLOR[ts],
    };

  if (cs === "watch" || fs === "watch" || ps === "watch" || ts === "watch") {
    const which = [cs==="watch"&&"CLIENT", fs==="watch"&&"FINANCE", ps==="watch"&&"PROJECT", ts==="watch"&&"TEAM"].filter(Boolean).join(" + ");
    return {
      issue:  `${which} signals at watch level — monitor for escalation`,
      action: "Review flagged items before end of day",
      chain:  [{ id: "CLIENTS", on: cs==="watch" }, { id: "PROJECTS", on: ps==="watch" }, { id: "FINANCE", on: fs==="watch" }, { id: "TEAM", on: ts==="watch" }],
      chainColor: ZCOLOR["watch"],
    };
  }

  return {
    issue:  "Practice operating normally. No immediate intervention required.",
    action: "Review weekly performance and plan next sprint",
    chain:  [{ id: "CLIENTS", on: false }, { id: "PROJECTS", on: false }, { id: "FINANCE", on: false }, { id: "TEAM", on: false }],
    chainColor: ZCOLOR["stable"],
  };
}

// ── Interventions ─────────────────────────────────────────────────────────────

interface Intervention { priority: number; title: string; severity: ZoneState; }

function deriveInterventions({
  pendingApprovals, overdueInvoices, riskProjects,
  overloaded, billingReady, canInvoice,
}: {
  pendingApprovals: any[]; overdueInvoices: any[]; riskProjects: any[];
  overloaded: any[]; billingReady: any[]; canInvoice: boolean;
}): Intervention[] {
  const items: Intervention[] = [];
  let r = 1;
  overdueInvoices.slice(0,3).forEach((inv: any) => items.push({
    priority: r++, severity: inv.daysOverdue > 30 ? "critical" : "friction",
    title: `Recover overdue invoice ${inv.ref} (${inv.daysOverdue}d) — ${formatINRShort(inv.netReceivablePaise)}`,
  }));
  pendingApprovals.slice(0,3).forEach((ap: any) => items.push({
    priority: r++, severity: (ap.daysWaiting ?? 0) > 10 ? "friction" : "watch",
    title: `Escalate approval: ${ap.title} (${ap.projectRef}, ${ap.daysWaiting}d)`,
  }));
  riskProjects.slice(0,2).forEach((p: any) => items.push({
    priority: r++, severity: "friction",
    title: `Owner review: ${p.ref} — ${p.title}`,
  }));
  overloaded.slice(0,2).forEach((m: any) => items.push({
    priority: r++, severity: "watch",
    title: `Redistribute tasks from ${m.assignee} (${m.totalOpen} open, ${m.overdueCount} late)`,
  }));
  if (canInvoice && billingReady.length > 0) items.push({
    priority: r++, severity: "watch",
    title: `Generate invoice for ${billingReady.length} ready phase${billingReady.length > 1 ? "s" : ""}`,
  });
  return items;
}

// ── Alert strip ───────────────────────────────────────────────────────────────

function AlertStrip({ attn, score }: { attn: AttnResult; score: number }) {
  const band = healthBand(score);
  const st: ZoneState = attn.chainColor === ZCOLOR["critical"] ? "critical"
    : attn.chainColor === ZCOLOR["friction"] ? "friction"
    : attn.chainColor === ZCOLOR["watch"]    ? "watch" : "stable";
  return (
    <div className="esti-av-strip">
      <span className="esti-av-strip__shape" style={{ color: attn.chainColor || "var(--cds-text-primary)" }}>{SHAPE[st]}</span>
      <span className="esti-av-strip__issue">{attn.issue}</span>
      <span className="esti-av-strip__action">→ {attn.action}</span>
      <span className="esti-av-strip__health" style={{ color: band.color || "var(--cds-text-primary)" }}>STATE · {band.label}</span>
    </div>
  );
}

// ── Telemetry gauge ───────────────────────────────────────────────────────────

function TelemGauge({ pct, state, sz = 32 }: { pct: number; state: ZoneState; sz?: number }) {
  const r    = sz * 0.36;
  const cx   = sz / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * Math.min(Math.max(pct / 100, 0), 1);
  return (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}
      style={{ transform: "rotate(-90deg)", flexShrink: 0 }} aria-hidden>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--cds-border-subtle)" strokeWidth="3" />
      {pct > 0 && (
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={ZCOLOR[state]} strokeWidth="3"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      )}
    </svg>
  );
}

// ── Quad cell primitives ──────────────────────────────────────────────────────

// AORMS geometry state language — three shapes, two colours only.
//   ● Handled (white)     — system handling internally, no owner attention
//   ▲ Monitoring (white)  — system monitoring internally
//   ■ Act (interactive)   — AI requesting owner intervention (ONE per dashboard, in evidence)
// StatusSymbol never emits ■: the single Act marker is rendered explicitly in the evidence layer.
const GEO_WORD: Record<string, string> = {
  stable: "Handled",
  info: "Handled",
  watch: "Monitoring",
  friction: "Monitoring",
  critical: "Monitoring",
  inactive: "Handled",
};

function geoGlyph(state: ZoneState | "info" | "inactive"): "●" | "▲" {
  if (state === "stable" || state === "info" || state === "inactive") return "●";
  return "▲"; // watch / friction / critical → monitoring
}

// Three-way shape for flow tasks: ● Running · ▲ Attention · ■ Urgent.
function shapeFor(state?: ZoneState): "●" | "▲" | "■" {
  if (state === "critical") return "■";
  if (state === "watch" || state === "friction") return "▲";
  return "●";
}

// Priority weight for ranking flow tasks (highest first).
const FLOW_PRIORITY: Record<string, number> = { critical: 3, friction: 2, watch: 1, stable: 0, inactive: 0 };
const rankFlow = (a: { state?: ZoneState }, b: { state?: ZoneState }) =>
  (FLOW_PRIORITY[b.state ?? "stable"] ?? 0) - (FLOW_PRIORITY[a.state ?? "stable"] ?? 0);

// The three glyphs have different optical sizes in the font; a per-shape class scales them
// to equal visual height (the circle is drawn smaller, so it gets scaled up).
const GEO_SHAPE_CLASS: Record<string, string> = {
  "●": "esti-geo--circle",
  "▲": "esti-geo--triangle",
  "■": "esti-geo--square",
};

function GeoMark({
  glyph,
  sm,
  act,
  className = "",
  label,
  style,
}: {
  glyph: "●" | "▲" | "■";
  sm?: boolean;
  act?: boolean;
  className?: string;
  label?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`esti-geo ${GEO_SHAPE_CLASS[glyph]}${sm ? " esti-geo--sm" : ""}${act ? " esti-geo--act" : ""}${className ? ` ${className}` : ""}`}
      aria-label={label}
      style={style}
    >
      {glyph}
    </span>
  );
}

function StatusSymbol({ state, label }: { state: ZoneState | "info" | "inactive"; label: string }) {
  return <GeoMark glyph={geoGlyph(state)} label={label || GEO_WORD[state]} />;
}

function MacroHdr({ name, label, nameColor }: { name: string; label: string; nameColor?: string }) {
  return (
    <div className="esti-macro-hdr">
      <span className="esti-macro-hdr__name" style={nameColor ? { color: nameColor || "var(--cds-text-primary)" } : undefined}>{name}</span>
      <span className="esti-macro-hdr__status">{label}</span>
    </div>
  );
}

// ── Detail row (Overview bottom section) ──────────────────────────────────────

function DetailRow({
  ac, ph, ti, canInvoice, canFees, hrEnabled,
}: {
  ac: any; ph: any[]; ti: any[]; canInvoice: boolean; canFees: boolean; hrEnabled: boolean;
}) {
  const pending      = ac?.pendingApprovals  ?? [];
  const overdueInvs  = ac?.overdueInvoices   ?? [];
  const billingReady = ac?.billingReadyPhases ?? [];
  const riskProjects = ph.filter((p: any) => p.health === "RED");
  const overloaded   = ti.filter((m: any) => m.capacity === "OVERLOADED");

  const items = deriveInterventions({
    pendingApprovals: pending, overdueInvoices: overdueInvs,
    riskProjects, overloaded, billingReady, canInvoice,
  });

  return (
    <div className="esti-detail-grid">

      {canInvoice && (
        <div className="esti-detail-cell">
          <div className="esti-detail-hdr">
            <span className="esti-detail-hdr__title">BILLING QUEUE</span>
            {overdueInvs.length > 0 && <Tag type="red" size="sm">{overdueInvs.length} overdue</Tag>}
          </div>
          {overdueInvs.length === 0 && billingReady.length === 0 ? (
            <div className="esti-detail-empty">
              <span style={{ color: "var(--cds-support-success)" }}>●</span> No billing items pending
            </div>
          ) : (
            <>
              {overdueInvs.slice(0,4).map((inv: any) => (
                <div key={inv.id} className="esti-detail-item">
                  <span className="esti-detail-item__ref">{inv.ref}</span>
                  <span className="esti-detail-item__val">{formatINRShort(inv.netReceivablePaise)}</span>
                  <span className="esti-detail-item__tag" style={{ color: "var(--cds-support-error)" }}>{inv.daysOverdue}d</span>
                </div>
              ))}
              {billingReady.length > 0 && (
                <div className="esti-detail-item">
                  <span className="esti-detail-item__ref">Ready to invoice</span>
                  <span className="esti-detail-item__val">{billingReady.length} phases</span>
                  <span className="esti-detail-item__tag" style={{ color: "var(--cds-support-warning)" }}>QUEUE</span>
                </div>
              )}
            </>
          )}
          {canFees && (
            <div style={{ padding: "var(--cds-spacing-04) var(--cds-spacing-05)", borderTop: "1px solid var(--cds-border-subtle)", marginTop: "auto" }}>
              <AiDraftPanel defaultKind="BILLING_ASSISTANT" compact />
            </div>
          )}
        </div>
      )}

      {hrEnabled && (
        <div className="esti-detail-cell">
          <div className="esti-detail-hdr">
            <span className="esti-detail-hdr__title">TEAM CAPACITY</span>
            {overloaded.length > 0 && <Tag type="red" size="sm">{overloaded.length} overloaded</Tag>}
          </div>
          {ti.length === 0
            ? <div className="esti-detail-empty"><InlineLoading description="Loading…" /></div>
            : ti.slice(0,7).map((m: any) => (
                <div key={m.assignee} className="esti-detail-item">
                  <span className="esti-detail-item__ref">{m.assignee}</span>
                  <span className="esti-detail-item__val">{m.totalOpen}</span>
                  <span className="esti-detail-item__tag" style={{ color: LOAD_COLOR[m.capacity] ?? "var(--cds-text-helper)" }}>
                    {CAPACITY_LABEL[m.capacity] ?? m.capacity}
                  </span>
                </div>
              ))
          }
        </div>
      )}

      <div className="esti-detail-cell">
        <div className="esti-detail-hdr">
          <span className="esti-detail-hdr__title">INTERVENTION QUEUE</span>
          {items.length > 0 && <Tag type="red" size="sm">{items.length}</Tag>}
        </div>
        {items.length === 0
          ? <div className="esti-detail-empty"><span style={{ color: "var(--cds-support-success)" }}>●</span> No interventions required</div>
          : items.slice(0,7).map((item) => (
              <div key={item.priority} className="esti-detail-item">
                <span className="esti-label" style={{ color: ZCOLOR[item.severity] || "var(--cds-text-primary)", flexShrink: 0 }}>{SHAPE[item.severity]}</span>
                <span className="esti-detail-item__ref">{item.title}</span>
              </div>
            ))
        }
      </div>

    </div>
  );
}

// ── Quality / Revision row (Overview bottom) ──────────────────────────────────

function QualityRow({ ri }: { ri: any }) {
  if (!ri || ri.totalDecisions === 0) return null;

  const riskColor = ri.revisionRiskBand === "HIGH" ? ZCOLOR["critical"]
    : ri.revisionRiskBand === "MEDIUM" ? ZCOLOR["friction"] : ZCOLOR["stable"];
  const riskType  = ri.revisionRiskBand === "HIGH" ? "red"
    : ri.revisionRiskBand === "MEDIUM" ? "magenta" : "green";

  return (
    <div className="esti-detail-grid esti-detail-grid--3col">
      <div className="esti-detail-cell">
        <div className="esti-detail-hdr">
          <span className="esti-detail-hdr__title">REVISION INTELLIGENCE</span>
          <Tag type={riskType as any} size="sm">{ri.revisionRiskBand} RISK</Tag>
        </div>
        {[
          { ref: "Client Requested",    val: ri.clientDriven  },
          { ref: "Internal Error",      val: ri.internalError },
          { ref: "Technical Query",     val: ri.technicalQuery },
          { ref: "Scope Change",        val: ri.scopeChange   },
        ].map((row) => (
          <div key={row.ref} className="esti-detail-item">
            <span className="esti-detail-item__ref">{row.ref}</span>
            <span className="esti-detail-item__val">{row.val}</span>
          </div>
        ))}
      </div>

      <div className="esti-detail-cell">
        <div className="esti-detail-hdr">
          <span className="esti-detail-hdr__title">QUALITY INDEX</span>
        </div>
        {[
          { ref: "Revision health score", val: ri.healthScore    },
          { ref: "Scope drift",           val: `${ri.scopeDriftPct}%` },
          { ref: "Total decisions",       val: ri.totalDecisions },
        ].map((row) => (
          <div key={row.ref} className="esti-detail-item">
            <span className="esti-detail-item__ref">{row.ref}</span>
            <span className="esti-detail-item__val" style={row.ref === "Revision health score" ? { color: riskColor || "var(--cds-text-primary)" } : undefined}>
              {row.val}
            </span>
          </div>
        ))}
      </div>

      <div className="esti-detail-cell">
        <div className="esti-detail-hdr">
          <span className="esti-detail-hdr__title">ASPRF ENGINE</span>
        </div>
        <div className="esti-detail-empty">
          <span style={{ color: "var(--cds-text-disabled)" }}>○</span>
          Performance metrics — see ASPRF module
        </div>
      </div>
    </div>
  );
}

// ── Cognitive overview primitives ────────────────────────────────────────────

const STATE_LADDER: ZoneState[] = ["inactive", "stable", "watch", "friction", "critical"];
function nextState(s: ZoneState): ZoneState {
  const idx = STATE_LADDER.indexOf(s);
  return (idx > 1 ? STATE_LADDER[idx - 1] : STATE_LADDER[1]) as ZoneState;
}
function stateTagType(s: ZoneState): string {
  return s === "critical" ? "red" : s === "friction" ? "orange" : s === "watch" ? "yellow" : "green";
}

function zoneTagType(s: ZoneState): "red" | "purple" | "blue" | "green" | "gray" {
  if (s === "critical") return "red";
  if (s === "friction") return "purple";
  if (s === "watch") return "blue";
  if (s === "stable") return "green";
  return "gray";
}

// ── Cognitive load protection helpers ─────────────────────────────────────────

// Neutral by design — recovery readout stays white, not colour-coded.
function calmnessColor(_score: number): string {
  return "var(--cds-text-primary)";
}

function focusContext(items: any[]): string {
  const hasCritical = items.some((i: any) => i.severity === "critical");
  if (hasCritical) return "This needs owner attention now.";
  const h = new Date().getHours();
  if (h < 10) return "Plan this into the day before work spreads.";
  if (h < 13) return "Handle this before midday.";
  if (h < 17) return "Close this before end of day.";
  return "This remains the useful action for today.";
}

function calmnessLabel(score: number): string {
  if (score >= 88) return "Everything under control";
  if (score >= 72) return "Operations running smoothly";
  if (score >= 55) return "Small delays detected";
  if (score >= 38) return "Dependencies slowing progress";
  return "Multiple workflows blocked";
}

type SignalCopy = {
  value: string;
  detail: string;
};

function officeSignal(state: ZoneState): SignalCopy {
  if (state === "stable") return { value: "Stable", detail: "The office is under control." };
  if (state === "watch") return { value: "Minor friction", detail: "A few items may slow the day." };
  if (state === "friction") return { value: "Needs attention", detail: "Dependencies are slowing progress." };
  if (state === "critical") return { value: "Recovery required", detail: "Several workflows need owner attention." };
  return { value: "Reviewing", detail: "The system is still reading office signals." };
}

function clientSignal(state: ZoneState): SignalCopy {
  if (state === "stable") return { value: "Responsive", detail: "Client communication is healthy." };
  if (state === "watch") return { value: "Waiting", detail: "A normal client response is pending." };
  if (state === "friction") return { value: "Approval blocking", detail: "A client decision is affecting progress." };
  if (state === "critical") return { value: "Escalate today", detail: "A follow-up is needed to unblock work." };
  return { value: "No client signal", detail: "Client activity is not available yet." };
}

function financeSignal(state: ZoneState): SignalCopy {
  if (state === "stable") return { value: "Cash flow stable", detail: "Billing is moving normally." };
  if (state === "watch") return { value: "Follow-up pending", detail: "A payment reminder is recommended." };
  if (state === "friction") return { value: "Recovery delayed", detail: "The billing cycle is slowing down." };
  if (state === "critical") return { value: "Recover payment", detail: "Payment recovery needs attention today." };
  return { value: "Finance restricted", detail: "Finance signals are not available for this role." };
}

function projectSignal(state: ZoneState): SignalCopy {
  if (state === "stable") return { value: "On track", detail: "Project delivery is moving normally." };
  if (state === "watch") return { value: "Starting to slow", detail: "Early delay signals are appearing." };
  if (state === "friction") return { value: "Waiting on dependency", detail: "A blocker is slowing project progress." };
  if (state === "critical") return { value: "Intervention needed", detail: "A project is stalled and needs review." };
  return { value: "No project signal", detail: "No active project signal is available." };
}

function teamSignal(state: ZoneState): SignalCopy {
  if (state === "stable") return { value: "Workload balanced", detail: "Team capacity is distributed well." };
  if (state === "watch") return { value: "Team is busy", detail: "Workload is increasing but manageable." };
  if (state === "friction") return { value: "Load is uneven", detail: "Reallocation is recommended." };
  if (state === "critical") return { value: "Team bottlenecked", detail: "Overload is blocking progress." };
  return { value: "No team signal", detail: "Team capacity data is not available." };
}

function domainSignal(domain: string, state: ZoneState): SignalCopy {
  if (domain === "client" || domain === "approval") return clientSignal(state);
  if (domain === "finance") return financeSignal(state);
  if (domain === "project") return projectSignal(state);
  if (domain === "team") return teamSignal(state);
  return officeSignal(state);
}

function preparedSignal(state: ZoneState, hasAction: boolean): SignalCopy {
  if (state === "stable" && !hasAction) return { value: "Ready for today", detail: "Everything important is arranged." };
  if (state === "stable") return { value: "Priorities arranged", detail: "The day has a clear order." };
  if (state === "watch") return { value: "Review in progress", detail: "The system is processing new updates." };
  return { value: "Needs review", detail: "Human judgment is recommended before proceeding." };
}

function forecastSignal(value: number): string {
  if (value >= 78) return "Action required";
  if (value >= 58) return "Review recommended";
  if (value >= 36) return "Watch only";
  return "Moving normally";
}

function effortLabel(item: any): string {
  const steps = Array.isArray(item?.howTo) ? item.howTo.length : 0;
  if (cognitionState(item?.severity) === "critical") return "Owner attention";
  if (steps <= 2) return "Quick action";
  return "Focused review";
}

function actionOutcome(item: any): string {
  const source = item?.source ?? "";
  if (source === "finance") return "Billing can resume and cash-flow pressure should reduce.";
  if (source === "approval" || source === "client") return "The project team can continue without waiting on the client.";
  if (source === "team") return "Work moves away from overloaded people and delivery risk reduces.";
  if (source === "project") return "The project has a clearer recovery path and owner.";
  return "The office should return to a calmer operating state.";
}

function cognitionState(severity?: string): ZoneState {
  return severity === "critical" || severity === "friction" || severity === "watch" || severity === "stable" || severity === "inactive"
    ? severity
    : "inactive";
}

type DashboardInterventionAction =
  | "complete-overdue-tasks"
  | "rebalance-team-load"
  | "clear-stale-approvals"
  | "settle-overdue-invoices"
  | "close-critical-notes"
  | "stabilize-office";

function interventionAction(id?: string): DashboardInterventionAction {
  if (id === "finance-recovery") return "settle-overdue-invoices";
  if (id === "approval-escalation") return "clear-stale-approvals";
  if (id === "project-owner-review") return "complete-overdue-tasks";
  if (id === "team-load-redistribution") return "rebalance-team-load";
  if (id === "client-project-causal-chain") return "stabilize-office";
  return "stabilize-office";
}

function forecastPct(score: number | undefined, signal = 0): number {
  const base = score == null ? 50 : 100 - score;
  return Math.max(4, Math.min(96, Math.round(base + signal)));
}

function recoveryForecast(score: number, interventions: any[]): number {
  const lift = interventions
    .slice(0, 3)
    .reduce((sum: number, item: any) => sum + Number(item.impactPct ?? 6), 0);
  return Math.max(score, Math.min(96, Math.round(score + lift)));
}

function meetingAwareness(meetings: any[]): { label: string; detail: string; state: ZoneState } {
  const next = meetings[0];
  if (!next) {
    return { label: "OPEN", detail: "No meeting lock active", state: "stable" };
  }
  const days = Number(next.daysUntil ?? 999);
  if (days <= 0) {
    return { label: "FOCUS MODE", detail: `${next.projectRef ?? "Meeting"} today`, state: "watch" };
  }
  if (days === 1) {
    return { label: "PREP", detail: `${next.projectRef ?? "Meeting"} tomorrow`, state: "watch" };
  }
  return { label: "AWARE", detail: `${meetings.length} meeting signals`, state: "stable" };
}

function domainLabel(domain?: string): string {
  if (domain === "finance") return "FINANCE";
  if (domain === "client") return "CLIENT";
  if (domain === "project") return "PROJECT";
  if (domain === "team") return "TEAM";
  if (domain === "approval") return "APPROVAL";
  return "OFFICE";
}

function taskHref(taskId?: string | null, projectId?: string | null): string {
  const params = new URLSearchParams({ tab: "tasks" });
  if (taskId) params.set("taskId", taskId);
  if (projectId) params.set("projectId", projectId);
  return `/tasks?${params.toString()}`;
}

function projectIssueHref(p: any): string {
  if (p.focusTaskId) return taskHref(p.focusTaskId, p.id);
  if (p.focusInvoiceId) return `/projects/${p.id}?tab=invoices&invoiceId=${p.focusInvoiceId}`;
  if (p.focusApprovalId) return `/projects/${p.id}?tab=approvals&approvalId=${p.focusApprovalId}`;
  if ((p.overdueInvoices ?? 0) > 0) return `/projects/${p.id}?tab=invoices`;
  if ((p.staleApprovals ?? 0) > 0) return `/projects/${p.id}?tab=approvals`;
  return `/projects/${p.id}?tab=overview`;
}

function fallbackCognitiveInterventions(input: {
  pendingCount: number;
  maxWaitDays: number;
  overduePaise: number;
  billingReadyCount: number;
  meetingCount: number;
  riskProjects: number;
  delayedProjects: number;
  overloadedCount: number;
}): any[] {
  const items: any[] = [];
  if (input.meetingCount > 0 && (input.pendingCount > 0 || input.riskProjects > 0 || input.delayedProjects > 0)) {
    items.push({
      id: "meeting-focus-prep",
      source: "project",
      severity: "watch",
      recoveryLevel: 1,
      impactPct: 7,
      title: "Prepare meeting context before switching attention",
      suggestedAction: "Review only meeting-relevant project notes, approvals, and blockers before the next meeting.",
      howTo: ["Open the meeting project evidence.", "Read unresolved blockers only.", "Hide finance and HR items until the meeting is complete."],
      confidence: 0.76,
      riskIfIgnored: "Unrelated operational pressure can create attentional residue before the meeting.",
    });
  }
  if (input.maxWaitDays > 7 || input.pendingCount >= 2) {
    items.push({
      id: "approval-escalation",
      source: "approval",
      severity: input.maxWaitDays > 14 ? "critical" : "friction",
      recoveryLevel: 1,
      impactPct: input.maxWaitDays > 14 ? 14 : 10,
      title: "Escalate stale client approvals",
      suggestedAction: "Clear the oldest waiting approvals first so project and billing pressure can reduce.",
      howTo: ["Open client approvals.", "Send one decision-focused escalation.", "Record the response or escalation outcome."],
      confidence: 0.78,
      riskIfIgnored: "Client response delay will keep project and billing signals under pressure.",
    });
  }
  if (input.overduePaise > 0) {
    items.push({
      id: "finance-recovery",
      source: "finance",
      severity: input.overduePaise > 5_000_000 ? "critical" : "friction",
      recoveryLevel: 4,
      impactPct: input.overduePaise > 5_000_000 ? 16 : 10,
      title: "Run collection recovery on overdue invoices",
      suggestedAction: "Recover overdue invoice status after client follow-up is complete.",
      howTo: ["Open billing evidence.", "Follow up on the overdue invoice reference.", "Mark recovered invoices as paid."],
      confidence: 0.74,
      riskIfIgnored: "Aging receivables will continue to lower office calmness.",
    });
  }
  if (input.overloadedCount > 0) {
    items.push({
      id: "team-load-redistribution",
      source: "team",
      severity: input.overloadedCount > 2 ? "critical" : "friction",
      recoveryLevel: 2,
      impactPct: input.overloadedCount > 2 ? 15 : 9,
      title: "Redistribute overloaded staff tasks",
      suggestedAction: "Move overdue or overloaded work to the most available active team member.",
      howTo: ["Find the most overloaded assignee.", "Move selected overdue tasks.", "Review the new workload before stand-up."],
      confidence: 0.72,
      riskIfIgnored: "Work will stay concentrated around overloaded people and project health will degrade.",
    });
  }
  if (input.riskProjects > 0 || input.delayedProjects > 0) {
    items.push({
      id: "project-owner-review",
      source: "project",
      severity: input.riskProjects > 2 ? "critical" : "friction",
      recoveryLevel: 5,
      impactPct: input.riskProjects > 2 ? 16 : 11,
      title: "Run owner review for delayed projects",
      suggestedAction: "Close completed overdue tasks and assign one recovery owner for remaining blockers.",
      howTo: ["Open red project evidence.", "Close already-finished overdue tasks.", "Assign one owner to the recovery path."],
      confidence: 0.7,
      riskIfIgnored: "Schedule pressure will move from preventive recovery into correction.",
    });
  }
  if (input.billingReadyCount > 0) {
    items.push({
      id: "billing-ready",
      source: "finance",
      severity: "watch",
      recoveryLevel: 4,
      impactPct: 6,
      title: "Convert billing-ready phases into invoices",
      suggestedAction: "Turn completed phases into invoices before they become hidden finance load.",
      howTo: ["Review ready-to-bill phases.", "Confirm scope completion.", "Generate and send invoices."],
      confidence: 0.72,
      riskIfIgnored: "Earned work remains outside the receivables pipeline.",
    });
  }
  const rank = { critical: 3, friction: 2, watch: 1 };
  return items.sort((a, b) => rank[b.severity as keyof typeof rank] - rank[a.severity as keyof typeof rank] || b.impactPct - a.impactPct).slice(0, 6);
}

function CognitiveAskAi() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const generate = trpc.ai.generate.useMutation({
    onSuccess: (res) => setAnswer(res.output),
    onError: (err) => setAnswer(`Could not answer: ${err.message}`),
  });

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const q = prompt.trim();
    if (!q || generate.isPending) return;
    setAnswer("");
    generate.mutate({ kind: "SUMMARY", mode: "agent", prompt: q });
  }

  return (
    <form className="esti-cognitive-ask" onSubmit={submit}>
      <TextInput
        id="aorms-dashboard-ask-ai"
        labelText="Ask AORMS AI"
        hideLabel
        size="sm"
        placeholder="Ask why a project is delayed, who is overloaded, or which client is blocking billing"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={generate.isPending}
      />
      <Button
        type="submit"
        size="sm"
        kind="primary"
        renderIcon={Send}
        iconDescription="Ask"
        hasIconOnly
        disabled={!prompt.trim() || generate.isPending}
      />
      {(generate.isPending || answer) && (
        <div className="esti-cognitive-ask__answer">
          {generate.isPending ? <InlineLoading description="Thinking..." /> : answer}
        </div>
      )}
    </form>
  );
}

function CognitiveEvidence({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ ref: string; val?: string; tag?: string; state?: ZoneState; href?: string; act?: boolean }>;
}) {
  return (
    <div className="esti-cognitive-evidence">
      <div className="esti-cognitive-section-title">{title}</div>
      {items.length === 0 ? (
        <div className="esti-detail-empty">
          <GeoMark sm glyph="●" /> {empty}
        </div>
      ) : items.slice(0, 5).map((item, i) => {
        const content = (
          <>
            <span className="esti-detail-item__ref">
              <GeoMark sm glyph={shapeFor(item.state)} />{" "}
              {item.ref}
            </span>
            {item.val && <span className="esti-detail-item__val">{item.val}</span>}
            {item.tag && (
              <span className="esti-detail-item__tag" style={{ color: "var(--cds-text-secondary)" }}>
                {item.tag}
              </span>
            )}
          </>
        );
        return item.href ? (
          <Link key={`${item.ref}-${i}`} to={item.href} className="esti-detail-item esti-detail-item--link">
            {content}
          </Link>
        ) : (
          <div key={`${item.ref}-${i}`} className="esti-detail-item">
            {content}
          </div>
        );
      })}
    </div>
  );
}

// ── OVERVIEW TAB — cognitive command flow ────────────────────────────────────

function ScreenOverview({
  home, fh, ac, ph, ti, canInvoice, hrEnabled,
}: {
  home: any; fh: any; ac: any; ph: any[]; ti: any[]; att: any; ri: any;
  canInvoice: boolean; hrEnabled: boolean;
}) {
  const pending      = ac?.pendingApprovals   ?? [];
  const pendingCount = pending.length;
  const maxWaitDays  = pendingCount > 0 ? Math.max(...pending.map((a: any) => a.daysWaiting ?? 0)) : 0;
  const billingReady = ac?.billingReadyPhases  ?? [];
  const overdueInvs  = ac?.overdueInvoices      ?? [];
  const overduePaise = fh?.overdue30dPaise ?? 0;
  const riskProjects = ph.filter((p: any) => p.health === "RED");
  const overloaded   = ti.filter((m: any) => m.capacity === "OVERLOADED");

  const cs = clientState(pendingCount, maxWaitDays);
  const fs = financeState(fh?.outstandingPaise ?? 0, overduePaise, canInvoice);
  const ps = projectState(ph.length, riskProjects.length);
  const ts = teamState(overloaded.length, ti.length, hrEnabled);

  const office = home?.cognition?.office;
  const score  = office?.score ?? officeHealth(cs, fs, ps, ts);
  const attn   = deriveAttn({ cs, fs, ps, ts, pendingCount, maxWaitDays, riskProjects, overduePaise, billingReadyCount: billingReady.length, overloadedCount: overloaded.length });
  const officeState: ZoneState =
    cognitionState(office?.severity) !== "inactive"
      ? cognitionState(office?.severity)
      : attn.chainColor === ZCOLOR["critical"] ? "critical"
      : attn.chainColor === ZCOLOR["friction"] ? "friction"
      : attn.chainColor === ZCOLOR["watch"] ? "watch" : "stable";

  const backendInterventions = home?.cognition?.interventions ?? [];
  const interventions = backendInterventions.length > 0
    ? backendInterventions
    : fallbackCognitiveInterventions({
        pendingCount, maxWaitDays, overduePaise,
        billingReadyCount: billingReady.length,
        meetingCount: (ac?.meetingFocus ?? []).length,
        riskProjects: riskProjects.length,
        delayedProjects: ph.filter((p: any) => (p.overdueTasks ?? 0) > 0).length,
        overloadedCount: overloaded.length,
      });
  const primary = interventions[0];

  // Active Pressures — max 3, highest impact first (the shell caps + places the one ■).
  const pressures: Pressure[] = interventions.slice(0, 3).map((item: any) => ({
    domain: domainLabel(item.source),
    issue: item.title,
    impact: item.riskIfIgnored,
    action: item.suggestedAction ?? "Review and act.",
    state: cognitionState(item.severity),
  }));

  // Register snapshot — plain counts, no charts (spec §7).
  const tasksOverdue = ph.reduce((s: number, p: any) => s + (p.overdueTasks ?? 0), 0);
  const teamLoadPct  = ti.length > 0 ? Math.round(ti.reduce((s: number, m: any) => s + loadPct(m.capacity), 0) / ti.length) : 0;
  const snapshot: SnapshotRow[] = [
    { label: "Projects Active",   value: ph.length },
    { label: "Invoices Pending",  value: overdueInvs.length, state: overdueInvs.length > 0 ? "friction" : "stable" },
    { label: "Approvals Pending", value: pendingCount,       state: pendingCount > 0 ? "watch" : "stable" },
    { label: "Tasks Overdue",     value: tasksOverdue,       state: tasksOverdue > 0 ? "friction" : "stable" },
    ...(hrEnabled
      ? [{ label: "Team Load", value: `${teamLoadPct}%`, state: (teamLoadPct > 85 ? "friction" : teamLoadPct > 70 ? "watch" : "stable") as ZoneState }]
      : []),
  ];

  // Evidence — the facts behind the signal.
  const evidenceRows: EvidenceRow[] = [
    ...overdueInvs.slice(0, 2).map((inv: any) => ({
      fact: `Overdue invoice ${inv.ref}`,
      value: formatINRShort(inv.netReceivablePaise),
      state: "critical" as ZoneState,
      age: `${inv.daysOverdue}d`,
      href: `/projects/${inv.projectId}?tab=invoices&invoiceId=${inv.id}`,
    })),
    ...pending.slice(0, 2).map((ap: any) => ({
      fact: `${ap.projectRef} — ${ap.title}`,
      state: (ap.daysWaiting > 14 ? "critical" : "friction") as ZoneState,
      age: `${ap.daysWaiting}d`,
      href: `/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`,
    })),
    ...riskProjects.slice(0, 2).map((p: any) => ({
      fact: `${p.ref} at delivery risk`,
      value: p.title,
      state: "critical" as ZoneState,
      href: projectIssueHref(p),
    })),
  ];

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Studio Abstract" state={officeState} signal={officeSignal(officeState).detail} />}
      currentState={
        <CurrentStateBlock
          condition={officeSignal(officeState).value}
          state={officeState}
          band={healthBand(score).label}
          balancePct={score}
          signal={attn.issue}
        />
      }
      activePressures={<ActivePressureList pressures={pressures} />}
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={<EvidenceActionBlock cause={attn.issue} action={attn.action} rows={evidenceRows} />}
      observation={
        <EstiObservationPanel
          observation={`${calmnessLabel(score)}. ${officeSignal(officeState).detail}`}
          action={primary?.suggestedAction ?? "Review weekly performance and plan the next sprint."}
        />
      }
    />
  );
}

// ── PROJECTS TAB ──────────────────────────────────────────────────────────────

function ScreenProjects({
  ph, ti, canInvoice,
}: {
  ph: any[]; ti: any[]; att: any; billingReady: any[]; canInvoice: boolean;
}) {
  const risk    = ph.filter((p: any) => p.health === "RED");
  const watch   = ph.filter((p: any) => p.health === "YELLOW");
  const delayed = ph.filter((p: any) => (p.overdueTasks ?? 0) > 0).length;
  const stale   = ph.reduce((s: number, p: any) => s + (p.staleApprovals ?? 0), 0);
  const state   = projectState(ph.length, risk.length);
  const overloaded = ti.filter((m: any) => m.capacity === "OVERLOADED").length;

  const pressures: Pressure[] = risk.slice(0, 3).map((p: any) => ({
    domain: "Project",
    issue: `${p.ref} — ${p.title}`,
    impact:
      [
        p.overdueTasks > 0 ? `${p.overdueTasks} late tasks` : null,
        p.staleApprovals > 0 ? `${p.staleApprovals} stale approvals` : null,
        canInvoice && p.overdueInvoices > 0 ? `${p.overdueInvoices} invoices overdue` : null,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
    action: "Owner review — clear the blocker on the critical path",
    state: "critical",
    href: projectIssueHref(p),
  }));

  const snapshot: SnapshotRow[] = [
    { label: "Projects Active", value: ph.length },
    { label: "Delayed Projects", value: delayed, state: delayed > 0 ? "friction" : "stable" },
    { label: "Critical Projects", value: risk.length, state: risk.length > 0 ? "critical" : "stable" },
    { label: "Watch Projects", value: watch.length, state: watch.length > 0 ? "watch" : "stable" },
    { label: "Stale Approvals", value: stale, state: stale > 0 ? "friction" : "stable" },
  ];

  const evidenceRows: EvidenceRow[] = [...risk, ...watch].slice(0, 6).map((p: any) => ({
    fact: `${p.ref} — ${p.title}`,
    value: p.currentPhase ?? undefined,
    state: (p.health === "RED" ? "critical" : "watch") as ZoneState,
    age: `${p.progressPct ?? 0}%`,
    href: projectIssueHref(p),
  }));

  const observation =
    risk.length > 0
      ? `${risk.length} project${risk.length > 1 ? "s are" : " is"} at delivery risk${overloaded > 0 ? `, with ${overloaded} member${overloaded > 1 ? "s" : ""} overloaded` : ""}.`
      : "Delivery is on track across the active portfolio.";

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Project Abstract" state={state} signal={`${ph.length} active · ${risk.length} critical · ${watch.length} watch`} />}
      currentState={
        <CurrentStateBlock
          condition={projectSignal(state).value}
          state={state}
          band={`${delayed} delayed`}
          balancePct={projectHealthPct(ph.length, risk.length, delayed)}
          signal={projectSignal(state).detail}
        />
      }
      activePressures={<ActivePressureList pressures={pressures} />}
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={
        <EvidenceActionBlock
          cause={risk.length > 0 ? `${risk.length} project${risk.length > 1 ? "s" : ""} at delivery risk` : undefined}
          action="Clear the blocker on each critical path before delivery deadlines."
          rows={evidenceRows}
          empty="No projects at risk. Delivery on track."
        />
      }
      observation={
        <EstiObservationPanel
          observation={observation}
          action={risk.length > 0 ? "Assign one recovery owner per critical project." : undefined}
        />
      }
    />
  );
}

// ── FINANCE TAB ───────────────────────────────────────────────────────────────

function ScreenFinance({
  fh, ac, canInvoice,
}: {
  fh: any; ac: any; canInvoice: boolean; canFees: boolean; home: any;
}) {
  if (!canInvoice) {
    return (
      <Grid fullWidth className="esti-abstract">
        <Column lg={16} md={8} sm={4}>
          <Tile>
            <Stack gap={3}>
              <span className="esti-label--secondary">Finance data requires the invoice:manage permission.</span>
            </Stack>
          </Tile>
        </Column>
      </Grid>
    );
  }

  const overdueInvs  = ac?.overdueInvoices    ?? [];
  const billingReady = ac?.billingReadyPhases ?? [];
  const gst          = gstStatus();
  const outstanding  = fh?.outstandingPaise ?? 0;
  const overdue      = fh?.overdue30dPaise  ?? 0;
  const ready        = fh?.readyToBillPaise ?? 0;
  const state        = financeState(outstanding, overdue, canInvoice);

  const pressures: Pressure[] = [
    ...overdueInvs.slice(0, 2).map((inv: any) => ({
      domain: "Finance",
      issue: `Overdue invoice ${inv.ref}`,
      impact: `${formatINRShort(inv.netReceivablePaise)} · ${inv.daysOverdue}d`,
      action: "Contact the client on the overdue payment before the billing cycle closes.",
      state: (inv.daysOverdue > 30 ? "critical" : "friction") as ZoneState,
      href: `/projects/${inv.projectId}?tab=invoices&invoiceId=${inv.id}`,
    })),
    ...(billingReady.length > 0
      ? [{
          domain: "Finance",
          issue: `${billingReady.length} phase${billingReady.length > 1 ? "s" : ""} ready to invoice`,
          impact: ready > 0 ? formatINRShort(ready) : undefined,
          action: "Convert billing-ready phases into invoices.",
          state: "watch" as ZoneState,
          href: "/invoices",
        }]
      : []),
  ];

  const snapshot: SnapshotRow[] = [
    { label: "Receivables", value: formatINRShort(outstanding) },
    { label: "Overdue Invoices", value: overdueInvs.length, state: overdueInvs.length > 0 ? "critical" : "stable" },
    { label: "Billing Ready", value: formatINRShort(ready), state: ready > 0 ? "watch" : "stable" },
    { label: "Ready Phases", value: billingReady.length },
    { label: "GST Status", value: gst.label, state: gst.state },
  ];

  const evidenceRows: EvidenceRow[] = overdueInvs.slice(0, 6).map((inv: any) => ({
    fact: `Overdue invoice ${inv.ref}`,
    value: formatINRShort(inv.netReceivablePaise),
    state: (inv.daysOverdue > 30 ? "critical" : "friction") as ZoneState,
    age: `${inv.daysOverdue}d`,
    href: `/projects/${inv.projectId}?tab=invoices&invoiceId=${inv.id}`,
  }));

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Financial Abstract" state={state} signal={`${formatINRShort(outstanding)} receivable · ${overdueInvs.length} overdue`} />}
      currentState={
        <CurrentStateBlock
          condition={financeSignal(state).value}
          state={state}
          band={overdue > 0 ? `${formatINRShort(overdue)} overdue 30d+` : "No overdue"}
          balancePct={financeHealthPct(outstanding, overdue, canInvoice)}
          signal={financeSignal(state).detail}
        />
      }
      activePressures={<ActivePressureList pressures={pressures} />}
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={
        <EvidenceActionBlock
          cause={overdue > 0 ? `${formatINRShort(overdue)} in receivables is 30+ days overdue` : undefined}
          action="Recover overdue invoices before generating the next billing set."
          rows={evidenceRows}
          empty="No invoices overdue. Collections on track."
        />
      }
      observation={
        <EstiObservationPanel
          observation={financeSignal(state).detail}
          action={ready > 0 ? "Bill the ready phases so earned work enters the receivables pipeline." : undefined}
        />
      }
    />
  );
}

// ── TEAM TAB ──────────────────────────────────────────────────────────────────

function ScreenTeam({
  ti, att, hrEnabled,
}: {
  ti: any[]; att: any; hrEnabled: boolean;
}) {
  if (!hrEnabled) {
    return (
      <Grid fullWidth className="esti-abstract">
        <Column lg={16} md={8} sm={4}>
          <Tile>
            <Stack gap={3}>
              <span className="esti-label--secondary">Team module requires HR to be enabled in settings.</span>
            </Stack>
          </Tile>
        </Column>
      </Grid>
    );
  }

  const overloaded = ti.filter((m: any) => m.capacity === "OVERLOADED");
  const teamLoadPct = ti.length > 0 ? Math.round(ti.reduce((s: number, m: any) => s + loadPct(m.capacity), 0) / ti.length) : 0;
  const state = teamState(overloaded.length, ti.length, hrEnabled);

  const pressures: Pressure[] = overloaded.slice(0, 3).map((m: any) => ({
    domain: "Team",
    issue: `${m.assignee} is overloaded`,
    impact: `${m.totalOpen} open · ${m.overdueCount ?? 0} late`,
    action: "Redistribute overdue work to an available member.",
    state: "critical",
    href: taskHref(m.focusTaskId, m.focusProjectId),
  }));

  const snapshot: SnapshotRow[] = [
    { label: "Present Today", value: att?.present ?? "—" },
    { label: "Absent Today", value: att ? `${att.absent}/${att.headcount}` : "—" },
    { label: "WFH Today", value: att?.wfh ?? "—" },
    { label: "Overloaded Members", value: overloaded.length, state: overloaded.length > 0 ? "critical" : "stable" },
    { label: "Team Load", value: `${teamLoadPct}%`, state: teamLoadPct > 85 ? "friction" : teamLoadPct > 70 ? "watch" : "stable" },
  ];

  const evidenceRows: EvidenceRow[] = ti.slice(0, 6).map((m: any) => ({
    fact: m.assignee,
    value: `${m.totalOpen} open`,
    state: (m.capacity === "OVERLOADED" ? "critical" : m.capacity === "BUSY" ? "watch" : "stable") as ZoneState,
    age: CAPACITY_LABEL[m.capacity] ?? m.capacity,
    href: taskHref(m.focusTaskId, m.focusProjectId),
  }));

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Team Abstract" state={state} signal={`${ti.length} members · ${overloaded.length} overloaded`} />}
      currentState={
        <CurrentStateBlock
          condition={teamSignal(state).value}
          state={state}
          band={`${teamLoadPct}% load`}
          balancePct={100 - teamLoadPct}
          signal={teamSignal(state).detail}
        />
      }
      activePressures={<ActivePressureList pressures={pressures} />}
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={
        <EvidenceActionBlock
          cause={overloaded.length > 0 ? `${overloaded.length} member${overloaded.length > 1 ? "s" : ""} overloaded` : undefined}
          action="Move overdue work away from overloaded members before stand-up."
          rows={evidenceRows}
          empty="No team data available."
        />
      }
      observation={
        <EstiObservationPanel
          observation={teamSignal(state).detail}
          action={overloaded.length > 0 ? "Rebalance the workload to protect delivery." : undefined}
        />
      }
    />
  );
}

// ── APPROVALS TAB ─────────────────────────────────────────────────────────────

function ScreenApprovals({ ac }: { ac: any; home: any }) {
  const pending      = ac?.pendingApprovals ?? [];
  const pendingCount = pending.length;
  const maxWait      = pendingCount > 0 ? Math.max(...pending.map((a: any) => a.daysWaiting ?? 0)) : 0;
  const stale        = pending.filter((a: any) => (a.daysWaiting ?? 0) > 10).length;
  const state        = clientState(pendingCount, maxWait);

  const pressures: Pressure[] = pending
    .filter((a: any) => (a.daysWaiting ?? 0) > 10)
    .slice(0, 3)
    .map((ap: any) => ({
      domain: "Approval",
      issue: `${ap.projectRef} — ${ap.title}`,
      impact: `waiting ${ap.daysWaiting}d`,
      action: "Escalate the decision so project and billing can move.",
      state: (ap.daysWaiting > 14 ? "critical" : "friction") as ZoneState,
      href: `/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`,
    }));

  const snapshot: SnapshotRow[] = [
    { label: "Approvals Pending", value: pendingCount, state: pendingCount > 0 ? "watch" : "stable" },
    { label: "Stale (>10d)", value: stale, state: stale > 0 ? "friction" : "stable" },
    { label: "Oldest Wait", value: `${maxWait}d`, state: maxWait > 14 ? "critical" : maxWait > 7 ? "friction" : "stable" },
  ];

  const evidenceRows: EvidenceRow[] = pending.slice(0, 6).map((ap: any) => ({
    fact: `${ap.projectRef} — ${ap.title}`,
    state: (ap.daysWaiting > 14 ? "critical" : ap.daysWaiting > 7 ? "friction" : "watch") as ZoneState,
    age: `${ap.daysWaiting}d`,
    href: `/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`,
  }));

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Approval Register" state={state} signal={`${pendingCount} pending · oldest ${maxWait}d`} />}
      currentState={
        <CurrentStateBlock
          condition={clientSignal(state).value}
          state={state}
          band={stale > 0 ? `${stale} stale` : "None stale"}
          balancePct={clientHealthPct(pendingCount, maxWait, stale)}
          signal={clientSignal(state).detail}
        />
      }
      activePressures={<ActivePressureList pressures={pressures} />}
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={
        <EvidenceActionBlock
          cause={stale > 0 ? `${stale} approval${stale > 1 ? "s" : ""} waiting over 10 days` : undefined}
          action="Clear the oldest waiting approvals first."
          rows={evidenceRows}
          empty="No approvals pending. All client responses received."
        />
      }
      observation={
        <EstiObservationPanel
          observation={clientSignal(state).detail}
          action={pendingCount > 0 ? "One decision-focused escalation per stale approval." : undefined}
        />
      }
    />
  );
}

// ── REPORTS TAB ───────────────────────────────────────────────────────────────

function ScreenReports({ fh, ph, ri, canInvoice }: {
  fh: any; ph: any[]; ri: any; canInvoice: boolean; home: any;
}) {
  const red      = ph.filter((p: any) => p.health === "RED").length;
  const delayed  = ph.filter((p: any) => (p.overdueTasks ?? 0) > 0).length;
  const gst      = gstStatus();

  // Report & export center — utility-driven, no pressure section (spec §8.7).
  const snapshot: SnapshotRow[] = [
    { label: "Projects", value: ph.length },
    { label: "At Risk", value: red, state: red > 0 ? "critical" : "stable" },
    { label: "Delayed", value: delayed, state: delayed > 0 ? "friction" : "stable" },
    ...(canInvoice ? [{ label: "Receivables", value: formatINRShort(fh?.outstandingPaise ?? 0) }] : []),
    { label: "Revisions", value: ri?.totalDecisions ?? 0 },
    { label: "GST Status", value: gst.label, state: gst.state },
  ];

  const evidenceRows: EvidenceRow[] = [
    ...(canInvoice ? [{ fact: "GST / TDS filing abstracts", state: "stable" as ZoneState, href: "/filing" }] : []),
    { fact: "Team performance", state: "stable", href: "/performance" },
    { fact: "Office activity log", state: "stable", href: "/tasks?tab=activity" },
  ];

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Summary Sheets" state="stable" signal="Report & export center" />}
      currentState={
        <CurrentStateBlock
          condition="Reports ready"
          state="stable"
          band={`${ph.length} projects`}
          balancePct={100}
          signal="Delivery, financial and revision summaries are up to date."
        />
      }
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={<EvidenceActionBlock action="Open a report to review or export." rows={evidenceRows} empty="No reports available." />}
      observation={<EstiObservationPanel observation="A calm, utility screen — no action pressure. Open a report when you need to review or export." />}
    />
  );
}

// ── ACTIVITY TAB ──────────────────────────────────────────────────────────────

function relTime(input: string | Date): string {
  const t = new Date(input).getTime();
  if (Number.isNaN(t)) return "";
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function ScreenActivity() {
  const q = trpc.activity.listOffice.useQuery({ limit: 30, visibility: "STAFF" }, { staleTime: 30_000 });
  const rows = q.data?.rows ?? [];
  const userActions  = rows.filter((a) => a.actorName).length;
  const systemEvents = rows.length - userActions;

  // Audit / activity trail — record history, not an action center (spec §8.8).
  const snapshot: SnapshotRow[] = [
    { label: "Recent Changes", value: rows.length },
    { label: "User Actions", value: userActions },
    { label: "System Events", value: systemEvents },
  ];

  const evidenceRows: EvidenceRow[] = rows.slice(0, 6).map((a) => ({
    fact: a.summary,
    value: `${a.actorName ?? "System"}${a.projectRef ? ` · ${a.projectRef}` : ""}`,
    state: "stable" as ZoneState,
    age: relTime(a.createdAt),
  }));

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Office Log" state="stable" signal={`${rows.length} recent events`} />}
      currentState={
        <CurrentStateBlock
          condition={q.isLoading ? "Loading…" : "Activity timeline"}
          state="stable"
          band="Record history"
          balancePct={100}
          signal="Immutable audit and activity trail — record history, not an action center."
        />
      }
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={<EvidenceActionBlock rows={evidenceRows} empty="No recent office activity." />}
      observation={<EstiObservationPanel observation="A running record of what changed in the office. No pressure — this is history." />}
    />
  );
}


// ── WORK QUEUE TAB ────────────────────────────────────────────────────────────

function ScreenWorkQueue() {
  const queueQ = trpc.tasks.todayQueue.useQuery({ myTasks: false, limit: 25 }, { staleTime: 30_000 });
  const rows   = queueQ.data ?? [];
  const today  = new Date().toISOString().slice(0, 10);
  const overdue  = rows.filter((t) => t.dueDate && t.dueDate < today).length;
  const dueToday = rows.filter((t) => t.dueDate === today).length;
  const blocked  = rows.filter((t) => t.status === "BLOCKED").length;
  const highPri  = rows.filter((t) => t.priority === "CRITICAL" || t.priority === "HIGH").length;
  const state: ZoneState = blocked > 0 || overdue > 5 ? "friction" : overdue > 0 ? "watch" : "stable";

  const pressures: Pressure[] = rows
    .filter((t) => t.interventionRequired || t.status === "BLOCKED")
    .slice(0, 3)
    .map((t) => ({
      domain: "Work",
      issue: t.title,
      impact: t.projectRef ? `${t.projectRef}${t.dueDate ? ` · due ${t.dueDate}` : ""}` : undefined,
      action: t.status === "BLOCKED" ? "Unblock this task to release dependent project movement." : "Prioritize — intervention required.",
      state: (t.status === "BLOCKED" ? "critical" : "friction") as ZoneState,
      href: taskHref(t.id),
    }));

  const snapshot: SnapshotRow[] = [
    { label: "Open Tasks", value: rows.length },
    { label: "Due Today", value: dueToday, state: dueToday > 0 ? "watch" : "stable" },
    { label: "Overdue", value: overdue, state: overdue > 0 ? "friction" : "stable" },
    { label: "Blocked Tasks", value: blocked, state: blocked > 0 ? "critical" : "stable" },
    { label: "High Priority", value: highPri, state: highPri > 0 ? "watch" : "stable" },
  ];

  const evidenceRows: EvidenceRow[] = rows.slice(0, 6).map((t) => ({
    fact: t.title,
    value: t.projectRef ?? undefined,
    state: (t.status === "BLOCKED" ? "critical" : t.priority === "CRITICAL" || t.priority === "HIGH" ? "friction" : "watch") as ZoneState,
    age: t.dueDate ?? undefined,
    href: taskHref(t.id),
  }));

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Work Register" state={state} signal={`${rows.length} tasks · ${overdue} overdue`} />}
      currentState={
        <CurrentStateBlock
          condition={overdue > 0 ? "Overdue building" : blocked > 0 ? "Blocked work" : "Queue clear"}
          state={state}
          band={`${blocked} blocked`}
          balancePct={rows.length > 0 ? Math.round(((rows.length - overdue) / rows.length) * 100) : 100}
          signal={overdue > 0 ? "Overdue work is accumulating in the queue." : "The work queue is moving normally."}
        />
      }
      activePressures={<ActivePressureList pressures={pressures} />}
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={<EvidenceActionBlock action="Clear blocked and overdue tasks first." rows={evidenceRows} empty="No active tasks in the queue." />}
      observation={
        <EstiObservationPanel
          observation={overdue > 0 || blocked > 0 ? "Blocked and overdue tasks are holding queue movement." : "The execution queue is healthy."}
          action={blocked > 0 ? "Unblock the blocked tasks to release dependent work." : undefined}
        />
      }
    />
  );
}

// ── Studio Abstract shell ─────────────────────────────────────────────────────

export function StudioAbstract() {
  const { user } = useAuth();

  const homeQ     = trpc.dashboard.home.useQuery(undefined, { staleTime: 60_000 });
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;

  const tiQ  = trpc.dashboard.teamIntelligence.useQuery(undefined, { enabled: hrEnabled });
  const attQ = trpc.dashboard.attendanceToday.useQuery(undefined, { enabled: hrEnabled });

  const home = homeQ.data;
  const ac   = home?.actionCenter;
  const fh   = home?.financialHealth ?? null;
  const ph   = home?.projectHealth   ?? [];
  const ri   = home?.revisionIntelligence ?? null;
  const ti   = tiQ.data  ?? [];
  const att  = attQ.data ?? null;

  const canInvoice = can(user?.role, "invoice:manage");
  const canFees    = can(user?.role, "fees:manage");
  const canWrite   = can(user?.role, "write");

  const billingReady = ac?.billingReadyPhases ?? [];

  return (
    <div className="esti-studio-abstract-page">
      <Tabs>
        <TabList aria-label="Studio Abstract navigation">
          <Tab>STUDIO ABSTRACT</Tab>
          <Tab disabled={!canWrite}>LEAD REGISTER</Tab>
          <Tab>PROJECT ABSTRACT</Tab>
          <Tab disabled={!canInvoice}>FINANCIAL ABSTRACT</Tab>
          <Tab disabled={!hrEnabled}>TEAM ABSTRACT</Tab>
          <Tab>WORK REGISTER</Tab>
          <Tab>APPROVAL REGISTER</Tab>
          <Tab>SUMMARY SHEETS</Tab>
          <Tab>OFFICE LOG</Tab>
        </TabList>

        <TabPanels>
          <TabPanel style={{ padding: 0 }}>
            <ScreenOverview
              home={home} fh={fh} ac={ac} ph={ph} ti={ti} att={att} ri={ri}
              canInvoice={canInvoice} hrEnabled={hrEnabled}
            />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            {canWrite ? <Leads /> : null}
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenProjects ph={ph} ti={ti} att={att} billingReady={billingReady} canInvoice={canInvoice} />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenFinance fh={fh} ac={ac} canInvoice={canInvoice} canFees={canFees} home={home} />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenTeam ti={ti} att={att} hrEnabled={hrEnabled} />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenWorkQueue />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenApprovals ac={ac} home={home} />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenReports fh={fh} ph={ph} ri={ri} canInvoice={canInvoice} home={home} />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenActivity />
          </TabPanel>
        </TabPanels>
      </Tabs>

    </div>
  );
}
