import type { ReactNode } from "react";

type Dot = "green" | "yellow" | "red" | "white";

function StatusDot({ color }: { color: Dot }) {
  return <span className={`esti-lp-dot esti-lp-dot--${color}`} aria-hidden>●</span>;
}

function SectionBreak({
  eyebrow,
  title,
  body,
  id,
}: {
  eyebrow: string;
  title: string;
  body: string;
  id?: string;
}) {
  return (
    <section className="esti-lp-section-break" aria-labelledby={id ?? undefined}>
      <div className="esti-lp-section-break__copy">
        <p className="esti-lp-section-break__eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        <p>{body}</p>
      </div>
    </section>
  );
}

function FeatureTile({
  header,
  dot,
  title,
  bullets,
  meta,
  span,
}: {
  header: string;
  dot: Dot;
  title: string;
  bullets: readonly string[];
  meta?: string;
  span?: "1x1" | "2x1" | "2x2" | "4x1";
}) {
  return (
    <article className={`esti-lp-tile esti-lp-tile--${span ?? "1x1"}`}>
      <div className="esti-lp-tile__hdr">
        <StatusDot color={dot} />
        <span className="esti-lp-tile__hdr-label">{header}</span>
        {meta && <span className="esti-lp-tile__hdr-meta">{meta}</span>}
      </div>
      <div className="esti-lp-tile__body">
        <h3 className="esti-lp-feature-title">{title}</h3>
        <ul className="esti-lp-bullets">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

const TRUST_MARKS = [
  "COA fee scales",
  "GST · 26AS · GSTR",
  "NBC & compliance library",
  "CPWD Schedule of Rates",
  "Drawing transmittals",
] as const;

export function TrustStrip() {
  return (
    <section className="esti-lp-partners" id="platform" aria-label="Built for Indian architectural practice">
      <p className="esti-lp-partners__lead">
        Built for architects, interior designers and architectural consultancies in India
      </p>
      <div className="esti-lp-partners__row">
        {TRUST_MARKS.map((p) => (
          <span key={p} className="esti-lp-partners__mark">
            {p}
          </span>
        ))}
      </div>
    </section>
  );
}

const PAIN_POINTS = [
  {
    header: "Scattered record",
    dot: "red" as Dot,
    meta: "THE PROBLEM",
    title: "Approvals live in chats; drawings live in folders nobody trusts",
    bullets: [
      "Fee proposals drift from what was actually agreed",
      "Revisions disappear into screenshots and forwarded PDFs",
    ],
  },
  {
    header: "One spine",
    dot: "green" as Dot,
    meta: "THE ANSWER",
    title: "AORMS holds the operational record — from enquiry to final account",
    bullets: [
      "Projects, drawings, transmittals, revisions and GST in one system",
      "Every decision dated, attributed and visible to the people who need it",
    ],
  },
] as const;

export function PracticeProblemSection() {
  return (
    <>
      <SectionBreak
        eyebrow="For your practice"
        title="Design is your craft. Chasing approvals is not."
        body="Architects and designers lose billable hours when the office record fragments across WhatsApp, email and spreadsheets. AORMS gives the studio one disciplined spine — so principals spend time on design decisions, not archaeology."
        id="practice-problem"
      />
      <div className="esti-lp-grid esti-lp-grid--2">
        {PAIN_POINTS.map((p) => (
          <FeatureTile key={p.header} {...p} span="2x1" />
        ))}
      </div>
    </>
  );
}

const PILLARS = [
  {
    header: "Project delivery",
    dot: "green" as Dot,
    meta: "PHASES · DRAWINGS",
    title: "From enquiry to handover without losing the thread",
    bullets: [
      "Phases, tasks, drawing register and site visits on one timeline",
      "Transmittals and issue logs stay numbered and dated",
    ],
  },
  {
    header: "Fee recovery",
    dot: "white" as Dot,
    meta: "PROPOSALS · GST",
    title: "Get paid for work already on the record",
    bullets: [
      "COA-scale fee proposals linked to invoices and receipts",
      "GST billing, reconciliation and filing abstracts",
    ],
  },
  {
    header: "Revision intelligence",
    dot: "yellow" as Dot,
    meta: "SCOPE PROTECTION",
    title: "Never absorb a change you never agreed to",
    bullets: [
      "Client-driven revisions carry fee and time impact",
      "Meeting minutes become traceable revision requests",
    ],
  },
  {
    header: "Studio load",
    dot: "green" as Dot,
    meta: "TEAM · HR",
    title: "See who is overloaded before burnout becomes resignation",
    bullets: [
      "Attendance, assignments and ASPRF performance in one view",
      "Unlimited staff — no per-seat tiers",
    ],
  },
] as const;

export function CapabilitiesSection() {
  return (
    <>
      <SectionBreak
        eyebrow="Capabilities"
        title="What AORMS does for an architecture office"
        body="The modules architects actually need — not a generic CRM dressed up as practice software."
        id="capabilities-title"
      />
      <div className="esti-lp-grid" id="capabilities">
        {PILLARS.map((p) => (
          <FeatureTile key={p.header} {...p} />
        ))}
      </div>
    </>
  );
}

const WORKFLOW = [
  { step: "01", title: "Enquire & propose", detail: "Lead becomes a scoped fee proposal on the COA scale" },
  { step: "02", title: "Design & issue", detail: "Drawings, transmittals and approvals move as one record" },
  { step: "03", title: "Revise & decide", detail: "Client changes land with scope and fee impact visible" },
  { step: "04", title: "Bill & close", detail: "GST invoices, reconciliation and handover from the same spine" },
] as const;

export function WorkflowSection() {
  return (
    <>
      <SectionBreak
        eyebrow="How it works"
        title="One path — every project, every time"
        body="Whether you are a solo designer or a twenty-person studio, the record follows the same discipline from first conversation to final account."
        id="workflow-title"
      />
      <div className="esti-lp-grid esti-lp-workflow" id="workflow">
        {WORKFLOW.map((s) => (
          <article key={s.step} className="esti-lp-tile esti-lp-tile--1x1 esti-lp-workflow__step">
            <div className="esti-lp-tile__hdr">
              <StatusDot color="green" />
              <span className="esti-lp-tile__hdr-label">{s.title}</span>
              <span className="esti-lp-tile__hdr-meta">{s.step}</span>
            </div>
            <div className="esti-lp-tile__body">
              <p className="esti-lp-note">{s.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export function IntelligenceSection() {
  return (
    <>
      <SectionBreak
        eyebrow="Studio Intelligence"
        title="The office surface that tells you what needs a principal today"
        body="Studio Intelligence ranks live signals — overdue approvals, fee risk, team load — so you open AORMS to action, not to hunt."
        id="intelligence-title"
      />
      <div className="esti-lp-grid">
        <FeatureTile
          header="Action centre"
          dot="yellow"
          meta="DAILY"
          title="Ranked by consequence, not by who shouted last"
          bullets={[
            "Lead, project, financial and team zones with health at a glance",
            "Glass rail + stage layout — the same spatial model as the product",
          ]}
          span="2x1"
        />
        <FeatureTile
          header="Ask ESTI"
          dot="green"
          meta="AI"
          title="An assistant that reads your project record — not a generic chatbot"
          bullets={[
            "Explains risk across fees, revisions and site progress",
            "Bring your own OpenAI-compatible API key for better performance",
          ]}
        />
        <FeatureTile
          header="AI Studio"
          dot="white"
          meta="OPTIONAL"
          title="Plan and rank workflows when your firm enables it"
          bullets={["Hosted model usage is metered — or route through your API key"]}
        />
      </div>
    </>
  );
}

export function EstimationCallout() {
  return (
    <>
      <SectionBreak
        eyebrow="AORMS Estimate"
        title="Detailed BOQ on the desktop — linked to every project"
        body="The workspace runs in the browser. Estimating runs in AORMS Estimate on Windows: measure once, derive quantities, materials and bar bending schedules, then export sealed estimates into project cost management."
        id="estimation-title"
      />
      <div className="esti-lp-grid" id="estimation">
        <FeatureTile
          header="Measure once"
          dot="green"
          meta="DESKTOP"
          title="Enter dimensions; aligned child items derive automatically"
          bullets={["CPWD rate book and project-specific rates"]}
        />
        <FeatureTile
          header="Materials & steel"
          dot="yellow"
          meta="BBS"
          title="Takeoff, recipes and bar bending schedules in one estimating session"
          bullets={["Priced like any other line item in the BOQ"]}
        />
        <FeatureTile
          header="Project link"
          dot="green"
          meta="SYNC"
          title="Sign in before estimating — exports attach to the project record"
          bullets={["No duplicate qty math; one source of truth per project"]}
          span="2x1"
        />
      </div>
    </>
  );
}

export function PortalsSection() {
  return (
    <>
      <SectionBreak
        eyebrow="Portals"
        title="Clients, consultants and contractors see only their scope"
        body="Decisions happen inside a record — not inside a WhatsApp thread that nobody can audit later."
        id="portals-title"
      />
      <div className="esti-lp-grid">
        <FeatureTile
          header="Client portal"
          dot="green"
          meta="APPROVALS"
          title="Clients approve inside the project — not in forwarded screenshots"
          bullets={["Drawings, RFIs, fee status and meeting minutes in one scoped view"]}
        />
        <FeatureTile
          header="Consultant portal"
          dot="green"
          meta="ENGAGEMENT"
          title="External consultants coordinate against the same record you use"
          bullets={["Scoped to assigned engagements only"]}
        />
        <FeatureTile
          header="Contractor portal"
          dot="white"
          meta="SITE"
          title="Site instructions and issued drawings without office-wide access"
          bullets={["Billing movement recorded against the project"]}
          span="2x1"
        />
      </div>
    </>
  );
}

export function IntegrationsBand() {
  return (
    <>
      <SectionBreak
        eyebrow="Integrations"
        title="Connects to how your studio already works"
        body="Storage, calendar feeds, CAD companion and API access — all pointing back to the same project record."
        id="integrations-title"
      />
      <div className="esti-lp-grid" id="integrations">
        <FeatureTile
          header="Storage"
          dot="green"
          meta="CLOUD · BYOS"
          title="5 GB included; scale with per-GB usage or your own S3/NAS"
          bullets={["Drawings, documents and generated PDFs"]}
        />
        <FeatureTile
          header="Calendar"
          dot="green"
          meta="ICS"
          title="Site visits and deadlines on the calendar you already use"
          bullets={["Subscribable feed — no duplicate diary"]}
        />
        <FeatureTile
          header="CAD companion"
          dot="yellow"
          meta="ESTICAD"
          title="Takeoff capture that syncs to the drawing register"
          bullets={["Device-authenticated companion link"]}
        />
        <FeatureTile
          header="API"
          dot="white"
          meta="EXPORT"
          title="Programmatic access and portable XLSX/PDF exports"
          bullets={["Custom integrations for larger studios"]}
        />
      </div>
    </>
  );
}

export function AdoptionSection() {
  return (
    <>
      <SectionBreak
        eyebrow="Adoption"
        title="What studios leave behind — and what they gain"
        body="AORMS is built by practising architects. We describe honestly what changes when a studio moves to one record."
        id="adoption-title"
      />
      <div className="esti-lp-grid" id="reviews">
        <FeatureTile
          header="Before"
          dot="red"
          meta="SCATTERED"
          title="Three chat groups, a shared spreadsheet and a drawing folder nobody trusts"
          bullets={["Fee follow-ups tracked from memory", "Approvals buried in forwards"]}
        />
        <FeatureTile
          header="After"
          dot="green"
          meta="ONE RECORD"
          title="One project timeline the whole studio — and the client — can point to"
          bullets={["Every revision and invoice traceable to a date and a person"]}
        />
      </div>
    </>
  );
}

const FAQS = [
  {
    q: "Who is AORMS for?",
    a: "Registered architects, interior designers and architectural consultancy practices in India — solo studios through mid-sized firms. One standard licence with unlimited users.",
  },
  {
    q: "How much does AORMS cost?",
    a: "Every new account includes 5 GB of cloud storage and the full workspace. You pay for additional storage (per GB-month) and for hosted AI usage, or bring your own API key for Ask ESTI and AI Studio.",
  },
  {
    q: "Is there a desktop app?",
    a: "The AORMS workspace runs in the browser. AORMS Estimate is the Windows desktop app for detailed BOQ and measurement — sign in before estimating and link exports to your projects.",
  },
  {
    q: "Can I use my own AI API key?",
    a: "Yes. In Company → AI, set an OpenAI-compatible endpoint and key. AORMS prefers your provider for performance; hosted usage is not metered while BYO is active.",
  },
  {
    q: "Can I self-host?",
    a: "On-premises deployment is available for firms that need it. Pricing remains usage-based (storage + AI), not edition-based. Contact hi@aorms.in.",
  },
] as const;

export function FaqSection() {
  return (
    <>
      <SectionBreak
        eyebrow="FAQ"
        title="Questions architects ask before switching"
        body="Write to hi@aorms.in if yours is not listed — we answer directly."
        id="faq-title"
      />
      <div className="esti-lp-grid" id="faq">
        {FAQS.map((f) => (
          <FeatureTile key={f.q} header="Q&A" dot="white" title={f.q} bullets={[f.a]} span="2x1" />
        ))}
      </div>
    </>
  );
}

export function FinalCtaSection({ children }: { children?: ReactNode }) {
  return (
    <>
      <SectionBreak
        eyebrow="Get started"
        title="Create your studio record — 5 GB included, unlimited seats"
        body="Full workspace on signup. Pay for storage and AI as you grow. Detailed estimating on the desktop with AORMS Estimate."
        id="pricing-intro"
      />
      {children}
    </>
  );
}
