import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AORMS_STUDIO, AORMS_PLATFORM } from "../lib/product-nomenclature.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";

/** Public 404 — unknown marketing paths (not a soft redirect to the homepage). */
export function NotFound() {
  useEffect(() => {
    const title = "Page not found — AORMS";
    const description = "This page does not exist on aorms.in. Browse the platform home or sign in to AORMS-Studio.";
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex");
  }, []);

  return (
    <MarketingShell contours tagline="Not found">
      <div className="lp2-ds">
        <header className="lp2-section-head lp2-reveal" id="top">
          <p className="lp2-section-head__tag">404</p>
          <h1 className="lp2-section-head__title">Page not found</h1>
          <p className="lp2-section-head__body">
            The address you opened is not a public {AORMS_PLATFORM.name} page. Try one of these
            instead:
          </p>
          <p className="lp2-blog-links">
            <Link to="/">{AORMS_PLATFORM.name} home</Link>
            <span aria-hidden> · </span>
            <Link to="/login">{AORMS_STUDIO.title}</Link>
          </p>
        </header>
      </div>
    </MarketingShell>
  );
}
