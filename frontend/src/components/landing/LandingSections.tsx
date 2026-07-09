import CheckIcon from "@mui/icons-material/Check";

// ─── Primitives ────────────────────────────────────────────────────────────────

type Dot = "green" | "yellow" | "red" | "white" | "orange";

function Orb({ color }: { color: Dot }) {
  return <span className={`lp2-dot lp2-dot--${color}`} aria-hidden />;
}

function SectionHead({
  tag,
  title,
  body,
  id,
}: {
  tag: string;
  title: string;
  body: string;
  id?: string;
}) {
  return (
    <div className="lp2-section-head" id={id}>
      <p className="lp2-section-head__tag">{tag}</p>
      <h2 className="lp2-section-head__title">{title}</h2>
      <p className="lp2-section-head__body">{body}</p>
    </div>
  );
}

function Tile({
  dot,
  tag,
  title,
  bullets,
  wide,
}: {
  dot: Dot;
  tag: string;
  title: string;
  bullets: readonly string[];
  wide?: boolean;
}) {
  return (
    <article className={`lp2-tile${wide ? " lp2-tile--wide" : ""}`}>
      <div className="lp2-tile__hdr">
        <Orb color={dot} />
        <span className="lp2-tile__tag">{tag}</span>
      </div>
      <div className="lp2-tile__body">
        <h3 className="lp2-tile__title">{title}</h3>
        <ul className="lp2-tile__bullets">
          {bullets.map(b => <li key={b}>{b}</li>)}
        </ul>
      </div>
    </article>
  );
}

