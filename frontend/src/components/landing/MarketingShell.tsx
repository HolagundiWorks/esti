import { ActionDockProvider } from "@hcw/ui-kit";
import { Box } from "@mui/material";
import { type ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { HcwAttribution } from "../brand/HcwAttribution.js";
import {
  MARKETING_RAIL_PAGES,
  MARKETING_WIKI_RAIL_PAGES,
} from "../../lib/marketing-page-nav.js";
import { AORMS_STUDIO, AORMS_PLATFORM } from "../../lib/product-nomenclature.js";
import { useLpReveal } from "../../lib/use-lp-reveal.js";
import { LandingContours } from "./LandingContours.js";
import { MarketingConversionDock, type MarketingConversionDockVariant } from "./MarketingConversionDock.js";
import { MarketingFooter } from "./MarketingFooter.js";
import { MarketingRailHeader, MarketingRailNav } from "./MarketingRailNav.js";

/**
 * Marketing shell — studio glass rail + stage + ActionDock (conversion).
 */
export function MarketingShell({
  children,
  contours,
  wiki,
  tagline,
  vertical = "platform",
  footerVariant,
  visitCount,
  showFooter = true,
  showConversionDock,
  conversionDockVariant = "default",
}: {
  children: ReactNode;
  contours?: boolean;
  wiki?: boolean;
  tagline?: string;
  /** Default rail tagline when `tagline` is omitted (wiki uses its own default). */
  vertical?: "platform" | "architecture";
  footerVariant?: "platform" | "architecture";
  visitCount?: number | null;
  showFooter?: boolean;
  showConversionDock?: boolean;
  /** Platform `/` uses app picker CTAs; other pages use Create account + Sign in. */
  conversionDockVariant?: MarketingConversionDockVariant;
}) {
  return (
    <ActionDockProvider>
      <MarketingShellInner
        contours={contours}
        wiki={wiki}
        tagline={tagline}
        vertical={vertical}
        footerVariant={footerVariant ?? vertical}
        visitCount={visitCount}
        showFooter={showFooter}
        showConversionDock={showConversionDock ?? true}
        conversionDockVariant={conversionDockVariant}
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
  tagline,
  vertical,
  footerVariant,
  visitCount,
  showFooter,
  showConversionDock,
  conversionDockVariant,
}: {
  children: ReactNode;
  contours?: boolean;
  wiki?: boolean;
  tagline?: string;
  vertical: "platform" | "architecture";
  footerVariant: "platform" | "architecture";
  visitCount?: number | null;
  showFooter: boolean;
  showConversionDock: boolean;
  conversionDockVariant: MarketingConversionDockVariant;
}) {
  const { pathname } = useLocation();
  useLpReveal();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 900px)").matches : false,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const onWiki = wiki === true;
  const railPageLinks = onWiki ? [...MARKETING_WIKI_RAIL_PAGES] : [...MARKETING_RAIL_PAGES];
  const showDock = showConversionDock;

  const resolvedTagline =
    tagline ??
    (onWiki
      ? AORMS_STUDIO.wikiName
      : vertical === "architecture"
        ? AORMS_STUDIO.tagline
        : AORMS_PLATFORM.expansion);

  const railClass = [
    "esti-dash-rail",
    "lp2-marketing-rail",
    isMobile && mobileOpen ? "lp2-marketing-rail--open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={[
        "lp2-shell",
        "esti-lp",
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

      <Box
        className="esti-glass-dash lp2-glass-dash"
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: { xs: "visible", md: "visible" },
          display: "flex",
          flexDirection: "column",
          width: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            flex: 1,
            minHeight: 0,
            overflow: { xs: "visible", md: "visible" },
            gap: 2,
            alignItems: "stretch",
            width: 1,
          }}
        >
          <Box
            aria-hidden
            className="esti-dash-rail-spacer"
            sx={{
              display: { xs: "none", md: "block" },
              flex: "0 0 20%",
              maxWidth: "20%",
              flexShrink: 0,
            }}
          />

          <Box
            component="aside"
            className={railClass}
            aria-label="AORMS"
            sx={{
              flex: { xs: "0 0 auto", md: "0 0 20%" },
              maxWidth: { md: "20%" },
              minWidth: 0,
              width: { xs: "100%", md: "auto" },
              overflowY: { xs: "visible", md: "auto" },
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            <MarketingRailHeader
              brandHref="/"
              isMobile={isMobile}
              mobileOpen={mobileOpen}
              onToggleMobile={() => setMobileOpen((v) => !v)}
            />

            <Box
              className="lp2-rail__body"
              sx={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}
            >
              <p className="lp2-rail__tagline">{resolvedTagline}</p>
              <MarketingRailNav
                links={railPageLinks}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </Box>

            <footer className="lp2-rail__foot">
              {!onWiki ? (
                <p className="lp2-rail__value-prop">
                  5 GB free · unlimited users · no card needed
                </p>
              ) : null}
              <HcwAttribution variant="rail" showNote compact />
            </footer>
          </Box>

          <Box
            component="main"
            id="lp2-main"
            className="esti-dash-stage lp2-stage"
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              overflowY: { xs: "visible", md: "visible" },
              display: "flex",
              flexDirection: "column",
            }}
          >
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
          </Box>
        </Box>
      </Box>

      {showDock ? <MarketingConversionDock variant={conversionDockVariant} /> : null}
    </div>
  );
}
