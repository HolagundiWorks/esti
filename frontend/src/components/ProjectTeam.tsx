import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  ASSIGNMENT_ROLES,
  type AssignmentRoleCode,
  TEAM_ROLES,
  type TeamRoleCode,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { StaffAvatar } from "./StaffAvatar.js";
import { StatusDot } from "./StatusTag.js";

export function ProjectTeam({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.assignments.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const teamQ = trpc.team.list.useQuery();
  const invalidate = () =>
    utils.assignments.listByProject.invalidate({ projectId });
  const remove = trpc.assignments.remove.useMutation({ onSuccess: invalidate });

  const teamsQ = trpc.teams.list.useQuery();

  const [open, setOpen] = useState(false);
  const [teamMemberId, setTeamMemberId] = useState("");
  const [role, setRole] = useState<AssignmentRoleCode>("SITE_INCHARGE");

  const [teamOpen, setTeamOpen] = useState(false);
  const [selTeamId, setSelTeamId] = useState("");
  const [teamRole, setTeamRole] = useState<AssignmentRoleCode>("SUPPORT");

  const create = trpc.assignments.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setTeamMemberId("");
    },
  });

  const assignTeam = trpc.assignments.assignTeam.useMutation({
    onSuccess: () => {
      invalidate();
      setTeamOpen(false);
      setSelTeamId("");
    },
  });

  const team = (teamQ.data ?? []).filter((m) => m.active);
  const teamGroups = (teamsQ.data ?? []).filter((g) => g.active);

  const assignmentColumns: GridColDef[] = [
    {
      field: "name",
      headerName: "Member",
      flex: 1.5,
      minWidth: 180,
      renderCell: (p) => (
        <span className="esti-avatar-name-cell">
          <StaffAvatar name={p.row.name} size="sm" />
          {p.row.name}
        </span>
      ),
    },
    {
      field: "memberRole",
      headerName: "Designation",
      flex: 1,
      minWidth: 140,
      valueGetter: (v) => TEAM_ROLES[v as TeamRoleCode] ?? v,
    },
    {
      field: "role",
      headerName: "Project role",
      flex: 1,
      minWidth: 140,
      renderCell: (p) => (
        <StatusDot
          color={p.row.role === "SITE_INCHARGE" ? "purple" : "blue"}
          label={ASSIGNMENT_ROLES[p.row.role as AssignmentRoleCode] ?? p.row.role}
        />
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Button
          variant="text"
          size="small"
          disabled={remove.isPending}
          onClick={() => remove.mutate({ id: p.row.id })}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 4,
        }}
      >
        <Typography variant="h6" component="h3">
          Project team
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            disabled={teamGroups.length === 0}
            onClick={() => setTeamOpen(true)}
          >
            Assign team
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={team.length === 0}
            onClick={() => setOpen(true)}
          >
            Assign member
          </Button>
        </Stack>
      </Box>
      {team.length === 0 && (
        <Typography variant="body2">
          Add staff in the Team register first.
        </Typography>
      )}
      <Stack spacing={0.5} sx={{ mt: 1 }}>
        <Typography variant="subtitle1" component="h4">
          Assignments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Site in-charge and project staff
        </Typography>
        <DataGrid
          rows={listQ.data ?? []}
          columns={assignmentColumns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </Stack>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Assign team member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="as-member"
              select
              label="Team member"
              value={teamMemberId}
              onChange={(e) => setTeamMemberId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">Select…</MenuItem>
              {team.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="as-role"
              select
              label="Project role"
              value={role}
              onChange={(e) => setRole(e.target.value as AssignmentRoleCode)}
              fullWidth
            >
              {(Object.keys(ASSIGNMENT_ROLES) as AssignmentRoleCode[]).map(
                (k) => (
                  <MenuItem key={k} value={k}>
                    {ASSIGNMENT_ROLES[k]}
                  </MenuItem>
                ),
              )}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!teamMemberId || create.isPending}
            onClick={() => create.mutate({ projectId, teamMemberId, role })}
          >
            {create.isPending ? "Assigning…" : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Assign a team</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              Selecting a team staffs all of its active members onto this project
              in one action. Members already assigned are skipped.
            </Typography>
            <TextField
              id="at-team"
              select
              label="Team"
              value={selTeamId}
              onChange={(e) => setSelTeamId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">Select…</MenuItem>
              {teamGroups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {`${g.name} (${g.members.length} member${g.members.length === 1 ? "" : "s"})`}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="at-role"
              select
              label="Project role for all members"
              value={teamRole}
              onChange={(e) => setTeamRole(e.target.value as AssignmentRoleCode)}
              fullWidth
            >
              {(Object.keys(ASSIGNMENT_ROLES) as AssignmentRoleCode[]).map((k) => (
                <MenuItem key={k} value={k}>
                  {ASSIGNMENT_ROLES[k]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setTeamOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!selTeamId || assignTeam.isPending}
            onClick={() =>
              assignTeam.mutate({ projectId, teamId: selTeamId, role: teamRole })
            }
          >
            {assignTeam.isPending ? "Assigning…" : "Assign team"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
