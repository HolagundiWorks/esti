import { marked } from "marked";
import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { formatPostDate, getAdjacentPosts, getPost } from "../lib/blog.js";
import { applyBlogPostSeo } from "../lib/blog-seo.js";
import { sanitizeMarkdownHtml } from "../lib/sanitize-html.js";
import { relatedLandingForTags } from "../lib/blog-related.js";

export function BlogPost() {
  const { slug = "" } = useParams();
  const post = getPost(slug);
  const { newer, older } = getAdjacentPosts(slug);
  const relatedSolutions = useMemo(
    () => (post ? relatedLandingForTags(post.tags) : []),
    [post],
  );

  const html = useMemo(
    () =>
      post
        ? sanitizeMarkdownHtml(marked.parse(post.markdown, { async: false }) as string)
        : "",
    [post],
  );

  useEffect(() => {
    if (post) applyBlogPostSeo(post);
  }, [post]);

  return (
    <MarketingShell contours>
      <div className="lp2-ds">
        <p className="lp2-blog-back lp2-reveal">
          <Link to="/blog">← All posts</Link>
        </p>

        {!post ? (
          <header className="lp2-section-head lp2-reveal">
            <h1 className="lp2-section-head__title">Post not found</h1>
            <p className="lp2-section-head__body">
              This article may have moved. <Link to="/blog">Browse all posts</Link>.
            </p>
          </header>
        ) : (
          <>
            <header className="lp2-section-head lp2-reveal" id="top">
              <div className="lp2-blog-row__meta">
                <span>{formatPostDate(post.date)}</span>
                <span aria-hidden>·</span>
                <span>{post.readingMinutes} min read</span>
              </div>
              <h1 className="lp2-section-head__title">{post.title}</h1>
              {post.author ? <p className="lp2-section-head__body">{post.author}</p> : null}
              {post.tags.length > 0 && (
                <ul className="lp2-blog-row__tags" aria-label="Tags">
                  {post.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </header>

            <article className="lp2-seo-article lp2-reveal">
              <div
                className="lp2-seo-article__body lp2-prose"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </article>

            {relatedSolutions.length > 0 && (
              <nav className="lp2-ds-section lp2-seo-related lp2-reveal" aria-label="Related solutions">
                <h2 className="lp2-seo-related__title">Related solutions</h2>
                <ul className="lp2-seo-related__list">
                  {relatedSolutions.map((s) => (
                    <li key={s.slug}>
                      <Link to={`/${s.slug}`}>
                        <span aria-hidden>→</span> {s.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {(older || newer) && (
              <nav className="lp2-blog-pager lp2-reveal" aria-label="More posts">
                {older ? (
                  <Link to={`/blog/${older.slug}`} className="lp2-blog-pager__link">
                    <span className="lp2-blog-pager__dir">← Previous</span>
                    <span className="lp2-blog-pager__title">{older.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {newer ? (
                  <Link to={`/blog/${newer.slug}`} className="lp2-blog-pager__link lp2-blog-pager__link--next">
                    <span className="lp2-blog-pager__dir">Next →</span>
                    <span className="lp2-blog-pager__title">{newer.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </MarketingShell>
  );
}
