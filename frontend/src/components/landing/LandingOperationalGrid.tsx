import { Button } from "@mui/material";
import ArrowForward from "@mui/icons-material/ArrowForward";
import type { ReactNode } from "react";
import { ReelLoopTile } from "./LandingMediaTiles.js";

// ── Types ──────────────────────────────────────────────────────────

type Dot = "green" | "yellow" | "red" | "white";
type Span = "1x1" | "2x1" | "2x2" | "4x1";

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="esti-lp-section-label">{children}</p>;
}

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

function FeatureTile({ header, dot, title, bullets, meta, span }: {
  header: string; dot: Dot; title: string; bullets: readonly string[]; meta?: string; span?: Span;
}) {
  return (
    <Tile span={span}>
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

// ── Wireframe: Partners / trust strip ──────────────────────────────
// A "trusted by / built for" band. AORMS deliberately avoids inventing client
// logos, so this states the Indian-practice standards it is built around —
// reusing the existing status-bar styling (no new UI).
const PARTNER_MARKS = [
  "GST-native",
  "COA fee scales",
  "NBC",
  "CPWD Schedule of Rates",
  "26AS · AIS · GSTR",
] as const;

export function PartnersSection() {
  return (
    <section className="esti-lp-partners" id="partners" aria-label="Built for Indian practice">
      <p className="esti-lp-partners__lead">Built for how Indian practices actually work</p>
      <div className="esti-lp-partners__row">
        {PARTNER_MARKS.map((p) => (
          <span key={p} className="esti-lp-partners__mark">{p}</span>
        ))}
      </div>
    </section>
  );
}

// ── Wireframe: Features (4 highlighted) ─────────────────────────────
// The four capabilities that set AORMS apart, in the standard tile grid.
const FEATURES = [
  {
    header: "Project Control",
    dot: "green" as Dot,
    meta: "DELIVERY",
    title: "From enquiry to handover, the project stays one continuous record",
    bullets: ["Phases, tasks, drawings, decisions and site notes move together"],
  },
  {
    header: "Fee Recovery",
    dot: "white" as Dot,
    meta: "FINANCE",
    title: "Get paid for work you've already done",
    bullets: ["Proposals, GST invoices, receipts and reconciliation stay connected"],
  },
  {
    header: "Revision Memory",
    dot: "yellow" as Dot,
    meta: "SCOPE PROTECTION",
    title: "Never absorb a change you never agreed to",
    bullets: ["Client-driven revisions carry a dated fee and time trail"],
  },
  {
    header: "Team Visibility",
    dot: "green" as Dot,
    meta: "HR + LOAD",
    title: "Stop being the only person who knows everything",
    bullets: ["Attendance, task ownership and project pressure are visible together"],
  },
] as const;

export function FeaturesSection() {
  return (
    <>
      <SectionBreak
        eyebrow="Features"
        title="What sets AORMS apart"
        body="The key capabilities that keep a practice's projects, fees and record in one operational spine."
      />
      <div className="esti-lp-grid" id="features">
        {FEATURES.map((f) => (
          <FeatureTile key={f.header} header={f.header} dot={f.dot} meta={f.meta} title={f.title} bullets={f.bullets} />
        ))}
      </div>
    </>
  );
}

// ── Wireframe: Why Us (4 cards) ─────────────────────────────────────
export function WhyUsSection() {
  return (
    <>
      <SectionBreak
        eyebrow="Why Us"
        title="Why practices choose AORMS over spreadsheets and generic tools"
        body="Time back for design, not admin — the office remembers what a person would otherwise have to chase."
      />
      <div className="esti-lp-grid" id="why-us">
        {PRODUCTIVITY_BENEFITS.map((b) => (
          <FeatureTile key={b.header} header={b.header} dot={b.dot} title={b.title} bullets={b.bullets} />
        ))}
      </div>
    </>
  );
}

// ── Section 2: Value Proposition ───────────────────────────────────

const VALUE_PROPS = [
  {
    header: "One record",
    dot: "green" as Dot,
    title: "Projects, revisions, approvals, fees and GST stop living in five different places",
    bullets: ["Every project follows the same standard, from enquiry to handover"],
  },
  {
    header: "No lost fees",
    dot: "yellow" as Dot,
    title: "Client-driven changes carry a visible fee and time trail",
    bullets: ["Revision history shows who asked, who approved, and what it cost"],
  },
  {
    header: "Nothing waits on memory",
    dot: "green" as Dot,
    title: "Blocked work and pending approvals surface on their own",
    bullets: ["The office remembers what a person would otherwise have to chase"],
  },
  {
    header: "Built for India",
    dot: "green" as Dot,
    title: "GST, COA fee scales and the Indian financial year are native, not bolted on",
    bullets: ["Invoicing, reconciliation and filing abstracts follow Indian practice"],
  },
] as const;

export function ValuePropositionSection() {
  return (
    <>
      <SectionBreak
        eyebrow="02 / Why AORMS"
        title="The practice stops depending on someone's memory to protect time, fees, and approvals"
        body="Architectural practices don't lose money because they design badly. They lose it because the office runs on scattered chats, spreadsheets, and verbal approvals no one can find later."
      />
      <div className="esti-lp-grid" id="value">
        {VALUE_PROPS.map((v) => (
          <FeatureTile key={v.header} header={v.header} dot={v.dot} title={v.title} bullets={v.bullets} />
        ))}
      </div>
    </>
  );
}

// ── Section 3: Product Overview ────────────────────────────────────

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
          <DataRow k="First step" v="Create a free Lite workspace" />
          <DataRow k="Office role" v="Remembers, warns, records" />
        </div>
      </TileBody>
    </Tile>
  );
}

