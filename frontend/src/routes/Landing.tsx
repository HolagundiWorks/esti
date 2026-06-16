/**
 * AORMS marketing landing — architect-first, India practice management.
 * Scoped under .esti-lp (documented exception to Pure Carbon app policy).
 */
import {
  ArrowRight,
  Analytics,
  Building,
  Calculation,
  Catalog,
  Checkmark,
  Close,
  Document,
  Menu,
  Money,
  Pen,
  RulerAlt,
  Trophy,
  User,
  UserMultiple,
  type CarbonIconType,
} from "@carbon/icons-react";
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc.js";
import { applyLandingSeo, LANDING_SEO } from "../lib/landing-seo.js";
import { RevisionTransitionPreview } from "../components/RevisionTransitionPreview.js";
import { QualityIntelligencePreview } from "../components/QualityIntelligencePreview.js";

type Audience = "freelancer" | "studio";

const STORY = {
  intro:
    "Every architecture studio juggles the same tension — creative work on one side, and the office machinery that keeps it billable, compliant and deliverable on the other. We built two names for that reality.",
  aorms: {
    title: "AORMS",
    expansion: "Architectural Office Resource Management System",
    body:
      "AORMS is the system your office runs on — not a generic project tool with an architecture skin. It is the single record for projects, fees, drawings, people, compliance and client communication: the architectural office, organised.",
  },
  esti: {
    title: "ESTI",
    expansion: "Embedded Studio Intelligence",
    body:
      "ESTI is your studio's AI agent — Embedded Studio Intelligence woven into how you work. Fee guardrails, bylaw checks, revision tracking and GST logic live inside the work, not in a separate spreadsheet you rebuild every month.",
  },
  bridge:
    "Think of it this way: AORMS is what you need to run a modern architecture office. ESTI is how you get it — embedded, traceable and built for Indian practice from enquiry to final invoice.",
};

const TRUST = [
  "Council of Architecture fee stages",
  "GST · TDS u/s 194J · INR",
  "Financial year Apr – Mar",
  "Self-hosted · your data stays yours",
];

const CAPS_SOLO: { icon: CarbonIconType; title: string; body: string }[] = [
  { icon: Document, title: "Client revision control", body: "Client portal decisions classified Minor, Major or Critical — with explicit warnings before scope, timeline or cost shift." },
  { icon: Money, title: "Fees & collections", body: "COA proposals, GST/TDS invoicing, ready-to-bill phases and ageing — without a finance team." },
  { icon: Calculation, title: "Bylaw intelligence", body: "Pre-design envelope or post-design deviation report — versioned rules, branded compliance PDF." },
  { icon: Catalog, title: "Estimation & BBS", body: "Governed DSR, item-wise BOQ, drag-and-drop bar schedules with IS:2502 cutting lengths." },
  { icon: RulerAlt, title: "Knowledge bank", body: "Compliance rules, specification standards, structural templates — versioned and cited." },
  { icon: User, title: "Solo workspace", body: "Your tasks, leave and dashboard — HR and team modules stay out of the way until you hire." },
];

const CAPS_STUDIO: { icon: CarbonIconType; title: string; body: string }[] = [
  { icon: Document, title: "Client revision control", body: "Every client decision tagged Minor, Major or Critical in the portal — principals see revision risk before accepting scope impact." },
  { icon: Trophy, title: "ASPRF performance", body: "Rolling ASPRF scores across architects and teams — workload, delivery quality and studio performance in one view." },
  { icon: Money, title: "Fees & collections", body: "COA proposals, GST/TDS invoicing, ready-to-bill phases, ageing and bank reconciliation." },
  { icon: Calculation, title: "Bylaw intelligence", body: "Pre-design envelope or post-design deviation report — versioned rules, branded compliance PDF." },
  { icon: Catalog, title: "Estimation & BBS", body: "Governed DSR, item-wise BOQ, drag-and-drop bar schedules with IS:2502 cutting lengths." },
  { icon: RulerAlt, title: "Knowledge bank", body: "Compliance rules, specification standards, structural templates — versioned and cited." },
];

const INDIA_POINTS = [
  "Scale-of-Charges benchmarking and COA service categories",
  "CGST / SGST / IGST split, SAC 998321–998339, gap-free FY numbering",
  "BBMP and jurisdiction rule-sets with cited bye-law clauses",
  "Branded PDFs for compliance, invoices and transmittals",
];

