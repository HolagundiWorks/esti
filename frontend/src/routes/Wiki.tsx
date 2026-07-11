import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import type { CSSProperties } from "react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AormsLogo } from "../components/AormsLogo.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { AORMS_STUDIO, AORMS_PLATFORM } from "../lib/product-nomenclature.js";
import { applyWikiListSeo } from "../lib/wiki-seo.js";
import { getWikiHome, listWikiPages, wikiHubSections } from "../lib/wiki.js";
import { wikiAppPath } from "../lib/wiki-url.js";

function reveal(delay = 0): CSSProperties {
  return { "--lp-reveal-delay": `${delay}ms` } as CSSProperties;
}

export function Wiki() {
  const navigate = useNavigate();
  const home = getWikiHome();
  const hubSections = wikiHubSections();

  useEffect(() => {
    applyWikiListSeo();
  }, []);

  return (
    <MarketingShell wiki contours tagline="Central documentation">
      <div className="lp2-wiki">
        <section className="lp2-hero-wrap lp2-hero-wrap--wiki" id="top" aria-labelledby="wiki-h1">
          <div className="lp2-hero lp2-hero--minimal">
            <div className="lp2-hero__text lp2-hero__text--centered lp2-reveal" style={reveal(0)}>
              <p className="lp2-wiki-platform-band">
                {AORMS_PLATFORM.name} central wiki — four documentation domains. Live workspace:{" "}
                <strong>{AORMS_STUDIO.title}</strong>.{" "}
                <Link to="/">Platform home</Link>
              </p>
              <div className="lp2-hero__brand">
                <AormsLogo variant="hero" />
              </div>
              <h1 id="wiki-h1" className="lp2-hero__h1">
                {home?.title ?? "Central documentation"}
              </h1>
              <p className="lp2-hero__sub">
                {home?.excerpt ??
                  `HCW-UI · ${AORMS_STUDIO.title} · AI core · Management — official guides for the platform and ${AORMS_STUDIO.title}.`}
              </p>
              <p className="lp2-wiki-hero__hint">
                <RocketLaunchOutlinedIcon sx={{ fontSize: 16, verticalAlign: "text-bottom" }} aria-hidden />
                {" "}
                Start with{" "}
                <Link to={wikiAppPath("getting-started")}>Getting started</Link>
              </p>
            </div>
          </div>
        </section>

        <section className="lp2-wiki-hubs" aria-label="Documentation domains">
          <header className="lp2-section-head lp2-reveal" style={reveal(0)}>
            <p className="lp2-section-head__tag">Four domains</p>
            <h2 className="lp2-section-head__title">Browse by hub</h2>
            <p className="lp2-section-head__body">
              HCW-UI design system, {AORMS_STUDIO.title}, AI core, and office management — each hub
              links to guides and overviews.
            </p>
          </header>
          <div className="lp2-wiki-hubs__grid">
            {hubSections.map(({ hub }, i) => (
              <article
                key={hub.id}
                className="lp2-tile lp2-wiki-hub-card lp2-reveal"
                style={reveal(30 + i * 40)}
              >
                <button
                  type="button"
                  className="lp2-wiki-card__btn"
                  onClick={() => navigate(wikiAppPath(hub.hubSlug))}
                >
                  <p className="lp2-wiki-hub-card__tag">{hub.tagline}</p>
                  <h2 className="lp2-wiki-card__title">{hub.title}</h2>
                  <p className="lp2-wiki-card__detail">{hub.description}</p>
                  <span className="lp2-wiki-card__arrow" aria-hidden>
                    →
                  </span>
                </button>
              </article>
            ))}
          </div>
        </section>

        {hubSections.map(({ hub, guides }, gi) =>
          guides.length > 0 ? (
            <section
              key={hub.id}
              className="lp2-section"
              aria-labelledby={`wiki-hub-${hub.id}`}
            >
              <header className="lp2-section-head lp2-reveal" style={reveal(0)}>
                <p className="lp2-section-head__tag">{hub.title}</p>
                <h2 id={`wiki-hub-${hub.id}`} className="lp2-section-head__title">
                  {hub.tagline}
                </h2>
                <p className="lp2-section-head__body">
                  <Link to={wikiAppPath(hub.hubSlug)}>Hub overview →</Link>
                </p>
              </header>
              <div className="lp2-grid lp2-grid--2">
                {guides.map((p, i) => (
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
                      <p className="lp2-wiki-card__section">{p.section}</p>
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
          ) : null,
        )}
      </div>
    </MarketingShell>
  );
}
