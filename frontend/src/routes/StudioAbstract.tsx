/**
 * AORMS Studio Abstract — home screen of the system.
 *
 * Tabs: STUDIO ABSTRACT · LEAD REGISTER · PROJECT ABSTRACT · FINANCIAL ABSTRACT ·
 *       TEAM ABSTRACT · WORK REGISTER · APPROVAL REGISTER · AI REMARKS ·
 *       SUMMARY SHEETS · OFFICE LOG
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
  friction: "var(--cds-support-warning-minor, #ff832b)",
  critical: "var(--cds-support-error)",
  inactive: "var(--cds-text-disabled)",
};

// Identity colours per tile — Carbon tokens where available, brand hex fallback otherwise
const TILE_COLOR: Record<string, string> = {
  CLIENT:  "var(--cds-interactive)",
  FINANCE: "var(--cds-tag-background-purple, #6929c4)",
  PROJECT: "var(--cds-tag-background-teal, #009d9a)",
  TEAM:    "var(--cds-tag-background-cyan, #1192e8)",
};

// Team load colours and capacity bar mapping — shared by DetailRow / ScreenProjects / ScreenTeam
const LOAD_COLOR: Record<string, string> = {
  OVERLOADED: "var(--cds-support-error)",
  HIGH:       "var(--cds-support-warning-minor, #ff832b)",
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
  if (score >= 38) return { label: "Needs attention",     color: "var(--cds-support-warning-minor, #ff832b)" };
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
      <span className="esti-av-strip__shape" style={{ color: attn.chainColor }}>{SHAPE[st]}</span>
      <span className="esti-av-strip__issue">{attn.issue}</span>
      <span className="esti-av-strip__action">→ {attn.action}</span>
      <span className="esti-av-strip__health" style={{ color: band.color }}>STATE · {band.label}</span>
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
//   ■ Act (blue #0F62FE)  — AI requesting owner intervention (ONE per dashboard, in evidence)
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
      <span className="esti-macro-hdr__name" style={nameColor ? { color: nameColor } : undefined}>{name}</span>
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
              <span style={{ color: ZCOLOR["stable"] }}>●</span> No billing items pending
            </div>
          ) : (
            <>
              {overdueInvs.slice(0,4).map((inv: any) => (
                <div key={inv.id} className="esti-detail-item">
                  <span className="esti-detail-item__ref">{inv.ref}</span>
                  <span className="esti-detail-item__val">{formatINRShort(inv.netReceivablePaise)}</span>
                  <span className="esti-detail-item__tag" style={{ color: ZCOLOR["critical"] }}>{inv.daysOverdue}d</span>
                </div>
              ))}
              {billingReady.length > 0 && (
                <div className="esti-detail-item">
                  <span className="esti-detail-item__ref">Ready to invoice</span>
                  <span className="esti-detail-item__val">{billingReady.length} phases</span>
                  <span className="esti-detail-item__tag" style={{ color: ZCOLOR["watch"] }}>QUEUE</span>
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
          ? <div className="esti-detail-empty"><span style={{ color: ZCOLOR["stable"] }}>●</span> No interventions required</div>
          : items.slice(0,7).map((item) => (
              <div key={item.priority} className="esti-detail-item">
                <span className="esti-label" style={{ color: ZCOLOR[item.severity], flexShrink: 0 }}>{SHAPE[item.severity]}</span>
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
            <span className="esti-detail-item__val" style={{ color: row.ref === "Revision health score" ? riskColor : undefined }}>
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
          <span style={{ color: ZCOLOR["inactive"] }}>○</span>
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
  home, fh, ac, ph, ti, att, ri, canInvoice, hrEnabled,
}: {
  home: any; fh: any; ac: any; ph: any[]; ti: any[]; att: any; ri: any;
  canInvoice: boolean; hrEnabled: boolean;
}) {
  const utils = trpc.useUtils();
  const [appliedMsg, setAppliedMsg] = useState<string | null>(null);
  const applyIntervention = trpc.dashboard.applyIntervention.useMutation({
    onSuccess: (result) => {
      const changed =
        result.completedTasks +
        result.reassignedTasks +
        result.approvalsCleared +
        result.invoicesSettled +
        result.notesClosed;
      setAppliedMsg(
        changed > 0
          ? `Applied ${changed} demo update${changed === 1 ? "" : "s"}. Health is recalculating from live records.`
          : "No matching demo records needed changes. Health is recalculating.",
      );
      void utils.dashboard.home.invalidate();
      void utils.dashboard.actionCenter.invalidate();
      void utils.dashboard.financialHealth.invalidate();
      void utils.dashboard.projectHealth.invalidate();
      void utils.dashboard.teamIntelligence.invalidate();
    },
  });
  const pending       = ac?.pendingApprovals  ?? [];
  const pendingCount  = pending.length;
  const maxWaitDays   = pendingCount > 0 ? Math.max(...pending.map((a: any) => a.daysWaiting ?? 0)) : 0;
  const billingReady  = ac?.billingReadyPhases ?? [];
  const meetingFocus  = ac?.meetingFocus ?? [];
  const overduePaise  = fh?.overdue30dPaise ?? 0;
  const riskProjects  = ph.filter((p: any) => p.health === "RED");
  const overloaded    = ti.filter((m: any) => m.capacity === "OVERLOADED");

  const cs = clientState(pendingCount, maxWaitDays);
  const fs = financeState(fh?.outstandingPaise ?? 0, overduePaise, canInvoice);
  const ps = projectState(ph.length, riskProjects.length);
  const ts = teamState(overloaded.length, ti.length, hrEnabled);

  const blockedDecisions = pending.filter((a: any) => (a.daysWaiting ?? 0) > 7).length;
  const delayedProjects  = ph.filter((p: any) => (p.overdueTasks ?? 0) > 0).length;
  const totalStaleAppr   = ph.reduce((s: number, p: any) => s + (p.staleApprovals ?? 0), 0);
  const siteDelay        = (ac?.openConstruction ?? []).length;
  const revisionCount    = ri?.clientDriven ?? 0;
  const loading          = !home;

  const cHpct = clientHealthPct(pendingCount, maxWaitDays, blockedDecisions);
  const fHpct = financeHealthPct(fh?.outstandingPaise ?? 0, overduePaise, canInvoice);
  const pHpct = projectHealthPct(ph.length, riskProjects.length, delayedProjects);
  const tHpct = teamHealthPct(overloaded.length, ti.length, att ? (att.absent as number) : 0, hrEnabled);

  const attn  = deriveAttn({ cs, fs, ps, ts, pendingCount, maxWaitDays, riskProjects, overduePaise, billingReadyCount: billingReady.length, overloadedCount: overloaded.length });
  const cognition = home?.cognition;
  const office = cognition?.office;
  const domains = cognition?.domains ?? [];
  const backendInterventions = cognition?.interventions ?? [];
  const fallbackInterventions = fallbackCognitiveInterventions({
    pendingCount,
    maxWaitDays,
    overduePaise,
    billingReadyCount: billingReady.length,
    meetingCount: meetingFocus.length,
    riskProjects: riskProjects.length,
    delayedProjects,
    overloadedCount: overloaded.length,
  });
  const interventions = backendInterventions.length > 0 ? backendInterventions : fallbackInterventions;
  const signals = cognition?.signals ?? {};
  const score = office?.score ?? officeHealth(cs, fs, ps, ts);
  const officeState = cognitionState(office?.severity) !== "inactive" ? cognitionState(office?.severity) : cognitionState(attn.chainColor === ZCOLOR["critical"] ? "critical" : attn.chainColor === ZCOLOR["friction"] ? "friction" : attn.chainColor === ZCOLOR["watch"] ? "watch" : "stable");
  const primary = interventions[0];
  const primarySeverity = cognitionState(primary?.severity ?? officeState);
  const reasoningDrivers = domains
    .filter((d: any) => d.severity !== "stable" && d.severity !== "inactive")
    .flatMap((d: any) => (d.drivers ?? []).map((driver: string) => ({ domain: d.domain, driver, severity: cognitionState(d.severity) })))
    .slice(0, 5);
  const chainItems: Array<{ domain: string; driver: string; severity: ZoneState }> = reasoningDrivers.length > 0
    ? reasoningDrivers
    : interventions.length > 0
      ? interventions.map((item: any) => ({
          domain: item.source ?? "office",
          driver: item.suggestedAction ?? item.title,
          severity: cognitionState(item.severity),
        }))
      : [{ domain: "office", driver: "Practice operating normally. No immediate intervention required.", severity: officeState }];
  const forecast = [
    { label: "Project delay probability", value: forecastPct(domains.find((d: any) => d.domain === "project")?.score, (signals.delayedProjects ?? delayedProjects) * 5) },
    { label: "Invoice recovery delay", value: forecastPct(domains.find((d: any) => d.domain === "finance")?.score, (signals.overdueInvoices ?? 0) * 4) },
    { label: "Team overload risk", value: forecastPct(domains.find((d: any) => d.domain === "team")?.score, (signals.overloadedAssignees ?? overloaded.length) * 8) },
    { label: "Client escalation probability", value: forecastPct(domains.find((d: any) => d.domain === "approval")?.score, (signals.blockedApprovals ?? blockedDecisions) * 8) },
  ];
  const meeting = meetingAwareness(meetingFocus);
  const recoveryAfter = recoveryForecast(score, interventions);
  const officeCopy = officeSignal(officeState);
  const clientCopy = clientSignal(cs);
  const financeCopy = financeSignal(fs);
  const projectCopy = projectSignal(ps);
  const teamCopy = teamSignal(ts);
  const preparedCopy = preparedSignal(primarySeverity, interventions.length > 0);
  const recoveryCopy = recoveryAfter > score + 8
    ? { value: "Improving", detail: "Billing and workflow expected to normalize after action" }
    : officeState === "stable"
      ? { value: "Restored", detail: "Office stable again" }
      : { value: "Recovering", detail: "Recovery process started" };
  const activeDomains = [
    { key: "client", label: "CLIENT", pct: cHpct, state: cs },
    { key: "finance", label: "FINANCE", pct: fHpct, state: fs },
    { key: "project", label: "PROJECT", pct: pHpct, state: ps },
    { key: "team", label: "TEAM", pct: tHpct, state: ts },
  ];
  const recoveryDomains = activeDomains.filter((d) => d.state !== "stable" && d.state !== "inactive").slice(0, 3);

  // ── Evidence rows + the single Act marker ──────────────────────────────────
  // Geometry language allows exactly ONE blue ■ on the dashboard: the highest-leverage
  // intervention. We build all evidence rows, then promote one critical item to act=true.
  type EvidenceItem = { ref: string; val?: string; tag?: string; state?: ZoneState; href?: string; act?: boolean };
  const billingEvidence: EvidenceItem[] = [
    ...((ac?.overdueInvoices ?? []).slice(0, 3).map((inv: any) => ({
      ref: inv.ref,
      val: formatINRShort(inv.netReceivablePaise),
      tag: `${inv.daysOverdue}d`,
      state: "critical" as ZoneState,
      href: `/projects/${inv.projectId}?tab=invoices&invoiceId=${inv.id}`,
    }))),
    ...(billingReady.length > 0 ? [{
      ref: `${billingReady.length} phase${billingReady.length > 1 ? "s" : ""} ready to invoice`,
      val: billingReady.length === 1 ? billingReady[0].projectRef : undefined,
      tag: "READY",
      state: "watch" as ZoneState,
      href: billingReady.length === 1 ? `/projects/${billingReady[0].projectId}?tab=invoices&phaseId=${billingReady[0].id}` : "/invoices",
    }] : []),
  ];
  const clientEvidence: EvidenceItem[] = [
    ...pending.slice(0, 3).map((ap: any) => ({
      ref: ap.projectRef,
      val: ap.title,
      tag: `${ap.daysWaiting}d`,
      state: ap.daysWaiting > 14 ? "critical" as ZoneState : "friction" as ZoneState,
      href: `/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`,
    })),
    ...(revisionCount > 0 ? [{
      ref: "Client-driven revisions",
      val: String(revisionCount),
      tag: "CRIF",
      state: revisionCount > 10 ? "critical" as ZoneState : "watch" as ZoneState,
      href: "/projects?tab=revisions",
    }] : []),
    ...(totalStaleAppr > 0 ? [{
      ref: "Stale approvals",
      val: String(totalStaleAppr),
      tag: "BLOCKED",
      state: "friction" as ZoneState,
      href: "/tasks?tab=activity",
    }] : []),
    ...(siteDelay > 0 ? [{
      ref: "Open site items",
      val: String(siteDelay),
      tag: "SITE",
      state: "watch" as ZoneState,
      href: "/office/construction",
    }] : []),
  ];
  const projectEvidence: EvidenceItem[] = [
    ...meetingFocus.slice(0, 2).map((m: any) => ({
      ref: m.projectRef ?? "Meeting",
      val: m.title,
      tag: Number(m.daysUntil ?? 999) <= 0 ? "TODAY" : `${m.daysUntil}D`,
      state: Number(m.daysUntil ?? 999) <= 1 ? "watch" as ZoneState : "stable" as ZoneState,
      href: taskHref(m.id, m.projectId),
    })),
    ...riskProjects.slice(0, 3).map((p: any) => ({
      ref: p.ref,
      val: p.title,
      tag: "RED",
      state: "critical" as ZoneState,
      href: projectIssueHref(p),
    })),
    ...(delayedProjects > 0 ? [{
      ref: "Delayed projects",
      val: String(delayedProjects),
      tag: "TASKS",
      state: "watch" as ZoneState,
      href: "/tasks?tab=tasks&openOnly=1",
    }] : []),
  ];
  const teamEvidence: EvidenceItem[] = ti.slice(0, 4).map((m: any) => ({
    ref: m.assignee,
    val: `${m.totalOpen} open`,
    tag: CAPACITY_LABEL[m.capacity] ?? m.capacity,
    state: (m.capacity === "OVERLOADED" ? "critical" : m.capacity === "BUSY" ? "watch" : "stable") as ZoneState,
    href: taskHref(m.focusTaskId, m.focusProjectId),
  }));
  // Flow task lists, each ranked by priority — feed the Top-5 flow panels and the
  // per-module task counts in Office State. Today's Focus is AI/ML-driven (interventions).
  const billingFlow = [...billingEvidence].sort(rankFlow);
  const teamFlow = [...teamEvidence].sort(rankFlow);
  const projectFlow = [...projectEvidence].sort(rankFlow);
  const clientFlow = [...clientEvidence].sort(rankFlow);

  // "After this action" outcomes — derived from live state, one line per domain that
  // currently needs attention. No static copy: a calm office shows the steady line.
  const flowNeedsAttention = (flow: EvidenceItem[], state: ZoneState) =>
    state !== "stable" || flow.some((t) => t.state != null && t.state !== "stable");
  const afterLines: string[] = [];
  if (flowNeedsAttention(billingFlow, fs)) afterLines.push("Billing and collections will recover.");
  if (flowNeedsAttention(projectFlow, ps)) afterLines.push("Project delivery will stay on schedule.");
  if (flowNeedsAttention(teamFlow, ts)) afterLines.push("Team workload will rebalance.");
  if (flowNeedsAttention(clientFlow, cs)) afterLines.push("Client approvals will move faster.");
  if (afterLines.length === 0) afterLines.push("The office stays steady and on track.");

  return (
    <Stack gap={6} style={{ padding: "var(--cds-spacing-05)" }}>

      {/* Section 1 — STUDIO STATE */}
      <section aria-label="Studio state">
        <Stack orientation="horizontal" gap={4} style={{ marginBottom: "var(--cds-spacing-04)", alignItems: "center" }}>
          <span className="esti-label">STUDIO STATE</span>
          <Tag type={zoneTagType(officeState)} size="sm">{healthBand(score).label}</Tag>
        </Stack>
        <StructuredListWrapper>
          <StructuredListBody>
            {[
              { name: "CLIENT",   state: cs,              count: clientFlow.length,    copy: clientCopy },
              { name: "FINANCE",  state: fs,              count: billingFlow.length,   copy: financeCopy },
              { name: "PROJECTS", state: ps,              count: projectFlow.length,   copy: projectCopy },
              { name: "TEAM",     state: ts,              count: teamFlow.length,      copy: teamCopy },
              { name: "MEETING",  state: meeting.state,   count: meetingFocus.length,  copy: { detail: meeting.detail } },
              { name: "PREPARED", state: primarySeverity, count: interventions.length, copy: preparedCopy },
            ].map((c) => (
              <StructuredListRow key={c.name}>
                <StructuredListCell>{c.name}</StructuredListCell>
                <StructuredListCell>
                  {loading ? (
                    <Tag type="gray" size="sm">—</Tag>
                  ) : (
                    <Tag type={zoneTagType(c.state as ZoneState)} size="sm">
                      {shapeFor(c.state as ZoneState)} {c.count}
                    </Tag>
                  )}
                </StructuredListCell>
                <StructuredListCell>{c.copy.detail}</StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      </section>

      {/* Section 2 — AI REMARKS */}
      <section aria-label="AI remarks">
        <Stack orientation="horizontal" gap={4} style={{ marginBottom: "var(--cds-spacing-04)", alignItems: "center" }}>
          <span className="esti-label">AI REMARKS</span>
          <span className="esti-label--secondary">Based on live office signals</span>
        </Stack>
        {appliedMsg && (
          <InlineNotification kind="info" lowContrast title="Done" subtitle={appliedMsg}
            onCloseButtonClick={() => setAppliedMsg(null)} />
        )}
        {applyIntervention.error && (
          <InlineNotification kind="error" lowContrast title="Could not apply"
            subtitle={applyIntervention.error.message} />
        )}
        {interventions.length === 0 ? (
          <InlineNotification kind="success" title="All clear" subtitle="No interventions required." lowContrast hideCloseButton />
        ) : (
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Particular</TableHeader>
                  <TableHeader>Remarks</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {interventions.slice(0, 3).map((item: any, idx: number) => (
                  <TableRow
                    key={item.id}
                    className="esti-focus-row"
                    onClick={() => !applyIntervention.isPending && applyIntervention.mutate({ action: interventionAction(item.id) })}
                  >
                    <TableCell>
                      <Tag type={idx === 0 ? "red" : idx === 1 ? "blue" : "green"} size="sm">
                        {idx === 0 ? "■" : idx === 1 ? "▲" : "●"}
                      </Tag>
                    </TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>
                      {applyIntervention.isPending
                        ? "Applying…"
                        : (item.suggestedAction ?? item.riskIfIgnored ?? "Apply this action.")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </section>

      {/* Section 3 — SUPPORTING REGISTERS */}
      <section aria-label="Supporting registers">
        <span className="esti-label" style={{ display: "block", marginBottom: "var(--cds-spacing-04)" }}>
          SUPPORTING REGISTERS
        </span>
        <Grid narrow>
          {[
            { title: "Billing Register",  items: billingFlow,  empty: "Finance moving normally" },
            { title: "Team Register",     items: teamFlow,     empty: "Team workload balanced"  },
            { title: "Project Register",  items: projectFlow,  empty: "Delivery on track"       },
            { title: "Client Register",   items: clientFlow,   empty: "Client approvals flowing" },
          ].map(({ title, items, empty }) => (
            <Column lg={4} md={4} sm={4} key={title}>
              <Tile style={{ height: "100%" }}>
                <p className="esti-label" style={{ marginBottom: "var(--cds-spacing-03)" }}>{title}</p>
                {items.length === 0 ? (
                  <p className="esti-label--secondary">{empty}</p>
                ) : (
                  <StructuredListWrapper>
                    <StructuredListBody>
                      {items.slice(0, 5).map((item, i) => (
                        <StructuredListRow key={`${item.ref}-${i}`}>
                          <StructuredListCell>
                            <Tag type={zoneTagType(item.state ?? "stable")} size="sm">
                              {shapeFor(item.state ?? "stable")}
                            </Tag>
                          </StructuredListCell>
                          <StructuredListCell>
                            {item.href
                              ? <Link to={item.href}>{item.ref}</Link>
                              : item.ref}
                          </StructuredListCell>
                          {item.val && <StructuredListCell>{item.val}</StructuredListCell>}
                        </StructuredListRow>
                      ))}
                    </StructuredListBody>
                  </StructuredListWrapper>
                )}
              </Tile>
            </Column>
          ))}
        </Grid>
      </section>

      {/* Section 4 — ACTION NOTE */}
      <section aria-label="Action note">
        <InlineNotification
          kind={
            attn.chainColor === ZCOLOR["critical"] ? "error"
            : (attn.chainColor === ZCOLOR["friction"] || attn.chainColor === ZCOLOR["watch"]) ? "warning"
            : "info"
          }
          title="ACTION NOTE"
          subtitle={`${attn.issue} → ${attn.action}`}
          lowContrast
          hideCloseButton
        />
      </section>
    </Stack>
  );
}

// ── PROJECTS TAB ──────────────────────────────────────────────────────────────

function ScreenProjects({
  ph, ti, att, billingReady, canInvoice,
}: {
  ph: any[]; ti: any[]; att: any; billingReady: any[]; canInvoice: boolean;
}) {
  const riskProjects  = ph.filter((p: any) => p.health === "RED");
  const watchProjects = ph.filter((p: any) => p.health === "YELLOW");

  return (
    <div className="esti-pressure-grid">
      <div className="esti-pressure-cell esti-pressure-cell--full">
        <div className="esti-cockpit__zone-name">PROJECTS REQUIRING ATTENTION</div>
        {riskProjects.length === 0 && watchProjects.length === 0 ? (
          <p style={{ color: "var(--cds-text-secondary)" }}>No projects at risk. Delivery on track.</p>
        ) : (
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Project</TableHeader>
                  <TableHeader>Phase</TableHeader>
                  <TableHeader>Progress</TableHeader>
                  <TableHeader>Signals</TableHeader>
                  <TableHeader>State</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...riskProjects, ...watchProjects].map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="esti-label">{p.ref}</div>
                      <div className="esti-label esti-label--secondary">{p.title}</div>
                    </TableCell>
                    <TableCell>{p.currentPhase ?? "—"}</TableCell>
                    <TableCell style={{ width: 140 }}>
                      <ProgressBar label={p.ref} hideLabel size="small" value={p.progressPct} max={100} helperText={`${p.progressPct}%`} />
                    </TableCell>
                    <TableCell>
                      <Stack orientation="horizontal" gap={2} style={{ flexWrap: "wrap" }}>
                        {p.overdueTasks    > 0 && <Tag type="magenta" size="sm">{p.overdueTasks} late tasks</Tag>}
                        {p.staleApprovals  > 0 && <Tag type="red"     size="sm">{p.staleApprovals} stale appr.</Tag>}
                        {p.criticalNotesOpen > 0 && <Tag type="red"   size="sm">{p.criticalNotesOpen} critical</Tag>}
                        {canInvoice && p.overdueInvoices > 0 && <Tag type="red" size="sm">{p.overdueInvoices} inv. overdue</Tag>}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Tag type={HEALTH_TAG[p.health] ?? "gray"} size="sm">{HEALTH_LABEL[p.health] ?? p.health}</Tag>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>

      <div className="esti-pressure-cell">
        <div className="esti-cockpit__zone-name">TEAM CAPACITY MATRIX</div>
        {ti.length === 0
          ? <p style={{ color: "var(--cds-text-secondary)", }}>HR module inactive.</p>
          : ti.map((m: any) => {
              const pct   = loadPct(m.capacity);
              const color = LOAD_COLOR[m.capacity] ?? "var(--cds-border-strong)";
              return (
                <div key={m.assignee} className="esti-resource-row">
                  <div className="esti-resource-row__name">{m.assignee}</div>
                  <div className="esti-resource-row__bar" style={{ "--rl": `${pct}%`, "--rc": color } as React.CSSProperties} />
                  <div className="esti-resource-row__load">{m.totalOpen} open</div>
                  <Tag type={CAPACITY_TAG[m.capacity] ?? "gray"} size="sm">{CAPACITY_LABEL[m.capacity] ?? m.capacity}</Tag>
                </div>
              );
            })
        }
      </div>

      <div className="esti-pressure-cell">
        <div className="esti-cockpit__zone-name">PRACTICE PRESENCE TODAY</div>
        {att ? (
          <div className="esti-mini-grid">
            {[
              { k: "PRESENT", v: att.present },
              { k: "LEAVE",   v: `${att.absent}/${att.headcount}` },
              { k: "WFH",     v: att.wfh },
              { k: "ON SITE", v: att.site ?? "—" },
            ].map(({ k, v }) => (
              <div key={k} className="esti-mini-grid__cell">
                <div className="esti-cockpit__zone-name">{k}</div>
                <div className="esti-mini-grid__val">{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <InlineLoading description="Loading…" />
        )}
      </div>
    </div>
  );
}

// ── FINANCE TAB ───────────────────────────────────────────────────────────────

function ScreenFinance({
  fh, ac, canInvoice, canFees, home,
}: {
  fh: any; ac: any; canInvoice: boolean; canFees: boolean; home: any;
}) {
  const overdueInvs  = ac?.overdueInvoices   ?? [];
  const billingReady = ac?.billingReadyPhases ?? [];
  const gst          = gstStatus();
  const outstanding  = fh?.outstandingPaise ?? 0;
  const overdue      = fh?.overdue30dPaise  ?? 0;
  const ready        = fh?.readyToBillPaise ?? 0;

  if (!canInvoice) {
    return (
      <div className="esti-screen">
        <div className="esti-screen__placeholder">
          <span className="esti-screen__placeholder-label">○ Finance data requires invoice:manage permission</span>
        </div>
      </div>
    );
  }

  return (
    <div className="esti-pressure-grid">
      <div className="esti-pressure-cell">
        <div className="esti-cockpit__zone-name">FINANCIAL OVERVIEW</div>
        {!home ? <InlineLoading description="Loading…" /> : (
          <div className="esti-mini-grid">
            {[
              { k: "OUTSTANDING", v: formatINRShort(outstanding), st: outstanding > 20_000_000 ? ZCOLOR["friction"] : undefined },
              { k: "OVERDUE 30D+", v: formatINRShort(overdue),    st: overdue > 0 ? ZCOLOR["critical"] : undefined },
              { k: "READY BILL",   v: formatINRShort(ready),      st: ready > 0 ? ZCOLOR["watch"] : undefined },
              { k: "GST STATUS",   v: gst.label,                  st: gst.state !== "stable" ? ZCOLOR[gst.state] : undefined },
            ].map(({ k, v, st }) => (
              <div key={k} className="esti-mini-grid__cell">
                <div className="esti-cockpit__zone-name">{k}</div>
                <div className="esti-mini-grid__val" style={st ? { color: st } : undefined}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="esti-pressure-cell">
        <div className="esti-cockpit__zone-name">OVERDUE INVOICES</div>
        {!home ? <InlineLoading /> : overdueInvs.length === 0 ? (
          <p style={{ color: "var(--cds-text-secondary)" }}>No invoices overdue. Collections on track.</p>
        ) : (
          overdueInvs.map((inv: any) => (
            <div key={inv.id} className="esti-detail-item" style={{ borderBottom: "1px solid var(--cds-border-subtle)" }}>
              <span className="esti-detail-item__ref">{inv.ref}</span>
              <span className="esti-detail-item__val">{formatINRShort(inv.netReceivablePaise)}</span>
              <span className="esti-detail-item__tag" style={{ color: ZCOLOR["critical"] }}>{inv.daysOverdue}d</span>
            </div>
          ))
        )}
      </div>

      <div className="esti-pressure-cell">
        <div className="esti-cockpit__zone-name">BILLING QUEUE</div>
        {!home ? <InlineLoading /> : billingReady.length === 0 ? (
          <p style={{ color: "var(--cds-text-secondary)" }}>No phases ready for billing.</p>
        ) : (
          billingReady.map((ph: any, i: number) => (
            <div key={i} className="esti-detail-item" style={{ borderBottom: "1px solid var(--cds-border-subtle)" }}>
              <span className="esti-detail-item__ref">{ph.projectRef} — {ph.phaseName}</span>
              <span className="esti-detail-item__tag" style={{ color: ZCOLOR["watch"] }}>READY</span>
            </div>
          ))
        )}
        {canFees && (
          <div style={{ marginTop: "auto", padding: "var(--cds-spacing-04)", borderTop: "1px solid var(--cds-border-subtle)" }}>
            <AiDraftPanel defaultKind="BILLING_ASSISTANT" compact />
          </div>
        )}
      </div>
    </div>
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
      <div className="esti-screen">
        <div className="esti-screen__placeholder">
          <span className="esti-screen__placeholder-label">○ Team module requires HR to be enabled in settings</span>
        </div>
      </div>
    );
  }

  return (
    <div className="esti-pressure-grid">
      <div className="esti-pressure-cell">
        <div className="esti-cockpit__zone-name">ATTENDANCE TODAY</div>
        {att ? (
          <div className="esti-mini-grid">
            {[
              { k: "PRESENT",   v: att.present },
              { k: "ABSENT",    v: `${att.absent}/${att.headcount}` },
              { k: "WFH",       v: att.wfh },
              { k: "ON LEAVE",  v: att.onLeave },
            ].map(({ k, v }) => (
              <div key={k} className="esti-mini-grid__cell">
                <div className="esti-cockpit__zone-name">{k}</div>
                <div className="esti-mini-grid__val">{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <InlineLoading description="Loading…" />
        )}
      </div>

      <div className="esti-pressure-cell esti-pressure-cell--full">
        <div className="esti-cockpit__zone-name">CAPACITY MATRIX</div>
        {ti.length === 0 ? (
          <p style={{ color: "var(--cds-text-secondary)" }}>No team data available.</p>
        ) : (
          ti.map((m: any) => {
            const pct   = loadPct(m.capacity);
            const color = LOAD_COLOR[m.capacity] ?? "var(--cds-border-strong)";
            return (
              <div key={m.assignee} className="esti-resource-row">
                <div className="esti-resource-row__name">{m.assignee}</div>
                <div className="esti-resource-row__bar" style={{ "--rl": `${pct}%`, "--rc": color } as React.CSSProperties} />
                <div className="esti-resource-row__load">{m.totalOpen} open · {m.overdueCount} late</div>
                <Tag type={CAPACITY_TAG[m.capacity] ?? "gray"} size="sm">{CAPACITY_LABEL[m.capacity] ?? m.capacity}</Tag>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── APPROVALS TAB ─────────────────────────────────────────────────────────────

function ScreenApprovals({ ac, home }: { ac: any; home: any }) {
  const pending = ac?.pendingApprovals ?? [];

  return (
    <div className="esti-screen">
      <div className="esti-screen__hdr">
        <span className="esti-screen__hdr-title">APPROVAL QUEUE</span>
        {pending.length > 0 && <Tag type="red" size="sm">{pending.length} pending</Tag>}
        {pending.length === 0 && home && <Tag type="green" size="sm">All clear</Tag>}
      </div>

      {!home ? (
        <div style={{ padding: "var(--cds-spacing-06)" }}><InlineLoading description="Loading…" /></div>
      ) : pending.length === 0 ? (
        <div className="esti-screen__empty">
          <span style={{ color: ZCOLOR["stable"] }}>●</span>
          No approvals pending. All client responses received.
        </div>
      ) : (
        pending.map((ap: any) => {
          const urgent = (ap.daysWaiting ?? 0) > 10;
          return (
            <div key={ap.id} className="esti-appr-row">
              <div className="esti-appr-row__accent" style={{ background: urgent ? ZCOLOR["friction"] : ZCOLOR["watch"] }} />
              <div className="esti-appr-row__body">
                <div className="esti-appr-row__title">{ap.title}</div>
                <div className="esti-appr-row__ref">{ap.projectRef}</div>
              </div>
              <div className="esti-appr-row__days" style={{ color: urgent ? ZCOLOR["friction"] : ZCOLOR["watch"] }}>
                {ap.daysWaiting}d
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── AI INSIGHTS TAB ───────────────────────────────────────────────────────────

function ScreenAI({ ac, ph, ti, canInvoice, canFees }: {
  ac: any; ph: any[]; ti: any[]; canInvoice: boolean; canFees: boolean;
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
    <div className="esti-ai-panel">

      {canFees && (
        <div className="esti-ai-panel__section">
          <div className="esti-cockpit__zone-name" style={{ marginBottom: "var(--cds-spacing-04)" }}>AORMS AI · BILLING ASSISTANT</div>
          <AiDraftPanel defaultKind="BILLING_ASSISTANT" compact />
        </div>
      )}

      <div>
        <div className="esti-ai-panel__hdr">
          <div className="esti-cockpit__zone-name">INTERVENTION QUEUE</div>
          {items.length > 0 && <Tag type="red" size="sm">{items.length} items</Tag>}
        </div>

        {items.length === 0 ? (
          <div className="esti-ai-panel__empty">
            <span style={{ color: ZCOLOR["stable"] }}>●</span>
            No interventions required. Practice operating normally.
          </div>
        ) : items.map((item) => (
          <div key={item.priority} className="esti-ai-panel__row">
            <div className="esti-ai-panel__row__icon" style={{ color: ZCOLOR[item.severity] }}>
              {SHAPE[item.severity]}
            </div>
            <div className="esti-ai-panel__row__title">{item.title}</div>
            <div className="esti-ai-panel__row__priority">#{item.priority}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── REPORTS TAB ───────────────────────────────────────────────────────────────

function ScreenReports({ fh, ph, ri, canInvoice, home }: {
  fh: any; ph: any[]; ri: any; canInvoice: boolean; home: any;
}) {
  if (!home) {
    return (
      <div className="esti-screen">
        <div style={{ padding: "var(--cds-spacing-06)" }}><InlineLoading description="Loading reports…" /></div>
      </div>
    );
  }

  const red     = ph.filter((p: any) => p.health === "RED").length;
  const yellow  = ph.filter((p: any) => p.health === "YELLOW").length;
  const green   = ph.filter((p: any) => p.health === "GREEN").length;
  const delayed = ph.filter((p: any) => (p.overdueTasks ?? 0) > 0).length;
  const unbilled = ph.reduce((s: number, p: any) => s + (p.unbilledPhases ?? 0), 0);
  const gst = gstStatus();
  const tdsDue = nextTdsReturnDue();

  const Cell = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="esti-mini-grid__cell">
      <div className="esti-cockpit__zone-name">{k}</div>
      <div className="esti-mini-grid__val">{v}</div>
    </div>
  );

  return (
    <div className="esti-pressure-grid">
      {canInvoice && (
        <div className="esti-pressure-cell esti-pressure-cell--full">
          <div className="esti-cockpit__zone-name">FINANCIAL SUMMARY</div>
          <div className="esti-mini-grid">
            <Cell k="OUTSTANDING"     v={formatINRShort(fh?.outstandingPaise ?? 0)} />
            <Cell k="OVERDUE 30D+"    v={formatINRShort(fh?.overdue30dPaise ?? 0)} />
            <Cell k="READY TO BILL"   v={formatINRShort(fh?.readyToBillPaise ?? 0)} />
            <Cell k="UNBILLED PHASES" v={unbilled} />
          </div>
        </div>
      )}

      <div className="esti-pressure-cell esti-pressure-cell--full">
        <div className="esti-cockpit__zone-name">DELIVERY SUMMARY</div>
        <div className="esti-mini-grid">
          <Cell k="PROJECTS" v={ph.length} />
          <Cell k="ON TRACK" v={green} />
          <Cell k="WATCH"    v={yellow} />
          <Cell k="AT RISK"  v={red} />
          <Cell k="DELAYED"  v={delayed} />
        </div>
      </div>

      <div className="esti-pressure-cell esti-pressure-cell--full">
        <div className="esti-cockpit__zone-name">STATUTORY FILING</div>
        <div className="esti-mini-grid">
          <Cell k="GST DUE"    v={`${gst.label}${gst.daysUntil != null ? ` · ${gst.daysUntil}d` : ""}`} />
          <Cell k="TDS RETURN" v={tdsDue} />
        </div>
      </div>

      <div className="esti-pressure-cell esti-pressure-cell--full">
        <div className="esti-cockpit__zone-name">REVISION INTELLIGENCE</div>
        <div className="esti-mini-grid">
          <Cell k="CLIENT-DRIVEN" v={ri?.clientDriven ?? 0} />
          <Cell k="INTERNAL"      v={ri?.internalError ?? 0} />
          <Cell k="RISK BAND"     v={ri?.revisionRiskBand ?? "—"} />
        </div>
      </div>

      <div className="esti-pressure-cell esti-pressure-cell--full">
        <div className="esti-cockpit__zone-name">DETAILED REPORTS</div>
        <Stack gap={3}>
          {canInvoice && <Link to="/filing">GST / TDS filing abstracts →</Link>}
          <Link to="/performance">Team performance →</Link>
          <Link to="/tasks?tab=activity">Office activity log →</Link>
        </Stack>
      </div>
    </div>
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

  return (
    <div className="esti-screen">
      <div className="esti-screen__hdr">
        <span className="esti-screen__hdr-title">OFFICE ACTIVITY</span>
        {rows.length > 0 && <Tag type="gray" size="sm">{rows.length} recent</Tag>}
      </div>

      {q.isLoading ? (
        <div style={{ padding: "var(--cds-spacing-06)" }}><InlineLoading description="Loading activity…" /></div>
      ) : rows.length === 0 ? (
        <div className="esti-screen__empty">No recent office activity.</div>
      ) : (
        rows.map((a) => (
          <div key={a.id} className="esti-detail-item">
            <span className="esti-detail-item__ref">{a.summary}</span>
            <span className="esti-detail-item__val">
              {a.actorName ?? "System"}{a.projectRef ? ` · ${a.projectRef}` : ""}
            </span>
            <span className="esti-detail-item__tag" style={{ color: "var(--cds-text-secondary)" }}>
              {relTime(a.createdAt)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}


// ── WORK QUEUE TAB ────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "var(--cds-support-error)",
  HIGH:     "var(--cds-support-warning-minor, #ff832b)",
  MEDIUM:   "var(--cds-support-warning)",
  LOW:      "var(--cds-text-disabled)",
};

function ScreenWorkQueue() {
  const utils       = trpc.useUtils();
  const [myOnly, setMyOnly] = useState(false);
  const queueQ      = trpc.tasks.todayQueue.useQuery({ myTasks: myOnly, limit: 25 }, { staleTime: 30_000 });
  const computeM    = trpc.tasks.computeScores.useMutation({
    onSuccess: () => void utils.tasks.todayQueue.invalidate(),
  });
  const rows = queueQ.data ?? [];

  return (
    <div className="esti-screen">
      <div className="esti-screen__hdr">
        <span className="esti-screen__hdr-title">TODAY'S WORK QUEUE</span>
        <Tag type="gray" size="sm">{rows.length} tasks</Tag>
        <Button
          kind="ghost"
          size="sm"
          onClick={() => setMyOnly(!myOnly)}
        >
          {myOnly ? "All tasks" : "My tasks"}
        </Button>
        <Button
          kind="ghost"
          size="sm"
          disabled={computeM.isPending}
          onClick={() => computeM.mutate()}
        >
          {computeM.isPending ? "Refreshing…" : "Refresh scores"}
        </Button>
      </div>

      {queueQ.isLoading ? (
        <div style={{ padding: "var(--cds-spacing-06)" }}><InlineLoading description="Loading queue…" /></div>
      ) : rows.length === 0 ? (
        <div className="esti-screen__empty">
          <span style={{ color: ZCOLOR["stable"] }}>●</span> No active tasks. Run "Refresh scores" to populate.
        </div>
      ) : (
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Score</TableHeader>
                <TableHeader>Priority</TableHeader>
                <TableHeader>Task</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Due</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((t) => {
                const score = t.priorityScore ?? 0;
                const scoreColor = score >= 70 ? "var(--cds-support-error)" : score >= 45 ? "var(--cds-support-warning-minor, #ff832b)" : score >= 25 ? "var(--cds-support-warning)" : "var(--cds-text-secondary)";
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <span style={{ color: scoreColor, fontWeight: 600 }}>{score}</span>
                    </TableCell>
                    <TableCell>
                      <Tag type="gray" size="sm" style={{ color: PRIORITY_COLOR[t.priority] }}>
                        {t.priority}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      <Stack gap={3}>
                        <span>{t.title}</span>
                        {t.interventionRequired && <Tag type="red" size="sm">Intervention</Tag>}
                      </Stack>
                    </TableCell>
                    <TableCell>{t.projectRef ?? "—"}</TableCell>
                    <TableCell style={{ color: t.dueDate && t.dueDate < new Date().toISOString().slice(0,10) ? "var(--cds-support-error)" : "inherit" }}>
                      {t.dueDate ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Tag type={t.status === "BLOCKED" ? "red" : t.status === "IN_PROGRESS" ? "blue" : "gray"} size="sm">
                        {t.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
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
          <Tab>AI REMARKS</Tab>
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
            <ScreenAI ac={ac} ph={ph} ti={ti} canInvoice={canInvoice} canFees={canFees} />
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
