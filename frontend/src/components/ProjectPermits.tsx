import {
  Button,
  InlineNotification,
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
  PERMIT_TYPES,
  type PermitDueTier,
  PermitStatus,
  PermitType,
  permitDueTier,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const TIER_TAG: Record<PermitDueTier, { type: "red" | "magenta" | "blue" | "gray"; label: string }> = {
  overdue: { type: "red", label: "Overdue" },
  due_soon: { type: "magenta", label: "Due ≤14d" },
  upcoming: { type: "blue", label: "Due ≤30d" },
  none: { type: "gray", label: "" },
};

export function ProjectPermits({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const permitsQ = trpc.permits.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const update = trpc.permits.update.useMutation({
    onSuccess: () => utils.permits.listByProject.invalidate({ projectId }),
  });

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("BPAS");
  const [authority, setAuthority] = useState<string>(PERMIT_TYPES.BPAS.authorities[0]);
  const [appNo, setAppNo] = useState("");
  const [dueDate, setDueDate] = useState("");

  const create = trpc.permits.create.useMutation({
    onSuccess: () => {
      utils.permits.listByProject.invalidate({ projectId });
      setOpen(false);
      setAppNo("");
      setDueDate("");
    },
  });

  const authorities = PERMIT_TYPES[type as keyof typeof PERMIT_TYPES].authorities;

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
        <h3>Permits &amp; compliance</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          New permit
        </Button>
      </div>
      <TableContainer title="Statutory approvals" description="Tracking with due-date alerts">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Type</TableHeader>
              <TableHeader>Authority</TableHeader>
              <TableHeader>Application #</TableHeader>
              <TableHeader>Due</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Update</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(permitsQ.data ?? []).map((p) => {
              const tier = permitDueTier(p.dateDue, p.status);
              const tag = TIER_TAG[tier];
              return (
                <TableRow key={p.id}>
                  <TableCell>{PERMIT_TYPES[p.permitType as keyof typeof PERMIT_TYPES]?.label ?? p.permitType}</TableCell>
                  <TableCell>{p.authority}</TableCell>
                  <TableCell>{p.applicationNo ?? "—"}</TableCell>
                  <TableCell>
                    {p.dateDue ?? "—"}{" "}
                    {tier !== "none" && <Tag type={tag.type}>{tag.label}</Tag>}
                  </TableCell>
                  <TableCell>{p.status}</TableCell>
                  <TableCell>
                    <Select
                      id={`pm-${p.id}`}
                      labelText="Permit status"
                      hideLabel
                      size="sm"
                      value={p.status}
                      onChange={(e) =>
                        update.mutate({
                          id: p.id,
                          status: e.target.value as (typeof PermitStatus.options)[number],
                        })
                      }
                    >
                      {PermitStatus.options.map((s) => (
                        <SelectItem key={s} value={s} text={s} />
                      ))}
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        modalHeading="New permit"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!authority || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            permitType: type as (typeof PermitType.options)[number],
            authority,
            applicationNo: appNo || undefined,
            dateDue: dueDate || undefined,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="pm-type"
            labelText="Permit type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setAuthority(
                PERMIT_TYPES[e.target.value as keyof typeof PERMIT_TYPES].authorities[0],
              );
            }}
          >
            {PermitType.options.map((t) => (
              <SelectItem key={t} value={t} text={PERMIT_TYPES[t].label} />
            ))}
          </Select>
          <Select
            id="pm-auth"
            labelText="Authority"
            value={authority}
            onChange={(e) => setAuthority(e.target.value)}
          >
            {authorities.map((a) => (
              <SelectItem key={a} value={a} text={a} />
            ))}
          </Select>
          <TextInput
            id="pm-appno"
            labelText="Application number (optional)"
            value={appNo}
            onChange={(e) => setAppNo(e.target.value)}
          />
          <TextInput
            id="pm-due"
            labelText="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {create.error && (
            <InlineNotification
              kind="error"
              title="Could not create"
              subtitle={create.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>
    </>
  );
}
