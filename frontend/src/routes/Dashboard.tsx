/**
 * AORMS Dashboard — Command Center
 *
 * Permanent two-column layout:
 *   Left  (flex: 1)            — alert strip + horizontal tabs + tab content
 *   Right (min(20%, 25vh) wide) — always-visible telemetry panel (4 square tiles)
 *
 * The telemetry panel never changes between tabs. It is the office nervous system —
 * peripheral awareness without requiring active reading.
 *
 * Tabs: OVERVIEW · PROJECTS · FINANCE · TEAM · APPROVALS · AI INSIGHTS · REPORTS · ACTIVITY
 */
import {
  Button,
  InlineNotification,
  InlineLoading,
  ProgressBar,
  Stack,
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
} from "../components/dashboard/dashboardUi.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

// ── Zone state ────────────────────────────────────────────────────────────────

type ZoneState = "stable" | "watch" | "friction" | "critical" | "inactive";

const SHAPE: Record<ZoneState, string> = {
  stable: "●", watch: "▲", friction: "◆", critical: "■", inactive: "○",
};

const ZCOLOR: Record<ZoneState, string> = {
  stable:   "#42be65",
  watch:    "#f1c21b",
  friction: "#ff832b",
  critical: "#fa4d56",
  inactive: "#6f6f6f",
};

// Identity colours per tile — matches zone border-top in styles.scss
const TILE_COLOR: Record<string, string> = {
  CLIENT:  "#0f62fe",
  FINANCE: "#6929c4",
  PROJECT: "#009d9a",
  TEAM:    "#1192e8",
};

