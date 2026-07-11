import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalPortalShell } from "../components/portal/ExternalPortalShell.js";
import { ProjectSiteReference } from "../components/ProjectSiteReference.js";
import { StatusDot } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red" | "teal"> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  APPROVED: "green",
  REJECTED: "red",
  ISSUED: "teal",
};

export function SitePortal() {
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const meQ = trpc.auth.me.useQuery();
  const user = meQ.data;
  const utils = trpc.useUtils();

  // Projects list (for supervisor to pick from when not scoped to one)
  const projectsQ = trpc.projectOffice.list.useQuery(
    { limit: 50, offset: 0 },
    { enabled: !projectId },
  );

  // Inspections for selected project
  const inspectionsQ = trpc.inspections.listForSite.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );
  const invalidate = () => utils.inspections.listForSite.invalidate({ projectId: projectId! });

  const submit = trpc.inspections.submit.useMutation({ onSuccess: invalidate });
  const createForSite = trpc.inspections.createForSite.useMutation({
    onSuccess: () => { invalidate(); setCreateOpen(false); resetForm(); },
  });

  const visitsQ = trpc.siteVisits.listForSite.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );
  const confirmBySupervisor = trpc.siteVisits.confirmBySupervisor.useMutation({
    onSuccess: () => utils.siteVisits.listForSite.invalidate({ projectId: projectId! }),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    dateVisit: "", weather: "", attendees: "", progress: "", observations: "", instructions: "",
  });
  const resetForm = () => setForm({ dateVisit: "", weather: "", attendees: "", progress: "", observations: "", instructions: "" });

  const shellProps = {
    companyName: user?.fullName ?? "Site Supervisor",
    portalLabel: AORMS_PORTALS.site.label,
  };

  if (!projectId) {
    return (
      <ExternalPortalShell {...shellProps}>
        <Stack spacing={3} sx={{ maxWidth: 640 }}>
          <Stack spacing={1}>
            <Typography variant="h5" component="h2">{AORMS_PORTALS.site.label}</Typography>
            <Typography variant="body2" color="text.secondary">
              Field view — pick a project
            </Typography>
          </Stack>
          {projectsQ.isLoading && (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Loading projects…</Typography>
            </Stack>
          )}
          {(projectsQ.data ?? []).length === 0 && !projectsQ.isLoading && (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2">No projects assigned yet.</Typography>
            </Box>
          )}
          <Stack spacing={1.5}>
            {(projectsQ.data ?? []).map((p) => (
              <Card key={p.id}>
                <CardActionArea onClick={() => navigate(`/projects/${p.id}`)} sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    <Typography variant="body1">
                      <strong>{p.ref}</strong> — {p.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{p.status}</Typography>
                  </Stack>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        </Stack>
      </ExternalPortalShell>
    );
  }

  const inspections = inspectionsQ.data ?? [];

  return (
    <ExternalPortalShell {...shellProps}>
      <Stack spacing={3} sx={{ maxWidth: 640 }}>
        <Stack spacing={1}>
          <Typography variant="h5" component="h2">Site Inspections</Typography>
          <Typography variant="body2" color="text.secondary">
            Field view
          </Typography>
        </Stack>

        {/* Site visits requiring supervisor confirmation */}
        {(visitsQ.data ?? []).filter((v) => v.status === "PLANNED" && !v.supervisorConfirmedAt).length > 0 && (
          <Stack spacing={1.5}>
            <Typography variant="h6" component="h3">Site visits — confirm your attendance</Typography>
            {(visitsQ.data ?? [])
              .filter((v) => v.status === "PLANNED" && !v.supervisorConfirmedAt)
              .map((v) => (
                <Box key={v.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                  <Stack spacing={1.5}>
                    <Typography variant="body1"><strong>{v.plannedDate}</strong></Typography>
                    {v.notes && <Typography variant="body2" color="text.secondary">{v.notes}</Typography>}
                    <Box>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={confirmBySupervisor.isPending}
                        onClick={() => confirmBySupervisor.mutate({ id: v.id })}
                      >
                        Confirm attendance
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              ))}
          </Stack>
        )}

        {/* Agreed baseline (read-only source of truth) */}
        <ProjectSiteReference projectId={projectId} compact />

        <Box>
          <Button variant="contained" onClick={() => setCreateOpen(true)}>New inspection report</Button>
        </Box>

        {inspectionsQ.isLoading && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading…</Typography>
          </Stack>
        )}
        {inspections.length === 0 && !inspectionsQ.isLoading && (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2">
              No inspection reports yet. Tap "New inspection report" to create one.
            </Typography>
          </Box>
        )}

        <Stack spacing={1.5}>
          {inspections.map((insp) => (
            <Box key={insp.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Typography variant="body1"><strong>{insp.ref}</strong></Typography>
                  <StatusDot color={STATUS_TAG[insp.status] ?? "gray"} label={insp.status} />
                </Stack>
                {insp.dateVisit && (
                  <Typography variant="body2" color="text.secondary">Visit: {insp.dateVisit}</Typography>
                )}
                {insp.progress && (
                  <Typography variant="body2">
                    {insp.progress.slice(0, 120)}{insp.progress.length > 120 ? "…" : ""}
                  </Typography>
                )}
                {insp.status === "REJECTED" && insp.rejectionNote && (
                  <Alert severity="error">
                    <strong>Rejected</strong> — {insp.rejectionNote}
                  </Alert>
                )}
                {insp.status === "DRAFT" && (
                  <Box>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={submit.isPending}
                      onClick={() => submit.mutate({ id: insp.id })}
                    >
                      {submit.isPending ? "Submitting…" : "Submit for approval"}
                    </Button>
                  </Box>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>

      <Dialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); resetForm(); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>New inspection report</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="si-date"
              label="Date of visit"
              type="date"
              value={form.dateVisit}
              onChange={(e) => setForm((f) => ({ ...f, dateVisit: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              id="si-weather"
              label="Weather"
              value={form.weather}
              onChange={(e) => setForm((f) => ({ ...f, weather: e.target.value }))}
              fullWidth
            />
            <TextField
              id="si-att"
              label="Attendees"
              value={form.attendees}
              onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))}
              fullWidth
            />
            <TextField
              id="si-prog"
              label="Progress"
              multiline
              rows={3}
              value={form.progress}
              onChange={(e) => setForm((f) => ({ ...f, progress: e.target.value }))}
              fullWidth
            />
            <TextField
              id="si-obs"
              label="Observations"
              multiline
              rows={3}
              value={form.observations}
              onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
              fullWidth
            />
            <TextField
              id="si-instr"
              label="Instructions"
              multiline
              rows={3}
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => { setCreateOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={createForSite.isPending}
            onClick={() =>
              createForSite.mutate({
                projectId: projectId!,
                dateVisit: form.dateVisit || undefined,
                weather: form.weather || undefined,
                attendees: form.attendees || undefined,
                progress: form.progress || undefined,
                observations: form.observations || undefined,
                instructions: form.instructions || undefined,
                inspectorName: user?.fullName || undefined,
              })
            }
          >
            {createForSite.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </ExternalPortalShell>
  );
}
