import { Tag, Theme } from "@carbon/react";
import { marked } from "marked";
import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { formatPostDate, getAdjacentPosts, getPost } from "../lib/blog.js";
import { applyBlogPostSeo } from "../lib/blog-seo.js";

export function BlogPost() {
  const { slug = "" } = useParams();
  const post = getPost(slug);
  const { newer, older } = getAdjacentPosts(slug);

  const html = useMemo(
    () => (post ? (marked.parse(post.markdown, { async: false }) as string) : ""),
    [post],
  );

  useEffect(() => {
    if (post) applyBlogPostSeo(post);
  }, [post]);

  return (
    <MarketingShell visitCount={null}>
      <Theme theme="g100" className="esti-blog-theme">
      <main id="main-content" className="esti-blog">
        <Link to="/blog" className="esti-blog__back">← All posts</Link>

        {!post ? (
          <div className="esti-blog__empty">
            <h1>Post not found</h1>
            <p>
              This article may have moved. <Link to="/blog">Browse all posts</Link>.
            </p>
          </div>
        ) : (
          <article className="esti-blog-article">
            <div className="esti-blog-card__meta">
              <span>{formatPostDate(post.date)}</span>
              <span aria-hidden>·</span>
              <span>{post.readingMinutes} min read</span>
            </div>
            <h1>{post.title}</h1>
            {post.author && <p className="esti-blog-article__byline">{post.author}</p>}
            {post.tags.length > 0 && (
              <div className="esti-blog-card__tags">
                {post.tags.map((t) => (
                  <Tag key={t} type="cool-gray" size="sm">{t}</Tag>
                ))}
              </div>
            )}
            {/* Content is authored by the team in-repo (trusted), not user input. */}
            <div className="esti-blog-article__body" dangerouslySetInnerHTML={{ __html: html }} />

            {(older || newer) && (
              <nav className="esti-blog-pager" aria-label="More posts">
                {older ? (
                  <Link to={`/blog/${older.slug}`} className="esti-blog-pager__link esti-blog-pager__link--prev">
                    <span className="esti-blog-pager__dir">← Previous</span>
                    <span className="esti-blog-pager__title">{older.title}</span>
                  </Link>
                ) : <span />}
                {newer ? (
                  <Link to={`/blog/${newer.slug}`} className="esti-blog-pager__link esti-blog-pager__link--next">
                    <span className="esti-blog-pager__dir">Next →</span>
                    <span className="esti-blog-pager__title">{newer.title}</span>
                  </Link>
                ) : <span />}
              </nav>
            )}
          </article>
        )}
      </main>
      </Theme>
    </MarketingShell>
  );
}
