import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { RailLayout } from "../components/RailLayout.js";
import { AccountTab } from "../components/profile/AccountTab.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { aormsIdTeaserVisible } from "@esti/contracts";
import { useCapabilities } from "../lib/capabilities.js";
import { welcomeKitUrl } from "../lib/welcomeKit.js";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" component="span" className="esti-label esti-label--secondary">{label}</Typography>
      <Typography component="span">{value}</Typography>
    </Stack>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
      <Box className="esti-fill" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack spacing={1}>
          <Typography variant="body2" component="span" className="esti-label esti-label--secondary">{label}</Typography>
          <Typography variant="h5" component="h3">{value}</Typography>
        </Stack>
      </Box>
    </Grid>
  );
}

function PlannedGrid({ items }: { items: { title: string; description: string }[] }) {
  return (
    <Grid container spacing={1}>
      {items.map((m) => (
        <Grid key={m.title} size={{ xs: 12, sm: 6, lg: 3 }}>
          <Box className="esti-fill" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Typography variant="h6" component="h4">{m.title}</Typography>
              <Typography variant="body2" component="p" className="esti-label esti-label--secondary">{m.description}</Typography>
              <Box>
                <Chip label="Planned" size="small" variant="outlined" />
              </Box>
            </Stack>
          </Box>
        </Grid>
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

  const [tab, setTab] = useState(0);

  const tabs: { label: string; panel: ReactNode }[] = [
    {
      label: "Personal",
      panel: (
        <Box className="esti-fill" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Field label="Full name" value={user?.fullName ?? "—"} />
            <Field label="Email" value={user?.email ?? "—"} />
            <Field label="Role" value={user?.role ?? "—"} />
            {w?.hasTeamMember && <Field label="Team role" value={w.teamRole ?? "—"} />}
          </Stack>
        </Box>
      ),
    },
    {
      label: "Work Profile",
      panel: w?.hasTeamMember ? (
        <Grid container spacing={1}>
          <Stat label="Assigned projects" value={w.assignedProjects} />
          <Stat label="Open tasks" value={w.openTasks} />
          <Stat label="Completed tasks" value={w.doneTasks} />
          <Stat label="Days present (30d)" value={w.attendance30} />
        </Grid>
      ) : (
        <Typography variant="body2" component="p" className="esti-label esti-label--secondary">
          No staff record linked to this account — work metrics appear once you are added to the team.
        </Typography>
      ),
    },
    {
      label: "AORMS Identity",
      panel: (
        <Stack spacing={2}>
          <Box className="esti-fill" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Field
                label="AORMS Unique ID"
                value={aormsId ?? "Not yet generated — earned after 100 hours of active use."}
              />
              {!aormsId && usage && (
                <Stack spacing={1.5}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" component="span" className="esti-label esti-label--secondary">Active use</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (Math.min(usage.minutes, usage.requiredMinutes) / usage.requiredMinutes) * 100)}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {`${Math.floor(usage.minutes / 60)} of ${Math.floor(usage.requiredMinutes / 60)} hours`}
                    </Typography>
                  </Stack>
                  {usage.canGenerate ? (
                    // The Apply button surfaces only after 5 days of use and
                    // stays greyed until earned — a deliberate curiosity teaser.
                    (usage.eligible || aormsIdTeaserVisible(usage.daysUsed)) && (
                      <Box>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!usage.eligible || generateId.isPending}
                          onClick={() => generateId.mutate()}
                        >
                          Apply for unique ID
                        </Button>
                      </Box>
                    )
                  ) : (
                    <Typography variant="body2" component="p" className="esti-label esti-label--helper">
                      No identity platform is configured for this install — an owner can
                      link a handle from Users.
                    </Typography>
                  )}
                  {generateId.isError && (
                    <Alert severity="error">
                      <AlertTitle>Could not generate the ID</AlertTitle>
                      {generateId.error.message}
                    </Alert>
                  )}
                </Stack>
              )}
              <Field label="Professional role" value={user?.role ?? "—"} />
            </Stack>
          </Box>
          {aormsId && (
            <Box className="esti-fill" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Typography variant="h6" component="h4">Welcome kit</Typography>
                <Typography variant="body2" component="p" className="esti-label esti-label--secondary">
                  Your welcome kit: a certificate (A4) and your ID card with the Unique
                  Identification No, printable at credit-card size. Essential and Pro
                  cards follow — Essential after 100 hours on AORMS, Pro against
                  certification.
                </Typography>
                <div className="esti-row">
                  <Button
                    size="small"
                    variant="contained"
                    href={welcomeKitUrl("certificate", { name: user?.fullName, id: aormsId })}
                    target="_blank"
                    rel="noopener"
                  >
                    Certificate
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    href={welcomeKitUrl("card", { name: user?.fullName, id: aormsId })}
                    target="_blank"
                    rel="noopener"
                  >
                    ID card
                  </Button>
                </div>
              </Stack>
            </Box>
          )}
          <PlannedGrid
            items={[
              { title: "Firm Mapping", description: "Registered office / firm association." },
            ]}
          />
        </Stack>
      ),
    },
    {
      label: "Account",
      panel: <AccountTab />,
    },
    {
      label: "Certification",
      panel: (
        <PlannedGrid
          items={[
            { title: "Certification Track", description: "ACA / ACE / ACC / ACOM / ACFM / ACO." },
            { title: "Certification Level", description: "Foundation · Practitioner · Specialist · Master." },
            { title: "Certification History", description: "Assessments and awarded certifications." },
          ]}
        />
      ),
    },
    {
      label: "AORMS Index",
      panel: (
        <PlannedGrid
          items={[
            { title: "Overall Score", description: "Composite professional score." },
            { title: "Knowledge & Skill", description: "Knowledge contribution + skill assessment scores." },
            { title: "Platform & Community", description: "Platform competency + community reputation." },
          ]}
        />
      ),
    },
    ...(!isExternal
      ? [
          {
            label: "Downloads",
            panel: (
              <Box className="esti-fill" sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Typography variant="h6" component="h4">Desktop installers</Typography>
                  <Typography variant="body2" component="p" className="esti-label esti-label--secondary">
                    Installers are managed by AORMS IT and hosted under <code>/downloads</code>.
                  </Typography>
                  <Stack spacing={1}>
                    {LITE_DOWNLOAD_URL ? (
                      <Box>
                        <Button variant="contained" href={LITE_DOWNLOAD_URL}>Download AORMS Lite</Button>
                      </Box>
                    ) : (
                      <Box>
                        <Button variant="text" disabled>Lite: Coming soon</Button>
                      </Box>
                    )}
                    {PRO_DOWNLOAD_URL ? (
                      <Box>
                        <Button variant="contained" href={PRO_DOWNLOAD_URL}>Download AORMS Pro</Button>
                      </Box>
                    ) : (
                      <Box>
                        <Button variant="text" disabled>Pro: Coming soon</Button>
                      </Box>
                    )}
                  </Stack>
                </Stack>
              </Box>
            ),
          },
        ]
      : []),
    {
      label: "Preferences",
      panel: (
        <Box className="esti-fill" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography component="p">Theme, dashboard layout, notification preferences and security settings.</Typography>
            <Box>
              <Button component={Link} to="/settings" variant="contained">Open settings</Button>
            </Box>
          </Stack>
        </Box>
      ),
    },
  ];

  const activeTab = Math.min(tab, tabs.length - 1);

  return (
    <RailLayout
      title={user?.fullName ?? "My profile"}
      description="Your AORMS identity, work profile, certifications and preferences."
      tabs={
        <Tabs
          orientation="vertical"
          value={activeTab}
          onChange={(_e, v) => setTab(v)}
          aria-label="Profile sections"
        >
          {tabs.map((t) => (
            <Tab key={t.label} label={t.label} />
          ))}
        </Tabs>
      }
    >
      {tabs[activeTab]?.panel}
    </RailLayout>
  );
}
