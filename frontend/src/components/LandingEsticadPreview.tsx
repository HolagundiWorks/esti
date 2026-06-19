import { Download } from "@carbon/icons-react";
import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
} from "@carbon/react";
import { ESTICAD_DOWNLOAD_URL } from "../lib/esticadLink.js";

type Props = {
  logoSrc?: string;
  /** When true, only tabs and download content (brand lives in parent feature band). */
  hideBrandColumn?: boolean;
};

const DESK_FEATURES = [
  "Built-in revision time log — save a state, restore onto the main drawing later",
  "Pick up wall lengths, slab areas and counts with snaps and ortho",
  "Naming and dimension suggestions — you approve before anything changes",
];

const CLOUD_FEATURES = [
  "Measured quantities flow into the project estimate",
  "Same drawing register, fee stages and GST trail as the web office",
  "Open in ESTICAD from any project drawing in AORMS",
];

/**
 * ESTICAD — Tabs for desk vs practice file, StructuredList for features.
 */
export function LandingEsticadPreview({
  logoSrc = "/esticad-logo.png",
  hideBrandColumn = false,
}: Props) {
  const content = (
    <Stack gap={5}>
      <InlineNotification
        kind="info"
        title="One drawing file — not a folder of copies"
        subtitle="Save at each revision, keep working on the main board, and restore an earlier layout when the client changes their mind."
        hideCloseButton
        lowContrast
      />

      <Tabs>
        <TabList aria-label="ESTICAD capabilities">
          <Tab>At your drawing desk</Tab>
          <Tab>Linked to AORMS</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <StructuredListWrapper aria-label="Drawing desk features">
              <StructuredListBody>
                {DESK_FEATURES.map((f) => (
                  <StructuredListRow key={f}>
                    <StructuredListCell>{f}</StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </TabPanel>
          <TabPanel>
            <StructuredListWrapper aria-label="Practice file integration">
              <StructuredListBody>
                {CLOUD_FEATURES.map((f) => (
                  <StructuredListRow key={f}>
                    <StructuredListCell>{f}</StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {hideBrandColumn && (
        <Stack orientation="horizontal" gap={3}>
          <Tag type="green" size="sm">
            Free
          </Tag>
          <Tag type="gray" size="sm">
            Windows
          </Tag>
          <Tag type="blue" size="sm">
            Links to AORMS
          </Tag>
          <Button
            kind="primary"
            renderIcon={Download}
            href={ESTICAD_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download ESTICAD
          </Button>
        </Stack>
      )}
    </Stack>
  );

  if (hideBrandColumn) {
    return content;
  }

  return (
    <Grid>
      <Column lg={5} md={8} sm={4}>
        <Stack gap={5}>
          <img src={logoSrc} alt="ESTICAD" className="esti-landing-esticad-logo" />
          <Stack gap={3}>
            <Stack orientation="horizontal" gap={3}>
              <Tag type="green" size="sm">
                Free
              </Tag>
              <Tag type="gray" size="sm">
                Windows
              </Tag>
              <Tag type="blue" size="sm">
                Links to AORMS
              </Tag>
            </Stack>
            <h3>Drawing software built for architects</h3>
            <p>
              Draw at your desk, measure quantities, and keep every revision in one project file
              — without duplicate copies on your drive.
            </p>
          </Stack>
          <Button
            kind="primary"
            renderIcon={Download}
            href={ESTICAD_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download ESTICAD
          </Button>
        </Stack>
      </Column>

      <Column lg={11} md={8} sm={4}>
        {content}
      </Column>
    </Grid>
  );
}
