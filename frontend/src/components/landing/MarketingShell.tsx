import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import MenuIcon from "@mui/icons-material/Menu";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { IconButton, useMediaQuery } from "@mui/material";
import { ActionDock, ActionDockProvider, useScreenActions } from "@hcw/ui-kit";
import { type ReactNode, useEffect, useState } from "react";
import { createAccountUrl } from "../../lib/onboarding.js";
import { isWikiHost, wikiAppPath, wikiPageUrl } from "../../lib/wiki-url.js";
import { LandingContours } from "./LandingContours.js";

const SECTION_LINKS = [
  { href: "/#fee-recovery", label: "Fee recovery" },
  { href: "/#revisions", label: "Revisions" },
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

const RAIL_COLLAPSED_KEY = "aorms.lp2.railCollapsed";

/**
 * Marketing shell — glass rail + scrolling stage (2026-07 redesign).
 * Rail collapses on desktop; page CTAs publish to the ActionDock.
 * Provider lives here because public marketing routes sit outside the app shell.
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
  return (
    <ActionDockProvider>
      <MarketingShellInner contours={contours} wiki={wiki}>
        {children}
      </MarketingShellInner>
    </ActionDockProvider>
  );
}

function MarketingShellInner({
  children,
  contours,
  wiki,
}: {
  children: ReactNode;
  contours?: boolean;
  wiki?: boolean;
}) {
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(RAIL_COLLAPSED_KEY);
      // Default collapsed; only expand when the user explicitly chose "0".
      return stored !== "0";
    } catch {
      return true;
    }
  });

  const onWiki = wiki || isWikiHost();
  const wikiHref = onWiki ? wikiAppPath() : wikiPageUrl();
  const primaryHref = onWiki ? "https://aorms.in/login" : createAccountUrl();
  const primaryLabel = onWiki ? "Sign in to AORMS" : "Create account";

  useEffect(() => {
    try {
      localStorage.setItem(RAIL_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore quota / private mode */
    }
  }, [collapsed]);

  useScreenActions(
    [
      {
        id: "lp-create",
        zone: "center",
        tone: "primary",
        label: primaryLabel,
        icon: onWiki ? <LoginIcon /> : <PersonAddIcon />,
        onClick: () => {
          window.location.assign(primaryHref);
        },
      },
      ...(!onWiki
        ? [
            {
              id: "lp-signin",
              zone: "right" as const,
              tone: "default" as const,
              label: "Sign in",
              icon: <LoginIcon />,
              onClick: () => {
                window.location.assign("/login");
              },
            },
          ]
        : []),
    ],
    [onWiki, primaryHref, primaryLabel],
  );

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

  const railOpen = isMobile ? mobileOpen : !collapsed;
  const railClass = [
    "lp2-rail",
    isMobile && mobileOpen ? "lp2-rail--open" : "",
    !isMobile && collapsed ? "lp2-rail--collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
          <div className="lp2-blob lp2-blob--f" />
          <div className="lp2-blob lp2-blob--g" />
          <div className="lp2-blob lp2-blob--h" />
        </div>
      )}

      {contours && !isMobile && <LandingContours />}

      <aside className={railClass} aria-label="AORMS">
        <div className="lp2-rail__brand-row">
          {(isMobile || !collapsed) && (
            <a
              href={onWiki ? wikiAppPath() : "/#top"}
              className="lp2-rail__brand"
              aria-label="AORMS home"
            >
              <span
                role="img"
                aria-label="AORMS"
                className="esti-landing-brand-logo esti-brand esti-brand--aorms"
              />
            </a>
          )}
          {isMobile ? (
            <IconButton
              className="lp2-rail__burger"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
              size="small"
            >
              {mobileOpen ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
            </IconButton>
          ) : (
            <IconButton
              className="lp2-rail__collapse"
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((v) => !v)}
              size="small"
            >
              {collapsed ? (
                <ChevronRightIcon fontSize="small" />
              ) : (
                <ChevronLeftIcon fontSize="small" />
              )}
            </IconButton>
          )}
        </div>

        {railOpen && (
          <>
            <p className="lp2-rail__tagline">
              {onWiki ? "Documentation" : "Practice OS for Indian studios"}
            </p>

            <nav className="lp2-rail__nav" aria-label="Sections">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="lp2-rail__link"
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="lp2-rail__spacer" aria-hidden />

            {!onWiki && (
              <p className="lp2-rail__value-prop">
                5 GB free&nbsp;·&nbsp;unlimited users&nbsp;·&nbsp;no card needed
              </p>
            )}

            <div className="lp2-rail__foot">
              <img
                src="/hcw-black.png"
                alt="Holagundi Consulting Works"
                className="lp2-rail__hcw"
              />
            </div>
          </>
        )}
      </aside>

      <div
        className={`lp2-rail-spacer${!isMobile && collapsed ? " lp2-rail-spacer--collapsed" : ""}`}
        aria-hidden
      />

      <main id="lp2-main" className="lp2-stage">
        <div className="lp2-content">{children}</div>
      </main>

      <ActionDock />
    </div>
  );
}
