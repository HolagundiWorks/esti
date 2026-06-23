import { ArrowRight, Building, Launch, PlayFilledAlt } from "@carbon/icons-react";
import { Column, Grid, InlineNotification, Link, Stack } from "@carbon/react";
import type { ElementType } from "react";
import { DEMO_ACCOUNTS, type DemoKind } from "../lib/landing-demo.js";
import { LandingCaseStudyCard } from "./landing/LandingCaseStudyCard.js";
import { LandingContentBlock } from "./landing/LandingContentBlock.js";

const DEMO_ICONS: Record<DemoKind, ElementType> = {
  team: Building,
};

type Props = {
  onOpenDemo: (kind: DemoKind) => void;
  loadingKind: DemoKind | null;
  isPending: boolean;
  errorMessage?: string | null;
};

export function LandingDemoSection({ onOpenDemo, loadingKind, isPending, errorMessage }: Props) {
  return (
    <Stack gap={7}>
      <LandingContentBlock
        titleId="demo-heading"
        eyebrow={
          <Stack orientation="horizontal" gap={2}>
            <PlayFilledAlt size={16} aria-hidden />
            <span>Case studies · try it yourself</span>
          </Stack>
        }
        title="Walk through a real architecture practice"
        lead="One team workspace seeded with projects, fees, decisions, workload, portals, and site coordination. One click and you are inside."
      />

      <Grid>
        {(["team"] as const).map((kind) => {
          const acct = DEMO_ACCOUNTS[kind];
          const Icon = DEMO_ICONS[kind];
          const loading = isPending && loadingKind === kind;
          return (
            <Column key={kind} lg={8} md={8} sm={4}>
              <LandingCaseStudyCard
                icon={Icon}
                eyebrow={acct.caseStudy.eyebrow}
                title={acct.title}
                body={acct.subtitle}
                metric={acct.caseStudy.metric}
                metricLabel={acct.caseStudy.metricLabel}
                highlights={acct.highlights}
                tour={acct.tour}
                tag={acct.featured ? "Good place to start" : undefined}
                ctaLabel={acct.cta}
                ctaIcon={Launch}
                onCta={() => onOpenDemo(kind)}
                loading={loading}
                disabled={isPending}
              />
            </Column>
          );
        })}
      </Grid>

      {errorMessage && (
        <InlineNotification kind="error" title="Could not open demo" subtitle={errorMessage} />
      )}

      <p>
        The demo is sample data for exploring — feel free to click around.{" "}
        <Link href="#beta">
          Want your own practice workspace? <ArrowRight size={14} aria-hidden />
        </Link>
      </p>
    </Stack>
  );
}
