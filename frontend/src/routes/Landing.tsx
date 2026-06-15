/**
 * ESTI AORMS — marketing landing page.
 * Audience: Indian architecture practices — solo architects and firms of 5–50.
 * Branded (ESTI indigo on ink), editorial, SEO-keyworded. Styled under .esti-lp
 * (a documented marketing exception to the Pure Carbon app policy).
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
  type CarbonIconType,
} from "@carbon/icons-react";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

type ThemeName = "white" | "g100";


// ─── content ─────────────────────────────────────────────────────────────────

const STATS: { value: string; label: string }[] = [
  { value: "1 platform", label: "replaces Excel, Tally, email & WhatsApp" },
  { value: "GST + TDS", label: "CGST/SGST/IGST & 194J, built in" },
  { value: "COA", label: "Scale-of-Charges fee compliance" },
  { value: "Self-hosted", label: "your server, your data" },
];

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

const FAQS: { q: string; a: string }[] = [
  { q: "What is an AORMS, and how is it different from generic project software?", a: "AORMS — Architectural Office Resource Management System — is practice-management software built for architecture firms. ESTI understands COA service stages, the Scale of Charges, Indian GST/TDS, bylaw compliance (FAR, setbacks, coverage), drawing revisions and bar bending schedules out of the box." },
  { q: "Does it work for a solo architect as well as a 50-person firm?", a: "Yes. A solo practitioner gets every module under one login; growing studios switch on seniority roles, HR, team assignments, timesheets and ASPRF performance scoring. The same platform scales from one architect to fifty." },
  { q: "How does ESTI handle GST and TDS?", a: "It generates tax invoices with the correct CGST/SGST or IGST split, TDS u/s 194J, the SAC code for professional fees and gap-free FY-sequential numbering. GSTR-1, GSTR-3B and TDS abstracts are built in, with bank and 26AS reconciliation." },
  { q: "Can it check building bylaws like FAR and setbacks?", a: "The RIE engine validates FAR/FSI, ground coverage, setbacks, height, basement and sustainability against a versioned jurisdiction rule-set (e.g. BBMP), runs a pre-design quick check or post-design deviation report, and issues a branded compliance PDF." },
  { q: "Is my data safe, and can I self-host?", a: "ESTI is self-hosted on your own server — your drawings, invoices and client data never leave your infrastructure. Role-based access and separate read-only client and consultant portals ensure outsiders see only what you share. We offer optional managed hosting too." },
];

// ─── Landing ─────────────────────────────────────────────────────────────────

export function Landing({ theme, onToggleTheme }: { theme: ThemeName; onToggleTheme: () => void }) {
  const utils = trpc.useUtils();
  const [annual, setAnnual] = useState(true);
  const demo = trpc.auth.login.useMutation({ onSuccess: () => utils.auth.me.invalidate() });

  // The demo login this instance opens (override per-instance, e.g. the solo
  // instance sets VITE_DEMO_EMAIL=solo@demo.aorms.in) and an optional link to a
  // separate solo-firm demo instance (e.g. https://solo.aorms.in).
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL ?? "principal@demo.aorms.in";
  const soloDemoUrl = import.meta.env.VITE_SOLO_DEMO_URL ?? "";

  const runDemo = () => demo.mutate({ email: demoEmail, password: "demo1234" });
  const openSoloDemo = () => { if (soloDemoUrl) window.location.href = soloDemoUrl; };
  const contact = () => { window.location.href = "mailto:hi@aorms.in?subject=ESTI%20AORMS%20enquiry"; };
  const wa = () => window.open("https://wa.me/919880000000?text=" + encodeURIComponent("Hi, I'd like to know more about ESTI AORMS."), "_blank", "noopener");

  const solo = annual ? "₹499" : "₹599";
  const studio = annual ? "₹2,499" : "₹2,999";

  // ESTI mark: white on dark backgrounds, black on light; theme-aware for the
  // top bar / footer (which sit on the Carbon background that flips with theme).
  const aormsOnDark = "/aorms-logo-white.png";
  const aormsAuto = theme === "white" ? "/aorms-logo.png" : "/aorms-logo-white.png";
  const hcwLogo = theme === "white" ? "/hcw-black.png" : "/hcw-white.png";

  return (
    <div className="esti-lp">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="esti-lp-bar">
        <a href="#top" className="esti-lp-brand"><img src={aormsAuto} alt="AORMS" style={{ height: 30 }} /></a>
        <nav className="esti-lp-nav">
          <a href="#modules">Modules</a>
          <a href="#compliance">Compliance</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="esti-lp-bar-actions">
          <button className="esti-lp-iconbtn" aria-label="Toggle theme" onClick={onToggleTheme}>
            {theme === "white" ? <Asleep size={20} /> : <Light size={20} />}
          </button>
          {soloDemoUrl && (
            <button className="esti-lp-btn esti-lp-btn--ghost" onClick={openSoloDemo}>Solo demo</button>
          )}
          <button className="esti-lp-btn esti-lp-btn--gold" onClick={runDemo} disabled={demo.isPending}>
            {demo.isPending ? "Opening…" : soloDemoUrl ? "Studio demo" : "Live demo"}
          </button>
        </div>
      </header>

      <main id="top">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="esti-lp-hero">
          <div className="esti-lp-wrap esti-lp-hero-grid">
            <div>
              <span className="esti-lp-eyebrow">AORMS · Built for Indian architects</span>
              <h1>Run your practice, <em>not the paperwork.</em></h1>
              <p>
                ESTI is the self-hosted office platform for Indian architecture
                practices — COA fee proposals, GST &amp; TDS invoicing, drawings,
                bylaw compliance, BBS and team performance, in one place.
              </p>
              <div className="esti-lp-hero-cta">
                <button className="esti-lp-btn esti-lp-btn--gold esti-lp-btn--lg" onClick={runDemo} disabled={demo.isPending}>
                  {demo.isPending ? "Opening demo…" : "Explore the studio demo"} <ArrowRight size={18} />
                </button>
                {soloDemoUrl
                  ? <button className="esti-lp-btn esti-lp-btn--ghost esti-lp-btn--lg" onClick={openSoloDemo}>Solo architect? Try the solo demo</button>
                  : <button className="esti-lp-btn esti-lp-btn--ghost esti-lp-btn--lg" onClick={contact}>Talk to us</button>}
              </div>
              <p className="esti-lp-hero-note">No credit card · a full studio demo (team + HR) and a solo-practice demo · your data stays on your own server.</p>
              {demo.error && <p className="esti-lp-hero-note">Could not open the demo: {demo.error.message}</p>}
            </div>
            <img src={aormsOnDark} className="esti-lp-mark" alt="AORMS" />
          </div>
        </section>

        {/* ── Stat strip ──────────────────────────────────────────────────── */}
        <div className="esti-lp-stats">
          {STATS.map((s) => (
            <div key={s.label} className="esti-lp-stat">
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Product ─────────────────────────────────────────────────────── */}
        <section className="esti-lp-section">
          <div className="esti-lp-wrap">
            <span className="esti-lp-eyebrow">The dashboard</span>
            <h2>Your whole practice, on one screen</h2>
            <p className="esti-lp-lead">What can I bill today? Who's overdue? Which project needs attention? Answered in ten seconds.</p>

            <div className="esti-lp-mock">
              <div className="esti-lp-mock-top"><span /><span /><span /></div>
              <div className="esti-lp-mock-kpis">
                {[
                  { l: "Ready to bill", v: "₹24.6L" },
                  { l: "Outstanding", v: "₹8.1L" },
                  { l: "Active projects", v: "14" },
                  { l: "Utilization", v: "82%" },
                ].map((k) => (
                  <div key={k.l} className="esti-lp-mock-kpi"><small>{k.l}</small><b>{k.v}</b></div>
                ))}
              </div>
              <div style={{ padding: "1.25rem", display: "grid", gap: "0.9rem" }}>
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
          </div>
        </section>

        {/* ── Capabilities ────────────────────────────────────────────────── */}
        <section id="modules" className="esti-lp-section" style={{ paddingTop: 0 }}>
          <div className="esti-lp-wrap">
            <span className="esti-lp-eyebrow">Modules</span>
            <h2>Everything an architecture office runs on</h2>
            <p className="esti-lp-lead">From enquiry to completion certificate — integrated, not stitched together from five tools.</p>
            <div className="esti-lp-grid esti-lp-grid--3">
              {CAPS.map((c) => {
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

        {/* ── India-first band ────────────────────────────────────────────── */}
        <section id="compliance" className="esti-lp-band">
          <div className="esti-lp-wrap esti-lp-section">
            <div className="esti-lp-grid--2" style={{ display: "grid", gap: "3rem", alignItems: "center" }}>
              <div>
                <span className="esti-lp-eyebrow">India-first compliance</span>
                <h2>The only platform that speaks COA, GST and bylaws natively</h2>
                <p>
                  Foreign practice tools can't price a COA proposal, split an IGST
                  invoice, or warn you that your FAR is exceeded. ESTI does all
                  three — because it was built for the Indian context, not adapted to it.
                </p>
                <ul className="esti-lp-checks">
                  {INDIA_POINTS.map((p) => (
                    <li key={p}><Checkmark size={18} className="esti-lp-ic" /><span>{p}</span></li>
                  ))}
                </ul>
              </div>
              <div className="esti-lp-mock" style={{ marginTop: 0 }}>
                <div className="esti-lp-mock-top"><span /><span /><span /></div>
                <div style={{ padding: "1.25rem", display: "grid", gap: "0.9rem" }}>
                  <div style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>RIE feasibility — sample</div>
                  {[
                    { l: "FAR utilised", v: 96 },
                    { l: "Ground coverage", v: 58 },
                    { l: "Setback compliance", v: 100 },
                    { l: "Sustainability score", v: 74 },
                  ].map((m) => (
                    <div key={m.l}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.35rem", color: "var(--cds-text-secondary)" }}>
                        <span>{m.l}</span><span>{m.v}%</span>
                      </div>
                      <div className="esti-lp-mock-bar"><i style={{ width: `${m.v}%` }} /></div>
                    </div>
                  ))}
                  <div style={{ fontSize: "0.85rem", color: "var(--cds-text-secondary)" }}>1 deviation — front setback short by 0.4 m, flagged before submission.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────────────── */}
        <section id="pricing" className="esti-lp-section">
          <div className="esti-lp-wrap">
            <span className="esti-lp-eyebrow">Pricing</span>
            <h2>Simple pricing for practices of every size</h2>
            <p className="esti-lp-lead">Self-hosted — pay for the software, run it on a ₹400-a-month VPS. Start with the live demo.</p>
            <div className="esti-lp-pricing-toggle" style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1.25rem" }}>
              <button className="esti-lp-btn esti-lp-btn--ghost" style={{ opacity: annual ? 0.6 : 1 }} onClick={() => setAnnual(false)}>Monthly</button>
              <button className="esti-lp-btn esti-lp-btn--ghost" style={{ opacity: annual ? 1 : 0.6 }} onClick={() => setAnnual(true)}>Annual · save ~17%</button>
            </div>

            <div className="esti-lp-price">
              <div className="esti-lp-card">
                <h3>Solo</h3>
                <div className="esti-lp-amt">{solo}<span style={{ fontSize: "0.9rem", color: "var(--cds-text-secondary)", fontWeight: 400 }}> / mo</span></div>
                <ul>
                  {["1 architect, every module", "COA fees, GST/TDS & filing", "Drawings, DXF & compliance", "Client portal & email support"].map((b) => (
                    <li key={b}><Checkmark size={16} className="esti-lp-ic" />{b}</li>
                  ))}
                </ul>
                <button className="esti-lp-btn esti-lp-btn--ghost" onClick={runDemo} disabled={demo.isPending}>Explore the demo</button>
              </div>

              <div className="esti-lp-card esti-lp-card--feature">
                <h3>Studio · most popular</h3>
                <div className="esti-lp-amt">{studio}<span style={{ fontSize: "0.9rem", color: "var(--cds-text-secondary)", fontWeight: 400 }}> / mo</span></div>
                <ul>
                  {["Up to 15 users, seniority roles", "Workload, timesheets & ASPRF", "Consultant coordination & HR", "SteelFlow BBS & RIE engine", "Priority support"].map((b) => (
                    <li key={b}><Checkmark size={16} className="esti-lp-ic" />{b}</li>
                  ))}
                </ul>
                <button className="esti-lp-btn esti-lp-btn--gold" onClick={contact}>Talk to us</button>
              </div>

              <div className="esti-lp-card">
                <h3>Firm</h3>
                <div className="esti-lp-amt">Custom</div>
                <ul>
                  {["16 – 50 users", "Managed hosting & onboarding", "Data migration assistance", "Dedicated support"].map((b) => (
                    <li key={b}><Checkmark size={16} className="esti-lp-ic" />{b}</li>
                  ))}
                </ul>
                <button className="esti-lp-btn esti-lp-btn--ghost" onClick={contact}>Contact sales</button>
              </div>
            </div>
            <p className="esti-lp-lead" style={{ marginTop: "1.25rem", fontSize: "0.9rem" }}>
              Prices in INR, exclusive of GST. More than 50 architects?{" "}
              <a href="mailto:hi@aorms.in" style={{ color: "var(--lp-accent)" }}>Talk to us</a> ·{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); wa(); }} style={{ color: "var(--lp-accent)" }}>WhatsApp</a>.
            </p>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section id="faq" className="esti-lp-section" style={{ paddingTop: 0 }}>
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

        {/* ── Final CTA ───────────────────────────────────────────────────── */}
        <section className="esti-lp-final">
          <div className="esti-lp-wrap esti-lp-section">
            <span className="esti-lp-eyebrow">Get started</span>
            <h2>Get back to the drawing board</h2>
            <p>Open a fully populated demo studio — 14 live projects, fees, GST invoices, RIE assessments and ASPRF scores — and see how little admin ESTI leaves you.</p>
            <div className="esti-lp-hero-cta">
              <button className="esti-lp-btn esti-lp-btn--gold esti-lp-btn--lg" onClick={runDemo} disabled={demo.isPending}>
                {demo.isPending ? "Opening demo…" : "Explore the live demo"} <ArrowRight size={18} />
              </button>
              <button className="esti-lp-btn esti-lp-btn--ghost esti-lp-btn--lg" onClick={contact}>Talk to us</button>
              <button className="esti-lp-btn esti-lp-btn--ghost esti-lp-btn--lg" onClick={wa}>WhatsApp</button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="esti-lp-foot">
        <div className="esti-lp-wrap esti-lp-foot-grid">
          <div>
            <div className="esti-lp-brand" style={{ marginBottom: "0.75rem" }}><img src={aormsAuto} alt="AORMS" style={{ height: 28 }} /></div>
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
            <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>Company</h3>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <a href="#modules">Modules</a>
              <a href="#pricing">Pricing</a>
              <a href="#faq">FAQ</a>
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
