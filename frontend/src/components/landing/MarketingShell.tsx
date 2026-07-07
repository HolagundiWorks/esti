import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import { Button, IconButton } from "@mui/material";
import { useState, type ReactNode } from "react";
import { trpc } from "../../lib/trpc.js";

/**
 * Rail download boxes — the free Community desktop app + the Estimate companion,
 * each a square flat card (description + download button). The Community URL
 * comes from the live installer resolver (newest desktop-v* release), falling
 * back to the build-time env; Estimate is a build-time env (or /download).
 */
function RailDownloads() {
  const installersQ = trpc.marketing.desktopInstallers.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });
  const communityUrl =
    installersQ.data?.lite ??
    (import.meta.env.VITE_COMMUNITY_DOWNLOAD_URL as string | undefined) ??
    (import.meta.env.VITE_LITE_DOWNLOAD_URL as string | undefined) ??
    "/download";
  const estimateUrl =
    (import.meta.env.VITE_ESTIMATION_DOWNLOAD_URL as string | undefined) ?? "/download";

  return (
    <div className="esti-lp-rail__downloads">
      <div className="esti-lp-dl-box">
        <p className="esti-lp-dl-box__eyebrow">Desktop app</p>
        <p className="esti-lp-dl-box__title">AORMS Community</p>
        <p className="esti-lp-dl-box__desc">
          The free, offline desktop app — your whole office on your own machine and
          local network. Postgres bundled, no cloud, no licence.
        </p>
        <a className="esti-lp-dl-btn" href={communityUrl}>Download Community</a>
      </div>
      <div className="esti-lp-dl-box">
        <p className="esti-lp-dl-box__eyebrow">Companion</p>
        <p className="esti-lp-dl-box__title">AORMS Estimate</p>
        <p className="esti-lp-dl-box__desc">
          The standalone estimating app — measure once, take off materials and the
          Bar Bending Schedule. Free and fully offline.
        </p>
        <a className="esti-lp-dl-btn" href={estimateUrl}>Download Estimate</a>
      </div>
    </div>
  );
}

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
  { label: "DRAWINGS + REVISIONS", dot: "green" },
  { label: "FREE COMMUNITY EDITION", dot: "green" },
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
export function MarketingShell({
  children,
  downloads,
}: {
  children: ReactNode;
  /** Show the Community + Estimate download boxes in the rail (landing only). */
  downloads?: boolean;
}) {
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

        {downloads && <RailDownloads />}

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