// Team load colours and capacity bar mapping — shared by DetailRow / ScreenProjects / ScreenTeam
const LOAD_COLOR: Record<string, string> = {
  OVERLOADED: "#fa4d56", HIGH: "#ff832b", MODERATE: "#f1c21b", AVAILABLE: "#42be65",
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
  if (score >= 88) return { label: "STABLE",                color: "#42be65" };
  if (score >= 72) return { label: "OPERATIONAL",           color: "#42be65" };
  if (score >= 55) return { label: "ELEVATED STRESS",       color: "#f1c21b" };
  if (score >= 38) return { label: "FRICTION",              color: "#ff832b" };
  return              { label: "INTERVENTION REQUIRED", color: "#fa4d56" };
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
      <span className="esti-av-strip__health" style={{ color: band.color }}>HEALTH {score} · {band.label}</span>
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

const ALERT_COLOR: Record<string, string> = {
  stable: "#42be65", watch: "#f1c21b", friction: "#ff832b",
  critical: "#fa4d56", info: "#4589ff", inactive: "transparent",
};

function QuadCell({
  name, value, sub, state, note,
}: {
  name: string; value: React.ReactNode;
  sub?: string; state: ZoneState | "info" | "inactive"; note?: string;
}) {
  const tagBg   = "transparent";
  const tagColor = state !== "inactive" ? "var(--cds-text-inverse)" : "var(--cds-text-disabled)";

  return (
    <div className={`esti-qcell esti-qcell--${state}`}>
      <span className="esti-qcell__name">{name}</span>
      <span className="esti-qcell__val">{value}</span>
      {sub && (
        <span className="esti-qcell__tag" style={{ background: tagBg, color: tagColor }}>
          {sub}
        </span>
      )}
      {note && <span className="esti-qcell__note">{note}</span>}
    </div>
  );
}

function MacroHdr({ name, state, label, nameColor }: { name: string; state: ZoneState; label: string; nameColor?: string }) {
  return (
    <div className="esti-macro-hdr">
      <span className="esti-macro-hdr__name" style={nameColor ? { color: nameColor } : undefined}>{name}</span>
      <span
        className="esti-macro-hdr__status"
        style={{ background: ZCOLOR[state], color: "var(--cds-background)" }}
      >
        {label}
      </span>
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

// ── Cognitive load protection helpers ─────────────────────────────────────────

function calmnessColor(score: number): string {
  if (score >= 72) return ZCOLOR["stable"];
  if (score >= 55) return ZCOLOR["watch"];
  if (score >= 38) return ZCOLOR["friction"];
  return ZCOLOR["critical"];
}

function focusContext(items: any[]): string {
  const hasCritical = items.some((i: any) => i.severity === "critical");
  if (hasCritical) return "Immediate — cannot safely defer";
  const h = new Date().getHours();
  if (h < 10) return "Plan for the day ahead";
  if (h < 13) return "Complete before midday";
  if (h < 17) return "Complete before end of day";
  return "Remaining today";
}

function calmnessLabel(score: number): string {
  if (score >= 88) return "CALM";
  if (score >= 72) return "MANAGEABLE";
  if (score >= 55) return "LOAD ELEVATED";
  if (score >= 38) return "LOAD HIGH";
  return "OVERLOAD RISK";
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

function confidencePct(value?: number): number {
  if (value == null) return 0;
  return Math.round(value <= 1 ? value * 100 : value);
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

function meetingAwareness(pendingCount: number, delayedProjects: number): { label: string; detail: string; state: ZoneState } {
  if (pendingCount > 0 || delayedProjects > 0) {
    return { label: "FOCUS MODE", detail: "Protect owner attention", state: "watch" };
  }
  return { label: "OPEN", detail: "No meeting lock active", state: "stable" };
}

function recoveryLevelLabel(level?: number): string {
  if (level === 1) return "L1 OWNER";
  if (level === 2) return "L2 REALLOCATE";
  if (level === 3) return "L3 DELEGATE";
  if (level === 4) return "L4 FINANCE";
  if (level === 5) return "L5 WORKFLOW";
  return "RECOVERY";
}

function domainLabel(domain?: string): string {
  if (domain === "finance") return "FINANCE";
  if (domain === "client") return "CLIENT";
  if (domain === "project") return "PROJECT";
  if (domain === "team") return "TEAM";
  if (domain === "approval") return "APPROVAL";
  return "OFFICE";
}

function fallbackCognitiveInterventions(input: {
  pendingCount: number;
  maxWaitDays: number;
  overduePaise: number;
  billingReadyCount: number;
  riskProjects: number;
  delayedProjects: number;
  overloadedCount: number;
}): any[] {
  const items: any[] = [];
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

function SignalMetric({
  title,
  value,
  detail,
  state,
  pulse,
}: {
  title: string;
  value: React.ReactNode;
  detail: string;
  state: ZoneState;
  pulse?: boolean;
}) {
  return (
    <div className={`esti-signal-metric ${pulse ? "esti-signal-metric--pulse" : ""}`}>
      <span className="esti-signal-metric__title">{title}</span>
      <span className="esti-signal-metric__value" style={{ color: ZCOLOR[state] }}>{value}</span>
      <span className="esti-signal-metric__detail">{detail}</span>
    </div>
  );
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
  items: Array<{ ref: string; val?: string; tag?: string; state?: ZoneState; href?: string }>;
}) {
  return (
    <div className="esti-cognitive-evidence">
      <div className="esti-cognitive-section-title">{title}</div>
      {items.length === 0 ? (
        <div className="esti-detail-empty">
          <span style={{ color: ZCOLOR["stable"] }}>●</span> {empty}
        </div>
      ) : items.slice(0, 4).map((item, i) => {
        const content = (
          <>
            <span className="esti-detail-item__ref">{item.ref}</span>
            {item.val && <span className="esti-detail-item__val">{item.val}</span>}
            {item.tag && (
              <span className="esti-detail-item__tag" style={{ color: ZCOLOR[item.state ?? "watch"] }}>
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
  const primaryConfidence = confidencePct(primary?.confidence);
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
  const meeting = meetingAwareness(pendingCount, delayedProjects);
  const recoveryAfter = recoveryForecast(score, interventions);
  const activeDomains = [
    { key: "client", label: "CLIENT", pct: cHpct, state: cs },
    { key: "finance", label: "FINANCE", pct: fHpct, state: fs },
    { key: "project", label: "PROJECT", pct: pHpct, state: ps },
    { key: "team", label: "TEAM", pct: tHpct, state: ts },
  ];
  const recoveryDomains = activeDomains.filter((d) => d.state !== "stable" && d.state !== "inactive").slice(0, 3);

  return (
    <div className="esti-cognitive-dashboard">

      <section className="esti-cognitive-layer esti-cognitive-signal-layer" aria-label="Signal layer">
        <div className="esti-cognitive-health">
        <MacroHdr name="SYSTEM HEALTH" state={officeState} label={healthBand(score).label} />
        <div className="esti-quad">
          <QuadCell name="CLIENT"  value={loading ? "—" : `${cHpct}%`} sub={CLIENT_LABEL[cs]}  state={cs} />
          <QuadCell name="FINANCE" value={loading ? "—" : `${fHpct}%`} sub={FINANCE_LABEL[fs]} state={fs} />
          <QuadCell name="PROJECT" value={loading ? "—" : `${pHpct}%`} sub={PROJECT_LABEL[ps]} state={ps} />
          <QuadCell name="TEAM"    value={loading ? "—" : `${tHpct}%`} sub={TEAM_LABEL[ts]}    state={ts} />
        </div>
      </div>

        <SignalMetric
          title="OFFICE CALMNESS"
          value={loading ? "—" : `${score}%`}
          detail={calmnessLabel(score)}
          state={officeState}
          pulse
        />
        <SignalMetric
          title="MEETING AWARENESS"
          value={meeting.label}
          detail={meeting.detail}
          state={meeting.state}
        />
        <SignalMetric
          title="SYSTEM CONFIDENCE"
          value={`${primaryConfidence || score}%`}
          detail={primary ? "Recommendation visible" : "No low-confidence action shown"}
          state={primarySeverity}
        />
      </section>

      <section className="esti-cognitive-layer esti-cognitive-brain-layer" aria-label="Cognitive layer">
        <div className="esti-cognitive-main" aria-label="Today's focus">
          <div className="esti-focus-header">
            <div className="esti-focus-calmness">
              <span className="esti-focus-calmness__label">TODAY'S FOCUS</span>
              <span className="esti-focus-calmness__score" style={{ color: calmnessColor(score) }}>
                {interventions.length === 0 ? "0" : Math.min(interventions.length, 3)}
              </span>
              <span className="esti-focus-calmness__band">{focusContext(interventions)}</span>
            </div>
        </div>

        <div className="esti-poa-section">
          {appliedMsg && (
            <InlineNotification
              kind="success"
              lowContrast
              title="Intervention applied"
              subtitle={appliedMsg}
              onCloseButtonClick={() => setAppliedMsg(null)}
            />
          )}
          {applyIntervention.error && (
            <InlineNotification
              kind="error"
              lowContrast
              title="Intervention failed"
              subtitle={applyIntervention.error.message}
            />
          )}
          {interventions.length === 0 ? (
            <InlineNotification kind="success" lowContrast hideCloseButton
              title="No immediate action required"
              subtitle="Office is calm. Use this time for deep work." />
          ) : interventions.slice(0, 3).map((item: any, i: number) => (
            <div key={item.id} className="esti-poa-action">
              <span className="esti-poa-action__num" style={{ color: ZCOLOR[cognitionState(item.severity)] }}>{i + 1}</span>
              <div className="esti-poa-action__body">
                <span className="esti-label">{item.title}</span>
                <div className="esti-poa-action__meta">
                  <span>{recoveryLevelLabel(item.recoveryLevel)}</span>
                  <span style={{ color: ZCOLOR[cognitionState(item.severity)] }}>+{item.impactPct ?? 6}% recovery</span>
                </div>
                {item.suggestedAction && (
                  <p className="esti-cognitive-copy">{item.suggestedAction}</p>
                )}
                {Array.isArray(item.howTo) && item.howTo.length > 0 && (
                  <div className="esti-poa-action__steps">
                    {item.howTo.slice(0, 3).map((step: string, idx: number) => (
                      <span key={`${item.id}-step-${idx}`}>{step}</span>
                    ))}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                kind={cognitionState(item.severity) === "critical" ? "danger" : "tertiary"}
                disabled={applyIntervention.isPending}
                onClick={() => applyIntervention.mutate({ action: interventionAction(item.id) })}
              >
                {applyIntervention.isPending ? "Applying…" : "Apply"}
              </Button>
            </div>
          ))}
          </div>

          {interventions.length > 3 && (
            <div className="esti-poa-section">
              <div className="esti-cognitive-section-title">SAFELY DEFERRED</div>
              <div className="esti-focus-deferred-note">System has assessed these as non-critical. No action needed now.</div>
              {interventions.slice(3).map((item: any) => (
                <div key={item.id} className="esti-focus-deferred">
                  <span style={{ color: ZCOLOR["inactive"], fontFamily: "'IBM Plex Mono', monospace" }}>○</span>
                  <span className="esti-label--secondary">{item.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="esti-cognitive-reasoning" aria-label="AI reasoning">
          <div className="esti-cognitive-section-title">AI REASONING</div>
          <div className="esti-cognitive-chain">
            {chainItems.slice(0, 4).map((item, i) => (
              <div key={`${item.domain}-${i}`} className="esti-cognitive-chain__row">
                <span style={{ color: ZCOLOR[item.severity] }}>{SHAPE[item.severity]}</span>
                <span>{domainLabel(item.domain)}</span>
                <span>{item.driver}</span>
              </div>
            ))}
          </div>
          <div className="esti-cognitive-forecast">
            {forecast.map((item) => (
              <div key={item.label} className="esti-cognitive-forecast__row">
                <span>{item.label}</span>
                <span>{item.value}%</span>
              </div>
            ))}
          </div>
          {primary?.riskIfIgnored && (
            <p className="esti-cognitive-copy">{primary.riskIfIgnored}</p>
          )}
        </div>

        <div className="esti-cognitive-recovery" aria-label="Office recovery engine">
          <div className="esti-cognitive-section-title">OFFICE RECOVERY ENGINE</div>
          <div className="esti-recovery-forecast">
            <div>
              <span>Current</span>
              <strong style={{ color: calmnessColor(score) }}>{loading ? "—" : `${score}%`}</strong>
            </div>
            <span className="esti-recovery-forecast__arrow">→</span>
            <div>
              <span>Post action</span>
              <strong style={{ color: calmnessColor(recoveryAfter) }}>{loading ? "—" : `${recoveryAfter}%`}</strong>
            </div>
          </div>
          <div className="esti-recovery-domain-list">
            {(recoveryDomains.length > 0 ? recoveryDomains : activeDomains.slice(0, 3)).map((d) => {
              const next = nextState(d.state);
              const lift = d.state === "stable" ? 0 : 18;
              return (
                <div key={d.key} className="esti-recovery-domain">
                  <span>{d.label}</span>
                  <span style={{ color: ZCOLOR[d.state] }}>{d.pct}%</span>
                  <span>→</span>
                  <span style={{ color: ZCOLOR[next] }}>{Math.min(96, d.pct + lift)}%</span>
                </div>
              );
            })}
          </div>
          <ProgressBar label="Recovery confidence" hideLabel size="small"
            value={primaryConfidence || score} max={100}
            helperText={`Confidence ${primaryConfidence || score}%`} />
        </div>
      </section>

      <section className="esti-cognitive-layer esti-cognitive-evidence-grid" aria-label="Evidence layer">
        <CognitiveEvidence
          title="BILLING EVIDENCE"
          empty="No billing pressure detected"
          items={[
            ...((ac?.overdueInvoices ?? []).slice(0, 3).map((inv: any) => ({
              ref: inv.ref,
              val: formatINRShort(inv.netReceivablePaise),
              tag: `${inv.daysOverdue}d`,
              state: "critical" as ZoneState,
              href: `/projects/${inv.projectId}?tab=invoices`,
            }))),
            ...(billingReady.length > 0 ? [{
              ref: `${billingReady.length} phase${billingReady.length > 1 ? "s" : ""} ready to invoice`,
              val: billingReady.length === 1 ? billingReady[0].projectRef : undefined,
              tag: "READY",
              state: "watch" as ZoneState,
              href: billingReady.length === 1 ? `/projects/${billingReady[0].projectId}?tab=invoices` : "/invoices",
            }] : []),
          ]}
        />
        <CognitiveEvidence
          title="TEAM EVIDENCE"
          empty="No team overload detected"
          items={ti.slice(0, 4).map((m: any) => ({
            ref: m.assignee,
            val: `${m.totalOpen} open`,
            tag: CAPACITY_LABEL[m.capacity] ?? m.capacity,
            state: m.capacity === "OVERLOADED" ? "critical" : m.capacity === "BUSY" ? "watch" : "stable",
            href: "/team",
          }))}
        />
        <CognitiveEvidence
          title="PROJECT EVIDENCE"
          empty="No project delivery pressure detected"
          items={[
            ...riskProjects.slice(0, 3).map((p: any) => ({
              ref: p.ref,
              val: p.title,
              tag: "RED",
              state: "critical" as ZoneState,
              href: `/projects/${p.id}`,
            })),
            ...(delayedProjects > 0 ? [{
              ref: "Delayed projects",
              val: String(delayedProjects),
              tag: "TASKS",
              state: "watch" as ZoneState,
              href: "/projects",
            }] : []),
          ]}
        />
        <CognitiveEvidence
          title="CLIENT EVIDENCE"
          empty="No client approval blockage detected"
          items={[
            ...pending.slice(0, 3).map((ap: any) => ({
              ref: ap.projectRef,
              val: ap.title,
              tag: `${ap.daysWaiting}d`,
              state: ap.daysWaiting > 14 ? "critical" as ZoneState : "friction" as ZoneState,
              href: `/projects/${ap.projectId}?tab=approvals`,
            })),
            ...(revisionCount > 0 ? [{
              ref: "Client-driven revisions",
              val: String(revisionCount),
              tag: "CRIF",
              state: revisionCount > 10 ? "critical" as ZoneState : "watch" as ZoneState,
              href: "/projects",
            }] : []),
            ...(totalStaleAppr > 0 ? [{
              ref: "Stale approvals",
              val: String(totalStaleAppr),
              tag: "BLOCKED",
              state: "friction" as ZoneState,
              href: "/projects",
            }] : []),
            ...(siteDelay > 0 ? [{
              ref: "Open site items",
              val: String(siteDelay),
              tag: "SITE",
              state: "watch" as ZoneState,
              href: "/projects",
            }] : []),
          ]}
        />
      </section>
    </div>
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

// ── PLACEHOLDER (unimplemented tabs) ──────────────────────────────────────────

function Placeholder({ title }: { title: string }) {
  return (
    <div className="esti-screen">
      <div className="esti-screen__placeholder">
        <span className="esti-screen__placeholder-label">○ {title} — OPERATIONAL VIEW LOADING</span>
      </div>
    </div>
  );
}

// ── Dashboard shell ───────────────────────────────────────────────────────────

export function Dashboard() {
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

  const billingReady = ac?.billingReadyPhases ?? [];

  return (
    <div style={{ width: "80%", margin: "0 auto" }}>
      <Tabs>
        <TabList aria-label="Dashboard navigation">
          <Tab>OVERVIEW</Tab>
          <Tab>PROJECTS</Tab>
          <Tab disabled={!canInvoice}>FINANCE</Tab>
          <Tab disabled={!hrEnabled}>TEAM</Tab>
          <Tab>APPROVALS</Tab>
          <Tab>AI INSIGHTS</Tab>
          <Tab>REPORTS</Tab>
          <Tab>ACTIVITY</Tab>
        </TabList>

        <TabPanels>
          <TabPanel style={{ padding: 0 }}>
            <ScreenOverview
              home={home} fh={fh} ac={ac} ph={ph} ti={ti} att={att} ri={ri}
              canInvoice={canInvoice} hrEnabled={hrEnabled}
            />
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
            <ScreenApprovals ac={ac} home={home} />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenAI ac={ac} ph={ph} ti={ti} canInvoice={canInvoice} canFees={canFees} />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <Placeholder title="REPORTS" />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <Placeholder title="ACTIVITY" />
          </TabPanel>
        </TabPanels>
      </Tabs>

    </div>
  );
}
