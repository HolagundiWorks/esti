import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_TAG,
  TEAM_ROLES,
  type TeamRoleCode,
} from "@esti/contracts";
import { useState } from "react";
import { StatusDot, StatusTag } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

type AppStatus = (typeof APPLICATION_STATUSES)[number];

export function ApplicationsTab() {
  const utils = trpc.useUtils();
  const listQ = trpc.hrProfile.listApplications.useQuery({});
  const teamQ = trpc.team.list.useQuery();

  const createApp = trpc.hrProfile.createApplication.useMutation({
    onSuccess: () => { utils.hrProfile.listApplications.invalidate(); setCreateOpen(false); resetForm(); },
  });
  const updateStatus = trpc.hrProfile.updateApplicationStatus.useMutation({
    onSuccess: () => utils.hrProfile.listApplications.invalidate(),
  });
  const onboard = trpc.hrProfile.onboardApplication.useMutation({
    onSuccess: () => {
      utils.hrProfile.listApplications.invalidate();
      utils.team.list.invalidate();
      setOnboardOpen(null);
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState<string | null>(null);
  const [onboardTeamMemberId, setOnboardTeamMemberId] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    appliedRole: "ARCHITECT" as TeamRoleCode,
    notes: "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function resetForm() {
    setForm({ name: "", email: "", phone: "", appliedRole: "ARCHITECT", notes: "" });
  }

  const apps = listQ.data ?? [];

  return (
    <Stack spacing={2}>
      <div className="esti-row-between">
        <Typography variant="subtitle1" component="h4">
          {apps.length} application{apps.length !== 1 ? "s" : ""}
        </Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New application
        </Button>
      </div>

      {listQ.isLoading && (
        <Stack spacing={0.5}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={32} />
          ))}
        </Stack>
      )}

      {apps.length === 0 && !listQ.isLoading && (
        <Box sx={{ p: 2 }}>
          <p className="esti-label esti-label--secondary">
            No job applications yet. Add one to start the onboarding pipeline.
          </p>
        </Box>
      )}

      <Grid container spacing={2}>
        {apps.map((a) => (
          <Grid key={a.id} size={{ xs: 12, md: 6, lg: 3 }}>
            <Box className="esti-app-tile" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Stack spacing={1}>
                <div className="esti-row-between">
                  <p><strong>{a.name}</strong></p>
                  <StatusTag
                    value={a.status as AppStatus}
                    map={APPLICATION_STATUS_TAG}
                    label={APPLICATION_STATUS_LABEL[a.status as AppStatus] ?? a.status}
                  />
                </div>

                <p className="esti-label esti-label--secondary">
                  {TEAM_ROLES[a.appliedRole as TeamRoleCode] ?? a.appliedRole}
                </p>

                {a.email && <p className="esti-label esti-label--secondary">{a.email}</p>}
                {a.phone && <p className="esti-label esti-label--secondary">{a.phone}</p>}
                {a.notes && (
                  <p className="esti-label"><em>{a.notes}</em></p>
                )}
                {a.appliedAt && (
                  <p className="esti-label esti-label--secondary">
                    Applied: {new Date(a.appliedAt).toLocaleDateString("en-IN")}
                  </p>
                )}

                {/* Pipeline actions */}
                <div className="esti-app-tile__actions">
                  {a.status === "APPLIED" && (
                    <Button
                      variant="text" size="small"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ appId: a.id, status: "SCREENING" })}
                    >
                      Start screening
                    </Button>
                  )}
                  {a.status === "SCREENING" && (
                    <Button
                      variant="text" size="small"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ appId: a.id, status: "INTERVIEW" })}
                    >
                      Move to interview
                    </Button>
                  )}
                  {a.status === "INTERVIEW" && (
                    <Button
                      variant="text" size="small"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ appId: a.id, status: "OFFERED" })}
                    >
                      Send offer
                    </Button>
                  )}
                  {a.status === "OFFERED" && !a.memberId && (
                    <>
                      <Button
                        variant="contained" size="small"
                        startIcon={<CheckCircleOutlineIcon />}
                        onClick={() => {
                          setOnboardTeamMemberId("");
                          setOnboardOpen(a.id);
                        }}
                      >
                        Onboard
                      </Button>
                      <Button
                        variant="text" color="error" size="small"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ appId: a.id, status: "REJECTED" })}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {a.memberId && (
                    <StatusDot color="green" label="Onboarded" />
                  )}
                  {(a.status === "APPLIED" || a.status === "SCREENING" || a.status === "INTERVIEW") && (
                    <Button
                      variant="text" color="error" size="small"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ appId: a.id, status: "REJECTED" })}
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* New application modal */}
      <Dialog
        aria-labelledby="applications-tab-create-title"
        open={createOpen}
        onClose={() => { setCreateOpen(false); resetForm(); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="applications-tab-create-title">New job application</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="app-name" label="Applicant name" value={form.name} onChange={set("name")} fullWidth />
            <TextField id="app-role" select label="Applied for" value={form.appliedRole} onChange={set("appliedRole")} fullWidth>
              {(Object.keys(TEAM_ROLES) as TeamRoleCode[]).map((k) => (
                <MenuItem key={k} value={k}>{TEAM_ROLES[k]}</MenuItem>
              ))}
            </TextField>
            <TextField id="app-email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} fullWidth />
            <TextField id="app-phone" label="Phone" value={form.phone} onChange={set("phone")} fullWidth />
            <TextField id="app-notes" label="Notes" value={form.notes} onChange={set("notes")} fullWidth />
            {createApp.error && (
              <Alert severity="error">{createApp.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => { setCreateOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!form.name || createApp.isPending}
            onClick={() => createApp.mutate({
              name: form.name,
              email: form.email || undefined,
              phone: form.phone || undefined,
              appliedRole: form.appliedRole,
              notes: form.notes || undefined,
            })}
          >
            {createApp.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Onboard modal — link to existing team member or create new */}
      <Dialog
        aria-labelledby="applications-tab-onboard-title"
        open={!!onboardOpen}
        onClose={() => setOnboardOpen(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="applications-tab-onboard-title">Onboard applicant</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <p>
              Linking the application to a team member marks it as onboarded. Select an existing
              member record if one was already created, or leave blank to create a new one automatically.
            </p>
            <TextField
              id="ob-member"
              select
              label="Link to existing team member (optional)"
              value={onboardTeamMemberId}
              onChange={(e) => setOnboardTeamMemberId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">— Create new team member —</MenuItem>
              {(teamQ.data ?? []).map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
              ))}
            </TextField>
            {onboard.error && (
              <Alert severity="error">{onboard.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOnboardOpen(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={onboard.isPending}
            onClick={() => {
              if (!onboardOpen) return;
              onboard.mutate({
                appId: onboardOpen,
                memberId: onboardTeamMemberId || undefined,
              });
            }}
          >
            {onboard.isPending ? "Onboarding…" : "Onboard"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
