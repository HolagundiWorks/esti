import { useEffect } from "react";
import { DESIGN_SYSTEM_NAV, DesignSystemPage } from "../components/landing/DesignSystemPage.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { useLpReveal } from "../lib/use-lp-reveal.js";

export function DesignSystem() {
  useLpReveal();

  useEffect(() => {
    const title = "HCW-UI-Kit — Human Centric Works design system";
    const description =
      "Depth encodes importance. Explore @hcw/ui-kit — the layered design system behind AORMS: flat, soft, and glass surfaces, Rail · Stage · Dock spatial model, Urbanist type, and Radiant Orange accent.";
    document.title = title;
    const set = (sel: string, attr: "content" | "href", val: string) =>
      document.querySelector(sel)?.setAttribute(attr, val);
    set('meta[name="description"]', "content", description);
    set('meta[property="og:title"]', "content", title);
    set('meta[property="og:description"]', "content", description);
    set('meta[property="og:url"]', "content", `${window.location.origin}/design-system`);
    set('meta[name="twitter:title"]', "content", title);
    set('meta[name="twitter:description"]', "content", description);
    set('link[rel="canonical"]', "href", `${window.location.origin}/design-system`);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const raf = window.requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <MarketingShell contours sectionLinks={DESIGN_SYSTEM_NAV} tagline="HCW-UI-Kit · design system">
      <DesignSystemPage />
    </MarketingShell>
  );
}
