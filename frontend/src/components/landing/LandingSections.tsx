import CheckIcon from "@mui/icons-material/Check";
import type { CSSProperties, ReactNode } from "react";

// ─── Primitives ────────────────────────────────────────────────────────────────

type Dot = "green" | "yellow" | "red" | "white" | "orange";

type Keyword = { pain: string; solution: string };

function Orb({ color }: { color: Dot }) {
  return <span className={`lp2-dot lp2-dot--${color}`} aria-hidden />;
}

function revealStyle(delay = 0): CSSProperties {
  return { "--lp-reveal-delay": `${delay}ms` } as CSSProperties;
}

/** Section opener: problem as the headline, solution as the supporting line. */
function SectionHead({
  tag,
  problem,
  solution,
  id,
}: {
  tag: string;
  problem: string;
  solution: string;
  id?: string;
}) {
  return (
    <div className="lp2-section-head lp2-reveal" id={id} style={revealStyle(0)}>
      <p className="lp2-section-head__tag">{tag}</p>
      <h2 className="lp2-section-head__title">{problem}</h2>
      <p className="lp2-section-head__body">{solution}</p>
    </div>
  );
}

/** Pain → solution chips that glance the feature set. */
function KeywordStrip({
  label,
  marks,
}: {
  label?: string;
  marks: readonly Keyword[];
}) {
  return (
    <div
      className="lp2-keywords lp2-reveal"
      aria-label={label ?? "Feature glance"}
      style={revealStyle(60)}
    >
      {label && <p className="lp2-keywords__label">{label}</p>}
      <ul className="lp2-keywords__list">
        {marks.map((m) => (
          <li key={`${m.pain}-${m.solution}`}>
            <Orb color="orange" />
            <span className="lp2-trust__pair">
              <span className="lp2-trust__pain">{m.pain}</span>
              <span className="lp2-trust__arrow" aria-hidden>
                →
              </span>
              <span className="lp2-trust__solution">{m.solution}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({
  dot,
  tag,
  title,
  bullets,
  wide,
  delay = 0,
}: {
  dot: Dot;
  tag: string;
  title: string;
  bullets: readonly string[];
  wide?: boolean;
  delay?: number;
}) {
  return (
    <article
      className={`lp2-tile lp2-reveal${wide ? " lp2-tile--wide" : ""}`}
      style={revealStyle(delay)}
    >
      <div className="lp2-tile__hdr">
        <Orb color={dot} />
        <span className="lp2-tile__tag">{tag}</span>
      </div>
      <div className="lp2-tile__body">
        <h3 className="lp2-tile__title">{title}</h3>
        <ul className="lp2-tile__bullets">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function StepTile({
  n,
  title,
  detail,
  delay = 0,
}: {
  n: string;
  title: string;
  detail: string;
  delay?: number;
}) {
  return (
    <article className="lp2-tile lp2-step-tile lp2-reveal" style={revealStyle(delay)}>
      <div className="lp2-tile__hdr">
        <span className="lp2-step-tile__n">{n}</span>
        <span className="lp2-tile__tag">{title}</span>
      </div>
      <div className="lp2-tile__body">
        <p className="lp2-tile__detail">{detail}</p>
      </div>
    </article>
  );
}

function Section({
  id,
  labelledBy,
  children,
}: {
  id: string;
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <section className="lp2-section" id={id} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

// ─── 1. Global keywords bar (after hero) ───────────────────────────────────────

const PLATFORM_MARKS: readonly Keyword[] = [
  { pain: "What to invoice", solution: "Ready on the record" },
  { pain: "Client revisions", solution: "MoM → approval" },
  { pain: "GST & due dates", solution: "On the trail" },
  { pain: "Studio load", solution: "Seen early" },
];

export function TrustStrip() {
  return (
    <section
      className="lp2-trust lp2-reveal"
      id="platform"
      aria-label="Practice pains, tackled"
      style={revealStyle(40)}
    >
      <p className="lp2-trust__label">Built around the standards Indian practices actually use</p>
      <ul className="lp2-trust__marks">
        {PLATFORM_MARKS.map((m) => (
          <li key={m.pain}>
            <Orb color="orange" />
            <span className="lp2-trust__pair">
              <span className="lp2-trust__pain">{m.pain}</span>
              <span className="lp2-trust__arrow" aria-hidden>
                →
              </span>
              <span className="lp2-trust__solution">{m.solution}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── 2. Capabilities ───────────────────────────────────────────────────────────

const CAPS = [
  {
    dot: "green" as Dot,
    tag: "Project delivery",
    title: "Enquiry to handover — without losing the thread",
    bullets: [
      "Phases, tasks and drawings move on one timeline",
      "Transmittals, site visits and approvals stay connected",
    ],
  },
  {
    dot: "yellow" as Dot,
    tag: "Fee recovery",
    title: "Know what to bill before the month closes",
    bullets: [
      "COA payment stages live on the project — not a side sheet",
      "GST invoices and receipts close from the same trail",
    ],
  },
  {
    dot: "white" as Dot,
    tag: "Client revisions",
    title: "MoM in · ESTI extracts · you verify · client approves",
    bullets: [
      "Every change starts from minutes of meeting",
      "Criticality marked before drawings or site move",
    ],
  },
  {
    dot: "green" as Dot,
    tag: "Studio load",
    title: "See overload while there is still time to act",
    bullets: [
      "Attendance, ownership and ASPRF performance together",
      "Unlimited staff — no per-seat pricing",
    ],
  },
] as const;

const CAP_KEYWORDS: readonly Keyword[] = [
  { pain: "Scattered files", solution: "One timeline" },
  { pain: "Money tracking", solution: "Fee recovery" },
  { pain: "Client changes", solution: "MoM → approval" },
  { pain: "Burnout risk", solution: "Studio load view" },
];

export function CapabilitiesSection() {
  return (
    <Section id="capabilities" labelledBy="cap-head">
      <SectionHead
        id="cap-head"
        tag="Capabilities"
        problem="The practice runs on many tools. The record does not."
        solution="AORMS holds delivery, fees, revisions and studio load in one living record — shaped for how Indian architecture studios actually work."
      />
      <div className="lp2-grid lp2-grid--4">
        {CAPS.map((c, i) => (
          <Tile key={c.tag} {...c} delay={40 + i * 70} />
        ))}
      </div>
      <KeywordStrip label="At a glance" marks={CAP_KEYWORDS} />
    </Section>
  );
}

// ─── 3. Fee recovery ───────────────────────────────────────────────────────────

const FEE_TILES = [
  {
    dot: "yellow" as Dot,
    tag: "Ready to invoice",
    title: "See what the studio has earned — and not yet billed",
    bullets: [
      "Completed work against the fee proposal surfaces as invoice-ready",
      "No more hunting spreadsheets for what is still open",
    ],
  },
  {
    dot: "green" as Dot,
    tag: "Payment stages",
    title: "Know the next stage before the client asks",
    bullets: [
      "COA-scale stages stay attached to the project",
      "Principal and accounts see the same next due",
    ],
  },
  {
    dot: "white" as Dot,
    tag: "Incoming & due",
    title: "Receipts and due dates in one glance",
    bullets: [
      "Expected inflows ranked by due date",
      "GST invoices, receipts and filing dates on the same trail",
    ],
  },
  {
    dot: "green" as Dot,
    tag: "Reminders",
    title: "Filing and payment dates that do not slip quietly",
    bullets: [
      "GST filing dates reminded before they become a scramble",
      "Overdue fee stages rise in Studio Intelligence",
    ],
  },
] as const;

const FEE_KEYWORDS: readonly Keyword[] = [
  { pain: "What to invoice", solution: "Invoice-ready work" },
  { pain: "Next payment stage", solution: "Stage on the project" },
  { pain: "Incoming money", solution: "Receipts trail" },
  { pain: "Due dates", solution: "Reminded early" },
];

export function FeeRecoverySection() {
  return (
    <Section id="fee-recovery" labelledBy="fee-head">
      <SectionHead
        id="fee-head"
        tag="Fee recovery"
        problem="The drawings move. The money waits for someone to chase it."
        solution="What needs invoicing, the next payment stage, incoming receipts and due dates stay on the same project record the studio already works in."
      />
      <div className="lp2-grid lp2-grid--4">
        {FEE_TILES.map((c, i) => (
          <Tile key={c.tag} {...c} delay={40 + i * 70} />
        ))}
      </div>
      <KeywordStrip label="At a glance" marks={FEE_KEYWORDS} />
    </Section>
  );
}

// ─── 4. Client revisions ───────────────────────────────────────────────────────

const REVISION_STEPS = [
  {
    n: "01",
    title: "Meeting & MoM",
    detail:
      "Discussion becomes minutes of meeting — the starting point for every change, not a chat that vanishes.",
  },
  {
    n: "02",
    title: "ESTI extracts",
    detail:
      "ESTI reads the minutes and surfaces implied revisions — so the studio asks for a clear request, not a vague follow-up.",
  },
  {
    n: "03",
    title: "Architect verifies",
    detail:
      "You mark criticality and implication — fee, time, design — then forward that reading to the client.",
  },
  {
    n: "04",
    title: "Client approves · site moves",
    detail:
      "Only after approval do drawings and site proceed — with a dated trail the whole studio can trust.",
  },
] as const;

const REVISION_KEYWORDS: readonly Keyword[] = [
  { pain: "Client meeting", solution: "Minutes of meeting" },
  { pain: "What changed?", solution: "ESTI extracts" },
  { pain: "Impact", solution: "Architect marks" },
  { pain: "Go-ahead", solution: "Client approval" },
];

export function ClientRevisionSection() {
  return (
    <Section id="revisions" labelledBy="rev-head">
      <SectionHead
        id="rev-head"
        tag="Client revisions"
        problem="Revisions arrive as chats and half-remembered meetings. The site moves first."
        solution="Every revision is raised from minutes of meeting — extracted, verified, approved — then the change happens on site with a clear trail."
      />
      <div className="lp2-grid lp2-grid--4">
        {REVISION_STEPS.map((s, i) => (
          <StepTile key={s.n} {...s} delay={40 + i * 70} />
        ))}
      </div>
      <KeywordStrip label="At a glance" marks={REVISION_KEYWORDS} />
    </Section>
  );
}

// ─── 5. Workflow ───────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    title: "Enquiry & proposal",
    detail:
      "A lead becomes a scoped fee proposal on the COA scale — attached to the project for the full life of the work.",
  },
  {
    n: "02",
    title: "Design & drawings",
    detail:
      "Phases, tasks and the drawing register move together. Transmittals are numbered and dated against the project.",
  },
  {
    n: "03",
    title: "Approvals & revisions",
    detail:
      "Meetings become minutes. ESTI extracts; the client requests; you mark impact; they approve — then drawings and site move.",
  },
  {
    n: "04",
    title: "Bill & close",
    detail:
      "Invoice-ready work and the next payment stage are already on the record. GST invoices and filing abstracts close from the same system.",
  },
] as const;

const WORKFLOW_KEYWORDS: readonly Keyword[] = [
  { pain: "Lead to fee", solution: "COA proposal" },
  { pain: "Drawing issue", solution: "Numbered transmittal" },
  { pain: "Client revision", solution: "MoM → approval" },
  { pain: "What to invoice", solution: "Ready on the record" },
];

export function WorkflowSection() {
  return (
    <Section id="workflow" labelledBy="wf-head">
      <SectionHead
        id="wf-head"
        tag="How it works"
        problem="Every project invents its own path. The studio pays for the confusion."
        solution="One clear path — enquiry, design, MoM-led revision, bill — so solo studios and twenty-person offices travel the same four stages."
      />
      <div className="lp2-grid lp2-grid--4">
        {STEPS.map((s, i) => (
          <StepTile key={s.n} {...s} delay={40 + i * 70} />
        ))}
      </div>
      <KeywordStrip label="At a glance" marks={WORKFLOW_KEYWORDS} />
    </Section>
  );
}

// ─── 6. Studio Intelligence ────────────────────────────────────────────────────

const INTEL_KEYWORDS: readonly Keyword[] = [
  { pain: "What needs me today?", solution: "Action centre" },
  { pain: "What to invoice", solution: "Fee signal" },
  { pain: "Revision pressure", solution: "MoM trail" },
  { pain: "Ask the record", solution: "Ask ESTI" },
];

export function IntelligenceSection() {
  return (
    <Section id="intelligence" labelledBy="ai-head">
      <SectionHead
        id="ai-head"
        tag="Studio Intelligence"
        problem="You open the office and hunt for what matters. The day is already half gone."
        solution="Studio Intelligence ranks live signals — invoice-ready work, overdue stages, MoM revision pressure, studio load — so you open AORMS to act."
      />
      <div className="lp2-grid lp2-grid--3">
        <Tile
          dot="yellow"
          tag="Action centre"
          title="Ranked by consequence — not by who shouted last"
          bullets={[
            "Fee, revision, project and studio zones with health at a glance",
            "See what blocks cashflow or site tomorrow — not what was loudest",
          ]}
          delay={40}
        />
        <Tile
          dot="green"
          tag="Ask ESTI"
          title="An assistant that reads your project record"
          bullets={["Explains fee stages, MoM revisions and site progress from the same trail"]}
          delay={110}
        />
        <Tile
          dot="white"
          tag="BYO API key"
          title="Route AI through your own provider"
          bullets={["OpenAI-compatible endpoint · hosted model as fallback"]}
          delay={180}
        />
      </div>
      <KeywordStrip label="At a glance" marks={INTEL_KEYWORDS} />
    </Section>
  );
}

// ─── 7. Drawings ───────────────────────────────────────────────────────────────

const DRAWING_KEYWORDS: readonly Keyword[] = [
  { pain: "Which sheet is current?", solution: "Drawing register" },
  { pain: "What was issued?", solution: "Numbered transmittal" },
  { pain: "Client access", solution: "Single portal" },
  { pain: "Approval evidence", solution: "On the record" },
];

export function DrawingsSection() {
  return (
    <Section id="drawings" labelledBy="draw-head">
      <SectionHead
        id="draw-head"
        tag="Drawings"
        problem="Issued sets live in folders. The portal gets a screenshot. Nobody knows which sheet is current."
        solution="One drawing register, numbered transmittals, and a single client portal for the issued set — studio and client read the same record."
      />
      <div className="lp2-grid lp2-grid--3">
        <Tile
          dot="green"
          tag="Drawing register"
          title="Current vs superseded — always clear"
          bullets={["Every sheet version dated against the project"]}
          delay={40}
        />
        <Tile
          dot="yellow"
          tag="Transmittals"
          title="Numbered issues, not forwarded files"
          bullets={["What left the office, when, and to whom"]}
          delay={110}
        />
        <Tile
          dot="green"
          tag="Single portal"
          title="Clients see the issued set — not a chat dump"
          bullets={["Approvals and revisions stay on the same trail"]}
          delay={180}
        />
      </div>
      <KeywordStrip label="At a glance" marks={DRAWING_KEYWORDS} />
    </Section>
  );
}

/** @deprecated Estimation marketing removed 2026-07 — use DrawingsSection. */
export const EstimationSection = DrawingsSection;
export const EstimateSection = DrawingsSection;

// ─── 8. Portals ────────────────────────────────────────────────────────────────

const PORTAL_KEYWORDS: readonly Keyword[] = [
  { pain: "Client approvals", solution: "Scoped portal" },
  { pain: "Revision request", solution: "From MoM" },
  { pain: "Fee status", solution: "Next stage visible" },
  { pain: "Drawing share", solution: "Issued set" },
];

export function PortalsSection() {
  return (
    <Section id="portals" labelledBy="port-head">
      <SectionHead
        id="port-head"
        tag="Portals"
        problem="Approvals and drawings travel as screenshots. The trail disappears."
        solution="Clients submit revision requests and review fee stages in a scoped portal. Consultants and contractors see only their issued set — decisions stay on the record."
      />
      <div className="lp2-grid lp2-grid--3">
        <Tile
          dot="green"
          tag="Client portal"
          title="Revisions, approvals and fee status — not screenshots"
          bullets={[
            "Submit revisions raised from minutes of meeting",
            "Review criticality · approve before site · see next payment stage",
          ]}
          delay={40}
        />
        <Tile
          dot="green"
          tag="Consultant portal"
          title="RFIs and issued drawings against the office record"
          bullets={["Scoped to assigned engagements only"]}
          delay={110}
        />
        <Tile
          dot="white"
          tag="Contractor portal"
          title="Site instructions without office-wide access"
          bullets={["Changes reach site only after the client approval trail"]}
          delay={180}
        />
      </div>
      <KeywordStrip label="At a glance" marks={PORTAL_KEYWORDS} />
    </Section>
  );
}

// ─── 9. Pricing ────────────────────────────────────────────────────────────────

const INCLUDED: string[] = [
  "Unlimited staff, clients, contractors and projects",
  "Fee recovery — invoice-ready work, payment stages, due dates",
  "Client revisions — MoM → ESTI extract → approve → site",
  "Projects · drawings · transmittals · approvals",
  "GST invoicing · reconciliation · filing abstracts",
  "HR, payroll and ASPRF performance",
  "Client, consultant and contractor portals",
  "Ask ESTI and AI Studio · 5 GB cloud storage",
];

const METERS = [
  {
    tag: "Storage",
    dot: "green" as Dot,
    price: "5 GB free",
    sub: "Additional storage per GB-month as you grow",
    features: [
      "Usage visible in Company settings",
      "Archive closed projects to reclaim space",
      "Additional GB-month as you grow",
    ],
  },
  {
    tag: "AI model",
    dot: "yellow" as Dot,
    price: "Metered or BYO",
    sub: "Plug in your own OpenAI-compatible API key",
    features: [
      "Hosted inference billed per usage",
      "BYO key — your provider, your cost",
      "Falls back safely if unreachable",
    ],
    accent: true,
  },
] as const;

const PRICING_KEYWORDS: readonly Keyword[] = [
  { pain: "Seat licences", solution: "Unlimited users" },
  { pain: "Feature tiers", solution: "Full workspace" },
  { pain: "Storage growth", solution: "Pay per GB" },
  { pain: "AI cost", solution: "Metered or BYO" },
];

export function PricingSection() {
  return (
    <Section id="pricing" labelledBy="price-head">
      <SectionHead
        id="price-head"
        tag="Pricing"
        problem="Software that charges per seat teaches you to leave people out."
        solution="Start with the full workspace. Pay for storage and AI as you grow — every account includes the complete feature set and 5 GB."
      />
      <div className="lp2-pricing lp2-reveal" style={revealStyle(40)}>
        <div className="lp2-pricing__included">
          <p className="lp2-pricing__tag">What every account includes</p>
          <ul className="lp2-pricing__list">
            {INCLUDED.map((f) => (
              <li key={f}>
                <CheckIcon sx={{ fontSize: 15 }} aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="lp2-pricing__meters">
          {METERS.map((m) => (
            <div
              key={m.tag}
              className={`lp2-pricing__meter${"accent" in m && m.accent ? " lp2-pricing__meter--accent" : ""}`}
            >
              <div className="lp2-pricing__meter-hdr">
                <span className={`lp2-dot lp2-dot--${m.dot}`} aria-hidden />
                <span className="lp2-pricing__meter-tag">{m.tag}</span>
              </div>
              <p className="lp2-pricing__price">{m.price}</p>
              <p className="lp2-pricing__sub">{m.sub}</p>
              <ul className="lp2-tile__bullets">
                {m.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <KeywordStrip label="At a glance" marks={PRICING_KEYWORDS} />
    </Section>
  );
}

// ─── 10. FAQ ───────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Who is AORMS for?",
    a: "Registered architects, interior designers and architectural consultancy practices in India — solo studios to mid-sized firms. Unlimited users on every account; no seat tiers.",
  },
  {
    q: "How does fee recovery work?",
    a: "AORMS shows what is ready to invoice, the next COA payment stage, incoming receipts and due dates on the project record. GST invoices and filing reminders stay on the same trail — so money tracking is not a side spreadsheet.",
  },
  {
    q: "How much does it cost?",
    a: "Every account includes 5 GB storage and the full workspace. Pay for additional storage per GB-month and for hosted AI usage. Bring your own OpenAI-compatible API key and hosted usage is not metered.",
  },
  {
    q: "Is there a desktop app?",
    a: "No. AORMS runs entirely in your browser at aorms.in — projects, finance, drawings and portals in one cloud workspace. See wiki.aorms.in for setup guides.",
  },
  {
    q: "Where is the documentation?",
    a: "The official AORMS Wiki lives at wiki.aorms.in — getting started, workflows, finance and account setup.",
  },
  {
    q: "Can I self-host AORMS?",
    a: "AORMS is offered as cloud SaaS. Write to hi@aorms.in for dedicated deployment questions.",
  },
  {
    q: "What AI can AORMS use?",
    a: "ESTI cognition, Ask ESTI and AI Studio can use the hosted model (metered) or your own API key from any OpenAI-compatible provider — Ollama, OpenAI, Azure OpenAI, and compatible alternatives. ESTI also extracts revision items from minutes of meeting.",
  },
  {
    q: "How does client revision management work?",
    a: "The client schedules a meeting; discussion becomes minutes of meeting. ESTI extracts implied revisions and the studio asks the client to submit a revision request. The architect verifies criticality and implications, the client approves — then changes proceed on drawings and site with a dated trail.",
  },
] as const;

const FAQ_KEYWORDS: readonly Keyword[] = [
  { pain: "Who is it for?", solution: "Indian architecture studios" },
  { pain: "Money tracking?", solution: "Fee recovery" },
  { pain: "Revisions?", solution: "MoM → approval" },
  { pain: "Seats?", solution: "Unlimited" },
];

export function FaqSection() {
  return (
    <Section id="faq" labelledBy="faq-head">
      <SectionHead
        id="faq-head"
        tag="FAQ"
        problem="Switching tools raises the same questions every principal asks."
        solution="Open a question for the answer — write to hi@aorms.in if yours is not listed."
      />
      <div className="lp2-faq lp2-reveal" style={revealStyle(40)}>
        {FAQS.map((f) => (
          <details key={f.q} className="lp2-faq__item">
            <summary className="lp2-faq__q">{f.q}</summary>
            <p className="lp2-faq__a">{f.a}</p>
          </details>
        ))}
      </div>
      <KeywordStrip label="At a glance" marks={FAQ_KEYWORDS} />
    </Section>
  );
}
