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
import { Link as RouterLink } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { useAuth } from "../../lib/auth.js";
import { trpc } from "../../lib/trpc.js";
import { useCapabilities } from "../../lib/capabilities.js";
import { welcomeKitUrl } from "../../lib/welcomeKit.js";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" component="span" className="esti-label esti-label--secondary">
        {label}
      </Typography>
      <Typography component="span">{value}</Typography>
    </Stack>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
      <Box className="esti-fill" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack spacing={1}>
          <Typography variant="body2" component="span" className="esti-label esti-label--secondary">
            {label}
          </Typography>
          <Typography variant="h5" component="h3">
            {value}
          </Typography>
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
              <Typography variant="h6" component="h4">
                {m.title}
              </Typography>
              <Typography variant="body2" component="p" className="esti-label esti-label--secondary">
                {m.description}
              </Typography>
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

/** Workspace identity — personal, work profile, AORMS ID (lives on `/account`, not in workspace). */
export function UserProfilePanel() {
  const { user } = useAuth();
  const workQ = trpc.userProfile.workSummary.useQuery(undefined, { enabled: !!user });
  const w = workQ.data;
  const meQ = trpc.users.myProfile.useQuery(undefined, { enabled: !!user });
  const aormsId = meQ.data?.accountPublicId ?? null;
  const utils = trpc.useUtils();
  const usageQ = trpc.usage.status.useQuery(undefined, { enabled: !!user && !aormsId });
  const generateId = trpc.usage.generateAormsId.useMutation({
    meta: { errorTitle: "Couldn't generate the AORMS ID" },
    onSuccess: () => {
      void utils.usage.status.invalidate();
      void utils.users.myProfile.invalidate();
    },
  });
  const usage = usageQ.data;

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
                    <Typography variant="body2" component="span" className="esti-label esti-label--secondary">
                      Active use
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(
                        100,
                        (Math.min(usage.minutes, usage.requiredMinutes) / usage.requiredMinutes) * 100,
                      )}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {`${Math.floor(usage.minutes / 60)} of ${Math.floor(usage.requiredMinutes / 60)} hours`}
                    </Typography>
                  </Stack>
                  {usage.canGenerate ? null : (
                    <Typography variant="body2" component="p" className="esti-label esti-label--helper">
                      No identity platform is configured for this install — an owner can link a handle from
                      Users.
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
                <Typography variant="h6" component="h4">
                  Welcome kit
                </Typography>
                <Typography variant="body2" component="p" className="esti-label esti-label--secondary">
                  Your welcome kit: a certificate (A4) and your ID card with the Unique Identification No,
                  printable at credit-card size.
                </Typography>
              </Stack>
            </Box>
          )}
          <PlannedGrid items={[{ title: "Firm Mapping", description: "Registered office / firm association." }]} />
        </Stack>
      ),
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
            label: "Help",
            panel: (
              <Box className="esti-fill" sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Typography variant="h6" component="h4">
                    AORMS Wiki
                  </Typography>
                  <Typography variant="body2" component="p" className="esti-label esti-label--secondary">
                    Estimation, workflows, and account setup — official documentation at aorms.in/wiki.
                  </Typography>
                  <Button variant="contained" href="/wiki/getting-started">
                    Open getting started guide
                  </Button>
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
            <Typography component="p">
              Theme, dashboard layout, notification preferences and security settings.
            </Typography>
            <Button variant="outlined" component={RouterLink} to="/account#settings">
              Open account settings
            </Button>
          </Stack>
        </Box>
      ),
    },
  ];

  const activeTab = Math.min(tab, tabs.length - 1);
  const identityTab = tabs.findIndex((t) => t.label === "AORMS Identity");

  const tabActions =
    activeTab === identityTab && !aormsId && usage?.canGenerate && usage.eligible ? (
      <Button
        variant="contained"
        size="small"
        disabled={!usage.eligible || generateId.isPending}
        onClick={() => generateId.mutate()}
      >
        Apply for unique ID
      </Button>
    ) : activeTab === identityTab && aormsId ? (
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          size="small"
          onClick={() =>
            window.open(welcomeKitUrl("certificate", { name: user?.fullName, id: aormsId }), "_blank", "noopener")
          }
        >
          Certificate
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() =>
            window.open(welcomeKitUrl("card", { name: user?.fullName, id: aormsId }), "_blank", "noopener")
          }
        >
          ID card
        </Button>
      </Stack>
    ) : null;

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="h6" component="h2" className="esti-grow">
            My profile
          </Typography>
          {tabActions}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Your AORMS identity, work profile, certifications and preferences — managed outside the workspace.
        </Typography>
        <Tabs value={activeTab} onChange={(_e, v) => setTab(v)} aria-label="Profile sections" variant="scrollable">
          {tabs.map((t) => (
            <Tab key={t.label} label={t.label} />
          ))}
        </Tabs>
        {tabs[activeTab]?.panel}
      </Stack>
    </Box>
  );
}
