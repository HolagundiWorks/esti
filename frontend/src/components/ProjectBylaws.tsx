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
  TextInput,
} from "@carbon/react";
import {
  BYLAW_PARAMETERS,
  type BylawCompliance,
  type BylawParameterCode,
  bylawCompliance,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const TAG: Record<
  BylawCompliance,
  { type: "green" | "red" | "gray"; label: string }
> = {
  compliant: { type: "green", label: "Compliant" },
  violation: { type: "red", label: "Violation" },
  pending: { type: "gray", label: "Pending" },
};

export function ProjectBylaws({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.bylaws.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const invalidate = () => utils.bylaws.listByProject.invalidate({ projectId });

  const update = trpc.bylaws.update.useMutation({ onSuccess: invalidate });
  const remove = trpc.bylaws.remove.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [parameter, setParameter] = useState<BylawParameterCode>("FAR");
  const [permitted, setPermitted] = useState("");
  const [proposed, setProposed] = useState("");
  const [clause, setClause] = useState("");

  const create = trpc.bylaws.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setPermitted("");
      setProposed("");
      setClause("");
    },
  });

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
        <h3>Development-control compliance</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          Add parameter
        </Button>
      </div>
      <TableContainer
        title="Zoning / building bylaws"
        description="Permitted limits vs proposed design"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Parameter</TableHeader>
              <TableHeader>Permitted</TableHeader>
              <TableHeader>Proposed</TableHeader>
              <TableHeader>Compliance</TableHeader>
              <TableHeader>Clause</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(listQ.data ?? []).map((b) => {
              const meta = BYLAW_PARAMETERS[b.parameter as BylawParameterCode];
              const verdict = bylawCompliance(
                b.direction as "max" | "min",
                b.permittedValue,
                b.proposedValue,
              );
              const tag = TAG[verdict];
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    {meta?.label ?? b.parameter}
                    <div>
                      {b.direction === "max" ? "max" : "min"} · {b.unit}
                    </div>
                  </TableCell>
                  <TableCell>
                    {b.permittedValue ?? "—"} {b.unit}
                  </TableCell>
                  <TableCell>
                    <TextInput
                      id={`bl-prop-${b.id}`}
                      labelText="Proposed value"
                      hideLabel
                      size="sm"
                      type="number"
                      defaultValue={b.proposedValue ?? ""}
                      onBlur={(e) => {
                        const v =
                          e.target.value === "" ? null : Number(e.target.value);
                        if (v !== b.proposedValue)
                          update.mutate({ id: b.id, proposedValue: v });
                      }}
                      style={{ maxWidth: 110 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tag type={tag.type}>{tag.label}</Tag>
                  </TableCell>
                  <TableCell>{b.clause ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      kind="ghost"
                      size="sm"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ id: b.id })}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        modalHeading="Add bylaw parameter"
        primaryButtonText={create.isPending ? "Adding…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={permitted === "" || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            parameter,
            permittedValue: Number(permitted),
            proposedValue: proposed === "" ? null : Number(proposed),
            clause: clause || undefined,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="bl-param"
            labelText="Parameter"
            value={parameter}
            onChange={(e) => setParameter(e.target.value as BylawParameterCode)}
          >
            {(Object.keys(BYLAW_PARAMETERS) as BylawParameterCode[]).map(
              (k) => (
                <SelectItem
                  key={k}
                  value={k}
                  text={BYLAW_PARAMETERS[k].label}
                />
              ),
            )}
          </Select>
          <TextInput
            id="bl-permitted"
            labelText={`Permitted (${BYLAW_PARAMETERS[parameter].unit}, ${BYLAW_PARAMETERS[parameter].direction})`}
            type="number"
            value={permitted}
            onChange={(e) => setPermitted(e.target.value)}
          />
          <TextInput
            id="bl-proposed"
            labelText="Proposed (optional)"
            type="number"
            value={proposed}
            onChange={(e) => setProposed(e.target.value)}
          />
          <TextInput
            id="bl-clause"
            labelText="Bylaw clause (optional)"
            placeholder="e.g. BBMP Zoning Reg. 4.2"
            value={clause}
            onChange={(e) => setClause(e.target.value)}
          />
        </Stack>
      </Modal>
    </>
  );
}
