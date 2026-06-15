/**
 * ESTI AORMS — marketing landing page.
 * Audience: Indian architecture practices. The hero asks the visitor to pick a
 * path — Freelancer (a solo practice) or Studio (a full team) — and only then
 * reveals a tailored middle section: learn the features, then experience the
 * matching demo. Styled under .esti-lp (a documented marketing exception to the
 * Pure Carbon app policy).
 */
import {
  ArrowRight,
  Asleep,
  Building,
  Calculation,
  Catalog,
  Checkmark,
  Document,
  Light,
  Money,
  Trophy,
  User,
  UserMultiple,
  type CarbonIconType,
} from "@carbon/icons-react";
import { useRef, useState } from "react";
import { trpc } from "../lib/trpc.js";

type ThemeName = "white" | "g100";
type Audience = "freelancer" | "studio";

// ─── content ─────────────────────────────────────────────────────────────────

const CAPS: { icon: CarbonIconType; title: string; body: string }[] = [
  { icon: Money, title: "Fees, GST & collections", body: "COA fee proposals with below-minimum guardrails, GST/TDS invoicing, GSTR & TDS abstracts, and reconciliation." },
  { icon: Document, title: "Projects & drawings", body: "COA-stage projects with phase billing, drawing register, DXF takeoff, revisions, transmittals and inspections." },
  { icon: Calculation, title: "Bylaw compliance", body: "RIE engine for FAR, setbacks, coverage, height and basement — pre-design check or deviation report with PDF." },
  { icon: Catalog, title: "Estimation & BBS", body: "Master DSR rates, item-wise BOQ, and SteelFlow AI drag-and-drop bar bending schedules per IS:456 / IS:2502." },
  { icon: Trophy, title: "Team & performance", body: "Roster, assignments, timesheets and stand-ups feeding a rolling 30-day ASPRF performance score across six KPIs." },
  { icon: Building, title: "Portals & knowledge", body: "Client and consultant portals, a governed Knowledge Bank, plus an immutable activity and audit trail." },
];

const INDIA_POINTS = [
  "Council of Architecture Scale-of-Charges fee benchmarking",
  "GST CGST/SGST/IGST + TDS u/s 194J, with GSTR & TDS abstracts",
  "RIE bylaw engine — FAR, setbacks, ground coverage, height, basement",
  "Immutable, branded compliance and invoice PDFs",
];

const FINANCE_POINTS = [
  "Phase-linked billing — nothing billable slips through the cracks",
  "Every invoice tracked to paid, outstanding or overdue",
  "GST/TDS handled — correct tax split and gap-free numbering",
  "Bank reconciliation — see what you've actually collected",
];

// Money snapshot tiles for the Freelancer finance section (illustrative).
const MONEY_SNAPSHOT = [
  { l: "Ready to bill", v: "₹4.2L" },
  { l: "Outstanding", v: "₹2.8L" },
  { l: "Overdue", v: "₹0.9L" },
  { l: "Collected · FY", v: "₹38L" },
];

const FAQS: { q: string; a: string }[] = [
  { q: "What is an AORMS, and how is it different from generic project software?", a: "AORMS — Architectural Office Resource Management System — is practice-management software built for architecture firms. ESTI understands COA service stages, the Scale of Charges, Indian GST/TDS, bylaw compliance (FAR, setbacks, coverage), drawing revisions and bar bending schedules out of the box." },
  { q: "Does it work for a solo architect as well as a 50-person firm?", a: "Yes. A solo practitioner gets every module under one login; growing studios switch on seniority roles, HR, team assignments, timesheets and ASPRF performance scoring. The same platform scales from one architect to fifty." },
  { q: "How does ESTI handle GST and TDS?", a: "It generates tax invoices with the correct CGST/SGST or IGST split, TDS u/s 194J, the SAC code for professional fees and gap-free FY-sequential numbering. GSTR-1, GSTR-3B and TDS abstracts are built in, with bank and 26AS reconciliation." },
  { q: "Can it check building bylaws like FAR and setbacks?", a: "The RIE engine validates FAR/FSI, ground coverage, setbacks, height, basement and sustainability against a versioned jurisdiction rule-set (e.g. BBMP), runs a pre-design quick check or post-design deviation report, and issues a branded compliance PDF." },
  { q: "Is my data safe, and can I self-host?", a: "ESTI is self-hosted on your own server — your drawings, invoices and client data never leave your infrastructure. Role-based access and separate read-only client and consultant portals ensure outsiders see only what you share. We offer optional managed hosting too." },
];

