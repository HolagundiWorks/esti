import {
  Button,
  Checkbox,
  Column,
  FormGroup,
  Grid,
  InlineNotification,
  Modal,
  Stack,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import { TEAM_ROLES, type TeamRoleCode } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

type TeamRow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  members: { teamMemberId: string; name: string; role: string; active: boolean }[];
};

/** Reusable named teams — create groups of staff that can be staffed onto a project in one action. */
export function TeamsPanel() {
  const utils = trpc.useUtils();
  const teamsQ = trpc.teams.list.useQuery();
  const staffQ = trpc.team.list.useQuery();
  const staff = (staffQ.data ?? []).filter((m) => m.active);

  const invalidate = () => utils.teams.list.invalidate();
  const create = trpc.teams.create.useMutation({ onSuccess: () => { invalidate(); closeCreate(); } });
  const update = trpc.teams.update.useMutation({ onSuccess: () => { invalidate(); setEditId(null); } });
  const remove = trpc.teams.remove.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const [editId, setEditId] = useState<string | null>(null);
  const [editPicked, setEditPicked] = useState<Set<string>>(new Set());

  function closeCreate() {
    setOpen(false);
    setName("");
    setDesc("");
    setPicked(new Set());
  }
  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }
  function openEdit(team: TeamRow) {
    setEditId(team.id);
    setEditPicked(new Set(team.members.map((m) => m.teamMemberId)));
  }

  const teams = (teamsQ.data ?? []) as TeamRow[];
  const editTeam = teams.find((t) => t.id === editId) ?? null;

  return (
    <Stack gap={5}>
      <div className="esti-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h3>Teams</h3>
        <Button size="sm" disabled={staff.length === 0} onClick={() => setOpen(true)}>
          New team
        </Button>
      </div>

      {teamsQ.isLoading ? (
        <p className="esti-label esti-label--secondary">Loading…</p>
      ) : teams.length === 0 ? (
        <Tile>
          <p>
            No teams yet. Create a team to group staff and staff them onto a project in one action.
          </p>
        </Tile>
      ) : (
        <Grid narrow>
          {teams.map((t) => (
            <Column key={t.id} lg={4} md={4} sm={4}>
              <Tile className="esti-fill">
                <Stack gap={3}>
                  <div className="esti-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{t.name}</strong>
                    <Tag type="cool-gray" size="sm">
                      {t.members.length} member{t.members.length === 1 ? "" : "s"}
                    </Tag>
                  </div>
                  {t.description && <p className="esti-label esti-label--secondary">{t.description}</p>}
                  <div className="esti-row" style={{ flexWrap: "wrap", gap: "var(--cds-spacing-02)" }}>
                    {t.members.map((m) => (
                      <Tag key={m.teamMemberId} type="blue" size="sm">{m.name}</Tag>
                    ))}
                  </div>
                  <div className="esti-row" style={{ gap: "var(--cds-spacing-02)" }}>
                    <Button kind="ghost" size="sm" onClick={() => openEdit(t)}>Manage members</Button>
                    <Button kind="danger--ghost" size="sm" disabled={remove.isPending}
                      onClick={() => remove.mutate({ id: t.id })}>Delete</Button>
                  </div>
                </Stack>
              </Tile>
            </Column>
          ))}
        </Grid>
      )}

      {/* Create team */}
      <Modal
        open={open}
        modalHeading="New team"
        primaryButtonText={create.isPending ? "Creating…" : "Create team"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!name || create.isPending}
        onRequestClose={closeCreate}
        onRequestSubmit={() =>
          create.mutate({ name, description: desc || undefined, memberIds: [...picked] })
        }
      >
        <Stack gap={5}>
          <TextInput id="tg-name" labelText="Team name" value={name}
            onChange={(e) => setName(e.target.value)} />
          <TextArea id="tg-desc" labelText="Description (optional)" rows={2} value={desc}
            onChange={(e) => setDesc(e.target.value)} />
          <FormGroup legendText="Members">
            <Stack gap={2}>
              {staff.map((m) => (
                <Checkbox
                  key={m.id}
                  id={`tg-m-${m.id}`}
                  labelText={`${m.name} (${TEAM_ROLES[m.role as TeamRoleCode] ?? m.role})`}
                  checked={picked.has(m.id)}
                  onChange={() => setPicked((s) => toggle(s, m.id))}
                />
              ))}
            </Stack>
          </FormGroup>
          {create.error && (
            <InlineNotification kind="error" title="Could not create" subtitle={create.error.message}
              hideCloseButton lowContrast />
          )}
        </Stack>
      </Modal>

      {/* Manage members */}
      <Modal
        open={editTeam !== null}
        modalHeading={editTeam ? `Manage members — ${editTeam.name}` : "Manage members"}
        primaryButtonText={update.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={update.isPending}
        onRequestClose={() => setEditId(null)}
        onRequestSubmit={() => {
          if (editId) update.mutate({ id: editId, memberIds: [...editPicked] });
        }}
      >
        <FormGroup legendText="Members">
          <Stack gap={2}>
            {staff.map((m) => (
              <Checkbox
                key={m.id}
                id={`tg-e-${m.id}`}
                labelText={`${m.name} (${TEAM_ROLES[m.role as TeamRoleCode] ?? m.role})`}
                checked={editPicked.has(m.id)}
                onChange={() => setEditPicked((s) => toggle(s, m.id))}
              />
            ))}
          </Stack>
        </FormGroup>
      </Modal>
    </Stack>
  );
}
