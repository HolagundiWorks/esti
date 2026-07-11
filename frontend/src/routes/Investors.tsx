import { useEffect } from "react";
import { AormsLogo } from "../components/AormsLogo.js";
import { HcwAttribution } from "../components/brand/HcwAttribution.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";

const DECK_URL = "/aorms-investor-deck.pdf";
const CONTACT_EMAIL = "invest@aorms.in";

const SLIDES = [
  {
    n: "01",
    kicker: "The problem",
    title: "Architecture firms fail on operations, not design",
    body: "Brilliant studios run on spreadsheets, WhatsApp, and the memory of one or two senior people. The drawings are excellent; the operations are improvised. Money and momentum leak in the quiet gaps between projects — an approval that sat too long, an invoice never raised, a consultant who went silent. None of it is a design failure. All of it is a coordination failure, and the principal is the bottleneck.",
  },
  {
    n: "02",
    kicker: "The solution",
    title: "Continuous office cognition",
    body: "AORMS reads the whole practice as one system — clients, drawings, approvals, billing, revisions, and team load — then observes, reasons, predicts where pressure is building, and recommends the single highest-leverage action for the day. It does the watching so the principal doesn't have to. The screen is calm by design: most of the office is fine, so it says so, and surfaces the one place that needs attention.",
  },
  {
    n: "03",
    kicker: "Why now",
    title: "Reasoning is finally good enough — and practices are digitising",
    body: "LLM and behavioural reasoning have crossed the threshold where software can triage an office, not just store its records. At the same time, Indian practices are moving off paper and into tools, while compliance (GST, TDS, COA fees) grows more intricate every year. The firm that encodes that complexity natively wins the workflow.",
  },
  {
    n: "04",
    kicker: "Market",
    title: "An underserved, India-native segment",
    body: "India has one of the largest pools of registered architects in the world, and the mid-size practice — busy enough to feel the pain, too small for enterprise software — is poorly served by generic project tools built for somewhere else. AORMS is built for that firm: rupees in paise, the April–March year, GST and SAC codes, rate books, and COA fee logic, assumed from the ground up.",
  },
  {
    n: "05",
    kicker: "Product & moat",
    title: "Deep domain encoding for advisory consultancies",
    body: "The moat is depth in consulting-office operations: operational and design frameworks per industry; EmOI dual-tier intelligence; revision and approval models for architecture consultancies; governed knowledge and audit trails. One standard cloud licence with unlimited users — usage-based storage and AI.",
  },
  {
    n: "06",
    kicker: "Business model",
    title: "Self-hosted licence and hosted SaaS",
    body: "AORMS is cloud SaaS at aorms.in — one standard licence, unlimited users, 5 GB included storage, and metered storage plus AI beyond that. BYO API key supported. The public marketing surfaces, wiki, and demo double as a low-cost acquisition channel.",
  },
  {
    n: "07",
    kicker: "Traction",
    title: "A working, demoable product — not a deck of mockups",
    body: "The consultancy workspace is built and demoable: projects, fees, GST invoicing, drawings, revisions, client and consultant portals, Studio Intelligence, and ESTI. A fully seeded demo practice opens in one click; dashboard numbers are computed from real records. Platform frameworks and additional industry workspaces are on the roadmap.",
  },
];

export function Investors() {
  useEffect(() => {
    const title = "AORMS — Investor brief";
    const description =
      "AORMS is an office intelligence system for Indian architecture practices — observe, reason, predict, recommend. Investor brief and pitch deck from Human Centric Works.";
    document.title = title;
    const set = (sel: string, attr: "content" | "href", val: string) =>
      document.querySelector(sel)?.setAttribute(attr, val);
    set('meta[name="description"]', "content", description);
    set('meta[property="og:title"]', "content", title);
    set('meta[property="og:description"]', "content", description);
    set('meta[property="og:url"]', "content", `${window.location.origin}/investors`);
    set('meta[name="twitter:title"]', "content", title);
    set('meta[name="twitter:description"]', "content", description);
    set('link[rel="canonical"]', "href", `${window.location.origin}/investors`);
  }, []);

  return (
    <MarketingShell contours tagline="Investor brief" showConversionDock={false}>
      <div className="lp2-ds">
        <header className="lp2-section-head lp2-reveal" id="top">
          <p className="lp2-section-head__tag">Investor brief</p>
          <div className="lp2-hero__brand">
            <AormsLogo variant="hero" />
          </div>
          <h1 className="lp2-section-head__title">
            The office intelligence system for architecture practices.
          </h1>
          <p className="lp2-section-head__body">
            A continuous cognition engine that observes an architecture firm, reasons across its
            pressure points, predicts risk, and recommends the one action that matters — built
            India-native, from the ground up.
          </p>
          <p className="lp2-prose lp2-prose--inline">
            <a href={DECK_URL}>Download the pitch deck (PDF)</a>
          </p>
        </header>

        <div className="lp2-investor-slides">
          {SLIDES.map((s) => (
            <article key={s.n} className="lp2-tile lp2-investor-slide lp2-reveal">
              <span className="lp2-investor-slide__n" aria-hidden>
                {s.n}
              </span>
              <div className="lp2-investor-slide__body">
                <p className="lp2-investor-slide__kicker">{s.kicker}</p>
                <h2 className="lp2-investor-slide__title">{s.title}</h2>
                <p className="lp2-investor-slide__text">{s.body}</p>
              </div>
            </article>
          ))}
        </div>

        <footer className="lp2-ds-section lp2-investor-contact lp2-reveal">
          <p className="lp2-investor-slide__kicker">The ask</p>
          <h2 className="lp2-investor-contact__title">Let's talk</h2>
          <p className="lp2-prose">
            We're raising to expand jurisdiction coverage, stand up the hosted offering, and build
            out go-to-market. If that's interesting, the deck is above — and so are we.
          </p>
          <p className="lp2-prose lp2-prose--inline">
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
          <HcwAttribution variant="inline" />
          <p className="lp2-investor-contact__fine">Human Centric Works · AORMS</p>
        </footer>
      </div>
    </MarketingShell>
  );
}
