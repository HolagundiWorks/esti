import { Column, Grid, Link, Stack, Theme } from "@carbon/react";
import { Link as RouterLink } from "react-router-dom";
import { LANDING_NAV } from "../../lib/landing-slugs.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";

/**
 * Homepage "Solutions" band — an internal-linking hub into the keyword landing
 * pages (SEO Phase 3/9/10). Pure Carbon layout (Grid/Column/Stack/Link); React
 * Router `Link` keeps navigation client-side while still emitting real anchors
 * for crawlers.
 */
export function MarketingSolutions() {
  return (
    <Theme theme="g100">
      <LandingBand variant="muted" ariaLabelledby="solutions-title">
        <LandingEditorial>
          <h2 id="solutions-title">Built for every part of the practice</h2>
          <p className="esti-lp-lead">
            AORMS is architecture office management software for Indian firms — from
            COA fees and GST billing to drawing revisions, approvals and bylaw
            compliance. Explore by what you need to run.
          </p>
          <Grid narrow>
            {LANDING_NAV.map((group) => (
              <Column key={group.heading} lg={5} md={4} sm={4}>
                <nav aria-label={group.heading}>
                  <h3>{group.heading}</h3>
                  <Stack gap={3}>
                    {group.links.map((item) => (
                      <Link key={item.slug} as={RouterLink} to={`/${item.slug}`}>
                        {item.label}
                      </Link>
                    ))}
                  </Stack>
                </nav>
              </Column>
            ))}
          </Grid>
        </LandingEditorial>
      </LandingBand>
    </Theme>
  );
}
