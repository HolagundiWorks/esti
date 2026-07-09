import { Paper, Stack } from "@mui/material";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { applyWikiListSeo } from "../lib/wiki-seo.js";
import { getWikiHome, listWikiPages, wikiSections } from "../lib/wiki.js";
import { wikiAppPath, wikiPageUrl } from "../lib/wiki-url.js";

export function Wiki() {
  const navigate = useNavigate();
  const home = getWikiHome();
  const sections = wikiSections();

  useEffect(() => {
    applyWikiListSeo();
  }, []);

  return (
    <MarketingShell wiki>
      <main id="main-content" className="esti-wiki">
        <header className="esti-wiki__head">
          <h1>{home?.title ?? "AORMS Wiki"}</h1>
          <p>
            {home?.excerpt ??
              "Official documentation for the AORMS cloud workspace — one standard licence, unlimited users, no desktop installs."}
          </p>
          <p className="esti-wiki__cta">
            New here? Start with{" "}
            <Link to={wikiAppPath("getting-started")}>Getting started</Link> or the full{" "}
            <Link to={wikiAppPath("how-to-use-aorms")}>How to use AORMS</Link> guide.
          </p>
        </header>

        {sections.map((group) => (
          <section key={group.section} className="esti-wiki__section" aria-labelledby={`wiki-${group.section}`}>
            <h2 id={`wiki-${group.section}`}>{group.section}</h2>
            <Stack spacing={1.5}>
              {group.pages.map((p) => (
                <Paper
                  key={p.slug}
                  className="esti-wiki-card"
                  onClick={() => navigate(wikiAppPath(p.slug))}
                  sx={{ cursor: "pointer", p: 2 }}
                >
                  <h3>
                    <a href={wikiPageUrl(p.slug)} onClick={(e) => e.preventDefault()}>
                      {p.title}
                    </a>
                  </h3>
                  <p>{p.excerpt}</p>
                  <p className="esti-wiki-card__meta">{p.readingMinutes} min read</p>
                </Paper>
              ))}
            </Stack>
          </section>
        ))}

        {listWikiPages().length === 0 && (
          <p className="esti-wiki__empty">Documentation pages are being published — check back shortly.</p>
        )}
      </main>
      <MarketingFooter />
    </MarketingShell>
  );
}
