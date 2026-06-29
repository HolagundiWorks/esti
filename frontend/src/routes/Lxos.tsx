import {
  Column,
  Grid,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Tile,
} from "@carbon/react";
import { PageHeader } from "../components/PageHeader.js";
import { LessonsBank } from "../components/ProjectLessons.js";

/**
 * LXOS — Learning Exchange Operating System (AORMS knowledge & professional exchange
 * layer). Internal Exchange surfaces the live Lessons Learned bank; the other layers
 * are greenfield (see docs/esti/NAVIGATION.md § LXOS).
 */
function PlannedGrid({ items }: { items: { title: string; description: string }[] }) {
  return (
    <Grid narrow>
      {items.map((m) => (
        <Column key={m.title} lg={4} md={4} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={3}>
              <h4>{m.title}</h4>
              <p className="esti-label esti-label--secondary">{m.description}</p>
              <Tag type="gray" size="sm">Planned</Tag>
            </Stack>
          </Tile>
        </Column>
      ))}
    </Grid>
  );
}

export function Lxos() {
  return (
    <Stack gap={6}>
      <PageHeader
        title="LXOS"
        description="Learning Exchange Operating System — AORMS knowledge & professional exchange layer. Work and learning coexist; knowledge becomes infrastructure."
      />
      <Tabs>
        <TabList aria-label="LXOS layers" contained>
          <Tab>Internal Exchange</Tab>
          <Tab>Community Exchange</Tab>
          <Tab>Professional Identity</Tab>
          <Tab>Certification &amp; Growth</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Stack gap={6}>
              <LessonsBank />
              <PlannedGrid
                items={[
                  { title: "Documentation Exchange", description: "Standard / detail / working drawings + documentation standards." },
                  { title: "Internal Blogs", description: "Technical notes, material learnings, compliance and research." },
                  { title: "Whiteboard Studio", description: "Team discussions, sketch sessions, design and technical reviews." },
                  { title: "Knowledge Notes", description: "Standards, site-issue, vendor and internal reference notes." },
                ]}
              />
            </Stack>
          </TabPanel>
          <TabPanel>
            <PlannedGrid
              items={[
                { title: "Case Studies", description: "Cross-firm project case studies and documentation showcase." },
                { title: "Architecture Blogs", description: "Public architecture and technical writing." },
                { title: "Discussions", description: "Technical, standards and open professional discussions." },
                { title: "Templates & Research", description: "Templates exchange, vendor reviews, research papers." },
              ]}
            />
          </TabPanel>
          <TabPanel>
            <PlannedGrid
              items={[
                { title: "AORMS ID & Role", description: "Professional identity and role across the platform." },
                { title: "Contributions", description: "Knowledge contributions, articles and shared templates." },
                { title: "Reputation", description: "Community reputation score and contribution history." },
              ]}
            />
          </TabPanel>
          <TabPanel>
            <PlannedGrid
              items={[
                { title: "Certification Tracks", description: "AORMS Certified Architect / HR / Finance / Operations." },
                { title: "Skill Assessments", description: "Competency tests and practical exercises." },
                { title: "Levels & History", description: "Foundation → Master levels and learning history." },
              ]}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
