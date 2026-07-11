import { ActionDockProvider } from "@hcw/ui-kit";
import { type ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { HcwAttribution } from "../brand/HcwAttribution.js";
import {
  MARKETING_RAIL_PAGES,
  MARKETING_WIKI_RAIL_PAGES,
} from "../../lib/marketing-page-nav.js";
import { filterSectionDockLinks } from "../../lib/landing-nav.js";
import { AORMS_STUDIO, AORMS_PLATFORM } from "../../lib/product-nomenclature.js";
import { useLpReveal } from "../../lib/use-lp-reveal.js";
import { LandingContours } from "./LandingContours.js";
import { MarketingConversionDock } from "./MarketingConversionDock.js";
import { MarketingFooter } from "./MarketingFooter.js";
import { MarketingRailHeader, MarketingRailNav } from "./MarketingRailNav.js";
import { MarketingSectionDock } from "./MarketingSectionDock.js";

export type MarketingNavLink = { href: string; label: string };

const RAIL_COLLAPSED_KEY = "aorms-marketing-rail-collapsed";

/**
 * Marketing shell — glass rail + stage + SectionDock (in-page) + ActionDock (conversion).
 */
export function MarketingShell({
  children,
  contours,
  wiki,
  sectionLinks,
  tagline,
  vertical = "platform",
  footerVariant,
  visitCount,
  showFooter = true,
  showConversionDock,
}: {
  children: ReactNode;
  contours?: boolean;
  wiki?: boolean;
  /** In-page section anchors for the bottom SectionDock carousel. */
  sectionLinks?: readonly MarketingNavLink[];
  tagline?: string;
  /** Default rail tagline when `tagline` is omitted (wiki uses its own default). */
  vertical?: "platform" | "architecture";
  footerVariant?: "platform" | "architecture";
  visitCount?: number | null;
  showFooter?: boolean;
  showConversionDock?: boolean;
}) {
  return (
    <ActionDockProvider>
      <MarketingShellInner
        contours={contours}
        wiki={wiki}
        sectionLinks={sectionLinks}
        tagline={tagline}
        vertical={vertical}
        footerVariant={footerVariant ?? vertical}
        visitCount={visitCount}
        showFooter={showFooter}
        showConversionDock={showConversionDock ?? true}
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
  vertical,
  footerVariant,
  visitCount,
  showFooter,
  showConversionDock,
}: {
  children: ReactNode;
  contours?: boolean;
  wiki?: boolean;
  sectionLinks?: readonly MarketingNavLink[];
  tagline?: string;
  vertical: "platform" | "architecture";
  footerVariant: "platform" | "architecture";
  visitCount?: number | null;
  showFooter: boolean;
  showConversionDock: boolean;
}) {
  const { pathname } = useLocation();
  useLpReveal();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 900px)").matches : false,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(RAIL_COLLAPSED_KEY) === "1";
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, isMobile]);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, mobileOpen]);

  useEffect(() => {
    if (isMobile) return;
    window.localStorage.setItem(RAIL_COLLAPSED_KEY, railCollapsed ? "1" : "0");
  }, [railCollapsed, isMobile]);

  const onWiki = wiki === true;
  const railPageLinks = onWiki ? [...MARKETING_WIKI_RAIL_PAGES] : [...MARKETING_RAIL_PAGES];
  const sectionDockLinks = sectionLinks?.length
    ? filterSectionDockLinks(sectionLinks, pathname)
    : [];
  const showSectionDock = sectionDockLinks.length > 0;
  const showDock = showConversionDock;
  const desktopCollapsed = !isMobile && railCollapsed;
  const railExpanded = isMobile ? mobileOpen : true;

  const railClass = [
    "lp2-rail",
    desktopCollapsed ? "lp2-rail--collapsed" : "",
    isMobile && mobileOpen ? "lp2-rail--open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const spacerClass = [
    "lp2-rail-spacer",
    desktopCollapsed ? "lp2-rail-spacer--collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const resolvedTagline =
    tagline ??
    (onWiki
      ? AORMS_STUDIO.wikiName
      : vertical === "architecture"
        ? AORMS_STUDIO.tagline
        : AORMS_PLATFORM.expansion);

  return (
    <div
      className={[
        "lp2-shell",
        "esti-lp",
        showSectionDock ? "lp2-shell--section-dock" : "",
        showDock ? "lp2-shell--conversion-dock" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <a href="#lp2-main" className="lp2-skip">
        Skip to content
      </a>

      {isMobile && mobileOpen ? (
        <button
          type="button"
          className="lp2-rail-backdrop"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside className={railClass} aria-label="AORMS">
        <MarketingRailHeader
          collapsed={desktopCollapsed}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onToggleCollapse={() => setRailCollapsed((v) => !v)}
          onToggleMobile={() => setMobileOpen((v) => !v)}
        />

        {railExpanded ? (
          <div className="lp2-rail__body">
            <p className="lp2-rail__tagline">{resolvedTagline}</p>
            <MarketingRailNav
              links={railPageLinks}
              pathname={pathname}
              collapsed={desktopCollapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        ) : null}

        <footer className="lp2-rail__foot">
          {railExpanded && !onWiki ? (
            <p className="lp2-rail__value-prop">
              5 GB free · unlimited users · no card needed
            </p>
          ) : null}
          <HcwAttribution variant="rail" showNote={railExpanded && !desktopCollapsed} compact />
        </footer>
      </aside>

      <div className={spacerClass} aria-hidden />

      <main id="lp2-main" className="lp2-stage">
        {contours && (
          <div className="lp2-stage__contours" aria-hidden>
            <LandingContours />
          </div>
        )}
        <div className="lp2-content">
          {children}
          {showFooter ? (
            <MarketingFooter visitCount={visitCount} variant={footerVariant} />
          ) : null}
        </div>
      </main>

      {showSectionDock ? <MarketingSectionDock links={sectionDockLinks} /> : null}
      {showDock ? <MarketingConversionDock /> : null}
    </div>
  );
}
