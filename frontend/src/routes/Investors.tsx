import { Button, Theme } from "@carbon/react";
import { Document, Email } from "@carbon/icons-react";
import { useEffect } from "react";

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
    title: "Deep domain encoding, not another dashboard",
    body: "The moat is the depth: a cognition and architectural-reasoning engine that ranks tasks and reasons through missing data; a revision-intelligence model that separates billable client scope from internal error; an end-to-end estimation, BOQ, and construction-cost engine; scoped client, contractor, and consultant portals; and a fair, anti-gaming team performance score. It is self-hostable, so a firm's data stays its own — a real differentiator in this market.",
  },
  {
    n: "06",
    kicker: "Business model",
    title: "Self-hosted licence and hosted SaaS",
    body: "Two paths to the same product: a self-hosted licence for firms that want their data on their own infrastructure, and a managed hosted offering for those that want zero ops. Pricing scales by firm and seat. The public marketing surfaces and a one-click demo double as a low-cost acquisition channel.",
  },
  {
    n: "07",
    kicker: "Traction",
    title: "A working, demoable product — not a deck of mockups",
    body: "The full office is built and live: projects, fees, GST invoicing, drawings, revisions, PMC site delivery, the construction-cost OS, the portals, and the cognition dashboard. A fully seeded demo practice can be opened in one click, and every number on its dashboard is computed from real records. This is shippable software, today.",
  },
];

export function Investors() {
  useEffect(() => {
    const title = "AORMS — Investor brief";
    const description =
      "AORMS is an office intelligence system for Indian architecture practices — observe, reason, predict, recommend. Investor brief and pitch deck from Holagundi Consulting Works.";
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
    <Theme theme="g100">
      <div className="esti-investor">
        <header className="esti-investor__top">
          <img src="/aorms-logo-white.png" alt="AORMS" className="esti-investor__logo" />
          <Button kind="tertiary" size="sm" renderIcon={Document} href={DECK_URL}>
            Download deck
          </Button>
        </header>

        <section className="esti-investor__hero">
          <p className="esti-investor__eyebrow">Investor brief</p>
          <h1>The office intelligence system for architecture practices.</h1>
          <p className="esti-investor__lead">
            A continuous cognition engine that observes an architecture firm, reasons across its
            pressure points, predicts risk, and recommends the one action that matters — built
            India-native, from the ground up.
          </p>
          <Button renderIcon={Document} href={DECK_URL}>
            Download the pitch deck (PDF)
          </Button>
        </section>

        <div className="esti-investor__slides">
          {SLIDES.map((s) => (
            <section key={s.n} className="esti-investor-slide">
              <span className="esti-investor-slide__n">{s.n}</span>
              <div className="esti-investor-slide__body">
                <p className="esti-investor-slide__kicker">{s.kicker}</p>
                <h2>{s.title}</h2>
                <p>{s.body}</p>
              </div>
            </section>
          ))}
        </div>

        <footer className="esti-investor__contact">
          <p className="esti-investor-slide__kicker">The ask</p>
          <h2>Let's talk</h2>
          <p>
            We're raising to expand jurisdiction coverage, stand up the hosted offering, and build
            out go-to-market. If that's interesting, the deck is above — and so are we.
          </p>
          <Button renderIcon={Email} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </Button>
          <p className="esti-investor__fineprint">Holagundi Consulting Works · AORMS</p>
        </footer>
      </div>
    </Theme>
  );
}
