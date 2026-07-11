import { SectionDock } from "@hcw/ui-kit";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { filterSectionDockLinks } from "../../lib/landing-nav.js";
import type { MarketingNavLink } from "./MarketingShell.js";

/** Marketing wrapper — in-page section carousel only (page links live in the rail). */
export function MarketingSectionDock({ links }: { links: readonly MarketingNavLink[] }) {
  const { pathname, hash: routeHash } = useLocation();
  const [locationHash, setLocationHash] = useState(() =>
    typeof window === "undefined" ? "" : window.location.hash,
  );

  useEffect(() => {
    setLocationHash(window.location.hash);
    const onHashChange = () => setLocationHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [pathname, routeHash]);

  const sectionLinks = filterSectionDockLinks(links, pathname);
  if (sectionLinks.length === 0) return null;

  return (
    <SectionDock
      className="lp2-section-dock"
      links={sectionLinks}
      pathname={pathname}
      hash={routeHash || locationHash}
    />
  );
}
