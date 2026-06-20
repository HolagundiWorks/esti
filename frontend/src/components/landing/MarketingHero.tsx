import { ArrowRight, Checkmark, Login } from "@carbon/icons-react";
import { Button, ClickableTile, Column, Grid, ListItem, Stack, Tag, UnorderedList } from "@carbon/react";
import { DEMO_ACCOUNTS, type DemoKind } from "../../lib/landing-demo.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";

const RESOLVERS = [
  "CRIF revision register — every client change documented, budgeted, and approved",
  "COA fee proposals, GST invoicing, TDS reconciliation, and filing abstracts",
  "Scoped client, consultant, and contractor portals built into the project record",
] as const;

export function MarketingHero({
  onStudioDemo,
  onSoloDemo,
  onTrialScroll,
  demoLoading,
  demoKind,
}: {
  onStudioDemo: () => void;
  onSoloDemo?: () => void;
  onTrialScroll?: () => void;
  demoLoading: boolean;
  demoKind?: DemoKind | null;
}) {
  return (
    <LandingBand
        variant="lead"
        id="top"
        ariaLabelledby="hero-title"
        className="esti-landing-hero-full"
      >
        <LandingEditorial>
          <Grid fullWidth className="esti-landing-grid esti-landing-hero-grid">
            <Column lg={8} md={8} sm={4}>
              <Stack gap={8}>
                <Stack gap={5}>
                  <p className="esti-landing-eyebrow">
                    Architecture Office Record &amp; Management System
                  </p>
                  <h1 id="hero-title" className="esti-landing-lead-title">
                    One traceable record for Indian architecture practice.
                  </h1>
                  <p className="esti-landing-lead-subtitle">
                    From enquiry to final bill — projects, drawings, revisions, COA fees,
                    GST, compliance, and portals in a single self-hosted system.
                  </p>
                </Stack>

                <UnorderedList className="esti-landing-icon-list">
                  {RESOLVERS.map((r) => (
                    <ListItem key={r}>
                      <span className="esti-row">
                        <Checkmark size={20} aria-hidden />
                        <span>{r}</span>
                      </span>
                    </ListItem>
                  ))}
                </UnorderedList>

                <Stack orientation="horizontal" gap={4} className="esti-landing-hero-actions">
                  <Button
                    kind="primary"
                    size="lg"
                    renderIcon={ArrowRight}
                    onClick={onStudioDemo}
                    disabled={demoLoading}
                  >
                    {demoLoading && demoKind === "studio" ? "Opening…" : "Explore studio demo"}
                  </Button>
                  {onTrialScroll && (
                    <Button kind="secondary" size="lg" onClick={onTrialScroll}>
                      Request trial
                    </Button>
                  )}
                  <Button kind="ghost" size="lg" renderIcon={Login} href="/login">
                    Sign in
                  </Button>
                </Stack>
              </Stack>
            </Column>

            <Column lg={8} md={8} sm={4}>
              <Stack gap={5}>
                <p className="esti-landing-eyebrow">Two live workspaces — choose your practice</p>
                <Grid fullWidth condensed className="esti-landing-demo-tile-grid">
                  <Column lg={8} md={4} sm={4}>
                    <HeroDemoTile
                      kind="studio"
                      onOpen={onStudioDemo}
                      loading={demoLoading}
                      activeKind={demoKind ?? null}
                    />
                  </Column>
                  <Column lg={8} md={4} sm={4}>
                    <HeroDemoTile
                      kind="solo"
                      onOpen={onSoloDemo ?? (() => {})}
                      loading={demoLoading}
                      activeKind={demoKind ?? null}
                    />
                  </Column>
                </Grid>
              </Stack>
            </Column>
          </Grid>
        </LandingEditorial>
      </LandingBand>
  );
}

function HeroDemoTile({
  kind,
  onOpen,
  loading,
  activeKind,
}: {
  kind: DemoKind;
  onOpen: () => void;
  loading: boolean;
  activeKind: DemoKind | null;
}) {
  const acct = DEMO_ACCOUNTS[kind];
  const isLoading = loading && activeKind === kind;
  const tagType = kind === "studio" ? "blue" : "teal";

  return (
    <ClickableTile
      className="esti-fill esti-landing-hero-demo-tile"
      onClick={onOpen}
      disabled={loading}
    >
      <Stack gap={5}>
        <Tag type={tagType} size="sm">
          {acct.caseStudy.eyebrow}
        </Tag>
        <Stack gap={3}>
          <h3 className="esti-landing-section-title">{acct.title}</h3>
          <p>{acct.subtitle}</p>
        </Stack>
        <UnorderedList>
          {acct.highlights.slice(0, 3).map((h) => (
            <ListItem key={h}>{h}</ListItem>
          ))}
        </UnorderedList>
        <Stack gap={1}>
          <p className="esti-landing-feature-tile__metric">{acct.caseStudy.metric}</p>
          <p className="esti-landing-feature-tile__metric-label">
            {acct.caseStudy.metricLabel}
          </p>
        </Stack>
        <Button
          kind={kind === "studio" ? "primary" : "tertiary"}
          size="md"
          renderIcon={ArrowRight}
          tabIndex={-1}
          disabled={loading}
        >
          {isLoading ? "Opening…" : acct.cta}
        </Button>
      </Stack>
    </ClickableTile>
  );
}
