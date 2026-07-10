import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import type { CSSProperties } from "react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { applyWikiListSeo } from "../lib/wiki-seo.js";
import { getWikiHome, listWikiPages, wikiSections } from "../lib/wiki.js";
import { WIKI_SHELL_NAV, wikiAppPath } from "../lib/wiki-url.js";
import { useLpReveal } from "../lib/use-lp-reveal.js";

function reveal(delay = 0): CSSProperties {
  return { "--lp-reveal-delay": `${delay}ms` } as CSSProperties;
}

const START_HERE = [
  {
    slug: "getting-started",
    label: "Start here",
    title: "Getting started",
    detail: "Create your workspace, invite the studio, and open your first project.",
  },
  {
    slug: "how-to-use-aorms",
    label: "Daily use",
    title: "How to use AORMS",
    detail: "Projects, revisions, drawings, finance, and portals — the full workflow map.",
  },
] as const;

export function Wiki() {
  const navigate = useNavigate();
  const home = getWikiHome();
  const sections = wikiSections();
  useLpReveal();

  useEffect(() => {
    applyWikiListSeo();
  }, []);

  return (
    <MarketingShell wiki contours sectionLinks={WIKI_SHELL_NAV} tagline="Official documentation">
      <div className="lp2-wiki">
        <header className="lp2-wiki-hero" id="top" aria-labelledby="wiki-h1">
          <div className="lp2-wiki-hero__glow" aria-hidden />
          <div className="lp2-wiki-hero__inner lp2-reveal" style={reveal(0)}>
            <p className="lp2-wiki-hero__eyebrow">
              <MenuBookOutlinedIcon sx={{ fontSize: 18 }} aria-hidden />
              AORMS Wiki
            </p>
            <h1 id="wiki-h1" className="lp2-wiki-hero__title">
              {home?.title ?? "How to use AORMS"}
            </h1>
            <p className="lp2-wiki-hero__lead">
              {home?.excerpt ??
                "Official documentation for the AORMS cloud workspace — one standard licence, unlimited users, no desktop installs."}
            </p>
            <div className="lp2-wiki-hero__actions">
              <Link to={wikiAppPath("getting-started")} className="lp2-wiki-hero__cta lp2-wiki-hero__cta--primary">
                <RocketLaunchOutlinedIcon sx={{ fontSize: 18 }} aria-hidden />
                Getting started
              </Link>
              <Link to={wikiAppPath("how-to-use-aorms")} className="lp2-wiki-hero__cta">
                Full workflow guide
              </Link>
            </div>
          </div>
        </header>

        <section className="lp2-wiki-start" aria-label="Start here">
          <div className="lp2-grid lp2-grid--2">
            {START_HERE.map((card, i) => (
              <article
                key={card.slug}
                className="lp2-tile lp2-wiki-card lp2-reveal"
                style={reveal(40 + i * 50)}
              >
                <button
                  type="button"
                  className="lp2-wiki-card__btn"
                  onClick={() => navigate(wikiAppPath(card.slug))}
                >
                  <p className="lp2-wiki-card__tag">{card.label}</p>
                  <h2 className="lp2-wiki-card__title">{card.title}</h2>
                  <p className="lp2-wiki-card__detail">{card.detail}</p>
                  <span className="lp2-wiki-card__arrow" aria-hidden>
                    →
                  </span>
                </button>
              </article>
            ))}
          </div>
        </section>

        {sections.map((group, gi) => (
          <section
            key={group.section}
            className="lp2-section"
            aria-labelledby={`wiki-sec-${gi}`}
          >
            <div className="lp2-section-head lp2-ds-head lp2-reveal" style={reveal(0)}>
              <p className="lp2-section-head__tag">Guides</p>
              <h2 id={`wiki-sec-${gi}`} className="lp2-section-head__title">
                {group.section}
              </h2>
            </div>
            <div className="lp2-grid lp2-grid--2">
              {group.pages.map((p, i) => (
                <article
                  key={p.slug}
                  className="lp2-tile lp2-wiki-card lp2-reveal"
                  style={reveal(30 + i * 40)}
                >
                  <button
                    type="button"
                    className="lp2-wiki-card__btn"
                    onClick={() => navigate(wikiAppPath(p.slug))}
                  >
                    <p className="lp2-wiki-card__meta">
                      {p.readingMinutes} min read
                      {p.updated ? ` · Updated ${p.updated}` : ""}
                    </p>
                    <h3 className="lp2-wiki-card__title">{p.title}</h3>
                    <p className="lp2-wiki-card__detail">{p.excerpt}</p>
                    <span className="lp2-wiki-card__arrow" aria-hidden>
                      →
                    </span>
                  </button>
                </article>
              ))}
            </div>
          </section>
        ))}

        {listWikiPages().length === 0 && (
          <p className="lp2-wiki-empty lp2-reveal" style={reveal(60)}>
            Documentation pages are being published — check back shortly.
          </p>
        )}
      </div>
      <MarketingFooter />
    </MarketingShell>
  );
}
