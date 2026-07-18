import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Grid,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { TEAM_ROLES, type TeamRoleCode } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { StatusDot } from "./StatusTag.js";

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
  const create = trpc.teams.create.useMutation({ meta: { errorTitle: "Couldn't create the team" }, onSuccess: () => { invalidate(); closeCreate(); } });
  const update = trpc.teams.update.useMutation({ meta: { errorTitle: "Couldn't update the team" }, onSuccess: () => { invalidate(); setEditId(null); } });
  const remove = trpc.teams.remove.useMutation({ meta: { errorTitle: "Couldn't delete the team" }, onSuccess: invalidate });

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
    <Stack spacing={2}>
      <Box className="esti-row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" component="h3">Teams</Typography>
        <Button variant="contained" size="small" disabled={staff.length === 0} onClick={() => setOpen(true)}>
          New team
        </Button>
      </Box>

      {teamsQ.isLoading ? (
        <Stack spacing={0.5}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={32} />
          ))}
        </Stack>
      ) : teams.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <p>
            No teams yet. Create a team to group staff and staff them onto a project in one action.
          </p>
        </Box>
      ) : (
        <Grid container spacing={1.5}>
          {teams.map((t) => (
            <Grid key={t.id} size={{ xs: 12, md: 6, lg: 3 }}>
              <Box className="esti-fill" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack spacing={1}>
                  <Box className="esti-row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{t.name}</strong>
                    <StatusDot color="cool-gray"
                      label={`${t.members.length} member${t.members.length === 1 ? "" : "s"}`} />
                  </Box>
                  {t.description && <p className="esti-label esti-label--secondary">{t.description}</p>}
                  <Box className="esti-row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                    {t.members.map((m) => (
                      <StatusDot key={m.teamMemberId} color="blue" label={m.name} />
                    ))}
                  </Box>
                  <Box className="esti-row" sx={{ gap: 0.5 }}>
                    <Button variant="text" size="small" onClick={() => openEdit(t)}>Manage members</Button>
                    <Button variant="text" color="error" size="small" disabled={remove.isPending}
                      onClick={() => remove.mutate({ id: t.id })}>Delete</Button>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create team */}
      <Dialog aria-labelledby="teams-panel-create-title" open={open} onClose={closeCreate} fullWidth maxWidth="sm">
        <DialogTitle id="teams-panel-create-title">New team</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="tg-name" label="Team name" value={name}
              onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField id="tg-desc" label="Description (optional)" multiline rows={2} value={desc}
              onChange={(e) => setDesc(e.target.value)} fullWidth />
            <div>
              <Typography variant="subtitle2" component="legend">Members</Typography>
              <FormGroup>
                {staff.map((m) => (
                  <FormControlLabel
                    key={m.id}
                    control={
                      <Checkbox
                        id={`tg-m-${m.id}`}
                        checked={picked.has(m.id)}
                        onChange={() => setPicked((s) => toggle(s, m.id))}
                      />
                    }
                    label={`${m.name} (${TEAM_ROLES[m.role as TeamRoleCode] ?? m.role})`}
                  />
                ))}
              </FormGroup>
            </div>
            {create.error && (
              <Alert severity="error">
                <AlertTitle>Could not create</AlertTitle>
                {create.error.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={closeCreate}>Cancel</Button>
          <Button variant="contained" disabled={!name || create.isPending}
            onClick={() =>
              create.mutate({ name, description: desc || undefined, memberIds: [...picked] })
            }>
            {create.isPending ? "Creating…" : "Create team"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage members */}
      <Dialog aria-labelledby="teams-panel-members-title" open={editTeam !== null} onClose={() => setEditId(null)} fullWidth maxWidth="sm">
        <DialogTitle id="teams-panel-members-title">{editTeam ? `Manage members — ${editTeam.name}` : "Manage members"}</DialogTitle>
        <DialogContent>
          <div>
            <Typography variant="subtitle2" component="legend" sx={{ mt: 1 }}>Members</Typography>
            <FormGroup>
              {staff.map((m) => (
                <FormControlLabel
                  key={m.id}
                  control={
                    <Checkbox
                      id={`tg-e-${m.id}`}
                      checked={editPicked.has(m.id)}
                      onChange={() => setEditPicked((s) => toggle(s, m.id))}
                    />
                  }
                  label={`${m.name} (${TEAM_ROLES[m.role as TeamRoleCode] ?? m.role})`}
                />
              ))}
            </FormGroup>
          </div>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setEditId(null)}>Cancel</Button>
          <Button variant="contained" disabled={update.isPending}
            onClick={() => {
              if (editId) update.mutate({ id: editId, memberIds: [...editPicked] });
            }}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
