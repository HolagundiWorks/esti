import { marked } from "marked";
import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { applyWikiPageSeo } from "../lib/wiki-seo.js";
import { getWikiPage, listWikiPages } from "../lib/wiki.js";
import { isWikiHost, wikiAppPath } from "../lib/wiki-url.js";

export function WikiPage() {
  const { slug = "" } = useParams();
  const page = getWikiPage(slug);
  const pages = listWikiPages();
  const i = pages.findIndex((p) => p.slug === slug);
  const prev = i > 0 ? pages[i - 1] : undefined;
  const next = i >= 0 && i < pages.length - 1 ? pages[i + 1] : undefined;

  const html = useMemo(() => {
    if (!page) return "";
    const raw = marked.parse(page.markdown, { async: false }) as string;
    const base = isWikiHost() ? "" : "/wiki";
    return raw.replace(/href="([^"]+)"/g, (match, href) => {
      if (/^(https?:|mailto:|#|\/)/.test(href)) return match;
      return `href="${base}/${href}"`;
    });
  }, [page]);

  useEffect(() => {
    if (page) applyWikiPageSeo(page);
  }, [page]);

  return (
    <MarketingShell wiki>
      <main id="main-content" className="esti-wiki">
        <Link to={wikiAppPath()} className="esti-wiki__back">
          ← Wiki home
        </Link>

        {!page || page.slug === "index" ? (
          <div className="esti-wiki__empty">
            <h1>Page not found</h1>
            <p>
              This article may have moved. <Link to={wikiAppPath()}>Browse all guides</Link>.
            </p>
          </div>
        ) : (
          <article className="esti-wiki-article">
            <h1>{page.title}</h1>
            {page.updated && <p className="esti-wiki-article__meta">Updated {page.updated}</p>}
            <div className="esti-wiki-article__body" dangerouslySetInnerHTML={{ __html: html }} />

            {(prev || next) && (
              <nav className="esti-blog-pager" aria-label="More guides">
                {prev ? (
                  <Link to={wikiAppPath(prev.slug)} className="esti-blog-pager__link esti-blog-pager__link--prev">
                    <span className="esti-blog-pager__dir">← Previous</span>
                    <span className="esti-blog-pager__title">{prev.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {next ? (
                  <Link to={wikiAppPath(next.slug)} className="esti-blog-pager__link esti-blog-pager__link--next">
                    <span className="esti-blog-pager__dir">Next →</span>
                    <span className="esti-blog-pager__title">{next.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </article>
        )}
      </main>
      <MarketingFooter />
    </MarketingShell>
  );
}
