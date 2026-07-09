import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import { Button, IconButton, useMediaQuery } from "@mui/material";
import { type ReactNode, useState } from "react";
import { createAccountUrl } from "../../lib/onboarding.js";
import { isWikiHost, wikiAppPath, wikiPageUrl } from "../../lib/wiki-url.js";
import { LandingContours } from "./LandingContours.js";

const SECTION_LINKS = [
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

/**
 * Marketing shell — glass rail + scrolling stage (2026-07 redesign).
 */
export function MarketingShell({
  children,
  contours,
  wiki,
}: {
  children: ReactNode;
  contours?: boolean;
  /** Rendered on wiki.aorms.in — adjusts nav links. */
  wiki?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 900px)");
  const onWiki = wiki || isWikiHost();
  const wikiHref = onWiki ? wikiAppPath() : wikiPageUrl();

  const navLinks = onWiki
    ? [
        { href: wikiAppPath(), label: "Wiki home" },
        { href: wikiAppPath("getting-started"), label: "Getting started" },
        { href: wikiAppPath("how-to-use-aorms"), label: "How to use AORMS" },
        { href: "https://aorms.in/", label: "AORMS home" },
      ]
    : [
        ...SECTION_LINKS,
        { href: wikiHref, label: "Wiki" },
        { href: "/blog", label: "Blog" },
      ];

  return (
    <div className="lp2-shell esti-lp">
      <a href="#lp2-main" className="lp2-skip">
        Skip to content
      </a>

      {!isMobile && (
        <div className="lp2-blobs" aria-hidden>
          <div className="lp2-blob lp2-blob--a" />
          <div className="lp2-blob lp2-blob--b" />
          <div className="lp2-blob lp2-blob--c" />
          <div className="lp2-blob lp2-blob--d" />
          <div className="lp2-blob lp2-blob--e" />
        </div>
      )}

      {contours && !isMobile && <LandingContours />}

      <aside className={`lp2-rail${open ? " lp2-rail--open" : ""}`} aria-label="AORMS">
        <div className="lp2-rail__brand-row">
          <a href={onWiki ? wikiAppPath() : "/#top"} className="lp2-rail__brand" aria-label="AORMS home">
            <span
              role="img"
              aria-label="AORMS"
              className="esti-landing-brand-logo esti-brand esti-brand--aorms"
            />
          </a>
          <IconButton
            className="lp2-rail__burger"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            size="small"
          >
            {open ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        </div>

        <p className="lp2-rail__tagline">
          {onWiki ? "Documentation" : "For architects & designers"}
        </p>

        <nav className="lp2-rail__nav" aria-label="Sections">
          {navLinks.map((l) => (
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

        <div className="lp2-rail__spacer" aria-hidden />

        <div className="lp2-rail__ctas">
          {!onWiki && (
            <p className="lp2-rail__value-prop">
              5 GB free&nbsp;·&nbsp;unlimited users&nbsp;·&nbsp;no card needed
            </p>
          )}
          <Button
            variant="contained"
            size="small"
            fullWidth
            href={onWiki ? "https://aorms.in/login" : createAccountUrl()}
            onClick={() => setOpen(false)}
            className="lp2-rail__cta-primary"
          >
            {onWiki ? "Sign in to AORMS" : "Create account"}
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

        <div className="lp2-rail__foot">
          <img src="/hcw-black.png" alt="Holagundi Consulting Works" className="lp2-rail__hcw" />
        </div>
      </aside>

      <div className="lp2-rail-spacer" aria-hidden />

      <main id="lp2-main" className="lp2-stage">
        <div className="lp2-content">{children}</div>
      </main>
    </div>
  );
}
