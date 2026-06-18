/**
 * AORMS marketing landing — editorial design system (non-Carbon chrome).
 * Dashboard previews live in LandingCarbonZone and use real Carbon components.
 */
import {
  ArrowRight,
  Calculation,
  Catalog,
  Close,
  Document,
  Menu,
  Money,
  Pen,
  RulerAlt,
  Trophy,
} from "@carbon/icons-react";
import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { trpc } from "../lib/trpc.js";
import { applyLandingSeo, LANDING_SEO } from "../lib/landing-seo.js";
import { formatVisitCount, useLandingVisitCounter } from "../lib/landing-visit.js";
import { LandingEsticadPreview } from "../components/LandingEsticadPreview.js";
import { LandingCarbonZone } from "../components/LandingCarbonZone.js";
import { LandingDashboardPreview } from "../components/LandingDashboardPreview.js";
import { LandingTrialForm } from "../components/LandingTrialForm.js";
import { LandingReveal } from "../components/LandingReveal.js";
import { LandingRevisionMock } from "../components/LandingRevisionMock.js";
import { QualityIntelligencePreview } from "../components/QualityIntelligencePreview.js";

type DemoKind = "solo" | "studio";

const STORY = {
  aorms: {
    title: "AORMS",
    expansion: "Architectural Office Resource Management System",
    body:
      "The practice record — projects, drawing issues, people, COA fee proposals, GST billing and statutory filing.",
  },
  esti: {
    title: "ESTI",
    expansion: "Embedded Studio Intelligence",
    body:
      "Revision classification, RIE checks, ASPRF scoring and billing logic embedded in daily studio work.",
  },
};

const TRUST = [
  "COA Scale of Charges",
  "GST · TDS u/s 194J",
  "FY April – March",
  "Self-hosted VPS",
];

const MODULES: { icon: ElementType; title: string; body: string }[] = [
  {
    icon: Document,
    title: "Client instruction register",
    body: "Minor, Major or Critical — revision risk before unpaid redesign or re-issue GFC.",
  },
  {
    icon: Trophy,
    title: "ASPRF performance",
    body: "Rolling reliability, quality and delivery scores for people, teams and studio.",
  },
  {
    icon: Money,
    title: "Fees & collections",
    body: "COA-aligned proposals, phase-ready billing, GST invoicing and receivables ageing.",
  },
  {
    icon: Calculation,
    title: "Bylaw intelligence",
    body: "RIE envelope checks with branded compliance PDFs for sanction dossiers.",
  },
  {
    icon: Catalog,
    title: "Estimation & BBS",
    body: "Governed DSR, BOQ and IS:2502 bar schedules for structural coordination.",
  },
  {
    icon: RulerAlt,
    title: "Knowledge bank",
    body: "Versioned bye-law rule-sets, specifications and structural templates.",
  },
  {
    icon: Pen,
    title: "ESTICAD drawing app",
    body: "Free Windows CAD for plans and quantity takeoff — measurements feed the project BOQ in AORMS. Draw offline; quantify when connected to your studio.",
  },
];

const INDIA_POINTS = [
  "Scale-of-Charges mapped to COA work categories",
  "CGST / SGST / IGST with gap-free FY numbering",
  "BBMP rule-sets with cited bye-law clauses",
  "Branded PDFs for compliance packs and transmittals",
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What does ESTI stand for?",
    a: "Embedded Studio Intelligence — fee guardrails, RIE compliance, drawing control and billing signals inside your workflow.",
  },
  {
    q: "What is AORMS?",
    a: "Architectural Office Resource Management System — projects, fees, drawing issues, compliance and GST in one record.",
  },
  {
    q: "How are ESTI and AORMS related?",
    a: "AORMS is the office system. ESTI embeds COA fees, RIE checks, revisions, team signals and GST together.",
  },
  {
    q: "I'm a solo architect — is this overkill?",
    a: "One login, full practice depth, no HR until you hire. Roles and ASPRF activate when the studio grows.",
  },
  {
    q: "Does it handle Indian tax and bylaws?",
    a: "GST, TDS u/s 194J, GSTR/TDS abstracts, and RIE for FAR, setbacks, coverage and height.",
  },
  {
    q: "Can I self-host?",
    a: "Your VPS or office server — role-based access, audit trail, and scoped client and consultant portals.",
  },
  {
    q: "What is ESTICAD?",
    a: "ESTICAD is free Windows drawing software from Holagundi — for floor plans, sections and quantity measurement at your desk. It is not a separate practice-management system. When your studio uses AORMS, ESTICAD links to the same project so wall areas, slab quantities and counts flow into your BOQ and estimate instead of a loose Excel on the laptop. You can draft without internet; saving measured quantities needs an active studio connection.",
  },
];

