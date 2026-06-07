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

export function ProjectTeam({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.assignments.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const teamQ = trpc.team.list.useQuery();
  const invalidate = () => utils.assignments.listByProject.invalidate({ projectId });
  const remove = trpc.assignments.remove.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [teamMemberId, setTeamMemberId] = useState("");
  const [role, setRole] = useState<AssignmentRoleCode>("SITE_INCHARGE");

  const create = trpc.assignments.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setTeamMemberId("");
    },
  });

  const team = (teamQ.data ?? []).filter((m) => m.active);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 32,
        }}
      >
        <h3>Project team</h3>
        <Button size="sm" disabled={team.length === 0} onClick={() => setOpen(true)}>
          Assign member
        </Button>
      </div>
      {team.length === 0 && (
        <p style={{ color: "#6f6f6f" }}>Add staff in the Team register first.</p>
      )}
      <TableContainer title="Assignments" description="Site in-charge and project staff">
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
                <TableCell>{a.name}</TableCell>
                <TableCell>{TEAM_ROLES[a.memberRole as TeamRoleCode] ?? a.memberRole}</TableCell>
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
            {(Object.keys(ASSIGNMENT_ROLES) as AssignmentRoleCode[]).map((k) => (
              <SelectItem key={k} value={k} text={ASSIGNMENT_ROLES[k]} />
            ))}
          </Select>
        </Stack>
      </Modal>
    </>
  );
}
