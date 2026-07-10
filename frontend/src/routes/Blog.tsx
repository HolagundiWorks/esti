import { Chip, Grid, Paper } from "@mui/material";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { formatPostDate, listPosts } from "../lib/blog.js";
import { applyBlogListSeo } from "../lib/blog-seo.js";

// Roadmap of articles in the pipeline — shown as titles, not thin placeholder pages.
const COMING_NEXT = [
  "COA stage-wise fee structures — a billing guide for Indian architects",
  "Transmittal anatomy — what every drawing issue record should contain",
  "TDS on architecture invoices — what firms miss at year-end",
  "Scope-of-work letters vs fee proposals — when to use which",
];

export function Blog() {
  const navigate = useNavigate();
  const posts = listPosts();

  useEffect(() => {
    applyBlogListSeo();
  }, []);

  return (
      <MarketingShell>
      <div className="esti-blog">
        <header className="esti-blog__head">
          <h1>Blog</h1>
          <p>Office intelligence, revisions, approvals, billing, and delivery notes for Indian architecture practices.</p>
        </header>

        {posts.length === 0 ? (
          <p className="esti-blog__empty">No posts yet — check back soon.</p>
        ) : (
          <Grid container spacing={2} className="esti-blog__grid">
            {posts.map((p) => (
              <Grid key={p.slug} size={{ xs: 12, md: 6 }}>
                <Paper
                  className="esti-blog-card"
                  component="a"
                  href={`/blog/${p.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/blog/${p.slug}`);
                  }}
                  sx={{ cursor: "pointer", display: "block", textDecoration: "none", color: "inherit" }}
                >
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
                        <Chip
                          key={t}
                          size="small"
                          label={t}
                          sx={{
                            backgroundColor: "var(--cds-tag-background-cool-gray)",
                            color: "var(--cds-tag-color-cool-gray)",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </Paper>
              </Grid>
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
      </div>
      <MarketingFooter />
      </MarketingShell>
  );
}