// Per-audience tailored content. caps = indices into CAPS.
const PERSONA: Record<Audience, {
  icon: CarbonIconType; tag: string; sub: string; pitch: string;
  eyebrow: string; heading: string; lead: string;
  caps: number[];
  plan: { name: string; points: string[] };
  demoLabel: string;
}> = {
  freelancer: {
    icon: User,
    tag: "Freelancer",
    sub: "For a solo practice",
    pitch: "Heads-down in design and on site all day? ESTI quietly keeps the business side straight — what to bill, what's pending, and what's overdue.",
    eyebrow: "For the solo architect",
    heading: "Run the business side without thinking about it",
    lead: "Most architects live in design and site work — and lose track of what was meant to be billed, what's still to collect, and what's gone overdue. ESTI keeps that financial picture current in the background, so your practice stays healthy while you stay on the drawing board.",
    caps: [0, 1, 2, 3, 5],
    plan: { name: "Solo", points: ["Every billable phase, tracked", "GST/TDS invoices & filing, done right", "Outstanding & overdue, always visible", "Drawings, compliance & BBS in one place"] },
    demoLabel: "Experience the Freelancer demo",
  },
  studio: {
    icon: UserMultiple,
    tag: "Studio",
    sub: "Full studio with teams",
    pitch: "Everything a solo gets, plus team roster, workload, timesheets, HR and the ASPRF performance engine.",
    eyebrow: "For studios with teams",
    heading: "Run a studio of 5–50 without the chaos",
    lead: "Everything in the Freelancer plan, plus a team roster and assignments, workload calendar, timesheets and stand-ups, HR & payroll, consultant coordination, and a rolling 30-day ASPRF performance score across six KPIs.",
    caps: [0, 1, 2, 3, 4, 5],
    plan: { name: "Studio", points: ["Up to 15 users, seniority roles", "Workload, timesheets & ASPRF", "Consultant coordination & HR", "SteelFlow BBS & RIE engine"] },
    demoLabel: "Experience the Studio demo",
  },
};

// ─── Landing ─────────────────────────────────────────────────────────────────

