import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import { Button, IconButton } from "@mui/material";
import { useState, type ReactNode } from "react";

// Absolute "/#section" links so the nav works from any route (e.g. /blog), not
// just the landing page where the in-page anchors live.
const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#why-us", label: "Why Us" },
  { href: "/#integrations", label: "Integrations" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQs" },
] as const;

const STATUS_ITEMS = [
  { label: "PROJECTS + FEES + TEAM", dot: "green" },
  { label: "CLIENT PORTALS INCLUDED", dot: "green" },
  { label: "GST + INDIA WORKFLOWS", dot: "green" },
  { label: "AI OFFICE BRIEFINGS", dot: "yellow" },
  { label: "FREE LITE EDITION", dot: "green" },
] as const;

type Dot = "green" | "yellow" | "red" | "white";

function StatusDot({ color }: { color: Dot }) {
  return <span className={`esti-lp-dot esti-lp-dot--${color}`} aria-hidden>●</span>;
}

function LandingStatusBar() {
  return (
    <div className="esti-lp-statusbar" aria-hidden>
      {STATUS_ITEMS.map((item) => (
        <span key={item.label} className="esti-lp-statusbar__item">
          <StatusDot color={item.dot as Dot} />
          {item.label}
        </span>
      ))}
      <span className="esti-lp-statusbar__item esti-lp-statusbar__ver">
        AORMS · v2025.06
      </span>
    </div>
  );
}

/**
 * Marketing shell — RAIL / STAGE layout. The nav (formerly the top header) and the
 * "Developed by" + AORMS identity block (formerly the bottom bar) live in a FIXED,
 * NON-SCROLLING left rail; all content renders in the scrolling stage.
 */
export function MarketingShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="esti-landing-shell esti-lp-railshell">
      <a href="#main-content" className="esti-lp-skip">Skip to main content</a>

      {/* LEFT RAIL — fixed, no scroll: brand + nav (top), developed-by + AORMS (bottom) */}
      <aside className={`esti-lp-rail${navOpen ? " is-open" : ""}`} aria-label="AORMS">
        <div className="esti-lp-rail__top">
          <a href="/#top" className="esti-lp-rail__brand" aria-label="AORMS home">
            <span
              role="img"
              aria-label="AORMS"
              className="esti-landing-brand-logo esti-brand esti-brand--aorms"
            />
          </a>
          <IconButton
            className="esti-lp-rail__menu"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            onClick={() => setNavOpen((o) => !o)}
            size="small"
          >
            {navOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
        </div>

        <nav
          className={`esti-lp-rail__nav${navOpen ? " is-open" : ""}`}
          aria-label="Page sections"
        >
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="esti-landing-header__link"
              onClick={() => setNavOpen(false)}
            >
              {n.label}
            </a>
          ))}
          <Button
            variant="contained"
            size="small"
            href="/login"
            className="esti-landing-signin"
          >
            Log in
          </Button>
        </nav>

        {/* Pinned to the rail bottom: developed-by + AORMS identity. */}
        <div className="esti-lp-rail__foot">
          <div className="esti-lp-rail__studio">
            <p className="esti-landing-footer__eyebrow">Developed by</p>
            <img
              src="/hcw-black.png"
              alt="Holagundi Consulting Works"
              className="esti-landing-footer__hcw"
            />
            <p className="esti-landing-footer__addr">
              Holagundi Consulting Works<br />
              Hospet, Karnataka, India<br />
              +91 89510 89191
            </p>
          </div>
          <div className="esti-lp-rail__aorms">
            <span className="esti-lp-rail__aorms-mark">AORMS</span>
            <span>Architecture Office Resource Management System</span>
            <span>© Holagundi Consulting Works</span>
          </div>
        </div>
      </aside>

      {/* STAGE — all content */}
      <main id="main-content" className="esti-lp-stage esti-landing-content">
        {children}
        <LandingStatusBar />
      </main>
    </div>
  );
}