const FAQS: { q: string; a: Record<Audience, string> }[] = [
  {
    q: "What does ESTI stand for?",
    a: {
      freelancer: "ESTI stands for Embedded Studio Intelligence — the software product behind AORMS. It embeds fee logic, compliance checks, drawing control and billing intelligence into your daily workflow instead of leaving them in separate tools.",
      studio: "ESTI stands for Embedded Studio Intelligence — the engine that powers AORMS. For a studio, that means intelligence embedded across projects, team workload, fees, drawings and compliance — one traceable office record, not bolt-on modules.",
    },
  },
  {
    q: "What is AORMS?",
    a: {
      freelancer: "AORMS — Architectural Office Resource Management System — is the category of system your practice runs on: projects, fees, drawings, compliance and GST in one place. ESTI is the product that delivers your AORMS.",
      studio: "AORMS — Architectural Office Resource Management System — is practice software for architecture firms: every office resource from enquiries and drawings to fees, team workload and client portals in one system. ESTI is the embedded intelligence that powers it.",
    },
  },
  {
    q: "What is architectural studio management software?",
    a: {
      freelancer: "Studio management software — an AORMS — connects your projects, COA fees, drawings, compliance and GST in one record. ESTI delivers that AORMS for Indian architects, not adapted from generic project tools.",
      studio: "Architectural studio management software — an AORMS — connects projects, fees, drawings, compliance and GST billing in one traceable office record. ESTI (Embedded Studio Intelligence) powers AORMS for Indian architecture studios.",
    },
  },
  {
    q: "How are ESTI and AORMS related?",
    a: {
      freelancer: "AORMS names the system an architecture office needs. ESTI — Embedded Studio Intelligence — is the product that runs it. You log into ESTI; your practice runs as an AORMS.",
      studio: "AORMS is the architectural office system — resources, records and workflows in one place. ESTI embeds the intelligence: COA fees, RIE compliance, drawing revisions, team signals and GST, wired together for a studio.",
    },
  },
  {
    q: "I'm a solo architect — is this overkill?",
    a: {
      freelancer: "No. You get every module under one login without HR or team overhead. When you hire, seniority roles and attendance switch on without changing systems.",
      studio: "Solo practitioners use the same platform without HR overhead. Studios add roster, workload, attendance and ASPRF on top — one system as you grow.",
    },
  },
  {
    q: "How is ESTI different from Excel and WhatsApp?",
    a: {
      freelancer: "Every drawing revision, approval and invoice stays linked to its project. Clients get a scoped portal instead of scattered files on WhatsApp.",
      studio: "Every drawing revision, approval, decision and invoice stays linked to its project. Clients and consultants get scoped portals instead of scattered files. You stop rebuilding the same spreadsheet every month.",
    },
  },
  {
    q: "Does it handle Indian tax and bylaws?",
    a: {
      freelancer: "Yes — GST (including composition), TDS u/s 194J, GSTR/TDS filing abstracts, and the RIE engine for FAR, setbacks, ground coverage and height.",
      studio: "Yes — GST systems (including composition), TDS u/s 194J, GSTR/TDS filing abstracts, and the RIE engine for FAR, setbacks, ground coverage, height and basement against published rule versions.",
    },
  },
  {
    q: "How does client revision management work?",
    a: {
      freelancer: "Clients submit decisions through the portal. Each is classified Minor, Major or Critical. Major and Critical items show an explicit warning — accepting may affect timeline, cost or scope — before you sign off.",
      studio: "Clients submit decisions through the portal. Each is classified Minor, Major or Critical. Major and Critical items show an explicit warning before principals accept — revision risk feeds your office dashboard alongside ASPRF and billing signals.",
    },
  },
  {
    q: "What is the Quality intelligence dashboard?",
    a: {
      freelancer: "Quality intelligence is a studio dashboard zone — revision risk, scope drift and drawing accuracy rolled up firm-wide. Solo practitioners see revision control on each project; the full quality tile set activates when you run a team.",
      studio: "On the office dashboard, Quality intelligence pairs two live tiles: Revisions (client-driven vs internal error, scope drift, Major/Critical risk band) and Technical quality (drawing accuracy, site query rate). Principals see studio health alongside ASPRF team scores every morning.",
    },
  },
  {
    q: "Can I self-host?",
    a: {
      freelancer: "ESTI is designed for self-hosting on your VPS or office server. Role-based access and audit log keep your project data under your control.",
      studio: "ESTI is designed for self-hosting on your VPS or office server. Role-based access, audit log, and separate client/consultant portals keep outsiders on a need-to-know basis.",
    },
  },
];

