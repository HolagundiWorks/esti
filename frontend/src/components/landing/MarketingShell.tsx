import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import { Button, IconButton } from "@mui/material";
import { useState, type ReactNode } from "react";
import { createAccountUrl } from "../../lib/onboarding.js";
import { LandingContours } from "./LandingContours.js";

const LINKS = [
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#pricing",      label: "Pricing" },
  { href: "/#faq",          label: "FAQ" },
] as const;

/**
 * Marketing shell — glass rail + scrolling stage (2026-07 redesign).
 *
 * Rail (fixed, full viewport height, never scrolls):
 *   logo · tagline · nav · [spacer] · account value-prop · CTAs · estimate dl · HCW credit
 *
 * Stage (transparent canvas, scrolls independently):
 *   all page content
 */
export function MarketingShell({
  children,
  downloads,
  contours,
}: {
  children: ReactNode;
  downloads?: boolean;
  contours?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const estimateUrl =
    (import.meta.env.VITE_ESTIMATION_DOWNLOAD_URL as string | undefined) ??
    "/download";

  return (
    <div className="lp2-shell esti-lp">
      <a href="#lp2-main" className="lp2-skip">Skip to content</a>

      {/* ── BLOB SCENE — diffused orbs behind the glass rail ── */}
      <div className="lp2-blobs" aria-hidden>
        <div className="lp2-blob lp2-blob--a" />
        <div className="lp2-blob lp2-blob--b" />
        <div className="lp2-blob lp2-blob--c" />
        <div className="lp2-blob lp2-blob--d" />
        <div className="lp2-blob lp2-blob--e" />
      </div>

      {contours && <LandingContours />}

      {/* ── RAIL ─────────────────────────────────────────── */}
      <aside className={`lp2-rail${open ? " lp2-rail--open" : ""}`} aria-label="AORMS">

        {/* 1 · Brand */}
        <div className="lp2-rail__brand-row">
          <a href="/#top" className="lp2-rail__brand" aria-label="AORMS home">
            <span
              role="img"
              aria-label="AORMS"
              className="esti-landing-brand-logo esti-brand esti-brand--aorms"
            />
          </a>
          <IconButton
            className="lp2-rail__burger"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(v => !v)}
            size="small"
          >
            {open ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        </div>

        {/* 2 · Tagline */}
        <p className="lp2-rail__tagline">For architects &amp; designers</p>

        {/* 3 · Nav */}
        <nav className="lp2-rail__nav" aria-label="Sections">
          {LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="lp2-rail__link"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* 4 · Spacer — pushes CTAs to the bottom third */}
        <div className="lp2-rail__spacer" aria-hidden />

        {/* 5 · Account value-prop + CTAs */}
        <div className="lp2-rail__ctas">
          <p className="lp2-rail__value-prop">
            5 GB free&nbsp;·&nbsp;unlimited users&nbsp;·&nbsp;no card needed
          </p>
          <Button
            variant="contained"
            size="small"
            fullWidth
            href={createAccountUrl()}
            onClick={() => setOpen(false)}
            className="lp2-rail__cta-primary"
          >
            Create account
          </Button>
          <Button
            variant="text"
            size="small"
            fullWidth
            href="/login"
            onClick={() => setOpen(false)}
            className="lp2-rail__cta-text"
          >
            Sign in →
          </Button>
        </div>

        {/* 6 · Estimate download (optional) */}
        {downloads && (
          <div className="lp2-rail__dl">
            <span className="lp2-rail__dl-label">Desktop estimating</span>
            <a href={estimateUrl} className="lp2-rail__dl-link">
              AORMS Estimate ↓
            </a>
            <span className="lp2-rail__dl-note">Windows · sign-in required</span>
          </div>
        )}

        {/* 7 · HCW credit */}
        <div className="lp2-rail__foot">
          <img
            src="/hcw-black.png"
            alt="Holagundi Consulting Works"
            className="lp2-rail__hcw"
          />
        </div>
      </aside>

      {/* spacer keeps stage offset from fixed rail */}
      <div className="lp2-rail-spacer" aria-hidden />

      {/* ── STAGE ────────────────────────────────────────── */}
      <main id="lp2-main" className="lp2-stage">
        <div className="lp2-content">
          {children}
        </div>
      </main>
    </div>
  );
}