export function ProductOverviewSection() {
  return (
    <>
      <SectionBreak
        eyebrow="03 / Product Overview"
        title="A single operating system for an Indian architecture practice"
        body="AORMS holds projects, communication, tasks, decisions, drawings, documents, statutory work, fees, invoices, consultants, contractors and office resources in one operational record — not a generic ERP fitted to construction."
      />
      <div className="esti-lp-grid" id="platform">
        <ProductStoryTile />
        <FeatureTile
          header="Core Capabilities"
          dot="green"
          meta="SUMMARY"
          title="Everything a project touches, in one place"
          bullets={[
            "Projects, phases, tasks, drawings and decisions",
            "GST invoicing, reconciliation and filing abstracts",
            "Client, consultant and contractor portals",
            "Team workload, HR and performance scoring",
          ]}
          span="2x1"
        />
        <KpiTile header="Office Record" dot="green" value="9+" sub="Projects, revisions, fees, GST, teams, portals, and approvals held together" />
      </div>
    </>
  );
}

// ── Section 4: Feature Group 1 — Run the practice ──────────────────

export function FeatureGroup1Section() {
  return (
    <>
      <SectionBreak
        eyebrow="04 / Run The Practice"
        title="What 'standardized' actually means"
        body="Enquiry → proposal → drawings → approvals → billing → handover. Every project follows the same path, every decision lands on the record, and every fee ties back to work done — new intern or twentieth project, the office runs the same way."
      />
      <div className="esti-lp-grid">
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
      </div>
    </>
  );
}

// ── Section 5: Feature Group 2 — Protect the record ────────────────

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

export function FeatureGroup2Section() {
  return (
    <>
      <SectionBreak
        eyebrow="05 / Protect The Record"
        title="Never absorb a change you never agreed to"
        body="Every revision, document and approval is dated, attributed and kept — so a dispute over scope or a missing drawing is a five-second lookup, not a week of searching chat history."
      />
      <div className="esti-lp-grid">
        <ReelLoopTile
          slug="mom-revision"
          label="Minutes become revision requests"
          meta="MOM REVISION"
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
        <FeatureTile
          header="Document Control"
          dot="green"
          span="2x1"
          meta="DRAWINGS + TRANSMITTALS"
          title="One numbered, dated register for everything issued"
          bullets={[
            "Drawing register, transmittals and issue log stay in sync",
            "Configurable numbering patterns per document type",
            "Revision workflow ties documents to the decisions behind them",
          ]}
        />
      </div>
    </>
  );
}

