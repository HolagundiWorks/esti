/** Cross-page links for the marketing glass rail (not in-page section anchors). */
export type MarketingRailIcon =
  | "platform"
  | "architecture"
  | "consultancy"
  | "wiki"
  | "blog"
  | "about"
  | "legal"
  | "design-system";

export type MarketingPageLink = {
  href: string;
  label: string;
  icon: MarketingRailIcon;
};

// Marketing consolidation (2026-07): AORMS ships a single landing at `/`; the former
// wiki / blog / about / legal / per-app marketing pages were removed. The marketing rail
// (still used as the shell for the public auth pages) links back to the landing only.
export const MARKETING_RAIL_PAGES: readonly MarketingPageLink[] = [
  { href: "/", label: "Home", icon: "platform" },
] as const;

export const MARKETING_WIKI_RAIL_PAGES: readonly MarketingPageLink[] = MARKETING_RAIL_PAGES;

export function railPageLinkIsActive(href: string, pathname: string, hash = ""): boolean {
  const url = new URL(href, "https://aorms.local");
  const path = url.pathname || "/";
  const linkHash = url.hash.replace(/^#/, "");

  if (path === "/wiki") return pathname === "/wiki" || pathname.startsWith("/wiki/");
  if (path === "/" && linkHash) {
    if (pathname !== "/") return false;
    const current = hash.replace(/^#/, "");
    if (linkHash === "platform") return !current || current === "platform" || current === "top";
    return current === linkHash;
  }
  return pathname === path && !linkHash;
}