const PERSONA: Record<Audience, {
  icon: CarbonIconType;
  pickLabel: string;
  tag: string;
  sub: string;
  headlineEm: string;
  heroLead: string;
  panelTitle: string;
  metrics: { label: string; value: string; tone?: "ok" | "warn" }[];
  panelFoot: string;
  demoLabel: string;
  points: string[];
  modulesLead: string;
  finalLine: string;
}> = {
  freelancer: {
    icon: User,
    pickLabel: "Solo / Freelancer",
    tag: "Solo practice",
    sub: "One architect, full studio",
    headlineEm: "solo practice",
    heroLead: "Every module you need — fees, drawings, RIE, BBS and GST invoicing — without HR clutter or team dashboards in your way.",
    panelTitle: "Your desk · today",
    metrics: [
      { label: "Ready to bill", value: "₹2.1L" },
      { label: "Active projects", value: "4" },
      { label: "Approvals pending", value: "1" },
      { label: "Revision risk", value: "Low", tone: "ok" },
    ],
    panelFoot: "The dashboard a solo principal sees after login — billing and delivery without team noise.",
    demoLabel: "Open demo (solo view)",
    points: ["Client revisions — Minor / Major / Critical", "RIE + SteelFlow on real data", "Client portal with scope warnings", "Dedicated solo demo workspace — no team module"],
    modulesLead: "Same depth as a fifty-person studio, tuned for a single login — COA stages, drawing issues and lakh-formatted receivables out of the box.",
    finalLine: "Self-hosted AORMS for the solo architect who still runs a serious practice.",
  },
  studio: {
    icon: UserMultiple,
    pickLabel: "Team / Studio",
    tag: "Architecture studio",
    sub: "Teams of 5–50",
    headlineEm: "design studio",
    heroLead: "Self-hosted studio management built around what hurts most — uncontrolled client revisions — plus ASPRF team scores, COA fees, drawings, bylaws, BBS and GST from enquiry to final bill.",
    panelTitle: "Office pulse · today",
    metrics: [
      { label: "Ready to bill", value: "₹8.4L" },
      { label: "Open Major revisions", value: "2" },
      { label: "ASPRF · studio avg", value: "78" },
      { label: "Revision risk", value: "Medium", tone: "warn" },
    ],
    panelFoot: "Revision risk, quality intelligence and ASPRF on the dashboard principals use every morning.",
    demoLabel: "Open demo (studio view)",
    points: ["Major / Critical revision workflow in demo", "Quality intelligence on office dashboard", "Rolling ASPRF scores by role", "14 projects · multi-role team"],
    modulesLead: "Revision control and ASPRF lead the module set — then COA stages, RIE deviations, drawing issues and lakh-formatted receivables out of the box.",
    finalLine: "Self-hosted AORMS for Indian architecture — from growing studio to fifty-person office.",
  },
};

