import { ArrowRight } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { useState, type ReactNode } from "react";
import { DEMO_ACCOUNTS, type DemoKind } from "../../lib/landing-demo.js";
import { trpc } from "../../lib/trpc.js";

// ── Types ──────────────────────────────────────────────────────────

type Dot = "green" | "yellow" | "red" | "white";
type Span = "1x1" | "2x1" | "2x2" | "4x1";

export interface LandingGridProps {
  afterTryIt?: ReactNode;
  onStudioDemo: () => void;
  demoLoading: boolean;
  demoKind: DemoKind | null;
}

export interface LandingFinalCtaProps {
  children?: ReactNode;
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

// ── Story tiles ────────────────────────────────────────────────────

const COGNITION_SIGNALS = [
  { id: "PROJECTS", score: "14", state: "PHASES, DRAWINGS AND SITE VISITS MOVING", dot: "green" as Dot },
  { id: "FEES", score: "₹80K", state: "COMPLETED WORK WAITING TO BE BILLED", dot: "yellow" as Dot },
  { id: "TEAM", score: "22", state: "LOAD, ABSENCE AND BLOCKED TASKS VISIBLE", dot: "green" as Dot },
  { id: "CLIENTS", score: "4", state: "APPROVALS NEED A PRINCIPAL DECISION", dot: "yellow" as Dot },
] as const;

function ProductStoryTile() {
  return (
    <Tile span="2x2" className="esti-lp-tile--pitch">
      <TileHead label="Principal's Desk" dot="green" meta="Morning view" />
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
          <p className="esti-lp-section-label">What opens first</p>
          <h3 className="esti-lp-feature-title">
            A principal opens AORMS and sees what moved, what is blocked, what needs approval, what is billable, and who owns the next action.
          </h3>
          <div className="esti-lp-cognition-chain">
            <span>WORK THAT MOVED</span>
            <span>APPROVALS THAT WAIT</span>
            <span>FEES READY TO RAISE</span>
            <span>OWNERS WHO MUST ACT</span>
          </div>
        </div>

        <div className="esti-lp-cognition-forecast">
          <DataRow k="Built for" v="Solo to mid-size practices" />
          <DataRow k="First step" v="Enter a working office" />
          <DataRow k="Office role" v="Remembers, warns, records" />
        </div>
      </TileBody>
    </Tile>
  );
}

function BuyerOutcomeTile() {
  return (
    <Tile span="2x1" className="esti-lp-tile--outcome">
      <TileHead label="What changes" dot="yellow" meta="Practice memory" />
      <TileBody>
        <h3 className="esti-lp-feature-title">The practice stops depending on someone's memory to protect time, fees, and approvals.</h3>
        <ul className="esti-lp-bullets">
          <li>Principals see risk before it becomes cost.</li>
          <li>Teams see blocked work and the person responsible for the handoff.</li>
          <li>Clients approve through records, not noisy message trails.</li>
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

// ── Revision intelligence tile ─────────────────────────────────────

const REVISIONS = [
  { label: "Client Driven",   pct: 42, color: "var(--cds-tag-background-purple, #6929c4)" },
  { label: "Internal Error",  pct: 18, color: "var(--cds-support-error)" },
  { label: "Technical Query", pct: 27, color: "var(--cds-interactive)" },
  { label: "Scope Change",    pct: 13, color: "var(--cds-support-warning)" },
] as const;

function RevisionTile() {
  return (
    <Tile>
      <TileHead label="Revision Intelligence" dot="yellow" meta="Scope protection" />
      <TileBody>
        <SectionLabel>Why the drawing changed</SectionLabel>
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

// ── Demo tiles ─────────────────────────────────────────────────────

function DemoTile({
  kind, onOpen, loading, activeKind,
}: {
  kind: DemoKind; onOpen: () => void; loading: boolean; activeKind: DemoKind | null;
}) {
  const acct = DEMO_ACCOUNTS[kind];
  const isActive = loading && activeKind === kind;
  const accentColor = "var(--cds-interactive)";

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
  OWNER: "Whole office view — projects, money, people, risk, and audit trail.",
  PARTNER: "Fee proposals, GST, billing, reconciliation, HR, and reporting.",
  SENIOR: "Project delivery, drawings, site progress, and approvals.",
  ASSOCIATE: "Assigned tasks, clients, site notes, and daily project movement.",
  VIEWER: "Personal work, calendar, and activity without sensitive office data.",
  CLIENT: "One project only — drawings, approvals, revisions, and fee status.",
  CONSULTANT: "Scoped engagement, RFI movement, and issued drawing records.",
};

const LEVEL_ORDER: Record<string, number> = {
  OWNER: 1, PARTNER: 2, SENIOR: 3, ASSOCIATE: 4, VIEWER: 5, CLIENT: 6, CONSULTANT: 7,
};

const LEVEL_BG: Record<string, string> = {
  L1: "var(--cds-tag-background-purple, #6929c4)",
  L2: "var(--cds-interactive)",
  L3: "var(--cds-tag-background-teal, #005d5d)",
  L4: "var(--cds-support-error-inverse, #9f1853)",
  L5: "var(--cds-support-warning-minor, #b28600)",
  CL: "var(--cds-support-success)",
  CO: "var(--cds-tag-background-red, #520408)",
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
  const levelBg = LEVEL_BG[level] ?? "var(--cds-background-inverse)";
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

// ── Contractor portal tile ─────────────────────────────────────────

function ContractorPortalTile() {
  return (
    <Tile span="2x1">
      <TileHead label="CO · Contractor Portal" dot="white" />
      <TileBody>
        <p className="esti-lp-note" style={{ marginBottom: "var(--cds-spacing-04)" }}>
          Contractors enter only the project scope shared with them.
        </p>
        <ul className="esti-lp-bullets">
          <li>Issued drawings, transmittals, and site instructions</li>
          <li>Coordination and billing movement recorded against the project</li>
          <li>No visibility beyond the issued scope</li>
        </ul>
      </TileBody>
    </Tile>
  );
}

// ── Main export ────────────────────────────────────────────────────

export function LandingOperationalGrid({
  afterTryIt, onStudioDemo, demoLoading, demoKind,
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
        eyebrow="01 / Morning View"
        title="The principal sees the whole practice before the day begins"
        body="AORMS shows what moved overnight, what is blocked, what needs approval, what can be billed, and who owns the next action."
      />

      <div className="esti-lp-grid" id="platform">
        <ProductStoryTile />
        <BuyerOutcomeTile />
        <KpiTile header="Office Record" dot="green" value="9+" sub="Projects, revisions, fees, GST, teams, portals, and approvals held together" />
        <KpiTile header="Next Action" dot="yellow" value="Owner" sub="Every warning points to the person responsible for moving the work forward" />
      </div>

      <SectionBreak
        eyebrow="02 / One Standard"
        title="What 'standardized' actually means"
        body="Enquiry → proposal → drawings → approvals → billing → handover. Every project follows the same path, every decision lands on the record, and every fee ties back to work done — new intern or twentieth project, the office runs the same way."
      />

      <div className="esti-lp-grid">
        <KpiTile header="Indian Practice" dot="green" value="GST" sub="GST, COA, fee proposals, client approvals, and authority context stay in the record" />
        <KpiTile header="ESTI" dot="yellow" value="AI" sub="Reads the office state, explains risk, and suggests the next responsible action" />
        <FeatureTile
          header="Project Control"
          dot="green"
          meta="DELIVERY"
          title="From enquiry to handover, the project remains one continuous record"
          bullets={[
            "Phases, tasks, drawings, decisions, and site notes move together",
            "Blocked work reaches principals and project leads early",
            "Evidence remains ready for review, handover, and dispute control",
          ]}
        />
        <FeatureTile
          header="Fee Recovery"
          dot="white"
          meta="FINANCE"
          title="Get paid for work you've already done"
          bullets={[
            "Fee proposals, invoices, receipts, GST records, and reconciliation stay connected",
            "Ready-to-bill stages and overdue follow-ups remain visible",
            "Principals connect delivery movement to fee recovery",
          ]}
        />
        <FeatureTile
          header="Team Visibility"
          dot="green"
          meta="HR + LOAD"
          title="Stop being the only person who knows everything"
          bullets={[
            "Attendance, task ownership, and project pressure are visible together",
            "Leads can rebalance work before deadlines begin to slip",
            "Sensitive finance and owner views remain controlled",
          ]}
        />
        <FeatureTile
          header="Client Experience"
          dot="green"
          meta="PORTALS"
          title="Let clients decide inside a record, not inside WhatsApp noise"
          bullets={[
            "Approvals, drawings, RFIs, and fee status move through scoped portals",
            "Clients, consultants, and contractors see only what belongs to them",
            "Decisions stop disappearing into screenshots and forwarded messages",
          ]}
        />
      </div>

      <SectionBreak
        eyebrow="03 / See It Running"
        title="Enter a working office, not an empty dashboard"
        body="The demo opens with projects, fees, revisions, client approvals, team load, and recommendations already in motion."
      />

      <div className="esti-lp-grid">
        <DemoTile kind="team" onOpen={onStudioDemo} loading={demoLoading} activeKind={demoKind} />
        <FeatureTile
          header="Live Scenario"
          dot="green"
          meta="WORKING OFFICE"
          title="See how the system behaves before asking your team to change its habits"
          bullets={[
            "The dashboard reads populated project, fee, client, and team records",
            "Warnings explain what needs attention and why",
            "You can judge the office rhythm before rollout",
          ]}
        />
        <RevisionTile />
        <FeatureTile
          header="Revision Memory"
          dot="yellow"
          meta="FEE + TIME IMPACT"
          title="Never absorb a free revision again"
          bullets={[
            "Client-driven changes can carry fee and time impact",
            "Approval records show who accepted what and when",
            "Repeated revision pressure becomes visible to the principal",
          ]}
        />
      </div>

      {afterTryIt}

      <SectionBreak
        eyebrow="04 / People Enter"
        title="Controlled visibility for every person around the project"
        body="The owner sees the office. Finance sees billing and GST. The team sees assigned work. Clients see approvals. Contractors see only their issued scope."
      />

      <div className="esti-lp-grid">
        <ContractorPortalTile />
        {demoUsersQ.isLoading ? (
          <Tile span="2x1">
            <TileHead label="Loading Role Entry" dot="yellow" meta="Access model" />
            <TileBody>
              <h3 className="esti-lp-feature-title">Preparing controlled views.</h3>
              <p className="esti-lp-note">
                Owner, finance, team, client, consultant, and contractor access will appear here.
              </p>
            </TileBody>
          </Tile>
        ) : demoUsersQ.isError ? (
          <Tile span="2x1">
            <TileHead label="Role Entry Unavailable" dot="red" meta="Retry later" />
            <TileBody>
              <h3 className="esti-lp-feature-title">Controlled views could not be loaded.</h3>
              <p className="esti-lp-note">
                You can still open the team workspace from the hero.
              </p>
            </TileBody>
          </Tile>
        ) : users.length === 0 ? (
          <Tile span="2x1">
            <TileHead label="Role Entry" dot="white" meta="Not configured" />
            <TileBody>
              <h3 className="esti-lp-feature-title">Role-based visibility is configured inside the live workspace.</h3>
              <p className="esti-lp-note">
                Request access and we will provision owner, finance, team, client, consultant, and contractor views.
              </p>
            </TileBody>
          </Tile>
        ) : (
          users.map((u) => (
            <RoleTile
              key={u.id}
              user={u}
              busy={!!switching}
              activeEmail={switching}
              onSwitch={handleSwitch}
            />
          ))
        )}
      </div>
    </>
  );
}

export function LandingFinalCta({ children }: LandingFinalCtaProps) {
  return (
    <>
      <SectionBreak
        eyebrow="05 / Choose"
        title="Choose the depth of the framework you need"
        body="Start with a shared record, run the full framework across your practice, or deploy AORMS inside your own infrastructure."
      />

      {children}
    </>
  );
}