// ── Section 6: Workflow Overview ───────────────────────────────────

const WORKFLOW_STEPS = [
  { step: "Step 1", title: "Enquiry & Proposal", detail: "A lead becomes a scoped fee proposal against the COA scale" },
  { step: "Step 2", title: "Design & Drawings", detail: "Phases, tasks and drawings move together as one project record" },
  { step: "Step 3", title: "Approvals & Revisions", detail: "Client decisions land on the record with scope and fee impact" },
  { step: "Step 4", title: "Billing & Handover", detail: "GST invoices, reconciliation and final records close the project" },
] as const;

export function WorkflowOverviewSection() {
  return (
    <>
      <SectionBreak
        eyebrow="06 / How It Works"
        title="One path, every project, every time"
        body="A project moves through the same four stages whether it's a solo practice's third commission or a growing studio's fortieth — the record travels with it the whole way."
      />
      <div className="esti-lp-grid">
        {WORKFLOW_STEPS.map((s) => (
          <KpiTile key={s.step} header={s.title} dot="green" value={s.step.replace("Step ", "")} sub={s.detail} />
        ))}
        <FeatureTile
          header="Expected Outcome"
          dot="yellow"
          meta="RESULT"
          span="2x1"
          title="A continuous record from first client conversation to final account"
          bullets={[
            "No stage depends on a person's memory or a private spreadsheet",
            "The next responsible person is always visible",
          ]}
        />
      </div>
    </>
  );
}

// ── Section 7: Productivity Benefits ───────────────────────────────

const PRODUCTIVITY_BENEFITS = [
  {
    header: "Less chasing",
    dot: "green" as Dot,
    title: "Blocked work and missing information surface without a status-update meeting",
    bullets: ["Dependency tracking and standup questions replace 'what's the update?'"],
  },
  {
    header: "Faster billing",
    dot: "yellow" as Dot,
    title: "GST invoices generate from work already recorded, not re-typed from scratch",
    bullets: ["Ready-to-bill stages are visible the moment a phase closes"],
  },
  {
    header: "Faster onboarding",
    dot: "green" as Dot,
    title: "New team members see the same standard on day one",
    bullets: ["No tribal knowledge required to find where a project stands"],
  },
  {
    header: "Fewer surprises",
    dot: "white" as Dot,
    title: "Priority is ranked by consequence, not by who shouted last",
    bullets: ["The task that blocks site work tomorrow outranks a task with no deadline"],
  },
] as const;

export function ProductivityBenefitsSection() {
  return (
    <>
      <SectionBreak
        eyebrow="07 / Productivity"
        title="Time back for design, not admin"
        body="Every hour spent re-explaining project status, hunting for an approval, or re-typing an invoice is an hour not spent on the work a practice is actually paid for."
      />
      <div className="esti-lp-grid">
        {PRODUCTIVITY_BENEFITS.map((b) => (
          <FeatureTile key={b.header} header={b.header} dot={b.dot} title={b.title} bullets={b.bullets} />
        ))}
      </div>
    </>
  );
}

// ── Section 8: Collaboration Capabilities ──────────────────────────

