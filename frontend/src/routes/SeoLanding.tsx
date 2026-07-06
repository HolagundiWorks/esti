import { Button, Chip } from "@mui/material";
import ArrowForward from "@mui/icons-material/ArrowForward";
import { marked } from "marked";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import {
  getLandingPage,
  landingCategoryLabel,
  listLandingPages,
} from "../lib/landing-pages.js";
import { applyLandingPageSeo } from "../lib/landing-page-seo.js";

/** Renders a single keyword landing page (`/architecture-office-management-software`,
 *  etc.). The slug is resolved by App.tsx from the pathname before mounting. */
export function SeoLanding({ slug }: { slug: string }) {
  const page = getLandingPage(slug);

  const html = useMemo(
    () => (page ? (marked.parse(page.markdown, { async: false }) as string) : ""),
    [page],
  );

  // Up to three sibling pages from other categories, for internal linking.
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
      <MarketingShell>
        <main id="main-content" className="esti-blog">
          <Link to="/" className="esti-blog__back">← AORMS home</Link>

          {!page ? (
            <div className="esti-blog__empty">
              <h1>Page not found</h1>
              <p>
                This page may have moved. <Link to="/">Back to AORMS</Link> or{" "}
                <Link to="/blog">browse the blog</Link>.
              </p>
            </div>
          ) : (
            <article className="esti-blog-article">
              <Chip
                size="small"
                label={landingCategoryLabel(page.category)}
                sx={{
                  backgroundColor: "var(--cds-tag-background-cool-gray)",
                  color: "var(--cds-tag-color-cool-gray)",
                }}
              />
              <h1>{page.title}</h1>
              {page.intro && <p className="esti-blog-article__byline">{page.intro}</p>}

              {/* Content is authored by the team in-repo (trusted), not user input. */}
              <div
                className="esti-blog-article__body"
                dangerouslySetInnerHTML={{ __html: html }}
              />

              <section className="esti-blog-roadmap" aria-label="Get started">
                <h2>See AORMS on your own office</h2>
                <p>
                  Open the live demo workspace — no signup — or request a workspace for
                  your practice.
                </p>
                <div className="esti-blog-card__tags">
                  <Button href="/demo" endIcon={<ArrowForward />}>
                    Open the live demo
                  </Button>
                  <Button href="/#trial" variant="outlined">
                    Request a workspace
                  </Button>
                </div>
              </section>

              {related.length > 0 && (
                <nav className="esti-blog-roadmap" aria-label="Related pages">
                  <h2>Related</h2>
                  <ul>
                    {related.map((p) => (
                      <li key={p.slug}>
                        <Link to={`/${p.slug}`}>
                          <span aria-hidden>→</span> {p.title}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link to="/blog"><span aria-hidden>→</span> AORMS blog</Link>
                    </li>
                  </ul>
                </nav>
              )}
            </article>
          )}
        </main>
        <MarketingFooter />
      </MarketingShell>
  );
}
