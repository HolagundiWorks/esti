import { useEffect, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AORMS_STUDIO, AORMS_PLATFORM } from "../lib/product-nomenclature.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { formatPostDate, listPosts } from "../lib/blog.js";
import { applyBlogListSeo } from "../lib/blog-seo.js";

// Roadmap of articles in the pipeline — shown as titles, not thin placeholder pages.
const COMING_NEXT = [
  "EmOI dual-tier AI — quality gate and safety gate for advisory consultancies",
  "Operational vs design framework — what consulting offices actually need",
  "COA stage-wise fee structures — a billing guide for Indian architects",
  "Transmittal anatomy — what every drawing issue record should contain",
];

export function Blog() {
  const navigate = useNavigate();
  const posts = listPosts();

  useEffect(() => {
    applyBlogListSeo();
  }, []);

  return (
    <MarketingShell contours>
      <div className="lp2-ds">
        <header className="lp2-section-head lp2-reveal" id="top">
          <p className="lp2-section-head__tag">{AORMS_PLATFORM.name} blog</p>
          <h1 className="lp2-section-head__title">Blog</h1>
          <p className="lp2-section-head__body">
            Platform notes (frameworks, EmOI) and <strong>{AORMS_STUDIO.title}</strong>{" "}
            advisory operations for Indian architecture consultancies — revisions, approvals,
            billing, and workflows.
          </p>
          <p className="lp2-blog-links">
            <Link to="/">AORMS platform</Link>
            <span aria-hidden> · </span>
            <Link to="/login">{AORMS_STUDIO.title}</Link>
            <span aria-hidden> · </span>
            <Link to="/wiki">{AORMS_STUDIO.wikiName}</Link>
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="lp2-blog-empty lp2-reveal">No posts yet — check back soon.</p>
        ) : (
          <ul className="lp2-blog-list">
            {posts.map((p, i) => (
              <li key={p.slug} className="lp2-blog-row lp2-reveal" style={{ "--lp-i": i } as CSSProperties}>
                <a
                  href={`/blog/${p.slug}`}
                  className="lp2-blog-row__link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/blog/${p.slug}`);
                  }}
                >
                  <div className="lp2-blog-row__meta">
                    <span>{formatPostDate(p.date)}</span>
                    <span aria-hidden>·</span>
                    <span>{p.readingMinutes} min read</span>
                  </div>
                  <h2 className="lp2-blog-row__title">{p.title}</h2>
                  <p className="lp2-blog-row__excerpt">{p.excerpt}</p>
                  {p.tags.length > 0 && (
                    <ul className="lp2-blog-row__tags" aria-label="Tags">
                      {p.tags.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}

        <section className="lp2-ds-section lp2-blog-roadmap lp2-reveal" aria-label="Coming next">
          <h2 className="lp2-blog-roadmap__title">Coming next</h2>
          <ul className="lp2-blog-roadmap__list">
            {COMING_NEXT.map((t) => (
              <li key={t}>
                <span aria-hidden>→</span> {t}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </MarketingShell>
  );
}