function StepTile({ n, title, detail }: { n: string; title: string; detail: string }) {
  return (
    <article className="lp2-tile lp2-step-tile">
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

// ─── 1. Trust strip ────────────────────────────────────────────────────────────

const MARKS = [
  "COA fee scales",
  "GST · 26AS · GSTR",
  "NBC compliance library",
  "CPWD Schedule of Rates",
  "Drawing transmittals",
  "Bar bending schedules",
] as const;

export function TrustStrip() {
  return (
    <section className="lp2-trust" id="platform" aria-label="Built for Indian practice">
      <p className="lp2-trust__label">Built around the standards Indian practices actually use</p>
      <ul className="lp2-trust__marks">
        {MARKS.map(m => (
          <li key={m}>
            <Orb color="orange" />
            {m}
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
    title: "From enquiry to handover without losing the record",
    bullets: [
      "Phases, tasks and drawings move as one timeline",
      "Transmittals, site visits and approvals all connected",
    ],
  },
  {
    dot: "white" as Dot,
    tag: "Fee recovery",
    title: "Invoices that match the work you have already done",
    bullets: [
      "COA-scale fee proposals linked to GST invoices and receipts",
      "Reconciliation and filing abstracts in the same system",
    ],
  },
  {
    dot: "yellow" as Dot,
    tag: "Revision intelligence",
    title: "Never absorb a change you never agreed to",
    bullets: [
      "Client-driven revisions carry a dated fee and time impact",
      "Meeting minutes become traceable revision requests",
    ],
  },
  {
    dot: "green" as Dot,
    tag: "Studio load",
    title: "See who is overloaded before it becomes a problem",
    bullets: [
      "Attendance, task ownership and ASPRF performance together",
      "Unlimited staff — no per-seat pricing",
    ],
  },
] as const;

export function CapabilitiesSection() {
  return (
    <section className="lp2-section" id="capabilities" aria-labelledby="cap-head">
      <SectionHead
        id="cap-head"
        tag="Capabilities"
        title="One record for everything that makes a practice run"
        body="Not a generic project tool dressed up for architects. AORMS is built around the actual structure of consultancy work — phases, approvals, COA fees, transmittals, GST."
      />
      <div className="lp2-grid lp2-grid--4">
        {CAPS.map(c => <Tile key={c.tag} {...c} />)}
      </div>
    </section>
  );
}

// ─── 3. Workflow ───────────────────────────────────────────────────────────────

const STEPS = [
  { n: "01", title: "Enquiry & proposal", detail: "A lead becomes a scoped fee proposal on the COA scale. The proposal stays attached to the project for the full life of the commission." },
  { n: "02", title: "Design & drawings", detail: "Phases, tasks and drawing register move together. Transmittals are numbered and dated against the project, not filed separately." },
  { n: "03", title: "Approvals & revisions", detail: "Client decisions arrive through a scoped portal — dated, attributed, and with scope and fee impact already attached." },
  { n: "04", title: "Bill & close", detail: "GST invoices generate from work already recorded. Reconciliation, filing abstracts and the final project record close from the same system." },
] as const;

export function WorkflowSection() {
  return (
    <section className="lp2-section" aria-labelledby="wf-head">
      <SectionHead
        id="wf-head"
        tag="How it works"
        title="One path, every project, every time"
        body="Whether you are a solo practice on your third commission or a twenty-person studio on your fortieth, the record travels the same four stages."
      />
      <div className="lp2-grid lp2-grid--4">
        {STEPS.map(s => <StepTile key={s.n} {...s} />)}
      </div>
    </section>
  );
}

// ─── 4. Studio Intelligence ────────────────────────────────────────────────────

export function IntelligenceSection() {
  return (
    <section className="lp2-section" aria-labelledby="ai-head">
      <SectionHead
        id="ai-head"
        tag="Studio Intelligence"
        title="The office surface that tells you what needs a principal today"
        body="Studio Intelligence ranks live signals — overdue approvals, fee risk, revision pressure, team load — so you open AORMS to act, not to hunt."
      />
      <div className="lp2-grid lp2-grid--3">
        <Tile
          dot="yellow"
          tag="Action centre"
          title="Ranked by consequence, not by who last sent a message"
          bullets={[
            "Lead, project, financial and team zones each with health at a glance",
            "Principal sees what blocks site tomorrow — not what shouted loudest",
          ]}
          wide
        />
        <Tile
          dot="green"
          tag="Ask ESTI"
          title="An assistant that reads your project record — not a generic chatbot"
          bullets={["Explains risk across fees, revisions and site progress"]}
        />
        <Tile
          dot="white"
          tag="BYO API key"
          title="Route AI through your own provider for better performance"
          bullets={["OpenAI-compatible endpoint · hosted model as fallback"]}
        />
      </div>
    </section>
  );
}

// ─── 5. In-browser estimation ──────────────────────────────────────────────────

export function EstimationSection() {
  return (
    <section className="lp2-section" aria-labelledby="est-head">
      <SectionHead
        id="est-head"
        tag="Estimation"
        title="BOQ and measurement inside every project"
        body="Take off quantities, build the BOQ, schedule steel, and link CPWD or firm rates — all in the browser. No separate app to install."
      />
      <div className="lp2-grid lp2-grid--3" id="estimation">
        <Tile
          dot="green"
          tag="Measure once"
          title="Structure model drives derived quantities"
          bullets={["Dimensions cascade to items and materials"]}
        />
        <Tile
          dot="yellow"
          tag="Materials & BBS"
          title="Takeoff, recipes and bar bending schedules together"
          bullets={["Steel priced like any other BOQ line"]}
        />
        <Tile
          dot="green"
          tag="Project record"
          title="Estimates stay on the project for the full commission"
          bullets={["Export PDF when ready — one source of truth"]}
        />
      </div>
    </section>
  );
}

/** @deprecated Use EstimationSection — desktop Estimate funnel removed 2026-07. */
export const EstimateSection = EstimationSection;

// ─── 6. Portals ────────────────────────────────────────────────────────────────

export function PortalsSection() {
  return (
    <section className="lp2-section" aria-labelledby="port-head">
      <SectionHead
        id="port-head"
        tag="Portals"
        title="Every person around the project sees only their scope"
        body="Decisions happen inside a record, not inside a chat thread that vanishes. Unlimited clients, consultants and contractors on every account."
      />
      <div className="lp2-grid lp2-grid--3">
        <Tile
          dot="green"
          tag="Client portal"
          title="Approvals, drawings and fee status — not forwarded screenshots"
          bullets={["Scoped per project · MOM-linked revision trace"]}
        />
        <Tile
          dot="green"
          tag="Consultant portal"
          title="RFIs and issued drawings against the same record the office uses"
          bullets={["Scoped to assigned engagements only"]}
        />
        <Tile
          dot="white"
          tag="Contractor portal"
          title="Site instructions and issued drawings without office-wide access"
          bullets={["Billing movement recorded against the project"]}
        />
      </div>
    </section>
  );
}

// ─── 7. Pricing ────────────────────────────────────────────────────────────────

const INCLUDED: string[] = [
  "Unlimited staff, clients, contractors and projects",
  "Projects · drawings · transmittals · approvals",
  "Revision intelligence and document control",
  "GST invoicing · reconciliation · filing abstracts",
  "HR, payroll and ASPRF performance",
  "Client, consultant and contractor portals",
  "Ask ESTI and AI Studio",
  "5 GB cloud storage included",
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

export function PricingSection() {
  return (
    <section className="lp2-section" id="pricing" aria-labelledby="price-head">
      <SectionHead
        id="price-head"
        tag="Pricing"
        title="Start with the full workspace. Pay for storage and AI as you grow."
        body="One standard AORMS licence. Every new account gets the complete feature set and 5 GB of storage."
      />
      <div className="lp2-pricing">
        <div className="lp2-pricing__included">
          <p className="lp2-pricing__tag">What every account includes</p>
          <ul className="lp2-pricing__list">
            {INCLUDED.map(f => (
              <li key={f}>
                <CheckIcon sx={{ fontSize: 15 }} aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="lp2-pricing__meters">
          {METERS.map(m => (
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
                {m.features.map(f => <li key={f}>{f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 8. FAQ ────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Who is AORMS for?",
    a: "Registered architects, interior designers and architectural consultancy practices in India — solo studios to mid-sized firms. Unlimited users on every account; no seat tiers.",
  },
  {
    q: "How much does it cost?",
    a: "Every account includes 5 GB storage and the full workspace. Pay for additional storage per GB-month and for hosted AI usage. Bring your own OpenAI-compatible API key and hosted usage is not metered.",
  },
  {
    q: "Is there a desktop app?",
    a: "No. AORMS runs entirely in your browser at aorms.in — projects, finance, estimation, and portals in one cloud workspace. See wiki.aorms.in for setup guides.",
  },
  {
    q: "Where is the documentation?",
    a: "The official AORMS Wiki lives at wiki.aorms.in — getting started, workflows, finance, estimation, and account setup.",
  },
  {
    q: "Can I self-host AORMS?",
    a: "AORMS is offered as cloud SaaS. Write to hi@aorms.in for dedicated deployment questions.",
  },
  {
    q: "What AI can AORMS use?",
    a: "ESTI cognition, Ask ESTI and AI Studio can use the hosted model (metered) or your own API key from any OpenAI-compatible provider — Ollama, OpenAI, Azure OpenAI, and compatible alternatives.",
  },
  {
    q: "How does client revision management work?",
    a: "Revision requests come from minutes of meetings or direct client messages through the portal. Each is dated, attributed, and can carry a fee and time impact. The pattern of revisions per client is visible to the principal.",
  },
] as const;

export function FaqSection() {
  return (
    <section className="lp2-section" id="faq" aria-labelledby="faq-head">
      <SectionHead
        id="faq-head"
        tag="FAQ"
        title="Questions architects ask before switching"
        body="Write to hi@aorms.in if yours is not listed — we respond directly."
      />
      <div className="lp2-grid lp2-grid--2">
        {FAQS.map(f => (
          <article key={f.q} className="lp2-tile lp2-tile--faq">
            <h3 className="lp2-tile__title lp2-tile__title--q">{f.q}</h3>
            <p className="lp2-tile__detail">{f.a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

