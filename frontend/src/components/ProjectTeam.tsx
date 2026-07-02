import {
  Button,
  Modal,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import {
  ASSIGNMENT_ROLES,
  type AssignmentRoleCode,
  TEAM_ROLES,
  type TeamRoleCode,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { StaffAvatar } from "./StaffAvatar.js";

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

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "var(--cds-spacing-07)",
        }}
      >
        <h3>Project team</h3>
        <Stack orientation="horizontal" gap={3}>
          <Button
            kind="tertiary"
            size="sm"
            disabled={teamGroups.length === 0}
            onClick={() => setTeamOpen(true)}
          >
            Assign team
          </Button>
          <Button
            size="sm"
            disabled={team.length === 0}
            onClick={() => setOpen(true)}
          >
            Assign member
          </Button>
        </Stack>
      </div>
      {team.length === 0 && <p>Add staff in the Team register first.</p>}
      <TableContainer
        title="Assignments"
        description="Site in-charge and project staff"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Member</TableHeader>
              <TableHeader>Designation</TableHeader>
              <TableHeader>Project role</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(listQ.data ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <span className="esti-avatar-name-cell">
                    <StaffAvatar name={a.name} size="sm" />
                    {a.name}
                  </span>
                </TableCell>
                <TableCell>
                  {TEAM_ROLES[a.memberRole as TeamRoleCode] ?? a.memberRole}
                </TableCell>
                <TableCell>
                  <Tag type={a.role === "SITE_INCHARGE" ? "purple" : "blue"}>
                    {ASSIGNMENT_ROLES[a.role as AssignmentRoleCode] ?? a.role}
                  </Tag>
                </TableCell>
                <TableCell>
                  <Button
                    kind="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ id: a.id })}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        modalHeading="Assign team member"
        primaryButtonText={create.isPending ? "Assigning…" : "Assign"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!teamMemberId || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => create.mutate({ projectId, teamMemberId, role })}
      >
        <Stack gap={5}>
          <Select
            id="as-member"
            labelText="Team member"
            value={teamMemberId}
            onChange={(e) => setTeamMemberId(e.target.value)}
          >
            <SelectItem value="" text="Select…" />
            {team.map((m) => (
              <SelectItem key={m.id} value={m.id} text={m.name} />
            ))}
          </Select>
          <Select
            id="as-role"
            labelText="Project role"
            value={role}
            onChange={(e) => setRole(e.target.value as AssignmentRoleCode)}
          >
            {(Object.keys(ASSIGNMENT_ROLES) as AssignmentRoleCode[]).map(
              (k) => (
                <SelectItem key={k} value={k} text={ASSIGNMENT_ROLES[k]} />
              ),
            )}
          </Select>
        </Stack>
      </Modal>

      <Modal
        open={teamOpen}
        modalHeading="Assign a team"
        primaryButtonText={assignTeam.isPending ? "Assigning…" : "Assign team"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!selTeamId || assignTeam.isPending}
        onRequestClose={() => setTeamOpen(false)}
        onRequestSubmit={() =>
          assignTeam.mutate({ projectId, teamId: selTeamId, role: teamRole })
        }
      >
        <Stack gap={5}>
          <p>
            Selecting a team staffs all of its active members onto this project
            in one action. Members already assigned are skipped.
          </p>
          <Select
            id="at-team"
            labelText="Team"
            value={selTeamId}
            onChange={(e) => setSelTeamId(e.target.value)}
          >
            <SelectItem value="" text="Select…" />
            {teamGroups.map((g) => (
              <SelectItem
                key={g.id}
                value={g.id}
                text={`${g.name} (${g.members.length} member${g.members.length === 1 ? "" : "s"})`}
              />
            ))}
          </Select>
          <Select
            id="at-role"
            labelText="Project role for all members"
            value={teamRole}
            onChange={(e) => setTeamRole(e.target.value as AssignmentRoleCode)}
          >
            {(Object.keys(ASSIGNMENT_ROLES) as AssignmentRoleCode[]).map((k) => (
              <SelectItem key={k} value={k} text={ASSIGNMENT_ROLES[k]} />
            ))}
          </Select>
        </Stack>
      </Modal>
    </>
  );
}
