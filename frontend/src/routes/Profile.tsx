import {
  Button,
  Column,
  Grid,
  InlineNotification,
  ProgressBar,
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
import { useCapabilities } from "../lib/capabilities.js";
import { welcomeKitUrl } from "../lib/welcomeKit.js";

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
  // Usage-earned identity (Phase 34): progress toward the 100-hour AORMS ID.
  const utils = trpc.useUtils();
  const usageQ = trpc.usage.status.useQuery(undefined, { enabled: !aormsId });
  const generateId = trpc.usage.generateAormsId.useMutation({
    onSuccess: () => {
      void utils.usage.status.invalidate();
      void utils.users.myProfile.invalidate();
    },
  });
  const usage = usageQ.data;

  const LITE_DOWNLOAD_URL = import.meta.env.VITE_LITE_DOWNLOAD_URL ?? "";
  const PRO_DOWNLOAD_URL = import.meta.env.VITE_PRO_DOWNLOAD_URL ?? "";
  const { isExternal } = useCapabilities();

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
            {!isExternal && <Tab>Downloads</Tab>}
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
                    value={aormsId ?? "Not yet generated — earned after 100 hours of active use."}
                  />
                  {!aormsId && usage && (
                    <Stack gap={4}>
                      <ProgressBar
                        label="Active use"
                        helperText={`${Math.floor(usage.minutes / 60)} of ${Math.floor(usage.requiredMinutes / 60)} hours`}
                        value={Math.min(usage.minutes, usage.requiredMinutes)}
                        max={usage.requiredMinutes}
                      />
                      {usage.canGenerate ? (
                        <Button
                          size="sm"
                          disabled={!usage.eligible || generateId.isPending}
                          onClick={() => generateId.mutate()}
                        >
                          {usage.eligible
                            ? "Generate my AORMS ID"
                            : "Unlocks at 100 hours of active use"}
                        </Button>
                      ) : (
                        <p className="esti-label esti-label--helper">
                          No identity platform is configured for this install — an owner can
                          link a handle from Users.
                        </p>
                      )}
                      {generateId.isError && (
                        <InlineNotification
                          kind="error"
                          lowContrast
                          hideCloseButton
                          title="Could not generate the ID"
                          subtitle={generateId.error.message}
                        />
                      )}
                    </Stack>
                  )}
                  <Field label="Professional role" value={user?.role ?? "—"} />
                </Stack>
              </Tile>
              {aormsId && (
                <Tile className="esti-fill">
                  <Stack gap={4}>
                    <h4>Welcome kit</h4>
                    <p className="esti-label esti-label--secondary">
                      Your welcome kit: a certificate (A4) and your ID card with the Unique
                      Identification No, printable at credit-card size. Essential and Pro
                      cards follow — Essential after 100 hours on AORMS, Pro against
                      certification.
                    </p>
                    <div className="esti-row">
                      <Button
                        size="sm"
                        kind="primary"
                        href={welcomeKitUrl("certificate", { name: user?.fullName, id: aormsId })}
                        target="_blank"
                        rel="noopener"
                      >
                        Certificate
                      </Button>
                      <Button
                        size="sm"
                        kind="tertiary"
                        href={welcomeKitUrl("card", { name: user?.fullName, id: aormsId })}
                        target="_blank"
                        rel="noopener"
                      >
                        ID card
                      </Button>
                    </div>
                  </Stack>
                </Tile>
              )}
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

          
          {!isExternal && (
            <TabPanel>
              <Tile className="esti-fill">
                <Stack gap={4}>
                  <h4>Desktop installers</h4>
                  <p className="esti-label esti-label--secondary">Installers are managed by AORMS IT and hosted under <code>/downloads</code>.</p>
                  <Stack gap={2}>
                    {LITE_DOWNLOAD_URL ? (
                      <Button kind="primary" size="md" href={LITE_DOWNLOAD_URL}>Download AORMS Lite</Button>
                    ) : (
                      <Button kind="ghost" size="md" disabled>Lite: Coming soon</Button>
                    )}
                    {PRO_DOWNLOAD_URL ? (
                      <Button kind="primary" size="md" href={PRO_DOWNLOAD_URL}>Download AORMS Pro</Button>
                    ) : (
                      <Button kind="ghost" size="md" disabled>Pro: Coming soon</Button>
                    )}
                  </Stack>
                </Stack>
              </Tile>
            </TabPanel>
          )}
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

