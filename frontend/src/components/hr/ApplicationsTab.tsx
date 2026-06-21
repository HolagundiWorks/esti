import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import { Add, CheckmarkOutline } from "@carbon/icons-react";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_TAG,
  TEAM_ROLES,
  type TeamRoleCode,
} from "@esti/contracts";
import { useState } from "react";
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
    <Stack gap={5}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4>{apps.length} application{apps.length !== 1 ? "s" : ""}</h4>
        <Button size="sm" renderIcon={Add} onClick={() => setCreateOpen(true)}>
          New application
        </Button>
      </div>

      {listQ.isLoading && <p className="esti-label esti-label--secondary">Loading…</p>}

      {apps.length === 0 && !listQ.isLoading && (
        <Tile>
          <p className="esti-label esti-label--secondary">
            No job applications yet. Add one to start the onboarding pipeline.
          </p>
        </Tile>
      )}

      <Grid narrow>
        {apps.map((a) => (
          <Column key={a.id} lg={4} md={4} sm={4}>
            <Tile className="esti-app-tile">
              <Stack gap={3}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <p style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{a.name}</p>
                  <Tag
                    type={APPLICATION_STATUS_TAG[a.status as AppStatus] ?? "gray"}
                    size="sm"
                  >
                    {APPLICATION_STATUS_LABEL[a.status as AppStatus] ?? a.status}
                  </Tag>
                </div>

                <p className="esti-label esti-label--secondary">
                  {TEAM_ROLES[a.appliedRole as TeamRoleCode] ?? a.appliedRole}
                </p>

                {a.email && <p className="esti-label esti-label--secondary">{a.email}</p>}
                {a.phone && <p className="esti-label esti-label--secondary">{a.phone}</p>}
                {a.notes && (
                  <p className="esti-label" style={{ fontStyle: "italic" }}>{a.notes}</p>
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
                      kind="ghost" size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ appId: a.id, status: "SCREENING" })}
                    >
                      Start screening
                    </Button>
                  )}
                  {a.status === "SCREENING" && (
                    <Button
                      kind="ghost" size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ appId: a.id, status: "INTERVIEW" })}
                    >
                      Move to interview
                    </Button>
                  )}
                  {a.status === "INTERVIEW" && (
                    <Button
                      kind="ghost" size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ appId: a.id, status: "OFFERED" })}
                    >
                      Send offer
                    </Button>
                  )}
                  {a.status === "OFFERED" && !a.memberId && (
                    <>
                      <Button
                        kind="primary" size="sm"
                        renderIcon={CheckmarkOutline}
                        onClick={() => {
                          setOnboardTeamMemberId("");
                          setOnboardOpen(a.id);
                        }}
                      >
                        Onboard
                      </Button>
                      <Button
                        kind="danger--ghost" size="sm"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ appId: a.id, status: "REJECTED" })}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {a.memberId && (
                    <Tag type="green" size="sm">Onboarded</Tag>
                  )}
                  {(a.status === "APPLIED" || a.status === "SCREENING" || a.status === "INTERVIEW") && (
                    <Button
                      kind="danger--ghost" size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ appId: a.id, status: "REJECTED" })}
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </Stack>
            </Tile>
          </Column>
        ))}
      </Grid>

      {/* New application modal */}
      <Modal
        open={createOpen}
        modalHeading="New job application"
        primaryButtonText={createApp.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.name || createApp.isPending}
        onRequestClose={() => { setCreateOpen(false); resetForm(); }}
        onRequestSubmit={() => createApp.mutate({
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          appliedRole: form.appliedRole,
          notes: form.notes || undefined,
        })}
      >
        <Stack gap={5}>
          <TextInput id="app-name" labelText="Applicant name" value={form.name} onChange={set("name")} />
          <Select id="app-role" labelText="Applied for" value={form.appliedRole} onChange={set("appliedRole")}>
            {(Object.keys(TEAM_ROLES) as TeamRoleCode[]).map((k) => (
              <SelectItem key={k} value={k} text={TEAM_ROLES[k]} />
            ))}
          </Select>
          <TextInput id="app-email" labelText="Email" type="email" value={form.email} onChange={set("email")} />
          <TextInput id="app-phone" labelText="Phone" value={form.phone} onChange={set("phone")} />
          <TextInput id="app-notes" labelText="Notes" value={form.notes} onChange={set("notes")} />
          {createApp.error && (
            <InlineNotification kind="error" title="Error" subtitle={createApp.error.message} hideCloseButton lowContrast />
          )}
        </Stack>
      </Modal>

      {/* Onboard modal — link to existing team member or create new */}
      <Modal
        open={!!onboardOpen}
        modalHeading="Onboard applicant"
        primaryButtonText={onboard.isPending ? "Onboarding…" : "Onboard"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={onboard.isPending}
        onRequestClose={() => setOnboardOpen(null)}
        onRequestSubmit={() => {
          if (!onboardOpen) return;
          onboard.mutate({
            appId: onboardOpen,
            memberId: onboardTeamMemberId || undefined,
          });
        }}
      >
        <Stack gap={5}>
          <p>
            Linking the application to a team member marks it as onboarded. Select an existing
            member record if one was already created, or leave blank to create a new one automatically.
          </p>
          <Select
            id="ob-member"
            labelText="Link to existing team member (optional)"
            value={onboardTeamMemberId}
            onChange={(e) => setOnboardTeamMemberId(e.target.value)}
          >
            <SelectItem value="" text="— Create new team member —" />
            {(teamQ.data ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id} text={m.name} />
            ))}
          </Select>
          {onboard.error && (
            <InlineNotification kind="error" title="Error" subtitle={onboard.error.message} hideCloseButton lowContrast />
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
