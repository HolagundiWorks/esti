/** Cross-page links for the marketing glass rail (not in-page section anchors). */
import { AORMS_STUDIO } from "./product-nomenclature.js";

export type MarketingRailIcon =
  | "platform"
  | "architecture"
  | "wiki"
  | "blog"
  | "legal"
  | "design-system";

export type MarketingPageLink = {
  href: string;
  label: string;
  icon: MarketingRailIcon;
};

export const MARKETING_RAIL_PAGES: readonly MarketingPageLink[] = [
  { href: "/", label: "Platform", icon: "platform" },
  { href: "/login", label: AORMS_STUDIO.title, icon: "architecture" },
  { href: "/wiki", label: "Wiki", icon: "wiki" },
  { href: "/blog", label: "Blog", icon: "blog" },
  { href: "/legal", label: "Legal", icon: "legal" },
  { href: "/design-system", label: "Design system", icon: "design-system" },
] as const;

export const MARKETING_WIKI_RAIL_PAGES: readonly MarketingPageLink[] = [
  { href: "/wiki", label: "Wiki", icon: "wiki" },
  { href: "/login", label: AORMS_STUDIO.title, icon: "architecture" },
  { href: "/", label: "Platform", icon: "platform" },
  { href: "/blog", label: "Blog", icon: "blog" },
  { href: "/legal", label: "Legal", icon: "legal" },
  { href: "/design-system", label: "Design system", icon: "design-system" },
] as const;

export function railPageLinkIsActive(href: string, pathname: string): boolean {
  const url = new URL(href, "https://aorms.local");
  const path = url.pathname || "/";
  if (path === "/wiki") return pathname === "/wiki" || pathname.startsWith("/wiki/");
  return pathname === path;
}
