import { ArrowRight, Checkmark } from "@carbon/icons-react";
import { Button, Column, Grid, ListItem, Stack, Tag, Tile, UnorderedList } from "@carbon/react";
import { DEMO_ACCOUNTS, type DemoKind } from "../../lib/landing-demo.js";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";

export function MarketingDemoBand({
  onStudioDemo,
  onSoloDemo,
  demoLoading,
  demoKind,
}: {
  onStudioDemo: () => void;
  onSoloDemo: () => void;
  demoLoading: boolean;
  demoKind: DemoKind | null;
}) {
  return (
    <LandingBand id="demo" ariaLabelledby="demo-title">
      <LandingEditorial>
        <Stack gap={10}>
          <MarketingSectionHead
            id="demo-title"
            eyebrow="Live demo"
            title="Walk through a real Indian architecture practice — no sign-up."
            lead="Two workspaces seeded with real projects, fees, and decisions. A busy Bengaluru design studio or a solo practitioner — pick the practice that matches yours."
          />
          <Grid fullWidth className="esti-landing-tile-grid">
            <Column lg={8} md={4} sm={4}>
              <DemoCard
                kind="studio"
                onOpen={onStudioDemo}
                loading={demoLoading}
                activeKind={demoKind}
              />
            </Column>
            <Column lg={8} md={4} sm={4}>
              <DemoCard
                kind="solo"
                onOpen={onSoloDemo}
                loading={demoLoading}
                activeKind={demoKind}
              />
            </Column>
          </Grid>
          <p className="esti-landing-section-lead">
            Demo accounts reset weekly. Sign in via the buttons above — no credentials needed.
            Destructive operations are disabled in demo mode.
          </p>
        </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}

function DemoCard({
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
    <Tile className="esti-fill esti-landing-demo-card">
      <Stack gap={7}>
        <Stack gap={5}>
          <Stack orientation="horizontal" gap={3}>
            <Tag type={tagType} size="md">
              {acct.caseStudy.eyebrow}
            </Tag>
            {acct.featured && (
              <Tag type="purple" size="md">
                Recommended
              </Tag>
            )}
          </Stack>
          <Stack gap={2}>
            <h3 className="esti-landing-section-title">{acct.title}</h3>
            <p className="esti-landing-section-lead">{acct.subtitle}</p>
          </Stack>
        </Stack>

        <UnorderedList className="esti-landing-icon-list">
          {acct.highlights.slice(0, 3).map((h) => (
            <ListItem key={h}>
              <span className="esti-row">
                <Checkmark size={16} aria-hidden className="esti-landing-feature-tile__icon" />
                <span>{h}</span>
              </span>
            </ListItem>
          ))}
        </UnorderedList>

        <Button
          kind={kind === "studio" ? "primary" : "tertiary"}
          size="lg"
          renderIcon={ArrowRight}
          onClick={onOpen}
          disabled={loading}
        >
          {isLoading ? "Opening workspace…" : acct.cta}
        </Button>
      </Stack>
    </Tile>
  );
}
