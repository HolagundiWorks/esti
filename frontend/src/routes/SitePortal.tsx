import {
  Button,
  ClickableTile,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProjectSiteReference } from "../components/ProjectSiteReference.js";
import { trpc } from "../lib/trpc.js";

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

  if (!projectId) {
    return (
      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "1rem" }}>
        <Stack gap={6}>
          <Stack gap={2}>
            <h2>Site Portal</h2>
            <p className="esti-label--secondary">{user?.fullName ?? "Site Supervisor"} · Field view</p>
          </Stack>
          {projectsQ.isLoading && <p>Loading projects…</p>}
          {(projectsQ.data ?? []).length === 0 && !projectsQ.isLoading && (
            <Tile><p>No projects assigned yet.</p></Tile>
          )}
          <Stack gap={3}>
            {(projectsQ.data ?? []).map((p) => (
              <ClickableTile key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
                <Stack gap={3}>
                  <p><strong>{p.ref}</strong> — {p.title}</p>
                  <p className="esti-label--secondary">{p.status}</p>
                </Stack>
              </ClickableTile>
            ))}
          </Stack>
        </Stack>
      </main>
    );
  }

  const inspections = inspectionsQ.data ?? [];

  return (
    <main style={{ maxWidth: "640px", margin: "0 auto", padding: "1rem" }}>
      <Stack gap={6}>
        <Stack gap={2}>
          <h2>Site Inspections</h2>
          <p className="esti-label--secondary">{user?.fullName ?? "Site Supervisor"} · Field view</p>
        </Stack>

        {/* Site visits requiring supervisor confirmation */}
        {(visitsQ.data ?? []).filter((v) => v.status === "PLANNED" && !v.supervisorConfirmedAt).length > 0 && (
          <Stack gap={3}>
            <h3>Site visits — confirm your attendance</h3>
            {(visitsQ.data ?? [])
              .filter((v) => v.status === "PLANNED" && !v.supervisorConfirmedAt)
              .map((v) => (
                <Tile key={v.id}>
                  <Stack gap={3}>
                    <strong>{v.plannedDate}</strong>
                    {v.notes && <p className="esti-label--secondary">{v.notes}</p>}
                    <Button
                      size="sm" kind="primary"
                      disabled={confirmBySupervisor.isPending}
                      onClick={() => confirmBySupervisor.mutate({ id: v.id })}
                    >
                      Confirm attendance
                    </Button>
                  </Stack>
                </Tile>
              ))}
          </Stack>
        )}

        {/* Agreed baseline (read-only source of truth) */}
        <ProjectSiteReference projectId={projectId} compact />

        <Button onClick={() => setCreateOpen(true)}>New inspection report</Button>

        {inspectionsQ.isLoading && <p>Loading…</p>}
        {inspections.length === 0 && !inspectionsQ.isLoading && (
          <Tile><p>No inspection reports yet. Tap "New inspection report" to create one.</p></Tile>
        )}

        <Stack gap={3}>
          {inspections.map((insp) => (
            <Tile key={insp.id}>
              <Stack gap={3}>
                <Stack orientation="horizontal" gap={3}>
                  <strong>{insp.ref}</strong>
                  <Tag type={STATUS_TAG[insp.status] ?? "gray"}>{insp.status}</Tag>
                </Stack>
                {insp.dateVisit && <p className="esti-label--secondary">Visit: {insp.dateVisit}</p>}
                {insp.progress && <p>{insp.progress.slice(0, 120)}{insp.progress.length > 120 ? "…" : ""}</p>}
                {insp.status === "REJECTED" && insp.rejectionNote && (
                  <InlineNotification
                    kind="error"
                    title="Rejected"
                    subtitle={insp.rejectionNote}
                    hideCloseButton
                  />
                )}
                {insp.status === "DRAFT" && (
                  <Button
                    kind="primary"
                    size="sm"
                    disabled={submit.isPending}
                    onClick={() => submit.mutate({ id: insp.id })}
                  >
                    {submit.isPending ? "Submitting…" : "Submit for approval"}
                  </Button>
                )}
              </Stack>
            </Tile>
          ))}
        </Stack>
      </Stack>

      <Modal
        open={createOpen}
        modalHeading="New inspection report"
        primaryButtonText={createForSite.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={createForSite.isPending}
        onRequestClose={() => { setCreateOpen(false); resetForm(); }}
        onRequestSubmit={() =>
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
        <Stack gap={5}>
          <TextInput id="si-date" labelText="Date of visit" type="date" value={form.dateVisit}
            onChange={(e) => setForm((f) => ({ ...f, dateVisit: e.target.value }))} />
          <TextInput id="si-weather" labelText="Weather" value={form.weather}
            onChange={(e) => setForm((f) => ({ ...f, weather: e.target.value }))} />
          <TextInput id="si-att" labelText="Attendees" value={form.attendees}
            onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))} />
          <TextArea id="si-prog" labelText="Progress" rows={3} value={form.progress}
            onChange={(e) => setForm((f) => ({ ...f, progress: e.target.value }))} />
          <TextArea id="si-obs" labelText="Observations" rows={3} value={form.observations}
            onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))} />
          <TextArea id="si-instr" labelText="Instructions" rows={3} value={form.instructions}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} />
        </Stack>
      </Modal>
    </main>
  );
}
