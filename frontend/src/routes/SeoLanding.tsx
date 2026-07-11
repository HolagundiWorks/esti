import { marked } from "marked";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { AORMS_STUDIO } from "../lib/product-nomenclature.js";
import {
  getLandingPage,
  landingCategoryLabel,
  listLandingPages,
} from "../lib/landing-pages.js";
import { sanitizeMarkdownHtml } from "../lib/sanitize-html.js";
import { applyLandingPageSeo } from "../lib/landing-page-seo.js";

/** Renders a single keyword landing page (`/architecture-office-management-software`,
 *  etc.). The slug is resolved by App.tsx from the pathname before mounting. */
export function SeoLanding({ slug }: { slug: string }) {
  const page = getLandingPage(slug);

  const html = useMemo(
    () =>
      page
        ? sanitizeMarkdownHtml(marked.parse(page.markdown, { async: false }) as string)
        : "",
    [page],
  );

  const related = useMemo(() => {
    if (!page) return [];
    const others = listLandingPages().filter((p) => p.slug !== page.slug);
    const sameCat = others.filter((p) => p.category === page.category);
    const otherCat = others.filter((p) => p.category !== page.category);
    return [...sameCat, ...otherCat].slice(0, 4);
  }, [page]);

  useEffect(() => {
    if (page) applyLandingPageSeo(page);
  }, [page]);

  return (
    <MarketingShell contours vertical="architecture" footerVariant="architecture">
      <div className="lp2-ds">
        {!page ? (
          <header className="lp2-section-head lp2-reveal">
            <h1 className="lp2-section-head__title">Page not found</h1>
            <p className="lp2-section-head__body">
              This page may have moved. <Link to="/">Back to AORMS</Link> or{" "}
              <Link to="/blog">browse the blog</Link>.
            </p>
          </header>
        ) : (
          <>
            <header className="lp2-section-head lp2-reveal" id="top">
              <p className="lp2-section-head__tag">{landingCategoryLabel(page.category)}</p>
              <h1 className="lp2-section-head__title">{page.title}</h1>
              {page.intro ? <p className="lp2-section-head__body">{page.intro}</p> : null}
            </header>

            <article className="lp2-seo-article lp2-reveal">
              <div
                className="lp2-seo-article__body lp2-prose"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </article>

            <section className="lp2-ds-section lp2-seo-cta lp2-reveal" aria-label="Get started">
              <h2 className="lp2-seo-cta__title">See AORMS on your own office</h2>
              <p className="lp2-seo-cta__body">
                <strong>{AORMS_STUDIO.title}</strong> is the live workspace — use{" "}
                <strong>Create account</strong> or <strong>Sign in</strong> in the dock below, or{" "}
                <Link to="/login">sign in to explore</Link>. Platform north-star:{" "}
                <Link to="/">platform home</Link> · <Link to="/wiki">user guide</Link>.
              </p>
            </section>

            {related.length > 0 && (
              <nav className="lp2-ds-section lp2-seo-related lp2-reveal" aria-label="Related pages">
                <h2 className="lp2-seo-related__title">Related</h2>
                <ul className="lp2-seo-related__list">
                  {related.map((p) => (
                    <li key={p.slug}>
                      <Link to={`/${p.slug}`}>
                        <span aria-hidden>→</span> {p.title}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link to="/blog">
                      <span aria-hidden>→</span> AORMS blog
                    </Link>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </div>
    </MarketingShell>
  );
}