export function Landing() {
  const utils = trpc.useUtils();
  const demo = trpc.auth.login.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  const [audience, setAudience] = useState<Audience | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { applyLandingSeo(); }, []);
  useEffect(() => { setMenuOpen(false); }, [audience]);

  const fullDemoUrl = import.meta.env.VITE_FULL_DEMO_URL ?? "";
  const soloDemoUrl = import.meta.env.VITE_SOLO_DEMO_URL ?? "";

  const exploreDemo = () => {
    if (audience === "freelancer" && soloDemoUrl) {
      window.location.href = soloDemoUrl;
      return;
    }
    if (audience === "studio" && fullDemoUrl) {
      window.location.href = fullDemoUrl;
      return;
    }
    const email =
      audience === "freelancer" ? "solo@demo.aorms.in" : "principal@demo.aorms.in";
    demo.mutate({ email, password: "demo1234" });
  };
  const contact = () => { window.location.href = "mailto:hi@aorms.in?subject=ESTI%20AORMS%20enquiry"; };

  const estiLogo = "/esti-mark-white.png";
  const aormsLogo = "/aorms-logo.png";
  const hcwLogo = "/hcw-black.png";
  const p = audience ? PERSONA[audience] : null;
  const caps = audience === "studio" ? CAPS_STUDIO : CAPS_SOLO;

  const sectionNav = (
    <>
      {audience && (
        <>
          <a href="#usp" onClick={() => setMenuOpen(false)}>Why ESTI</a>
          <a href="#modules" onClick={() => setMenuOpen(false)}>Modules</a>
          <a href="#india" onClick={() => setMenuOpen(false)}>India-first</a>
          <a href="#demo" onClick={() => setMenuOpen(false)}>Demo</a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
        </>
      )}
      <a href="#story" onClick={() => setMenuOpen(false)}>Our story</a>
    </>
  );

  return (
    <div className="esti-lp">
      <header className="esti-lp-bar">
        <a href="#top" className="esti-lp-brand">
          <img src={aormsLogo} alt="AORMS" className="esti-lp-logo esti-lp-logo-aorms" />
        </a>
        <button
          type="button"
          className="esti-lp-menu-btn"
          aria-expanded={menuOpen}
          aria-controls="esti-lp-nav-mobile"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <Close size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          <span className="cds--assistive-text">{menuOpen ? "Close menu" : "Open menu"}</span>
        </button>
        <nav className="esti-lp-nav" aria-label="Page sections">
          {sectionNav}
        </nav>
        <nav
          id="esti-lp-nav-mobile"
          className={`esti-lp-nav-mobile${menuOpen ? " esti-lp-nav-mobile--open" : ""}`}
          aria-label="Page sections (mobile)"
        >
          {sectionNav}
        </nav>
        <div className="esti-lp-bar-actions">
          {audience ? (
            <button
              type="button"
              className="esti-lp-btn esti-lp-btn--gold"
              onClick={() => exploreDemo()}
              disabled={demo.isPending}
            >
              {demo.isPending ? "Opening…" : p?.demoLabel}
            </button>
          ) : (
            <button type="button" className="esti-lp-btn esti-lp-btn--ghost" onClick={contact}>
              Contact
            </button>
          )}
        </div>
      </header>

      <main id="top">
        <section className={`esti-lp-hero${audience ? " esti-lp-hero--revealed" : ""}`}>
          <div className="esti-lp-hero-grid esti-lp-wrap">
            <div className="esti-lp-hero-copy">
              <span className="esti-lp-eyebrow">Powered by ESTI · Embedded Studio Intelligence</span>
              <h1>
                {audience ? (
                  <>One office for your <em>{p!.headlineEm}</em> — not ten spreadsheets.</>
                ) : (
                  <>Architectural Studio Management Software for <em>Indian Architects</em></>
                )}
              </h1>
              <p className="esti-lp-hero-lead">
                {audience
                  ? p!.heroLead
                  : "AORMS — Architectural Office Resource Management System — is how a modern studio stays organised. ESTI embeds the intelligence: fees, drawings, bylaws and GST in one self-hosted record."}
              </p>

              {!audience ? (
                <>
                  <p className="esti-lp-hero-prompt">How do you practice?</p>
                  <div className="esti-lp-hero-pick" role="group" aria-label="Choose your practice type">
                    {(["freelancer", "studio"] as const).map((a) => {
                      const cfg = PERSONA[a];
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={a}
                          type="button"
                          className="esti-lp-hero-pick-btn"
                          onClick={() => setAudience(a)}
                        >
                          <Icon size={22} />
                          <span className="esti-lp-hero-pick-label">{cfg.pickLabel}</span>
                          <span className="esti-lp-hero-pick-sub">{cfg.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <ul className="esti-lp-hero-checks">
                    {p!.points.slice(0, 3).map((pt) => (
                      <li key={pt}><Checkmark size={16} /><span>{pt}</span></li>
                    ))}
                  </ul>
                  <div className="esti-lp-hero-cta">
                    <button
                      type="button"
                      className="esti-lp-btn esti-lp-btn--gold esti-lp-btn--lg"
                      onClick={() => exploreDemo()}
                      disabled={demo.isPending}
                    >
                      {demo.isPending ? "Opening…" : p!.demoLabel} <ArrowRight size={18} />
                    </button>
                    <button type="button" className="esti-lp-btn esti-lp-btn--ghost esti-lp-btn--lg" onClick={contact}>
                      Talk to us
                    </button>
                  </div>
                  <button type="button" className="esti-lp-hero-switch" onClick={() => setAudience(null)}>
                    ← Choose a different practice type
                  </button>
                  {demo.error && <p className="esti-lp-hero-note">Could not open demo: {demo.error.message}</p>}
                </>
              )}
            </div>

            {audience && p && (
              <aside className="esti-lp-hero-panel" aria-label="Example office dashboard">
                <div className="esti-lp-hero-panel-hdr">
                  <Pen size={18} />
                  <span>{p.panelTitle}</span>
                </div>
                <ul className="esti-lp-hero-metrics">
                  {p.metrics.map((m) => (
                    <li key={m.label}>
                      <span>{m.label}</span>
                      <strong className={m.tone === "ok" ? "esti-lp-tag-ok" : m.tone === "warn" ? "esti-lp-tag-warn" : undefined}>
                        {m.value}
                      </strong>
                    </li>
                  ))}
                </ul>
                <p className="esti-lp-hero-panel-foot">{p.panelFoot}</p>
              </aside>
            )}
          </div>
          <div className="esti-lp-hero-agent esti-lp-hero-agent--float" role="complementary" aria-label="ESTI AI agent">
            <div className="esti-lp-hero-agent-bubble">
              <p>
                <strong>ESTI</strong> — your AI agent for architecture studio work.
              </p>
              <p className="esti-lp-hero-agent-bubble-note">In active development — more capability shipping soon.</p>
              <span className="esti-lp-hero-agent-bubble-arrow" aria-hidden />
            </div>
            <div className="esti-lp-hero-agent-orb">
              <span className="esti-lp-hero-agent-ring" aria-hidden />
              <span className="esti-lp-hero-agent-dot">
                <img src={estiLogo} alt="" className="esti-lp-hero-agent-mark" />
              </span>
            </div>
            <span className="esti-lp-hero-agent-label">ESTI</span>
          </div>
        </section>

        {audience && p && (
          <div className="esti-lp-main">
            <div className="esti-lp-trust">
              <div className="esti-lp-wrap esti-lp-trust-grid">
                {TRUST.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>

            <section id="usp" className="esti-lp-section esti-lp-usp">
              <div className="esti-lp-wrap esti-lp-usp-revision">
                <span className="esti-lp-eyebrow">Primary capability</span>
                <h2>Client revision management — before scope slips away</h2>
                <p className="esti-lp-lead">
                  {audience === "studio"
                    ? "The workflow studios ask for first: every client decision in the portal is classified Minor, Major or Critical — so principals accept scope impact knowingly, not by accident."
                    : "Every client decision in your portal is classified Minor, Major or Critical — so you accept timeline, cost and scope impact knowingly, not over WhatsApp."}
                </p>
                <div className="esti-lp-usp-grid">
                  <ul className="esti-lp-checks">
                    <li><Checkmark size={18} className="esti-lp-ic" /><span>Client portal submissions tagged Minor, Major or Critical</span></li>
                    <li><Checkmark size={18} className="esti-lp-ic" /><span>Major and Critical decisions surface explicit scope warnings before sign-off</span></li>
                    <li><Checkmark size={18} className="esti-lp-ic" /><span>Revision risk rolls up to your dashboard — open Major and Critical counts at a glance</span></li>
                    <li><Checkmark size={18} className="esti-lp-ic" /><span>Immutable audit trail from client request to principal acceptance</span></li>
                  </ul>
                  <RevisionTransitionPreview />
                </div>
              </div>

              {audience === "studio" && (
                <>
                  <div className="esti-lp-wrap esti-lp-usp-asprf">
                    <div className="esti-lp-usp-asprf-inner">
                      <Trophy size={28} className="esti-lp-ic" />
                      <div>
                        <span className="esti-lp-eyebrow">Studio teams</span>
                        <h3>ASPRF performance scores</h3>
                        <p>
                          Rolling ASPRF scores across architects and teams — tie workload, delivery quality
                          and task signals to measurable studio performance, not gut feel.
                        </p>
                        <ul className="esti-lp-checks esti-lp-checks--inline">
                          <li><Checkmark size={16} className="esti-lp-ic" /><span>Per-role and studio-wide ASPRF roll-ups</span></li>
                          <li><Checkmark size={16} className="esti-lp-ic" /><span>Linked to attendance, tasks and revision load</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="esti-lp-wrap esti-lp-usp-quality">
                    <div className="esti-lp-usp-quality-head">
                      <Analytics size={28} className="esti-lp-ic" />
                      <div>
                        <span className="esti-lp-eyebrow">Office dashboard</span>
                        <h3>Quality intelligence</h3>
                        <p className="esti-lp-usp-quality-lead">
                          Studio-wide design health on one screen — a normalized quality radar,
                          revision source breakdown, and technical metrics alongside ASPRF.
                        </p>
                      </div>
                    </div>
                    <QualityIntelligencePreview />
                    <ul className="esti-lp-checks esti-lp-checks--inline esti-lp-checks--qi">
                      <li><Checkmark size={16} className="esti-lp-ic" /><span>Radar profile — revision health, scope control, drawing accuracy on one chart</span></li>
                      <li><Checkmark size={16} className="esti-lp-ic" /><span>Revisions tile — proportional meter by source, scope drift, risk band</span></li>
                      <li><Checkmark size={16} className="esti-lp-ic" /><span>Technical quality — drawing accuracy, site query rate, internal errors</span></li>
                    </ul>
                  </div>
                </>
              )}
            </section>

            <section id="modules" className="esti-lp-section esti-lp-section--muted">
              <div className="esti-lp-wrap">
                <span className="esti-lp-eyebrow">What&apos;s inside</span>
                <h2>Built for {audience === "freelancer" ? "your solo practice" : "how studios actually run"}</h2>
                <p className="esti-lp-lead">{p.modulesLead}</p>
                <div className="esti-lp-grid esti-lp-grid--3">
                  {caps.map((c) => {
                    const Icon = c.icon;
                    return (
                      <article key={c.title} className="esti-lp-cell">
                        <Icon size={28} className="esti-lp-ic" />
                        <h3>{c.title}</h3>
                        <p>{c.body}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>

            <section id="india" className="esti-lp-band">
              <div className="esti-lp-wrap esti-lp-band-grid">
                <div>
                  <span className="esti-lp-eyebrow">India-first</span>
                  <h2>Foreign tools don&apos;t speak COA, GST or BBMP</h2>
                  <p className="esti-lp-lead">
                    ESTI was written for Indian architecture practices — INR only, FY April to March,
                    lakh/crore formatting, and compliance rule-sets you can cite in a sanction submission.
                  </p>
                  <ul className="esti-lp-checks">
                    {INDIA_POINTS.map((pt) => (
                      <li key={pt}><Checkmark size={18} className="esti-lp-ic" /><span>{pt}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="esti-lp-mock">
                  <div className="esti-lp-mock-top"><span /><span /><span /></div>
                  <div className="esti-lp-mock-body">
                    <p className="esti-lp-mock-title">RIE · BBMP Residential</p>
                    <dl className="esti-lp-mock-dl">
                      <div><dt>FAR utilised</dt><dd>1.42 / 1.50</dd></div>
                      <div><dt>Ground coverage</dt><dd>58% · compliant</dd></div>
                      <div><dt>Front setback</dt><dd>3.2 m · compliant</dd></div>
                      <div><dt>Readiness</dt><dd className="esti-lp-tag-warn">Partial</dd></div>
                    </dl>
                  </div>
                </div>
              </div>
            </section>

            <section id="demo" className="esti-lp-section">
              <div className="esti-lp-wrap">
                <span className="esti-lp-eyebrow">Live demo</span>
                <h2>Explore the {p.tag.toLowerCase()} workspace</h2>
                <p className="esti-lp-lead">
                  Fully populated demo — real projects, fees, GST invoices, drawings and compliance.
                  No signup; explore as {audience === "freelancer" ? "a solo principal" : "a principal architect"} would.
                </p>
                <div className="esti-lp-demo-detail">
                  <ul className="esti-lp-checks">
                    {p.points.map((pt) => (
                      <li key={pt}><Checkmark size={18} className="esti-lp-ic" /><span>{pt}</span></li>
                    ))}
                  </ul>
                  <div className="esti-lp-hero-cta">
                    <button
                      type="button"
                      className="esti-lp-btn esti-lp-btn--gold esti-lp-btn--lg"
                      onClick={() => exploreDemo()}
                      disabled={demo.isPending}
                    >
                      {demo.isPending ? "Opening…" : p.demoLabel} <ArrowRight size={18} />
                    </button>
                    <button type="button" className="esti-lp-btn esti-lp-btn--ghost esti-lp-btn--lg" onClick={contact}>
                      Talk to us
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section id="faq" className="esti-lp-section esti-lp-section--muted">
              <div className="esti-lp-wrap esti-lp-faq-wrap">
                <span className="esti-lp-eyebrow">FAQ</span>
                <h2>Questions architects ask</h2>
                <div className="esti-lp-faq">
                  {FAQS.map((f) => (
                    <details key={f.q}>
                      <summary>{f.q}</summary>
                      <p>{f.a[audience]}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>

            <section className="esti-lp-final">
              <div className="esti-lp-wrap esti-lp-section">
                <Building size={32} className="esti-lp-ic" />
                <h2>Your drawings stay yours. Your practice stays organised.</h2>
                <p>{p.finalLine}</p>
                <div className="esti-lp-hero-cta">
                  <button
                    type="button"
                    className="esti-lp-btn esti-lp-btn--gold esti-lp-btn--lg"
                    onClick={() => exploreDemo()}
                    disabled={demo.isPending}
                  >
                    {p.demoLabel}
                  </button>
                  <button type="button" className="esti-lp-btn esti-lp-btn--ghost esti-lp-btn--lg" onClick={contact}>
                    hi@aorms.in
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        <section id="story" className="esti-lp-section esti-lp-story">
          <div className="esti-lp-wrap">
            <span className="esti-lp-eyebrow">Our story</span>
            <h2>Two names. One purpose.</h2>
            <p className="esti-lp-lead">{STORY.intro}</p>
            <div className="esti-lp-story-grid">
              <article className="esti-lp-story-card">
                <div className="esti-lp-story-logo-wrap">
                  <img src={aormsLogo} alt="AORMS" className="esti-lp-story-logo" />
                </div>
                <h3>{STORY.aorms.title}</h3>
                <p className="esti-lp-story-expansion">{STORY.aorms.expansion}</p>
                <p>{STORY.aorms.body}</p>
              </article>
              <article className="esti-lp-story-card esti-lp-story-card--esti">
                <div className="esti-lp-hero-agent esti-lp-hero-agent--story" aria-hidden>
                  <span className="esti-lp-hero-agent-ring" />
                  <span className="esti-lp-hero-agent-dot">
                    <img src={estiLogo} alt="" className="esti-lp-hero-agent-mark" />
                  </span>
                </div>
                <h3>{STORY.esti.title}</h3>
                <p className="esti-lp-story-expansion">{STORY.esti.expansion}</p>
                <p>{STORY.esti.body}</p>
              </article>
            </div>
            <p className="esti-lp-story-bridge">{STORY.bridge}</p>
          </div>
        </section>
      </main>

      <footer className="esti-lp-foot">
        <div className="esti-lp-wrap esti-lp-foot-grid">
          <div>
            <div className="esti-lp-brand esti-lp-foot-brand">
              <img src={aormsLogo} alt="AORMS" className="esti-lp-logo esti-lp-logo-aorms" />
            </div>
            <p className="esti-lp-muted">{LANDING_SEO.footerBlurb}</p>
            <div className="esti-lp-foot-links">
              <a href="mailto:hi@aorms.in">hi@aorms.in</a>
              <a href="https://aorms.in">aorms.in</a>
            </div>
            <div className="esti-lp-foot-dev">
              <span className="esti-lp-muted">Developed by</span>
              <a href="https://holagundi.works" target="_blank" rel="noopener noreferrer">
                <img src={hcwLogo} alt="Holagundi Consulting Wurkz" className="esti-lp-hcw" />
              </a>
            </div>
          </div>
          <div>
            <h3>Platform</h3>
            <ul className="esti-lp-foot-list">
              {["Client revision control", "Quality intelligence", "ASPRF performance", "COA fee proposals", "Drawing register & DXF", "RIE compliance"].map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Demos</h3>
            <ul className="esti-lp-foot-list esti-lp-foot-list--links">
              <li><button type="button" className="esti-lp-foot-link" onClick={() => exploreDemo()}>Open demo workspace</button></li>
              {audience && <li><a href="#demo">Your selected demo</a></li>}
            </ul>
          </div>
        </div>
        <div className="esti-lp-wrap esti-lp-foot-copy">
          <span className="esti-lp-muted">© {new Date().getFullYear()} Holagundi Consulting Works · All rights reserved</span>
        </div>
      </footer>
    </div>
  );
}
