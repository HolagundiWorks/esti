import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import { Button, IconButton } from "@mui/material";
import { useState, type ReactNode } from "react";

// Absolute "/#section" links so the nav works from any route (e.g. /blog), not
// just the landing page where the in-page anchors live.
const NAV = [
  { href: "/#platform", label: "Platform" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
  { href: "/investors", label: "Investors" },
  { href: "/#trial", label: "Get started" },
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

export function MarketingShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="esti-landing-shell">
      <a href="#main-content" className="esti-lp-skip">Skip to main content</a>
      <header className="esti-landing-header" aria-label="AORMS">
        <div className="esti-landing-header__inner">
          <IconButton
            className="esti-landing-header__menu"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            onClick={() => setNavOpen((o) => !o)}
            size="small"
          >
            {navOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
          <a href="/#top" className="esti-landing-header__name" aria-label="AORMS home">
            <span className="esti-landing-header-brand">
              <img
                src="/aorms-logo.png"
                alt="AORMS"
                className="esti-landing-brand-logo"
              />
            </span>
          </a>
          <nav className="esti-landing-header__nav" aria-label="Page sections">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="esti-landing-header__link">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="esti-landing-header__actions">
            <Button variant="contained" size="small" href="/login" className="esti-landing-signin">
              Log in
            </Button>
          </div>
        </div>
        {/* Mobile nav drawer */}
        <div className={`esti-landing-header__sidenav${navOpen ? " is-open" : ""}`}>
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
        </div>
        {navOpen && (
          <div
            className="esti-landing-header__overlay"
            onClick={() => setNavOpen(false)}
            aria-hidden
          />
        )}
      </header>
      <main id="main-content" className="esti-landing-content">
        {children}
      </main>
      <LandingStatusBar />
    </div>
  );
}
