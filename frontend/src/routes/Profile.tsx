import {
  Button,
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
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader.js";
import { AccountTab } from "../components/profile/AccountTab.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={3}>
      <span className="esti-label esti-label--secondary">{label}</span>
      <span>{value}</span>
    </Stack>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Column lg={4} md={4} sm={2}>
      <Tile className="esti-fill">
        <Stack gap={2}>
          <span className="esti-label esti-label--secondary">{label}</span>
          <h3>{value}</h3>
        </Stack>
      </Tile>
    </Column>
  );
}

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

/** User Profile — AORMS Identity Layer (header utility). */
export function Profile() {
  const { user } = useAuth();
  const workQ = trpc.userProfile.workSummary.useQuery();
  const w = workQ.data;
  const meQ = trpc.users.myProfile.useQuery();
  const aormsId = meQ.data?.accountPublicId ?? null;

  return (
    <Stack gap={6}>
      <PageHeader
        title={user?.fullName ?? "My profile"}
        description="Your AORMS identity, work profile, certifications and preferences."
      />
      <Tabs>
        <TabList aria-label="Profile sections" contained>
          <Tab>Personal</Tab>
          <Tab>Work Profile</Tab>
          <Tab>AORMS Identity</Tab>
          <Tab>Account</Tab>
          <Tab>Certification</Tab>
          <Tab>AORMS Index</Tab>
          <Tab>Preferences</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Tile className="esti-fill">
              <Stack gap={5}>
                <Field label="Full name" value={user?.fullName ?? "—"} />
                <Field label="Email" value={user?.email ?? "—"} />
                <Field label="Role" value={user?.role ?? "—"} />
                {w?.hasTeamMember && <Field label="Team role" value={w.teamRole ?? "—"} />}
              </Stack>
            </Tile>
          </TabPanel>

          <TabPanel>
            {w?.hasTeamMember ? (
              <Grid narrow>
                <Stat label="Assigned projects" value={w.assignedProjects} />
                <Stat label="Open tasks" value={w.openTasks} />
                <Stat label="Completed tasks" value={w.doneTasks} />
                <Stat label="Days present (30d)" value={w.attendance30} />
              </Grid>
            ) : (
              <p className="esti-label esti-label--secondary">
                No staff record linked to this account — work metrics appear once you are added to the team.
              </p>
            )}
          </TabPanel>

          <TabPanel>
            <Stack gap={5}>
              <Tile className="esti-fill">
                <Stack gap={5}>
                  <Field
                    label="AORMS Unique ID"
                    value={aormsId ?? "Not linked — an owner can link this login from Users."}
                  />
                  <Field label="Professional role" value={user?.role ?? "—"} />
                </Stack>
              </Tile>
              <PlannedGrid
                items={[
                  { title: "Firm Mapping", description: "Registered office / firm association." },
                ]}
              />
            </Stack>
          </TabPanel>

          <TabPanel>
            <AccountTab />
          </TabPanel>

          <TabPanel>
            <PlannedGrid
              items={[
                { title: "Certification Track", description: "ACA / ACE / ACC / ACOM / ACFM / ACO." },
                { title: "Certification Level", description: "Foundation · Practitioner · Specialist · Master." },
                { title: "Certification History", description: "Assessments and awarded certifications." },
              ]}
            />
          </TabPanel>

          <TabPanel>
            <PlannedGrid
              items={[
                { title: "Overall Score", description: "Composite professional score." },
                { title: "Knowledge & Skill", description: "Knowledge contribution + skill assessment scores." },
                { title: "Platform & Community", description: "Platform competency + community reputation." },
              ]}
            />
          </TabPanel>

          <TabPanel>
            <Tile className="esti-fill">
              <Stack gap={4}>
                <p>Theme, dashboard layout, notification preferences and security settings.</p>
                <Button as={Link} to="/settings">Open settings</Button>
              </Stack>
            </Tile>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
