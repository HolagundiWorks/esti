import { Activity, Building, Enterprise, Group } from "@carbon/icons-react";
import { Stack } from "@carbon/react";
import { LandingBand, LandingEditorial } from "./LandingBand.js";
import { LandingCaseStudyCard } from "./LandingCaseStudyCard.js";
import { MarketingSectionHead } from "./MarketingSectionHead.js";
import { MarketingTileGrid } from "./MarketingTileGrid.js";

const IMPACT = [
  {
    icon: Building,
    eyebrow: "Residential delivery",
    title: "Sharma Villa",
    body: "GFC drawings linked to ESTICAD takeoff, BOQ import, site records, and project evidence on Project Info.",
    metric: "1",
    metricLabel: "linked drawing set with live quantities",
    highlights: [
      "Drawings tab — Open in ESTICAD",
      "Estimates — DSR-linked BOQ",
      "CRIF decisions with threaded comments",
    ],
    tag: "Demo showcase",
    ctaLabel: "Open studio demo",
  },
  {
    icon: Enterprise,
    eyebrow: "Commercial",
    title: "Verde Commercial Block",
    body: "Multi-storey commercial workflow — transmittals, spec sheets from Knowledge Bank, and revision intelligence on decisions.",
    metric: "4",
    metricLabel: "disciplines on one project record",
    highlights: [
      "Drawing issue register with revisions",
      "Fee phases ready from Action Center",
      "Team workload visible when HR is on",
    ],
    tag: "Studio",
    ctaLabel: "Explore in demo",
  },
  {
    icon: Activity,
    eyebrow: "Architect-as-PMC",
    title: "PMC portfolio",
    body: "Schedules, snags, progress reports, site instructions, and contractor RFIs across showcase projects.",
    metric: "4",
    metricLabel: "PMC-enabled projects seeded",
    highlights: [
      "PMC nav — Gantt and snag lists",
      "Site coordination inbox",
      "Progress reports for client updates",
    ],
    tag: "PMC",
    ctaLabel: "See PMC in demo",
  },
  {
    icon: Group,
    eyebrow: "Client collaboration",
    title: "Kapoor Residence portal",
    body: "Client login scoped to their projects — issued documents, approvals, and acknowledgements without office access.",
    metric: "1",
    metricLabel: "live client portal persona",
    highlights: [
      "client@demo.aorms.in portal login",
      "Client-visible drawings and approvals",
      "Separate from internal L1–L5 staff ladder",
    ],
    tag: "External",
    ctaLabel: "Try studio demo",
  },
] as const;

export function MarketingImpactGrid({
  onStudioDemo,
  demoLoading,
}: {
  onStudioDemo: () => void;
  demoLoading: boolean;
}) {
  return (
    <LandingBand variant="contrast" id="impact" ariaLabelledby="impact-title">
      <LandingEditorial>
        <Stack gap={10}>
          <MarketingSectionHead
            id="impact-title"
            eyebrow="Practice impact"
            title="Smarter delivery powered by one record"
            lead="Metric-led stories from the studio demo workspace — each card maps to a real module path."
          />
          <MarketingTileGrid columns={2}>
            {IMPACT.map((item) => (
              <LandingCaseStudyCard
                key={item.title}
                icon={item.icon}
                eyebrow={item.eyebrow}
                title={item.title}
                body={item.body}
                metric={item.metric}
                metricLabel={item.metricLabel}
                highlights={[...item.highlights]}
                tag={item.tag}
                ctaLabel={item.ctaLabel}
                onCta={onStudioDemo}
                loading={demoLoading}
                disabled={demoLoading}
              />
            ))}
          </MarketingTileGrid>
        </Stack>
      </LandingEditorial>
    </LandingBand>
  );
}
