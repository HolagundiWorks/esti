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
import { wikiAppPath, WIKI_SHELL_NAV } from "../../lib/wiki-url.js";
import { LandingContours } from "./LandingContours.js";

const SECTION_LINKS = [
  { href: "/#fee-recovery", label: "Fee recovery" },
  { href: "/#revisions", label: "Revisions" },
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

export type MarketingNavLink = { href: string; label: string };

const RAIL_COLLAPSED_KEY = "aorms.lp2.railCollapsed";

/**
 * Marketing shell — glass rail + scrolling stage (2026-07 redesign).
 * Rail collapses on desktop; **page CTAs publish only to the ActionDock**
 * (never duplicated in the rail — Fitts / Hick / dock policy).
 * Provider lives here because public marketing routes sit outside the app shell.
 */
export function MarketingShell({
  children,
  contours,
  wiki,
  sectionLinks,
  tagline,
}: {
  children: ReactNode;
  contours?: boolean;
  /** Wiki documentation shell — rail nav + sign-in dock only. */
  wiki?: boolean;
  /** Override default landing section anchors (e.g. design-system page). */
  sectionLinks?: readonly MarketingNavLink[];
  /** Rail tagline under the brand mark. */
  tagline?: string;
}) {
  return (
    <ActionDockProvider>
      <MarketingShellInner
        contours={contours}
        wiki={wiki}
        sectionLinks={sectionLinks}
        tagline={tagline}
      >
        {children}
      </MarketingShellInner>
    </ActionDockProvider>
  );
}

function MarketingShellInner({
  children,
  contours,
  wiki,
  sectionLinks,
  tagline,
}: {
  children: ReactNode;
  contours?: boolean;
  wiki?: boolean;
  sectionLinks?: readonly MarketingNavLink[];
  tagline?: string;
}) {
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(RAIL_COLLAPSED_KEY);
      // Default expanded so section links are visible (Hick / discoverability).
      // Collapse only when the user explicitly chose "1".
      return stored === "1";
    } catch {
      return false;
    }
  });

  const onWiki = wiki === true;
  const primaryHref = onWiki ? "/login" : createAccountUrl();
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
    ? [...(sectionLinks ?? WIKI_SHELL_NAV)]
    : [
        ...(sectionLinks ?? SECTION_LINKS),
        { href: wikiAppPath(), label: "Wiki" },
        { href: "/blog", label: "Blog" },
        ...(sectionLinks ? [] : [{ href: "/design-system", label: "Design system" }]),
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

      {contours && <LandingContours />}

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
              {tagline ??
                (onWiki ? "Documentation" : "Practice OS for Indian studios")}
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
