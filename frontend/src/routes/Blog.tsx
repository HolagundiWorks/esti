import { ClickableTile, Column, Grid, Tag, Theme } from "@carbon/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { formatPostDate, listPosts } from "../lib/blog.js";
import { applyBlogListSeo } from "../lib/blog-seo.js";

// Roadmap of articles in the pipeline — shown as titles, not thin placeholder pages.
const COMING_NEXT = [
  "How better revision tracking prevents scope creep",
  "Why architecture teams miss early project warning signs",
  "Architecture practice management: the missing system",
  "Managing multiple client feedback loops efficiently",
  "Why managing architecture projects on Excel breaks down",
  "The real cost of poor project visibility in architecture studios",
];

export function Blog() {
  const navigate = useNavigate();
  const posts = listPosts();

  useEffect(() => {
    applyBlogListSeo();
  }, []);

  return (
    <Theme theme="white">
      <MarketingShell>
      <main id="main-content" className="esti-blog">
        <header className="esti-blog__head">
          <h1>Blog</h1>
          <p>Office intelligence, revisions, approvals, billing, and delivery notes for Indian architecture practices.</p>
        </header>

        {posts.length === 0 ? (
          <p className="esti-blog__empty">No posts yet — check back soon.</p>
        ) : (
          <Grid narrow className="esti-blog__grid">
            {posts.map((p) => (
              <Column key={p.slug} lg={8} md={4} sm={4}>
                <ClickableTile className="esti-blog-card" onClick={() => navigate(`/blog/${p.slug}`)}>
                  <div className="esti-blog-card__meta">
                    <span>{formatPostDate(p.date)}</span>
                    <span aria-hidden>·</span>
                    <span>{p.readingMinutes} min read</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.excerpt}</p>
                  {p.tags.length > 0 && (
                    <div className="esti-blog-card__tags">
                      {p.tags.map((t) => (
                        <Tag key={t} type="cool-gray" size="sm">{t}</Tag>
                      ))}
                    </div>
                  )}
                </ClickableTile>
              </Column>
            ))}
          </Grid>
        )}

        <section className="esti-blog-roadmap" aria-label="Coming next">
          <h2>Coming next</h2>
          <ul>
            {COMING_NEXT.map((t) => (
              <li key={t}><span aria-hidden>→</span> {t}</li>
            ))}
          </ul>
        </section>
      </main>
      <MarketingFooter />
      </MarketingShell>
    </Theme>
  );
}