export function Landing({ theme, onToggleTheme }: { theme: ThemeName; onToggleTheme: () => void }) {
  const utils = trpc.useUtils();
  const demo = trpc.auth.login.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  const [audience, setAudience] = useState<Audience | null>(null);
  const midRef = useRef<HTMLDivElement>(null);

  // Two demo experiences. Each can either live on THIS instance (log in directly)
  // or on a SEPARATE instance (redirect via a build-time VITE_*_DEMO_URL var).
  const fullDemoUrl = import.meta.env.VITE_FULL_DEMO_URL ?? "";
  const soloDemoUrl = import.meta.env.VITE_SOLO_DEMO_URL ?? "";

  const exploreFull = () => {
    if (fullDemoUrl) { window.location.href = fullDemoUrl; return; }
    demo.mutate({ email: "principal@demo.aorms.in", password: "demo1234" });
  };
  const exploreSolo = () => {
    if (soloDemoUrl) { window.location.href = soloDemoUrl; return; }
    demo.mutate({ email: "solo@demo.aorms.in", password: "demo1234" });
  };
  const exploreDemo = (a: Audience) => (a === "studio" ? exploreFull() : exploreSolo());
  const contact = () => { window.location.href = "mailto:hi@aorms.in?subject=ESTI%20AORMS%20enquiry"; };
  const wa = () => window.open("https://wa.me/919880000000?text=" + encodeURIComponent("Hi, I'd like to know more about ESTI AORMS."), "_blank", "noopener");

  const choose = (a: Audience) => {
    setAudience(a);
    // Let the section mount, then bring it into view.
    setTimeout(() => midRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  // Header, hero and footer are all dark, so the white logo marks are used throughout.
  const aormsOnDark = "/aorms-logo-white.png";
  const hcwLogo = "/hcw-white.png";

  const p = audience ? PERSONA[audience] : null;

  return (
    <div className="esti-lp">
      {/* ── Top bar (login / demo links already here) ─────────────────────── */}
      <header className="esti-lp-bar">
        <a href="#top" className="esti-lp-brand"><img src={aormsOnDark} alt="AORMS" style={{ height: 30 }} /></a>
        <div className="esti-lp-bar-actions">
          <button className="esti-lp-iconbtn" aria-label="Toggle theme" onClick={onToggleTheme}>
            {theme === "white" ? <Asleep size={20} /> : <Light size={20} />}
          </button>
          <button className="esti-lp-btn esti-lp-btn--ghost" onClick={exploreSolo} disabled={demo.isPending}>
            Freelancer demo
          </button>
          <button className="esti-lp-btn esti-lp-btn--gold" onClick={exploreFull} disabled={demo.isPending}>
            {demo.isPending ? "Opening…" : "Studio demo"}
          </button>
        </div>
      </header>

      <main id="top">
        {/* ── Hero + path picker ──────────────────────────────────────────── */}
        <section className="esti-lp-hero">
          <div className="esti-lp-wrap">
            <span className="esti-lp-eyebrow">AORMS · Built for Indian architects</span>
            <h1>Run your practice, <em>not the paperwork.</em></h1>
            <p style={{ maxWidth: "44rem" }}>
              ESTI is the self-hosted office platform for Indian architecture
              practices — COA fee proposals, GST &amp; TDS invoicing, drawings,
              bylaw compliance, BBS and team performance, in one place.
            </p>

            <p className="esti-lp-eyebrow" style={{ marginTop: "2.5rem" }}>Which one are you?</p>
            <div className="esti-lp-grid esti-lp-grid--2" style={{ marginTop: "0.75rem" }}>
              {(["freelancer", "studio"] as const).map((a) => {
                const cfg = PERSONA[a];
                const Icon = cfg.icon;
                const active = audience === a;
                return (
                  <button
                    key={a}
                    className={`esti-lp-card${active ? " esti-lp-card--feature" : ""}`}
                    style={{ cursor: "pointer", textAlign: "left", outline: active ? "2px solid var(--lp-accent)" : undefined }}
                    aria-pressed={active}
                    onClick={() => choose(a)}
                  >
                    <Icon size={28} className="esti-lp-ic" />
                    <h3>{cfg.tag} <span className="esti-lp-muted" style={{ fontWeight: 400 }}>· {cfg.sub}</span></h3>
                    <p>{cfg.pitch}</p>
                    <span className="esti-lp-btn esti-lp-btn--ghost" style={{ marginTop: "0.5rem" }}>
                      {active ? "Selected — see below" : "Explore this path"} <ArrowRight size={16} />
                    </span>
                  </button>
                );
              })}
            </div>
            {demo.error && <p className="esti-lp-hero-note">Could not open the demo: {demo.error.message}</p>}
          </div>
        </section>

        {/* ── Tailored middle (opens after a path is chosen) ──────────────── */}
        {p && audience && (
          <div ref={midRef}>
            {/* Intro for the chosen path */}
            <section className="esti-lp-section">
              <div className="esti-lp-wrap">
                <span className="esti-lp-eyebrow">{p.eyebrow}</span>
                <h2>{p.heading}</h2>
                <p className="esti-lp-lead">{p.lead}</p>

                <div className="esti-lp-grid esti-lp-grid--3" style={{ marginTop: "2rem" }}>
                  {p.caps.map((i) => {
                    const c = CAPS[i]!;
                    const Icon = c.icon;
                    return (
                      <div key={c.title} className="esti-lp-cell">
                        <Icon size={28} className="esti-lp-ic" />
                        <h3>{c.title}</h3>
                        <p>{c.body}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Audience band: Freelancer = financial clarity · Studio = compliance + team */}
            <section className="esti-lp-band">
              <div className="esti-lp-wrap esti-lp-section">
                <div className="esti-lp-grid--2" style={{ display: "grid", gap: "3rem", alignItems: "center" }}>
                  {audience === "freelancer" ? (
                    <>
                      <div>
                        <span className="esti-lp-eyebrow">Financial clarity</span>
                        <h2>Always know what to bill, what's due, and what's in</h2>
                        <p>
                          When you're deep in drawings and site visits, the money side
                          is the first thing to slip. ESTI keeps it current for you:
                          every completed phase becomes a billable line, every invoice
                          is tracked to paid or overdue, and bank reconciliation shows
                          what's actually been collected — so the practice stays healthy
                          without you chasing spreadsheets.
                        </p>
                        <ul className="esti-lp-checks">
                          {FINANCE_POINTS.map((pt) => (
                            <li key={pt}><Checkmark size={18} className="esti-lp-ic" /><span>{pt}</span></li>
                          ))}
                        </ul>
                      </div>
                      <div className="esti-lp-mock" style={{ marginTop: 0 }}>
                        <div className="esti-lp-mock-top"><span /><span /><span /></div>
                        <div style={{ padding: "1.25rem" }}>
                          <div style={{ fontWeight: 500, color: "var(--cds-text-primary)", marginBottom: "1rem" }}>Money at a glance</div>
                          <div className="esti-lp-mock-kpis">
                            {MONEY_SNAPSHOT.map((k) => (
                              <div key={k.l} className="esti-lp-mock-kpi"><small>{k.l}</small><b>{k.v}</b></div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="esti-lp-eyebrow">India-first compliance</span>
                        <h2>Speaks COA, GST and bylaws natively</h2>
                        <p>
                          Foreign tools can't price a COA proposal, split an IGST invoice,
                          or warn you that your FAR is exceeded. ESTI does all three —
                          because it was built for the Indian context, not adapted to it.
                        </p>
                        <ul className="esti-lp-checks">
                          {INDIA_POINTS.map((pt) => (
                            <li key={pt}><Checkmark size={18} className="esti-lp-ic" /><span>{pt}</span></li>
                          ))}
                        </ul>
                      </div>
                      <div className="esti-lp-mock" style={{ marginTop: 0 }}>
                        <div className="esti-lp-mock-top"><span /><span /><span /></div>
                        <div style={{ padding: "1.25rem", display: "grid", gap: "0.9rem" }}>
                          <div style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>Team performance — ASPRF</div>
                          {[
                            { l: "Ar. Vihaan Sharma — Gold", v: 92 },
                            { l: "Ar. Priya Sharma — Silver", v: 78 },
                            { l: "Ar. Ravi Kumar — Bronze", v: 65 },
                          ].map((m) => (
                            <div key={m.l}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem", color: "var(--cds-text-secondary)" }}>
                                <span>{m.l}</span><span>{m.v}</span>
                              </div>
                              <div className="esti-lp-mock-bar"><i style={{ width: `${m.v}%` }} /></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* FAQ (shared) */}
            <section className="esti-lp-section" style={{ paddingTop: 0 }}>
              <div className="esti-lp-wrap" style={{ maxWidth: "60rem" }}>
                <span className="esti-lp-eyebrow">FAQ</span>
                <h2>Frequently asked questions</h2>
                <div className="esti-lp-faq" style={{ marginTop: "2rem" }}>
                  {FAQS.map((f) => (
                    <details key={f.q}>
                      <summary>{f.q}</summary>
                      <p>{f.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>

            {/* Closing CTA — experience the matching demo (login link) */}
            <section className="esti-lp-final">
              <div className="esti-lp-wrap esti-lp-section">
                <span className="esti-lp-eyebrow">{p.tag} · {p.sub}</span>
                <h2>Now try it for yourself</h2>
                <p>Open the {p.tag} demo — a fully populated workspace ({p.plan.name} plan) with real projects, fees, GST invoices and compliance — and see how little admin ESTI leaves you.</p>
                <ul className="esti-lp-checks" style={{ margin: "1.25rem 0" }}>
                  {p.plan.points.map((pt) => (
                    <li key={pt}><Checkmark size={18} className="esti-lp-ic" /><span>{pt}</span></li>
                  ))}
                </ul>
                <div className="esti-lp-hero-cta">
                  <button className="esti-lp-btn esti-lp-btn--gold esti-lp-btn--lg" onClick={() => exploreDemo(audience)} disabled={demo.isPending}>
                    {demo.isPending ? "Opening demo…" : p.demoLabel} <ArrowRight size={18} />
                  </button>
                  <button className="esti-lp-btn esti-lp-btn--ghost esti-lp-btn--lg" onClick={() => choose(audience === "studio" ? "freelancer" : "studio")}>
                    I'm a {audience === "studio" ? "freelancer" : "studio"} instead
                  </button>
                  <button className="esti-lp-btn esti-lp-btn--ghost esti-lp-btn--lg" onClick={contact}>Talk to us</button>
                </div>
                {demo.error && <p className="esti-lp-hero-note">Could not open the demo: {demo.error.message}</p>}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ── Footer (always visible) ───────────────────────────────────────── */}
      <footer className="esti-lp-foot">
        <div className="esti-lp-wrap esti-lp-foot-grid">
          <div>
            <div className="esti-lp-brand" style={{ marginBottom: "0.75rem" }}><img src={aormsOnDark} alt="AORMS" style={{ height: 28 }} /></div>
            <p className="esti-lp-muted">Architectural Office Resource Management System for Indian practices — practice management for solo architects and firms of 5–50.</p>
            <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.75rem" }}>
              <a href="mailto:hi@aorms.in">hi@aorms.in</a>
              <a href="https://wa.me/919880000000" target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a href="https://aorms.in">aorms.in</a>
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <span className="esti-lp-muted" style={{ display: "block", marginBottom: "0.4rem" }}>Developed by</span>
              <a href="https://holagundi.works" target="_blank" rel="noopener noreferrer">
                <img src={hcwLogo} alt="Holagundi Consulting Wurkz" style={{ height: 26, maxWidth: "100%" }} />
              </a>
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>Platform</h3>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {["COA fee proposals", "GST / TDS invoicing", "Drawings & DXF takeoff", "RIE bylaw compliance", "DSR / BOQ / SteelFlow BBS", "ASPRF performance"].map((m) => (
                <span key={m} className="esti-lp-muted">{m}</span>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>Try a demo</h3>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <a href="#top" onClick={() => choose("freelancer")}>Freelancer demo</a>
              <a href="#top" onClick={() => choose("studio")}>Studio demo</a>
              <a href="#" onClick={(e) => { e.preventDefault(); wa(); }}>WhatsApp us</a>
            </div>
          </div>
        </div>
        <div className="esti-lp-wrap" style={{ marginTop: "2rem" }}>
          <span className="esti-lp-muted">© {new Date().getFullYear()} Holagundi Consulting Works · aorms.in · All rights reserved</span>
        </div>
      </footer>
    </div>
  );
}
