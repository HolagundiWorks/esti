import { ArrowRight } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { useState } from "react";
import { DEMO_ACCOUNTS, type DemoKind } from "../../lib/landing-demo.js";
import { trpc } from "../../lib/trpc.js";

// ── Types ──────────────────────────────────────────────────────────

type Dot = "green" | "yellow" | "red" | "white";
type Span = "1x1" | "2x1" | "2x2" | "4x1";

export interface LandingGridProps {
  onStudioDemo: () => void;
  demoLoading: boolean;
  demoKind: DemoKind | null;
  onTrialScroll?: () => void;
}

// ── Primitive building blocks ──────────────────────────────────────

function StatusDot({ color }: { color: Dot }) {
  return <span className={`esti-lp-dot esti-lp-dot--${color}`} aria-hidden>●</span>;
}

function TileHead({
  label, dot, meta,
}: { label: string; dot: Dot; meta?: string }) {
  return (
    <div className="esti-lp-tile__hdr">
      <StatusDot color={dot} />
      <span className="esti-lp-tile__hdr-label">{label}</span>
      {meta && <span className="esti-lp-tile__hdr-meta">{meta}</span>}
    </div>
  );
}

function Tile({
  span = "1x1", id, className, children,
}: { span?: Span; id?: string; className?: string; children: React.ReactNode }) {
  return (
    <div id={id} className={`esti-lp-tile esti-lp-tile--${span}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

function TileBody({ children }: { children: React.ReactNode }) {
  return <div className="esti-lp-tile__body">{children}</div>;
}

function SectionBreak({
  eyebrow, title, body,
}: { eyebrow: string; title: string; body: string }) {
  return (
    <section className="esti-lp-section-break" aria-label={title}>
      <div className="esti-lp-section-break__copy">
        <p className="esti-lp-section-break__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </section>
  );
}

function DataRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="esti-lp-data-row">
      <span className="esti-lp-data-key">{k}</span>
      <span className="esti-lp-data-val">{v}</span>
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <p className="esti-lp-section-label" style={style}>{children}</p>;
}

// ── KPI tile ──────────────────────────────────────────────────────

function KpiTile({ header, dot, value, sub }: {
  header: string; dot: Dot; value: string; sub: string;
}) {
  return (
    <Tile>
      <TileHead label={header} dot={dot} />
      <TileBody>
        <p className="esti-lp-kpi">{value}</p>
        <p className="esti-lp-note">{sub}</p>
      </TileBody>
    </Tile>
  );
}

// ── Sales pitch tiles ──────────────────────────────────────────────

const COGNITION_SIGNALS = [
  { id: "PROJECTS", score: "14", state: "ACTIVE JOBS IN ONE VIEW", dot: "green" as Dot },
  { id: "FEES", score: "₹80K", state: "BILLING RISK VISIBLE", dot: "yellow" as Dot },
  { id: "TEAM", score: "22", state: "LOAD AND ATTENDANCE TRACKED", dot: "green" as Dot },
  { id: "CLIENTS", score: "4", state: "APPROVALS NEED FOLLOW-UP", dot: "yellow" as Dot },
] as const;

function ProductStoryTile() {
  return (
    <Tile span="2x2" className="esti-lp-tile--pitch">
      <TileHead label="Why AORMS" dot="green" meta="One office system" />
      <TileBody>
        <div className="esti-lp-cognition-signals">
          {COGNITION_SIGNALS.map((s) => (
            <div key={s.id} className="esti-lp-cognition-signal">
              <StatusDot color={s.dot} />
              <span className="esti-lp-cognition-signal__name">{s.id}</span>
              <span className="esti-lp-cognition-signal__score">{s.score}</span>
              <span className="esti-lp-cognition-signal__state">{s.state}</span>
            </div>
          ))}
        </div>

        <div className="esti-lp-cognition-reason">
          <p className="esti-lp-section-label">The sales promise</p>
          <h3 className="esti-lp-feature-title">
            AORMS brings the work, money, people, approvals, and documents of an architecture office into one governed workspace.
          </h3>
          <div className="esti-lp-cognition-chain">
            <span>LESS FOLLOW-UP CHAOS</span>
            <span>FASTER FEE RECOVERY</span>
            <span>CLEAR PROJECT ACCOUNTABILITY</span>
            <span>CLIENT AND CONSULTANT PORTALS INCLUDED</span>
          </div>
        </div>

        <div className="esti-lp-cognition-forecast">
          <DataRow k="Best for" v="Small to mid-size teams" />
          <DataRow k="Setup" v="Demo workspace first" />
          <DataRow k="AI role" v="Explains and recommends" />
        </div>
      </TileBody>
    </Tile>
  );
}

function BuyerOutcomeTile() {
  return (
    <Tile span="2x1" className="esti-lp-tile--outcome">
      <TileHead label="What changes" dot="yellow" meta="Operational outcomes" />
      <TileBody>
        <h3 className="esti-lp-feature-title">Your office stops depending on scattered chats, memory, and spreadsheet discipline.</h3>
        <ul className="esti-lp-bullets">
          <li>Owners see risk before it becomes a crisis.</li>
          <li>Teams know what is blocked and who owns the next move.</li>
          <li>Clients get structured approvals instead of message threads.</li>
        </ul>
      </TileBody>
    </Tile>
  );
}

// ── Feature tile ──────────────────────────────────────────────────

function FeatureTile({ header, dot, title, bullets, meta }: {
  header: string; dot: Dot; title: string; bullets: readonly string[]; meta?: string;
}) {
  return (
    <Tile>
      <TileHead label={header} dot={dot} meta={meta} />
      <TileBody>
        <h3 className="esti-lp-feature-title">{title}</h3>
        <ul className="esti-lp-bullets">
          {bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </TileBody>
    </Tile>
  );
}

// ── Compliance engine tile (2×1) ───────────────────────────────────

function ComplianceTile() {
  return (
    <Tile span="2x1" id="compliance">
      <TileHead label="Compliance Engine" dot="green" meta="BBMP DCR 2024 · v2.1.3" />
      <TileBody>
        <div className="esti-lp-compliance-grid">
          <div>
            <SectionLabel>Location</SectionLabel>
            <DataRow k="State" v="Karnataka" />
            <DataRow k="Authority" v="BBMP" />
            <DataRow k="Zone" v="Residential Main" />
            <DataRow k="Plot area" v="2,400 sqft" />
          </div>
          <div>
            <SectionLabel>Development Rules</SectionLabel>
            <DataRow k="FAR Allowed" v="2.25" />
            <DataRow k="Max Built-up" v="5,400 sqft" />
            <DataRow k="Setback" v="3m front · 1.5m side" />
            <DataRow k="Fire NOC" v="Required" />
            <DataRow k="Parking" v="4 ECS" />
          </div>
        </div>
      </TileBody>
    </Tile>
  );
}

// ── Revision intelligence tile ─────────────────────────────────────

const REVISIONS = [
  { label: "Client Driven", pct: 42, color: "#6929c4" },
  { label: "Internal Error", pct: 18, color: "#fa4d56" },
  { label: "Technical Query", pct: 27, color: "#1192e8" },
  { label: "Scope Change", pct: 13, color: "#f1c21b" },
] as const;

function RevisionTile() {
  return (
    <Tile>
      <TileHead label="Revision Intelligence" dot="yellow" meta="Q1 FY 25–26" />
      <TileBody>
        <SectionLabel>Revision Breakdown</SectionLabel>
        {REVISIONS.map((r) => (
          <div key={r.label} className="esti-lp-rev-row">
            <span className="esti-lp-rev-label">{r.label}</span>
            <div className="esti-lp-rev-track">
              <div className="esti-lp-rev-fill" style={{ width: `${r.pct}%`, background: r.color }} />
            </div>
            <span className="esti-lp-rev-pct">{r.pct}%</span>
          </div>
        ))}
      </TileBody>
    </Tile>
  );
}

// ── India Desk tile ────────────────────────────────────────────────

function IndiaDeskTile() {
  return (
    <Tile id="india">
      <TileHead label="India Desk" dot="green" meta="8 cities" />
      <TileBody>
        <SectionLabel>Active Configuration</SectionLabel>
        <DataRow k="State" v="Karnataka" />
        <DataRow k="Authority" v="BBMP" />
        <DataRow k="Code Version" v="2024" />
        <DataRow k="Rule Updates" v="2 pending" />
        <DataRow k="Approval Timeline" v="~18 days" />
        <DataRow k="Zoning" v="Residential Main" />
        <p className="esti-lp-note" style={{ marginTop: "var(--cds-spacing-04)" }}>
          BBMP · HMDA · MCGM · CMDA · BDA · GHMC · PMC · MCD
        </p>
      </TileBody>
    </Tile>
  );
}

// ── Demo tiles ─────────────────────────────────────────────────────

function DemoTile({
  kind, onOpen, loading, activeKind,
}: {
  kind: DemoKind; onOpen: () => void; loading: boolean; activeKind: DemoKind | null;
}) {
  const acct = DEMO_ACCOUNTS[kind];
  const isActive = loading && activeKind === kind;
  const accentColor = "#1192e8";

  return (
    <Tile span="2x1" id="demo">
      <TileHead
        label="Team Demo"
        dot="green"
        meta="Recommended"
      />
      <div className="esti-lp-demo-body">
        <p className="esti-lp-demo-eyebrow" style={{ color: accentColor }}>
          {acct.caseStudy.eyebrow}
        </p>
        <h3 className="esti-lp-demo-title">{acct.title}</h3>
        <p className="esti-lp-note">{acct.subtitle}</p>
        <ul className="esti-lp-bullets" style={{ marginTop: "var(--cds-spacing-04)" }}>
          {acct.highlights.slice(0, 3).map((h) => <li key={h}>{h}</li>)}
        </ul>
        <div className="esti-lp-demo-action">
          <Button
            kind="primary"
            size="sm"
            renderIcon={ArrowRight}
            onClick={onOpen}
            disabled={loading}
          >
            {isActive ? "Opening workspace…" : acct.cta}
          </Button>
        </div>
      </div>
    </Tile>
  );
}

// ── Role tiles ─────────────────────────────────────────────────────

const ROLE_LEVEL: Record<string, string> = {
  OWNER: "L1", PARTNER: "L2", SENIOR: "L3",
  ASSOCIATE: "L4", VIEWER: "L5", CLIENT: "CL", CONSULTANT: "CO",
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Principal / Owner", PARTNER: "Partner / Finance Lead",
  SENIOR: "Senior Architect", ASSOCIATE: "Associate / Site Supervisor",
  VIEWER: "Junior / Intern", CLIENT: "Client Portal", CONSULTANT: "Consultant Portal",
};

const ROLE_DESC: Record<string, string> = {
  OWNER: "All modules — finances, team, firm settings, and audit log.",
  PARTNER: "GST invoicing, fee proposals, HR, and reporting.",
  SENIOR: "Full project delivery, drawings, tenders, and compliance.",
  ASSOCIATE: "Clients, tasks, site work, and portal triage.",
  VIEWER: "Personal task board, calendar, and activity feed only.",
  CLIENT: "Scoped view of one project — drawings, approvals, and fee status.",
  CONSULTANT: "Engagement scope, RFI inbox, and issued drawing set.",
};

const LEVEL_ORDER: Record<string, number> = {
  OWNER: 1, PARTNER: 2, SENIOR: 3, ASSOCIATE: 4, VIEWER: 5, CLIENT: 6, CONSULTANT: 7,
};

const LEVEL_BG: Record<string, string> = {
  L1: "#6929c4", L2: "#1192e8", L3: "#005d5d",
  L4: "#9f1853", L5: "#b28600", CL: "#198038", CO: "#520408",
};

function RoleTile({
  user, busy, activeEmail, onSwitch,
}: {
  user: { id: string | number; email: string; role: string; fullName: string };
  busy: boolean;
  activeEmail: string | null;
  onSwitch: (email: string) => void;
}) {
  const level = ROLE_LEVEL[user.role] ?? "?";
  const levelBg = LEVEL_BG[level] ?? "#444";
  const name = user.fullName.split("(")[0]?.trim() ?? user.fullName;
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  const desc = ROLE_DESC[user.role] ?? "";
  const isActive = activeEmail === user.email;

  return (
    <Tile>
      <TileHead label={`${level} · ${roleLabel.toUpperCase()}`} dot="white" />
      <button
        className="esti-lp-role-btn"
        onClick={() => onSwitch(user.email)}
        disabled={busy}
        style={{ opacity: busy && !isActive ? 0.5 : 1 }}
      >
        <div className="esti-lp-role-badge" style={{ background: levelBg }}>
          {isActive ? "…" : level}
        </div>
        <div className="esti-lp-role-info">
          <p className="esti-lp-role-name">{name}</p>
          <p className="esti-lp-role-title" style={{ color: levelBg }}>{roleLabel}</p>
          <p className="esti-lp-note">{isActive ? "Opening workspace…" : desc}</p>
        </div>
        {!busy && <span className="esti-lp-role-arrow">→</span>}
      </button>
    </Tile>
  );
}

// ── Bid portal tile (static — completes role row to 8) ─────────────

function BidPortalTile() {
  return (
    <Tile span="2x1">
      <TileHead label="BP · Bid Portal" dot="white" />
      <TileBody>
        <p className="esti-lp-note" style={{ marginBottom: "var(--cds-spacing-04)" }}>
          Magic-link tender access for contractors. No account needed.
        </p>
        <ul className="esti-lp-bullets">
          <li>Tender documents and BOQ</li>
          <li>Bid submission workflow</li>
          <li>No access beyond tender scope</li>
        </ul>
      </TileBody>
    </Tile>
  );
}

// ── CTA tile (4×1 full row) ────────────────────────────────────────

function CtaTile({ onOpenForm }: { onOpenForm: () => void }) {
  return (
    <Tile span="4x1" id="trial" className="esti-lp-tile--final-cta">
      <TileHead label="Request Workspace" dot="green" />
      <div className="esti-lp-cta-body">
        <div className="esti-lp-cta-text">
          <h3 className="esti-lp-cta-h">Your practice workspace, configured as an intelligence system.</h3>
          <p className="esti-lp-note">
            Projects, GST compliance, approvals, revisions, team load, and AI reasoning in one supervised command center.
            No credit card. No onboarding call.
          </p>
        </div>
        <Button kind="primary" size="lg" renderIcon={ArrowRight} onClick={onOpenForm}>
          Request workspace
        </Button>
      </div>
    </Tile>
  );
}

// ── Main export ────────────────────────────────────────────────────

export function LandingOperationalGrid({
  onStudioDemo, demoLoading, demoKind, onTrialScroll,
}: LandingGridProps) {
  const [switching, setSwitching] = useState<string | null>(null);

  const demoUsersQ = trpc.auth.demoUsers.useQuery();
  const switchMut = trpc.auth.demoSwitch.useMutation({
    onSuccess: () => { window.location.href = "/"; },
    onError: () => setSwitching(null),
  });

  const users = [...(demoUsersQ.data ?? [])].sort(
    (a, b) => (LEVEL_ORDER[a.role] ?? 99) - (LEVEL_ORDER[b.role] ?? 99),
  );

  function handleSwitch(email: string) {
    if (switching) return;
    setSwitching(email);
    switchMut.mutate({ email });
  }

  return (
    <>
      <SectionBreak
        eyebrow="01 / Product Promise"
        title="One operating system for the architecture office"
        body="AORMS gives principals one place to see delivery, money, team load, approvals, and client communication."
      />

      <div className="esti-lp-grid" id="platform">
        <ProductStoryTile />
        <BuyerOutcomeTile />
        <KpiTile header="One Workspace" dot="green" value="9+" sub="Modules for projects, fees, HR, drawings, tenders, and portals" />
        <KpiTile header="Try First" dot="green" value="Demo" sub="Open a live practice workspace before asking your team to switch" />
      </div>

      <SectionBreak
        eyebrow="02 / What You Get"
        title="The modules are sold as business outcomes"
        body="Each module is built around a management outcome: fewer surprises, faster billing, clearer ownership, and cleaner evidence."
      />

      <div className="esti-lp-grid">
        <KpiTile header="India Ready" dot="green" value="GST" sub="Invoices, compliance workflows, local authority context, and audit trails" />
        <KpiTile header="AI Layer" dot="yellow" value="LLM" sub="Office intelligence that explains risks and recommends next actions" />
        <FeatureTile
          header="Project Control"
          dot="green"
          meta="DELIVERY"
          title="Track every project from enquiry to handover"
          bullets={[
            "Stages, tasks, drawings, decisions, and site notes stay connected",
            "Blocked work is visible to owners and project leads",
            "Evidence is retained for review and handover",
          ]}
        />
        <FeatureTile
          header="Fee Recovery"
          dot="white"
          meta="FINANCE"
          title="Turn completed work into billable action faster"
          bullets={[
            "Fee proposals, invoices, receipts, and GST records in one place",
            "Overdue and ready-to-bill work stays visible",
            "Owners can connect delivery status to cash flow",
          ]}
        />
        <FeatureTile
          header="Team Visibility"
          dot="green"
          meta="HR + LOAD"
          title="Know who is overloaded, absent, blocked, or underused"
          bullets={[
            "Attendance, task ownership, and workload are visible together",
            "Role-based access keeps sensitive modules controlled",
            "Leads can rebalance work before deadlines slip",
          ]}
        />
        <FeatureTile
          header="Client Experience"
          dot="green"
          meta="PORTALS"
          title="Give clients and consultants structured access"
          bullets={[
            "Approvals, drawings, RFIs, and tenders move through scoped portals",
            "External users see only what they are meant to see",
            "Decisions stop disappearing inside chat history",
          ]}
        />
        <ComplianceTile />
        <IndiaDeskTile />
      </div>

      <SectionBreak
        eyebrow="03 / Try It"
        title="Let buyers enter through a familiar scenario"
        body="Open a practice workspace that already behaves like a working architecture office, then decide whether it fits your team."
      />

      <div className="esti-lp-grid">
        <DemoTile kind="team" onOpen={onStudioDemo} loading={demoLoading} activeKind={demoKind} />
        <FeatureTile
          header="Team Mode"
          dot="green"
          meta="DEFAULT"
          title="One workspace for owners, staff, clients, consultants, and bidders"
          bullets={[
            "Team, HR, workload, attendance, and role access are always part of the demo",
            "No separate solo mode or reduced module set",
            "The dashboard shows team load and recommendations from real demo records",
          ]}
        />
        <RevisionTile />
        <BidPortalTile />
      </div>

      <SectionBreak
        eyebrow="04 / Access Model"
        title="Every stakeholder gets the right workspace"
        body="Owners, teams, clients, consultants, and bidders see different surfaces, but the office record stays unified."
      />

      <div className="esti-lp-grid">
        {users.map((u) => (
          <RoleTile
            key={u.id}
            user={u}
            busy={!!switching}
            activeEmail={switching}
            onSwitch={handleSwitch}
          />
        ))}
      </div>

      <SectionBreak
        eyebrow="05 / Conversion"
        title="End with one clear next step"
        body="After the buyer has seen promise, proof, demo, and access model, the page closes with a single workspace request."
      />

      <div className="esti-lp-grid esti-lp-grid--final">
        <CtaTile onOpenForm={() => onTrialScroll?.()} />
      </div>
    </>
  );
}
