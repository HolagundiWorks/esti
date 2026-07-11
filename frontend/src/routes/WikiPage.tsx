import { marked } from "marked";
import { useEffect, useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { AORMS_STUDIO, isAormsStudioLegacySlug } from "../lib/product-nomenclature.js";
import { applyWikiPageSeo } from "../lib/wiki-seo.js";
import { sanitizeMarkdownHtml } from "../lib/sanitize-html.js";
import { getWikiPage, listWikiPages } from "../lib/wiki.js";
import { WIKI_HUBS } from "../lib/wiki-hub.js";
import { wikiAppPath } from "../lib/wiki-url.js";

function hubLabel(domain: string): string {
  return WIKI_HUBS.find((h) => h.id === domain)?.title ?? domain;
}

export function WikiPage() {
  const { slug = "" } = useParams();
  if (isAormsStudioLegacySlug(slug)) {
    return <Navigate to={wikiAppPath(AORMS_STUDIO.slug)} replace />;
  }
  const page = getWikiPage(slug);
  const pages = listWikiPages();
  const i = pages.findIndex((p) => p.slug === slug);
  const prev = i > 0 ? pages[i - 1] : undefined;
  const next = i >= 0 && i < pages.length - 1 ? pages[i + 1] : undefined;

  const html = useMemo(() => {
    if (!page) return "";
    const raw = marked.parse(page.markdown, { async: false }) as string;
    const linked = raw.replace(/href="([^"]+)"/g, (match, href) => {
      if (/^(https?:|mailto:|#|\/)/.test(href)) return match;
      return `href="${wikiAppPath(href)}"`;
    });
    return sanitizeMarkdownHtml(linked);
  }, [page]);

  useEffect(() => {
    if (page) applyWikiPageSeo(page);
  }, [page]);

  return (
    <MarketingShell wiki contours tagline="Official documentation">
      <div className="lp2-ds">
        <Link to={wikiAppPath()} className="lp2-wiki-back lp2-reveal">
          ← Wiki home
        </Link>

        {!page || page.slug === "index" ? (
          <header className="lp2-section-head lp2-reveal">
            <h1 className="lp2-section-head__title">Page not found</h1>
            <p className="lp2-section-head__body">
              This article may have moved. <Link to={wikiAppPath()}>Browse all guides</Link>.
            </p>
          </header>
        ) : (
          <article className="lp2-seo-article lp2-reveal">
            <header className="lp2-section-head">
              <p className="lp2-section-head__tag">
                <Link to={wikiAppPath()}>Wiki</Link>
                <span aria-hidden> · </span>
                {hubLabel(page.domain)}
              </p>
              <h1 className="lp2-section-head__title">{page.title}</h1>
              {page.updated ? (
                <p className="lp2-section-head__body">Updated {page.updated}</p>
              ) : null}
            </header>
            <div
              className="lp2-seo-article__body lp2-prose"
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {(prev || next) && (
              <nav className="lp2-blog-pager lp2-reveal" aria-label="More guides">
                {prev ? (
                  <Link to={wikiAppPath(prev.slug)} className="lp2-blog-pager__link">
                    <span className="lp2-blog-pager__dir">← Previous</span>
                    <span className="lp2-blog-pager__title">{prev.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {next ? (
                  <Link to={wikiAppPath(next.slug)} className="lp2-blog-pager__link lp2-blog-pager__link--next">
                    <span className="lp2-blog-pager__dir">Next →</span>
                    <span className="lp2-blog-pager__title">{next.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </article>
        )}
      </div>
    </MarketingShell>
  );
}
