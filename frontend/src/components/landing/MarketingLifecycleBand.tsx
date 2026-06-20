import {
  Column,
  Grid,
  ListItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  UnorderedList,
} from "@carbon/react";
import { LIFECYCLE_STAGES } from "./marketing-content.js";
import { MarketingBandSection } from "./MarketingBandSection.js";
import { MarketingFeatureTile } from "./MarketingFeatureTile.js";

export function MarketingLifecycleBand() {
  return (
    <MarketingBandSection
      id="lifecycle"
      variant="contrast"
      eyebrow="Practice workflow"
      title="From enquiry to handover — one project context."
      lead="Each project stage keeps decisions, documents, and commercial records in the same traceable object model."
    >
      <Tabs>
        <TabList aria-label="Project lifecycle stages" contained>
          {LIFECYCLE_STAGES.map((stage) => (
            <Tab key={stage.id}>{stage.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {LIFECYCLE_STAGES.map((stage) => (
            <TabPanel key={stage.id}>
              <Stack gap={7} className="esti-landing-tab-panel">
                <Grid fullWidth className="esti-landing-grid">
                  <Column sm={4} md={4} lg={8}>
                    <Stack gap={5}>
                      <p className="esti-landing-eyebrow">Outcomes</p>
                      <UnorderedList>
                        {stage.outcomes.map((item) => (
                          <ListItem key={item}>{item}</ListItem>
                        ))}
                      </UnorderedList>
                    </Stack>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <MarketingFeatureTile>
                      <p className="esti-landing-eyebrow">Modules in this phase</p>
                      <Stack orientation="horizontal" gap={3} className="esti-row">
                        {stage.modules.map((mod) => (
                          <Tag key={mod} type="blue" size="md">
                            {mod}
                          </Tag>
                        ))}
                      </Stack>
                    </MarketingFeatureTile>
                  </Column>
                </Grid>
              </Stack>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </MarketingBandSection>
  );
}