const DEMOS: {
  kind: DemoKind;
  title: string;
  sub: string;
  label: string;
}[] = [
  {
    kind: "solo",
    title: "Solo practitioner",
    sub: "Full practice depth, no HR until you need it.",
    label: "Open solo demo",
  },
  {
    kind: "studio",
    title: "Design studio",
    sub: "Teams of 5–50 with ASPRF and quality intelligence.",
    label: "Open studio demo",
  },
];

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#product", label: "Product" },
  { href: "#demo", label: "Demo" },
  { href: "#beta", label: "Beta" },
];

function PanelHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="esti-lp-panel__head">
      {eyebrow && <p className="esti-lp-kicker">{eyebrow}</p>}
      <h2>{title}</h2>
      {lead && <p className="esti-lp-panel__lead">{lead}</p>}
    </header>
  );
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="esti-lp-check">
      <span className="esti-lp-check__mark" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

export function Landing() {
  const utils = trpc.useUtils();
  const demo = trpc.auth.login.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  const [navOpen, setNavOpen] = useState(false);
  const [demoKind, setDemoKind] = useState<DemoKind | null>(null);

  useEffect(() => {
    applyLandingSeo();
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  const fullDemoUrl = import.meta.env.VITE_FULL_DEMO_URL ?? "";
  const soloDemoUrl = import.meta.env.VITE_SOLO_DEMO_URL ?? "";

  const openDemo = (kind: DemoKind) => {
    setDemoKind(kind);
    if (kind === "solo" && soloDemoUrl) {
      window.location.href = soloDemoUrl;
      return;
    }
    if (kind === "studio" && fullDemoUrl) {
      window.location.href = fullDemoUrl;
      return;
    }
    const email = kind === "solo" ? "solo@demo.aorms.in" : "principal@demo.aorms.in";
    demo.mutate({ email, password: "demo1234" });
  };

  const closeNav = () => setNavOpen(false);

  const aormsLogo = "/aorms-logo.png";
  const aormsLogoWhite = "/aorms-logo-white.png";
  const estiLogo = "/esti-mark-white.png";
  const estiLogoDark = "/esti-mark-black.png";
  const hcwLogo = "/hcw-white.png";
  const visitCount = useLandingVisitCounter();

  return (
    <div className="esti-lp">
      <header className="esti-lp-bar">
        <div className="esti-lp-wrap esti-lp-bar__inner">
          <a href="#top" className="esti-lp-brand" onClick={closeNav}>
            <img src={aormsLogoWhite} alt="AORMS" className="esti-lp-logo" />
            <img src={estiLogo} alt="" className="esti-lp-mark" aria-hidden />
          </a>

          <nav className="esti-lp-bar__nav" aria-label="Page sections">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="esti-lp-bar__link">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="esti-lp-bar__actions">
            <a href="#demo" className="esti-lp-bar__cta">
              Try demo
            </a>
            <button
              type="button"
              className="esti-lp-bar__menu"
              aria-label={navOpen ? "Close menu" : "Open menu"}
              aria-expanded={navOpen}
              onClick={() => setNavOpen((o) => !o)}
            >
              {navOpen ? <Close size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {navOpen && (
        <>
          <button
            type="button"
            className="esti-lp-backdrop"
            aria-label="Close menu"
            onClick={closeNav}
          />
          <nav className="esti-lp-drawer" aria-label="Mobile navigation">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="esti-lp-drawer__link" onClick={closeNav}>
                {n.label}
              </a>
            ))}
            <a href="#demo" className="esti-lp-drawer__link" onClick={closeNav}>
              Try demo
            </a>
            <a href="mailto:hi@aorms.in" className="esti-lp-drawer__link" onClick={closeNav}>
              Contact
            </a>
          </nav>
        </>
      )}

      <main id="top">
        <section className="esti-lp-block esti-lp-block--hero">
          <div className="esti-lp-wrap">
            <div className="esti-lp-hero-split">
              <LandingReveal>
                <div className="esti-lp-hero-copy">
                  <p className="esti-lp-kicker">Practice management · Indian architecture studios</p>
                  <h1>
                    One office record.
                    <br />
                    From briefing to final bill.
                  </h1>
                  <p className="esti-lp-lead">
                    AORMS holds projects, drawing issues, COA fee stages and GST billing in one
                    practice file. ESTI flags revision risk and checks RIE envelopes.{" "}
                    <strong>ESTICAD</strong> is optional free drawing software for Windows — measure
                    on your PC, keep the BOQ on your server. Self-hosted, on infrastructure you
                    control.
                  </p>
                  <div className="esti-lp-hero__actions">
                    <a href="#demo" className="esti-lp-btn esti-lp-btn--primary esti-lp-btn--lg">
                      Try the demo
                    </a>
                    <a href="#beta" className="esti-lp-text-link">
                      Request beta access
                      <ArrowRight size={16} aria-hidden />
                    </a>
                  </div>
                  {demo.error && demoKind && (
                    <p className="esti-lp-note">Could not open demo: {demo.error.message}</p>
                  )}
                  <ul className="esti-lp-trust__list esti-lp-trust__list--hero" aria-label="Trust signals">
                    {TRUST.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              </LandingReveal>

              <LandingReveal delay={80} className="esti-lp-hero__stage">
                <LandingCarbonZone>
                  <LandingDashboardPreview />
                </LandingCarbonZone>
              </LandingReveal>
            </div>
          </div>
        </section>

        <section id="overview" className="esti-lp-block esti-lp-block--board">
          <div className="esti-lp-wrap esti-lp-board">
            <div className="esti-lp-board__row esti-lp-board__row--3">
              <LandingReveal>
                <article className="esti-lp-card">
                  <img src={aormsLogo} alt="AORMS" className="esti-lp-wordmark" />
                  <h3>{STORY.aorms.title}</h3>
                  <p className="esti-lp-meta">{STORY.aorms.expansion}</p>
                  <p>{STORY.aorms.body}</p>
                </article>
              </LandingReveal>
              <LandingReveal delay={60}>
                <article className="esti-lp-card esti-lp-card--accent">
                  <img src={estiLogoDark} alt="" className="esti-lp-mark-lg" aria-hidden />
                  <h3>{STORY.esti.title}</h3>
                  <p className="esti-lp-meta">{STORY.esti.expansion}</p>
                  <p>{STORY.esti.body}</p>
                </article>
              </LandingReveal>
              <LandingReveal delay={120}>
                <article className="esti-lp-card">
                  <h3>India-first</h3>
                  <p className="esti-lp-meta">COA · GST · BBMP</p>
                  <ul className="esti-lp-list esti-lp-list--compact">
                    {INDIA_POINTS.map((pt) => (
                      <CheckItem key={pt}>{pt}</CheckItem>
                    ))}
                  </ul>
                </article>
              </LandingReveal>
            </div>

            <div id="product" className="esti-lp-board__row esti-lp-board__row--product">
              <LandingReveal>
                <article className="esti-lp-panel">
                  <PanelHead
                    eyebrow="Primary capability"
                    title="Client revision control"
                    lead="Minor, Major or Critical — scope, fee and programme impact before the next issue set."
                  />
                  <LandingRevisionMock />
                </article>
              </LandingReveal>
              <LandingReveal delay={80}>
                <article className="esti-lp-panel esti-lp-panel--wide">
                  <PanelHead
                    eyebrow="Office dashboard"
                    title="Quality intelligence"
                    lead="Revision load, quality radar and ASPRF in one morning view."
                  />
                  <LandingCarbonZone wide>
                    <QualityIntelligencePreview />
                  </LandingCarbonZone>
                </article>
              </LandingReveal>
            </div>

            <LandingReveal delay={60}>
              <article id="esticad" className="esti-lp-panel esti-lp-panel--wide">
                <PanelHead
                  eyebrow="Free drawing software · connects to AORMS"
                  title="ESTICAD — draw on your PC, quantify in your practice file"
                  lead="Most architects know AutoCAD or similar for linework. ESTICAD fills that role for studios on AORMS: fast 2D drafting at your desk, with measured quantities written back to the project BOQ — not a second spreadsheet on someone's laptop."
                />
                <LandingEsticadPreview />
              </article>
            </LandingReveal>

            <LandingReveal delay={40}>
              <article id="modules" className="esti-lp-panel">
                <PanelHead
                  eyebrow="What's inside"
                  title="Practice modules"
                  lead="From solo consultancy to fifty-seat studio — without retraining the office."
                />
                <div className="esti-lp-grid esti-lp-grid--3 esti-lp-module-grid">
                  {MODULES.map((m) => {
                    const Icon = m.icon;
                    return (
                      <article key={m.title} className="esti-lp-module">
                        <Icon size={22} aria-hidden className="esti-lp-module__icon" />
                        <h3>{m.title}</h3>
                        <p>{m.body}</p>
                      </article>
                    );
                  })}
                </div>
              </article>
            </LandingReveal>

            <LandingReveal delay={80}>
              <article id="beta" className="esti-lp-panel esti-lp-panel--wide esti-lp-panel--trial">
                <PanelHead
                  eyebrow="For Indian architecture practices"
                  title="Request AORMS beta testing access"
                  lead="Thank you for your interest. AORMS is practice management for architects — projects, drawing issues, COA fees, GST billing, revision control and RIE compliance in one self-hosted record. This is a manual beta programme, not instant trial signup. Tell us about your studio and we will email you about beta access or a walkthrough."
                />
                <LandingTrialForm />
              </article>
            </LandingReveal>

            <div id="demo" className="esti-lp-board__row esti-lp-board__row--bottom">
              {DEMOS.map((d, i) => {
                const loading = demo.isPending && demoKind === d.kind;
                return (
                  <LandingReveal key={d.kind} delay={i * 50}>
                    <article className="esti-lp-demo">
                      <h3>{d.title}</h3>
                      <p className="esti-lp-deck">{d.sub}</p>
                      <button
                        type="button"
                        className="esti-lp-btn esti-lp-btn--primary"
                        onClick={() => openDemo(d.kind)}
                        disabled={demo.isPending}
                      >
                        {loading ? "Opening…" : d.label}
                        {!loading && <ArrowRight size={16} aria-hidden />}
                      </button>
                    </article>
                  </LandingReveal>
                );
              })}
              <LandingReveal delay={100}>
                <article className="esti-lp-panel esti-lp-panel--faq">
                  <PanelHead title="Questions architects ask" />
                  <div className="esti-lp-faq esti-lp-faq--compact">
                    {FAQS.map((f) => (
                      <details key={f.q} className="esti-lp-faq__item">
                        <summary>{f.q}</summary>
                        <p>{f.a}</p>
                      </details>
                    ))}
                  </div>
                </article>
              </LandingReveal>
              <LandingReveal delay={140}>
                <article className="esti-lp-panel esti-lp-panel--cta">
                  <h3>Your drawings stay on your server.</h3>
                  <p>Self-hosted for Indian architecture practices — solo to fifty-person studio.</p>
                  <div className="esti-lp-hero__actions">
                    <a href="#demo" className="esti-lp-btn esti-lp-btn--primary">
                      Try the demo
                    </a>
                    <a href="#beta" className="esti-lp-text-link">
                      Request beta access
                      <ArrowRight size={16} aria-hidden />
                    </a>
                    <a href="mailto:hi@aorms.in" className="esti-lp-text-link">
                      hi@aorms.in
                      <ArrowRight size={16} aria-hidden />
                    </a>
                  </div>
                </article>
              </LandingReveal>
            </div>
          </div>
        </section>
      </main>

      <footer className="esti-lp-footer">
        <div className="esti-lp-wrap">
          <div className="esti-lp-footer__grid">
            <div className="esti-lp-footer__brand">
              <img src={aormsLogoWhite} alt="AORMS" className="esti-lp-logo" />
              <p>{LANDING_SEO.footerBlurb}</p>
            </div>
            <div>
              <h4>Explore</h4>
              <ul className="esti-lp-footer__links">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <a href={n.href}>{n.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Contact</h4>
              <ul className="esti-lp-footer__links">
                <li>
                  <a href="#beta">Request beta access</a>
                </li>
                <li>
                  <a href="mailto:hi@aorms.in">hi@aorms.in</a>
                </li>
                <li>
                  <a href="https://aorms.in">aorms.in</a>
                </li>
                <li>
                  <a href="https://holagundi.works" target="_blank" rel="noopener noreferrer">
                    <img src={hcwLogo} alt="Holagundi Consulting Works" className="esti-lp-hcw" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="esti-lp-footer__meta">
            {visitCount !== undefined && (
              <p className="esti-lp-footer__visits">
                <span className="esti-lp-footer__visits-val">{formatVisitCount(visitCount)}</span>
                {" site visits"}
              </p>
            )}
          </div>
          <p className="esti-lp-footer__copy">
            © {new Date().getFullYear()} Holagundi Consulting Works · All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