function ContractorPortalTile() {
  return (
    <Tile span="2x1">
      <TileHead label="CO · Contractor Portal" dot="white" />
      <TileBody>
        <p className="esti-lp-note">
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

export function CollaborationSection() {
  return (
    <>
      <SectionBreak
        eyebrow="08 / Collaboration"
        title="Controlled visibility for every person around the project"
        body="The owner sees the office. Finance sees billing and GST. The team sees assigned work. Clients see approvals. Consultants and contractors see only their issued scope."
      />
      <div className="esti-lp-grid">
        <FeatureTile
          header="Client Portal"
          dot="green"
          meta="ONE PROJECT"
          title="Clients decide inside a record, not inside WhatsApp noise"
          bullets={[
            "Approvals, drawings, RFIs, and fee status move through a scoped portal",
            "Issued meeting minutes appear here — ESTI drafts the revision requests they'd otherwise never write",
            "Decisions stop disappearing into screenshots and forwarded messages",
          ]}
        />
        <FeatureTile
          header="Consultant Portal"
          dot="green"
          meta="ENGAGEMENT SCOPE"
          title="Consultants coordinate against the same record the office uses"
          bullets={[
            "Scoped engagement, RFI movement, and issued drawing records",
            "No access beyond the engagements assigned to them",
          ]}
        />
        <ContractorPortalTile />
        <FeatureTile
          header="Team Assignments"
          dot="yellow"
          meta="WORKLOAD"
          title="Every assignment is visible to the people who need to see it"
          bullets={[
            "Project staffing, roles, and workload stay attached to the project",
            "Reassignment happens in the record, not in a side conversation",
          ]}
        />
      </div>
    </>
  );
}

// ── Section 9: Intelligence & Automation ───────────────────────────

export function EstimationSection() {
  return (
    <>
      <SectionBreak
        eyebrow="Estimation & Cost"
        title="Estimate once, cost it forever — CPWD rates, materials and steel, inside the project"
        body="AORMS Estimate is the standalone desktop app for detailed estimating: measure once and it derives the aligned quantities, takes off materials, and builds the Bar Bending Schedule. Export a sealed file, import it into any project's Cost Management, and re-cost live against the CPWD Schedule of Rates or your own project rates."
      />
      <div className="esti-lp-grid" id="estimation">
        <FeatureTile
          header="Measure once"
          dot="green"
          meta="ESTIMATE APP"
          title="Enter one measurement, derive everything aligned to it"
          bullets={[
            "Brick wall → plastering both faces → paint, net of openings — automatically",
            "Material take-off from recipes; nothing re-entered",
          ]}
        />
        <FeatureTile
          header="Rate book, one lever"
          dot="green"
          meta="CPWD DSR"
          title="Quantities are frozen; price is the only thing that moves"
          bullets={[
            "Re-cost against the 4,250-item CPWD schedule or per-project overrides",
            "As-estimated vs as-costed with the variance, live",
          ]}
        />
        <FeatureTile
          header="Bar Bending Schedule"
          dot="yellow"
          meta="IS 456 / IS 2502"
          title="Steel modelled against the code, not 100 manual steps"
          bullets={[
            "Slab, beam, column, footing — cut lengths, laps and weights computed",
            "Priced by the rate book like any other material",
          ]}
        />
      </div>
      <Button variant="contained" size="large" endIcon={<ArrowForward />} href="/download">
        Download AORMS Estimate
      </Button>
    </>
  );
}

export function IntelligenceSection() {
  return (
    <>
      <SectionBreak
        eyebrow="09 / Intelligence & Automation"
        title="ESTI — the intelligence layer embedded in your workspace"
        body="AORMS is the workspace. ESTI (Embedded Studio Intelligence) reads it — continuously calculating office health, recognising pressure, and asking only the questions that need answers. Deterministic systems create the score; ESTI explains it."
      />
      <div className="esti-lp-grid">
        <ReelLoopTile
          slug="task-prioritization"
          label="When everything is urgent"
          meta="TASK PRIORITIZATION"
        />
        <FeatureTile
          header="Ask ESTI"
          dot="yellow"
          meta="AI STUDIO"
          title="A drafting assistant grounded in your own project data"
          bullets={[
            "Drafts explanations, summaries and CAD notes from your own records",
            "Runs on-server (Ollama) or with your own OpenAI-compatible key",
          ]}
        />
        <FeatureTile
          header="Minutes → Revisions"
          dot="green"
          meta="CLIENT PORTAL"
          title="ESTI turns issued meeting minutes into the client's revision requests"
          bullets={[
            "Issue the minutes; ESTI extracts every change discussed into a ready, categorised request",
            "Clients review, edit and send — they never have to write a revision request again",
            "Drafts only: nothing reaches the office without the client's explicit push",
          ]}
        />
        <FeatureTile
          header="Cognition Engine"
          dot="green"
          meta="OFFICE HEALTH"
          title="A deterministic score of office pressure, not a chatbot guess"
          bullets={[
            "Continuously calculates project, financial, team and client health",
            "Surfaces the Action Center — what needs a decision today",
          ]}
        />
        <FeatureTile
          header="ESTI Pulse"
          dot="yellow"
          meta="STANDUP ENGINE"
          title="A dependency graph that asks the right person the right question"
          bullets={[
            "Detects missing approvals, measurements and confirmations automatically",
            "Ranks tasks by consequence — what blocks tomorrow's site work first",
            "Escalates unanswered questions up the chain, never silently",
          ]}
        />
        <FeatureTile
          header="Statutory Awareness"
          dot="green"
          span="4x1"
          meta="INDIA-FIRST"
          title="GST, TDS and the Indian financial year are built into the logic"
          bullets={[
            "CGST/SGST/IGST split, SAC codes and FY-sequential numbering",
            "26AS / AIS / GSTR reconciliation matched automatically",
          ]}
        />
      </div>
    </>
  );
}

// ── Section 10: Integrations ────────────────────────────────────────

export function IntegrationsSection() {
  return (
    <>
      <SectionBreak
        eyebrow="10 / Integrations"
        title="Connects to how a practice already works"
        body="AORMS doesn't ask a practice to abandon its tools — it gives drawings, calendars and storage a common record to point back to."
      />
      <div className="esti-lp-grid" id="integrations">
        <FeatureTile
          header="Storage"
          dot="green"
          meta="BRING YOUR OWN"
          title="Point object storage at your own infrastructure"
          bullets={["NAS or S3-compatible storage for drawings, documents and generated PDFs"]}
        />
        <FeatureTile
          header="ESTICAD"
          dot="yellow"
          meta="DESKTOP COMPANION"
          title="A CAD-side link back to the office record"
          bullets={["Device-authenticated takeoff capture and drawing register sync"]}
        />
        <FeatureTile
          header="Calendar"
          dot="green"
          meta="ICS FEED"
          title="Project deadlines and site visits on your own calendar"
          bullets={["A subscribable feed — no separate calendar to maintain"]}
        />
        <FeatureTile
          header="API & Data Exchange"
          dot="white"
          meta="PRO EDITION"
          title="Programmatic access and portable exports"
          bullets={["API access for custom integrations", "XLSX/PDF export across projects, invoices, GST filings and reports"]}
        />
      </div>
    </>
  );
}

// ── Section 11: Security & Reliability ─────────────────────────────

export function SecuritySection() {
  return (
    <>
      <SectionBreak
        eyebrow="11 / Security & Reliability"
        title="Built to be trusted with a practice's financial and client record"
        body="Access, statutory correctness, backups and audit trails are not add-ons — they're how the record stays usable years into a practice's growth."
      />
      <div className="esti-lp-grid">
        <FeatureTile
          header="Security"
          dot="green"
          meta="ACCESS CONTROL"
          title="A five-level access ladder, not one shared login"
          bullets={["Role-based access, two-factor authentication, org-scoped API keys"]}
        />
        <FeatureTile
          header="Compliance"
          dot="green"
          meta="INDIA-FIRST"
          title="GST and TDS correctness by construction, not by add-on"
          bullets={["Self-hosting keeps every record on infrastructure you control"]}
        />
        <FeatureTile
          header="Reliability"
          dot="yellow"
          meta="BACKUPS"
          title="A documented backup and restore drill, not a hope"
          bullets={["Dedicated cloud infrastructure or self-hosted on your own servers"]}
        />
        <FeatureTile
          header="Auditability"
          dot="green"
          meta="IMMUTABLE LOG"
          title="Every material change is attributed, dated, and kept"
          bullets={["An append-only activity log and a separate audit trail for owners"]}
        />
      </div>
    </>
  );
}

// ── Section 12: Customer Success ───────────────────────────────────

export function CustomerSuccessSection() {
  return (
    <>
      <SectionBreak
        eyebrow="12 / Built For Practices Like Yours"
        title="What practices bring to AORMS — and what they leave behind"
        body="AORMS is early. Rather than invent testimonials, here is honestly what it replaces for the practices adopting it."
      />
      <div className="esti-lp-grid" id="reviews">
        <FeatureTile
          header="Before"
          dot="red"
          meta="SCATTERED"
          title="Three WhatsApp groups, a shared spreadsheet, and a drawing folder nobody can find"
          bullets={["Approvals buried in forwarded screenshots", "Fee follow-ups tracked from memory"]}
        />
        <FeatureTile
          header="After"
          dot="green"
          meta="ONE RECORD"
          title="One project record that the whole team, and the client, can point to"
          bullets={["Every approval, revision and invoice traceable to a date and a person"]}
        />
        <KpiTile header="Adoption Path" dot="yellow" value="Lite → Pro" sub="Start free with a small practice; grow into the full framework without migrating records" />
        <KpiTile header="Data Ownership" dot="green" value="Yours" sub="Self-host at any time — your projects, drawings and financial records travel with you" />
      </div>
    </>
  );
}

// ── Section 13: FAQ ─────────────────────────────────────────────────

const FAQS = [
  {
    q: "Is AORMS really free?",
    a: "AORMS-Lite is free forever for up to three staff logins, with unlimited clients, contractors and projects, and no credit card required. It includes simple non-GST invoicing and basic bank reconciliation.",
  },
  {
    q: "Can I use AORMS without an internet connection?",
    a: "Yes. The Lite edition ships as a native Windows desktop app that runs entirely offline, with your data stored on your own machine.",
  },
  {
    q: "What happens to my data on the free Lite plan?",
    a: "Your projects, drawings and client data remain yours. On Lite, de-identified and aggregated data may be used to improve AORMS's AI models — this is disclosed in full in our legal terms and does not apply once you upgrade to Pro or self-host.",
  },
  {
    q: "What's the difference between Lite and Pro?",
    a: "Lite covers a small practice's core record-keeping. Pro adds GST invoicing, HR and payroll, revision intelligence, AI Studio, unlimited seats, and self-hosting — cloud-hosted or on your own infrastructure.",
  },
  {
    q: "Can I self-host AORMS?",
    a: "Yes, on the Pro edition. AORMS deploys on your own infrastructure with the same feature set as the cloud-hosted option.",
  },
] as const;

export function FaqSection() {
  return (
    <>
      <SectionBreak
        eyebrow="14 / Frequently Asked"
        title="Common questions before you start"
        body="If your question isn't here, write to hi@aorms.in and we'll answer it directly."
      />
      <div className="esti-lp-grid" id="faq">
        {FAQS.map((f) => (
          <FeatureTile key={f.q} header="Q&A" dot="white" title={f.q} bullets={[f.a]} span="2x1" />
        ))}
      </div>
    </>
  );
}

// ── Section 14: Final CTA ──────────────────────────────────────────

export function FinalCtaSection({ children }: { children?: ReactNode }) {
  return (
    <>
      <SectionBreak
        eyebrow="15 / Get Started"
        title="Start with a shared record, then adopt the full framework as the practice grows"
        body="Lite gives a small practice one shared record, free forever. Pro runs the whole practice to one standard — projects, GST, billing, revisions, site visits, portals, team load and AI — cloud-hosted or self-hosted on your own infrastructure."
      />
      {children}
    </>
  );
}
